-- ============================================
-- MIGRACIÓN 056: Diagnosticar y corregir definitivamente permission_number
-- ============================================
-- Esta migración primero diagnostica el problema y luego lo corrige
-- ============================================

-- DIAGNÓSTICO: Ver el estado actual del índice
DO $$
DECLARE
  v_index_def TEXT;
  v_duplicate_count INTEGER;
BEGIN
  -- Verificar definición del índice
  SELECT indexdef INTO v_index_def
  FROM pg_indexes
  WHERE indexname = 'idx_permissions_number';
  
  RAISE NOTICE '=== DIAGNÓSTICO ===';
  IF v_index_def IS NULL THEN
    RAISE NOTICE 'El índice idx_permissions_number NO EXISTE';
  ELSE
    RAISE NOTICE 'Índice actual: %', v_index_def;
    IF v_index_def LIKE '%company_id%' THEN
      RAISE NOTICE '✓ El índice incluye company_id (CORRECTO)';
    ELSE
      RAISE NOTICE '✗ El índice NO incluye company_id (INCORRECTO)';
    END IF;
  END IF;
  
  -- Contar duplicados
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT permission_number, COUNT(*) as cnt
    FROM permissions
    WHERE permission_number IS NOT NULL
    GROUP BY permission_number
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Duplicados globales encontrados: %', v_duplicate_count;
  
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT company_id, permission_number, COUNT(*) as cnt
    FROM permissions
    WHERE permission_number IS NOT NULL
    GROUP BY company_id, permission_number
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Duplicados por empresa encontrados: %', v_duplicate_count;
  RAISE NOTICE '=== FIN DIAGNÓSTICO ===';
END $$;

-- PASO 1: Eliminar TODOS los índices relacionados (sin excepciones)
DROP INDEX IF EXISTS idx_permissions_number CASCADE;
DROP INDEX IF EXISTS permissions_permission_number_idx CASCADE;
DROP INDEX IF EXISTS permissions_permission_number_key CASCADE;

-- Buscar y eliminar cualquier otro índice único en permission_number
DO $$
DECLARE
  v_idx RECORD;
BEGIN
  FOR v_idx IN 
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'permissions'
      AND indexdef LIKE '%permission_number%'
      AND indexdef LIKE '%UNIQUE%'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(v_idx.indexname) || ' CASCADE';
    RAISE NOTICE 'Índice eliminado: %', v_idx.indexname;
  END LOOP;
END $$;

-- PASO 2: Limpiar TODOS los duplicados (globales y por empresa)
DO $$
DECLARE
  v_dup RECORD;
  v_updated INTEGER;
BEGIN
  -- Limpiar duplicados globales primero
  FOR v_dup IN 
    SELECT permission_number, array_agg(id ORDER BY created_at) as perm_ids
    FROM permissions
    WHERE permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$'
    GROUP BY permission_number
    HAVING COUNT(*) > 1
  LOOP
    UPDATE permissions
    SET permission_number = NULL
    WHERE id = ANY(v_dup.perm_ids[2:array_length(v_dup.perm_ids, 1)])
      AND id != v_dup.perm_ids[1];
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Duplicado global limpiado: número %, % filas actualizadas', v_dup.permission_number, v_updated;
  END LOOP;
  
  -- Limpiar duplicados por empresa
  FOR v_dup IN 
    SELECT company_id, permission_number, array_agg(id ORDER BY created_at) as perm_ids
    FROM permissions
    WHERE permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$'
    GROUP BY company_id, permission_number
    HAVING COUNT(*) > 1
  LOOP
    UPDATE permissions
    SET permission_number = NULL
    WHERE id = ANY(v_dup.perm_ids[2:array_length(v_dup.perm_ids, 1)])
      AND id != v_dup.perm_ids[1];
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Duplicado por empresa limpiado: empresa %, número %, % filas actualizadas', 
      v_dup.company_id, v_dup.permission_number, v_updated;
  END LOOP;
END $$;

-- PASO 3: Reasignar números a permisos con NULL, por empresa
DO $$
DECLARE
  v_perm RECORD;
  v_company_id UUID;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
  v_total_updated INTEGER := 0;
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
    
    v_total_updated := v_total_updated + 1;
  END LOOP;
  
  RAISE NOTICE 'Total de permisos actualizados: %', v_total_updated;
END $$;

-- PASO 4: Crear el índice único CORRECTO (company_id, permission_number)
-- Este es el paso CRÍTICO: el índice debe incluir company_id
CREATE UNIQUE INDEX idx_permissions_number 
ON permissions(company_id, permission_number) 
WHERE permission_number IS NOT NULL;

-- PASO 5: Verificar que el índice se creó correctamente
DO $$
DECLARE
  v_index_def TEXT;
BEGIN
  SELECT indexdef INTO v_index_def
  FROM pg_indexes
  WHERE indexname = 'idx_permissions_number';
  
  IF v_index_def IS NULL THEN
    RAISE EXCEPTION 'ERROR: El índice idx_permissions_number no se creó';
  ELSIF v_index_def NOT LIKE '%company_id%' THEN
    RAISE EXCEPTION 'ERROR: El índice no incluye company_id. Definición: %', v_index_def;
  ELSE
    RAISE NOTICE '✓ Índice creado correctamente: %', v_index_def;
  END IF;
END $$;

-- PASO 6: Actualizar función del trigger
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
    
    -- Verificar que el número no existe para esta empresa
    IF NOT EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_company_id
        AND permission_number = v_permission_number
    ) THEN
      NEW.permission_number := v_permission_number;
      EXIT;
    ELSE
      v_next_number := v_next_number + 1;
      v_retry_count := v_retry_count + 1;
      
      IF v_retry_count >= v_max_retries THEN
        RAISE EXCEPTION 'No se pudo generar un número de permiso único después de % intentos para la empresa %', v_max_retries, v_company_id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 7: Asegurar que el trigger esté activo
DROP TRIGGER IF EXISTS set_permission_number_trigger ON permissions;
CREATE TRIGGER set_permission_number_trigger
BEFORE INSERT ON permissions
FOR EACH ROW
EXECUTE FUNCTION generate_permission_number();

-- VERIFICACIÓN FINAL
DO $$
DECLARE
  v_index_def TEXT;
  v_duplicate_count INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
  
  -- Verificar índice
  SELECT indexdef INTO v_index_def
  FROM pg_indexes
  WHERE indexname = 'idx_permissions_number';
  
  IF v_index_def LIKE '%company_id%' AND v_index_def LIKE '%permission_number%' THEN
    RAISE NOTICE '✓ Índice correcto: %', v_index_def;
  ELSE
    RAISE WARNING '✗ Índice puede estar incorrecto: %', v_index_def;
  END IF;
  
  -- Verificar duplicados
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT company_id, permission_number, COUNT(*) as cnt
    FROM permissions
    WHERE permission_number IS NOT NULL
    GROUP BY company_id, permission_number
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicate_count = 0 THEN
    RAISE NOTICE '✓ No hay duplicados por empresa';
  ELSE
    RAISE WARNING '✗ Aún hay % duplicados por empresa', v_duplicate_count;
  END IF;
  
  RAISE NOTICE '=== FIN VERIFICACIÓN ===';
END $$;

