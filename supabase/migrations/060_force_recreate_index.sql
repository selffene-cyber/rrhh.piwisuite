-- ============================================
-- MIGRACIÓN 060: Forzar recreación del índice con la estructura correcta
-- ============================================
-- Esta migración elimina el índice y lo recrea con la estructura correcta
-- sin importar cómo esté configurado actualmente
-- ============================================

-- PASO 1: Eliminar el índice actual (sin importar cómo esté configurado)
DROP INDEX IF EXISTS idx_permissions_number CASCADE;

-- PASO 2: Verificar que no queden índices relacionados (excluyendo la clave primaria)
DO $$
DECLARE
  v_idx RECORD;
BEGIN
  FOR v_idx IN 
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'permissions'
      AND (indexdef LIKE '%permission_number%' OR indexname LIKE '%permission_number%')
      AND indexdef LIKE '%UNIQUE%'
      AND indexname != 'permissions_pkey'  -- NO eliminar la clave primaria
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(v_idx.indexname) || ' CASCADE';
  END LOOP;
END $$;

-- PASO 3: Crear el índice único CORRECTO
-- IMPORTANTE: Debe incluir company_id para permitir que diferentes empresas
-- tengan el mismo número (PERM-0001, PERM-0002, etc.)
CREATE UNIQUE INDEX idx_permissions_number 
ON permissions(company_id, permission_number) 
WHERE permission_number IS NOT NULL;

-- PASO 4: Verificar que se creó correctamente
SELECT 
  'Índice recreado correctamente' as status,
  indexdef
FROM pg_indexes
WHERE indexname = 'idx_permissions_number';

-- PASO 5: Verificar que no hay duplicados que violen el nuevo índice
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ No hay duplicados - El índice debería funcionar correctamente'
    ELSE '✗ Aún hay ' || COUNT(*) || ' duplicados que necesitan limpieza'
  END as estado_duplicados
FROM (
  SELECT company_id, permission_number, COUNT(*) as cnt
  FROM permissions
  WHERE permission_number IS NOT NULL
  GROUP BY company_id, permission_number
  HAVING COUNT(*) > 1
) duplicates;

