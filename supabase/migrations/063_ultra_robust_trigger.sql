-- ============================================
-- MIGRACIÓN 063: Trigger ultra robusto con mejor manejo de locks
-- ============================================
-- Versión mejorada del trigger con mejor manejo de condiciones de carrera
-- ============================================

-- Eliminar el trigger actual
DROP TRIGGER IF EXISTS set_permission_number_trigger ON permissions;

-- Recrear la función con un enfoque más robusto
CREATE OR REPLACE FUNCTION generate_permission_number()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
  v_retry_count INTEGER := 0;
  v_max_retries INTEGER := 50;
  v_lock_key BIGINT;
  v_found BOOLEAN;
BEGIN
  -- Obtener company_id del permiso
  v_company_id := NEW.company_id;
  
  -- Si ya tiene un número asignado, verificar que no sea duplicado
  IF NEW.permission_number IS NOT NULL AND NEW.permission_number != '' THEN
    -- Verificar si el número ya existe en otro permiso de la misma empresa
    SELECT EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_company_id
        AND permission_number = NEW.permission_number 
        AND id IS DISTINCT FROM NEW.id
    ) INTO v_found;
    
    IF v_found THEN
      -- Forzar regeneración
      NEW.permission_number := NULL;
    ELSE
      -- El número es válido, retornar
      RETURN NEW;
    END IF;
  END IF;
  
  -- Generar una clave única para el lock basada en company_id
  v_lock_key := hashtext('perm_num_' || v_company_id::TEXT);
  
  -- Usar un lock a nivel de transacción para evitar race conditions
  -- Este lock se mantiene durante toda la transacción
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Loop para encontrar un número único
  LOOP
    -- Obtener el siguiente número correlativo para esta empresa
    -- Usamos una subconsulta para obtener el máximo de forma segura
    SELECT COALESCE(
      (SELECT MAX(CAST(SUBSTRING(permission_number FROM 'PERM-(\d+)') AS INTEGER))
       FROM permissions
       WHERE company_id = v_company_id
         AND permission_number IS NOT NULL
         AND permission_number ~ '^PERM-\d+$'),
      0
    ) + 1
    INTO v_next_number;
    
    -- Generar número de permiso
    v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
    
    -- Verificar que el número no existe para esta empresa (doble verificación crítica)
    SELECT NOT EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_company_id
        AND permission_number = v_permission_number
    ) INTO v_found;
    
    IF v_found THEN
      -- Asignar número y salir del loop
      NEW.permission_number := v_permission_number;
      EXIT;
    ELSE
      -- Si el número existe, incrementar y reintentar
      v_next_number := v_next_number + 1;
      v_retry_count := v_retry_count + 1;
      
      -- Prevenir loops infinitos
      IF v_retry_count >= v_max_retries THEN
        RAISE EXCEPTION 'No se pudo generar un número de permiso único después de % intentos para la empresa %. Último número intentado: %', 
          v_max_retries, v_company_id, v_permission_number;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
CREATE TRIGGER set_permission_number_trigger
BEFORE INSERT ON permissions
FOR EACH ROW
EXECUTE FUNCTION generate_permission_number();

-- Verificar que se creó correctamente
SELECT 
  'Trigger recreado' as status,
  tgname as trigger_name
FROM pg_trigger
WHERE tgname = 'set_permission_number_trigger';






