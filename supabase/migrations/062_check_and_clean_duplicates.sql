-- ============================================
-- MIGRACIÓN 062: Verificar y limpiar duplicados existentes
-- ============================================
-- Verifica si hay duplicados y los limpia antes de que el trigger funcione
-- ============================================

-- Verificar duplicados por empresa
SELECT 
  'Duplicados por empresa encontrados:' as info,
  company_id,
  permission_number,
  COUNT(*) as cantidad,
  array_agg(id ORDER BY created_at) as ids
FROM permissions
WHERE permission_number IS NOT NULL
GROUP BY company_id, permission_number
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- Limpiar duplicados: mantener el más antiguo, poner NULL a los demás
DO $$
DECLARE
  v_dup RECORD;
  v_updated INTEGER;
BEGIN
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
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'Duplicado limpiado: empresa %, número %, % filas actualizadas', 
      v_dup.company_id, v_dup.permission_number, v_updated;
  END LOOP;
END $$;

-- Reasignar números a permisos con NULL
DO $$
DECLARE
  v_perm RECORD;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
  v_total INTEGER := 0;
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
    
    -- Generar número único
    LOOP
      v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
      
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM permissions 
        WHERE company_id = v_perm.company_id 
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

-- Verificar que no quedan duplicados
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No hay duplicados - Todo está correcto'
    ELSE '✗ Aún hay ' || COUNT(*) || ' duplicados'
  END as estado_final
FROM (
  SELECT company_id, permission_number, COUNT(*) as cnt
  FROM permissions
  WHERE permission_number IS NOT NULL
  GROUP BY company_id, permission_number
  HAVING COUNT(*) > 1
) duplicates;






