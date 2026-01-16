-- ============================================
-- MIGRACIÓN 054: Verificar y corregir el índice único de permission_number
-- ============================================
-- Esta migración verifica que el índice único esté correctamente configurado
-- como (company_id, permission_number) y corrige cualquier problema
-- ============================================

-- Verificar si existe un índice único solo en permission_number (incorrecto)
DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  -- Verificar si existe un índice único solo en permission_number
  SELECT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_permissions_number'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef NOT LIKE '%company_id%'
  ) INTO v_index_exists;

  IF v_index_exists THEN
    -- Eliminar el índice incorrecto
    DROP INDEX IF EXISTS idx_permissions_number;
    
    -- Crear el índice correcto por empresa
    CREATE UNIQUE INDEX idx_permissions_number 
    ON permissions(company_id, permission_number) 
    WHERE permission_number IS NOT NULL;
    
    RAISE NOTICE 'Índice único corregido: ahora es por (company_id, permission_number)';
  ELSE
    -- Verificar si el índice correcto existe
    SELECT EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE indexname = 'idx_permissions_number'
        AND indexdef LIKE '%company_id%'
        AND indexdef LIKE '%permission_number%'
    ) INTO v_index_exists;
    
    IF NOT v_index_exists THEN
      -- Crear el índice correcto si no existe
      CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_number 
      ON permissions(company_id, permission_number) 
      WHERE permission_number IS NOT NULL;
      
      RAISE NOTICE 'Índice único creado: (company_id, permission_number)';
    ELSE
      RAISE NOTICE 'Índice único ya está correctamente configurado';
    END IF;
  END IF;
END $$;

-- Verificar y limpiar cualquier duplicado que pueda existir
DO $$
DECLARE
  v_dup RECORD;
  v_company_id UUID;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
BEGIN
  -- Encontrar permisos con permission_number duplicado dentro de la misma empresa
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
    
    RAISE NOTICE 'Duplicado encontrado y limpiado: empresa %, número %', v_dup.company_id, v_dup.permission_number;
  END LOOP;
  
  -- Reasignar números a permisos con NULL
  FOR v_dup IN 
    SELECT id, company_id 
    FROM permissions 
    WHERE permission_number IS NULL OR permission_number = ''
    ORDER BY created_at
  LOOP
    -- Obtener el siguiente número para esta empresa
    SELECT COALESCE(MAX(CAST(SUBSTRING(permission_number FROM 'PERM-(\d+)') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM permissions
    WHERE company_id = v_dup.company_id
      AND permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$';
    
    -- Generar número de permiso
    v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
    
    -- Verificar que no existe para esta empresa antes de asignar
    WHILE EXISTS (
      SELECT 1 FROM permissions 
      WHERE company_id = v_dup.company_id 
        AND permission_number = v_permission_number
    ) LOOP
      v_next_number := v_next_number + 1;
      v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
    END LOOP;
    
    -- Actualizar el permiso
    UPDATE permissions
    SET permission_number = v_permission_number
    WHERE id = v_dup.id;
  END LOOP;
END $$;

-- Asegurar que la función del trigger esté actualizada
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

-- Comentario
COMMENT ON FUNCTION generate_permission_number() IS 
'Genera un número de permiso único por empresa usando locks para evitar race conditions';






