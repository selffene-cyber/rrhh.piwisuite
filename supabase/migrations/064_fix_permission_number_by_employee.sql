-- ============================================
-- MIGRACIÓN 064: Corregir permission_number para que sea único por empresa Y trabajador
-- ============================================
-- El número debe ser único por (company_id, employee_id), no solo por company_id
-- Cada trabajador tendrá su propia secuencia: PERM-0001, PERM-0002, etc.
-- ============================================

-- PASO 1: Eliminar el índice actual
DROP INDEX IF EXISTS idx_permissions_number CASCADE;

-- PASO 2: Limpiar todos los permission_number existentes para reasignarlos correctamente
UPDATE permissions
SET permission_number = NULL
WHERE permission_number IS NOT NULL;

-- PASO 3: Reasignar números agrupados por empresa Y trabajador
DO $$
DECLARE
  v_perm RECORD;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
  v_total INTEGER := 0;
BEGIN
  FOR v_perm IN 
    SELECT id, company_id, employee_id 
    FROM permissions 
    WHERE permission_number IS NULL OR permission_number = ''
    ORDER BY company_id, employee_id, created_at
  LOOP
    -- Obtener el siguiente número para esta empresa Y este trabajador
    SELECT COALESCE(MAX(CAST(SUBSTRING(permission_number FROM 'PERM-(\d+)') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM permissions
    WHERE company_id = v_perm.company_id
      AND employee_id = v_perm.employee_id
      AND permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$';
    
    -- Generar número único para este trabajador
    LOOP
      v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
      
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM permissions 
        WHERE company_id = v_perm.company_id 
          AND employee_id = v_perm.employee_id
          AND permission_number = v_permission_number
      );
      
      v_next_number := v_next_number + 1;
    END LOOP;
    
    -- Actualizar
    UPDATE permissions
    SET permission_number = v_permission_number
    WHERE id = v_perm.id;
    
    v_total := v_total + 1;
  END LOOP;
  
  RAISE NOTICE 'Total de permisos actualizados: %', v_total;
END $$;

-- PASO 4: Crear el índice único CORRECTO: (company_id, employee_id, permission_number)
CREATE UNIQUE INDEX idx_permissions_number 
ON permissions(company_id, employee_id, permission_number) 
WHERE permission_number IS NOT NULL;

-- PASO 5: Actualizar la función del trigger para generar números por trabajador
DROP TRIGGER IF EXISTS set_permission_number_trigger ON permissions;

CREATE OR REPLACE FUNCTION generate_permission_number()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_employee_id UUID;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
  v_retry_count INTEGER := 0;
  v_max_retries INTEGER := 50;
  v_lock_key BIGINT;
  v_found BOOLEAN;
BEGIN
  -- Obtener company_id y employee_id del permiso
  v_company_id := NEW.company_id;
  v_employee_id := NEW.employee_id;
  
  -- Si ya tiene un número asignado, verificar que no sea duplicado
  IF NEW.permission_number IS NOT NULL AND NEW.permission_number != '' THEN
    -- Verificar si el número ya existe para este trabajador
    SELECT EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_company_id
        AND employee_id = v_employee_id
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
  
  -- Generar una clave única para el lock basada en company_id Y employee_id
  v_lock_key := hashtext('perm_num_' || v_company_id::TEXT || '_' || v_employee_id::TEXT);
  
  -- Usar un lock a nivel de transacción para evitar race conditions
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Loop para encontrar un número único para este trabajador
  LOOP
    -- Obtener el siguiente número correlativo para esta empresa Y este trabajador
    SELECT COALESCE(
      (SELECT MAX(CAST(SUBSTRING(permission_number FROM 'PERM-(\d+)') AS INTEGER))
       FROM permissions
       WHERE company_id = v_company_id
         AND employee_id = v_employee_id
         AND permission_number IS NOT NULL
         AND permission_number ~ '^PERM-\d+$'),
      0
    ) + 1
    INTO v_next_number;
    
    -- Generar número de permiso
    v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
    
    -- Verificar que el número no existe para este trabajador (doble verificación)
    SELECT NOT EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_company_id
        AND employee_id = v_employee_id
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
        RAISE EXCEPTION 'No se pudo generar un número de permiso único después de % intentos para la empresa % y trabajador %. Último número intentado: %', 
          v_max_retries, v_company_id, v_employee_id, v_permission_number;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 6: Recrear el trigger
CREATE TRIGGER set_permission_number_trigger
BEFORE INSERT ON permissions
FOR EACH ROW
EXECUTE FUNCTION generate_permission_number();

-- PASO 7: Verificar que se creó correctamente
SELECT 
  'Índice creado correctamente' as status,
  indexdef
FROM pg_indexes
WHERE indexname = 'idx_permissions_number';

-- PASO 8: Verificar que no hay duplicados
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No hay duplicados - Todo está correcto'
    ELSE '✗ Aún hay ' || COUNT(*) || ' duplicados'
  END as estado_final
FROM (
  SELECT company_id, employee_id, permission_number, COUNT(*) as cnt
  FROM permissions
  WHERE permission_number IS NOT NULL
  GROUP BY company_id, employee_id, permission_number
  HAVING COUNT(*) > 1
) duplicates;

