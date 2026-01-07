-- ============================================
-- MIGRACIÓN 061: Corregir función del trigger para evitar duplicados
-- ============================================
-- El índice está correcto, pero el trigger puede estar generando duplicados
-- Esta migración actualiza la función del trigger con mejor manejo de locks
-- ============================================

-- Eliminar el trigger actual
DROP TRIGGER IF EXISTS set_permission_number_trigger ON permissions;

-- Recrear la función con mejor manejo de locks y verificación
CREATE OR REPLACE FUNCTION generate_permission_number()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
  v_retry_count INTEGER := 0;
  v_max_retries INTEGER := 20;
  v_lock_key BIGINT;
BEGIN
  -- Obtener company_id del permiso
  v_company_id := NEW.company_id;
  
  -- Si ya tiene un número asignado, verificar que no sea duplicado para esta empresa
  IF NEW.permission_number IS NOT NULL AND NEW.permission_number != '' THEN
    -- Verificar si el número ya existe en otro permiso de la misma empresa
    IF EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_company_id
        AND permission_number = NEW.permission_number 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
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
    -- El lock ya está aplicado a nivel de transacción, no necesitamos FOR UPDATE aquí
    SELECT COALESCE(MAX(CAST(SUBSTRING(permission_number FROM 'PERM-(\d+)') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM permissions
    WHERE company_id = v_company_id
      AND permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$';
    
    -- Si no hay permisos previos, empezar en 1
    IF v_next_number IS NULL THEN
      v_next_number := 1;
    END IF;
    
    -- Generar número de permiso
    v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
    
    -- Verificar que el número no existe para esta empresa (doble verificación)
    -- Esta verificación es crítica para evitar duplicados
    IF NOT EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_company_id
        AND permission_number = v_permission_number
    ) THEN
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

-- Verificar que el trigger se creó correctamente
SELECT 
  'Trigger recreado correctamente' as status,
  tgname as trigger_name,
  tgtype::text as trigger_type
FROM pg_trigger
WHERE tgname = 'set_permission_number_trigger';

-- Verificar que la función existe
SELECT 
  'Función verificada' as status,
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'generate_permission_number'
LIMIT 1;

