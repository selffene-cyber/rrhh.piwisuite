-- ============================================
-- MIGRACIÓN 055: Forzar corrección del índice único de permission_number
-- ============================================
-- Esta migración elimina TODOS los índices relacionados y los recrea correctamente
-- ============================================

-- PASO 1: Eliminar TODOS los índices relacionados con permission_number
DROP INDEX IF EXISTS idx_permissions_number;
DROP INDEX IF EXISTS permissions_permission_number_idx;
DROP INDEX IF EXISTS permissions_permission_number_key;

-- PASO 2: Limpiar duplicados existentes (asignar NULL a los duplicados)
DO $$
DECLARE
  v_dup RECORD;
BEGIN
  -- Encontrar permisos con permission_number duplicado (incluso entre empresas diferentes)
  -- Primero, limpiar duplicados globales
  FOR v_dup IN 
    SELECT permission_number, array_agg(id ORDER BY created_at) as perm_ids
    FROM permissions
    WHERE permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$'
    GROUP BY permission_number
    HAVING COUNT(*) > 1
  LOOP
    -- Mantener el primero (más antiguo) y poner NULL a los demás
    UPDATE permissions
    SET permission_number = NULL
    WHERE id = ANY(v_dup.perm_ids[2:array_length(v_dup.perm_ids, 1)])
      AND id != v_dup.perm_ids[1];
    
    RAISE NOTICE 'Duplicado global encontrado y limpiado: número %', v_dup.permission_number;
  END LOOP;
  
  -- Luego, limpiar duplicados dentro de la misma empresa
  FOR v_dup IN 
    SELECT company_id, permission_number, array_agg(id ORDER BY created_at) as perm_ids
    FROM permissions
    WHERE permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$'
    GROUP BY company_id, permission_number
    HAVING COUNT(*) > 1
  LOOP
    -- Mantener el primero (más antiguo) y poner NULL a los demás
    UPDATE permissions
    SET permission_number = NULL
    WHERE id = ANY(v_dup.perm_ids[2:array_length(v_dup.perm_ids, 1)])
      AND id != v_dup.perm_ids[1];
    
    RAISE NOTICE 'Duplicado por empresa encontrado y limpiado: empresa %, número %', v_dup.company_id, v_dup.permission_number;
  END LOOP;
END $$;

-- PASO 3: Reasignar números a permisos con NULL, agrupados por empresa
DO $$
DECLARE
  v_perm RECORD;
  v_company_id UUID;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
BEGIN
  FOR v_perm IN 
    SELECT id, company_id 
    FROM permissions 
    WHERE permission_number IS NULL OR permission_number = ''
    ORDER BY company_id, created_at
  LOOP
    -- Obtener el siguiente número para esta empresa
    SELECT COALESCE(MAX(CAST(SUBSTRING(permission_number FROM 'PERM-(\d+)') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM permissions
    WHERE company_id = v_perm.company_id
      AND permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$';
    
    -- Generar número de permiso
    v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
    
    -- Verificar que no existe para esta empresa antes de asignar
    WHILE EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_perm.company_id 
        AND permission_number = v_permission_number
    ) LOOP
      v_next_number := v_next_number + 1;
      v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
    END LOOP;
    
    -- Actualizar el permiso
    UPDATE permissions
    SET permission_number = v_permission_number
    WHERE id = v_perm.id;
  END LOOP;
END $$;

-- PASO 4: Crear el índice único CORRECTO por empresa
-- Este índice permite que diferentes empresas tengan el mismo número (PERM-0001)
-- pero garantiza que dentro de una empresa, cada número sea único
CREATE UNIQUE INDEX idx_permissions_number 
ON permissions(company_id, permission_number) 
WHERE permission_number IS NOT NULL;

-- PASO 5: Asegurar que la función del trigger esté correcta
CREATE OR REPLACE FUNCTION generate_permission_number()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
  v_retry_count INTEGER := 0;
  v_max_retries INTEGER := 10;
BEGIN
  -- Obtener company_id del permiso
  v_company_id := NEW.company_id;
  
  -- Si ya tiene un número asignado, verificar que no sea duplicado para esta empresa
  IF NEW.permission_number IS NOT NULL AND NEW.permission_number != '' THEN
    -- Si el número ya existe en otro permiso de la misma empresa, generar uno nuevo
    IF EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_company_id
        AND permission_number = NEW.permission_number 
        AND id != NEW.id
    ) THEN
      -- Forzar regeneración
      NEW.permission_number := NULL;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Usar un lock a nivel de transacción para evitar race conditions
  -- Esto asegura que solo un proceso a la vez pueda calcular el siguiente número
  PERFORM pg_advisory_xact_lock(hashtext('permission_number_' || v_company_id::TEXT));
  
  -- Loop para encontrar un número único
  LOOP
    -- Obtener el siguiente número correlativo para esta empresa
    SELECT COALESCE(MAX(CAST(SUBSTRING(permission_number FROM 'PERM-(\d+)') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM permissions
    WHERE company_id = v_company_id
      AND permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$';
    
    -- Generar número de permiso
    v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
    
    -- Verificar que el número no existe para esta empresa (doble verificación)
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
        RAISE EXCEPTION 'No se pudo generar un número de permiso único después de % intentos para la empresa %', v_max_retries, v_company_id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 6: Asegurar que el trigger esté activo
DROP TRIGGER IF EXISTS set_permission_number_trigger ON permissions;
CREATE TRIGGER set_permission_number_trigger
BEFORE INSERT ON permissions
FOR EACH ROW
EXECUTE FUNCTION generate_permission_number();

-- Verificar el estado final
DO $$
DECLARE
  v_index_def TEXT;
BEGIN
  SELECT indexdef INTO v_index_def
  FROM pg_indexes
  WHERE indexname = 'idx_permissions_number';
  
  IF v_index_def IS NULL THEN
    RAISE EXCEPTION 'El índice idx_permissions_number no se creó correctamente';
  ELSIF v_index_def NOT LIKE '%company_id%' THEN
    RAISE EXCEPTION 'El índice idx_permissions_number no incluye company_id: %', v_index_def;
  ELSE
    RAISE NOTICE 'Índice creado correctamente: %', v_index_def;
  END IF;
END $$;

-- Comentarios
COMMENT ON INDEX idx_permissions_number IS 'Índice único que garantiza que cada empresa tenga números de permiso únicos';
COMMENT ON FUNCTION generate_permission_number() IS 
'Genera un número de permiso único por empresa usando locks para evitar race conditions';






