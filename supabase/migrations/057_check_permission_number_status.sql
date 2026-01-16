-- ============================================
-- MIGRACIÓN 057: Verificar estado del índice permission_number
-- ============================================
-- Consulta simple para verificar el estado actual
-- ============================================

-- Ver la definición del índice
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'permissions'
  AND indexname LIKE '%permission%'
ORDER BY indexname;

-- Verificar si hay duplicados por empresa
SELECT 
  company_id,
  permission_number,
  COUNT(*) as cantidad
FROM permissions
WHERE permission_number IS NOT NULL
GROUP BY company_id, permission_number
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- Verificar si hay duplicados globales (sin considerar empresa)
SELECT 
  permission_number,
  COUNT(*) as cantidad,
  array_agg(DISTINCT company_id) as empresas
FROM permissions
WHERE permission_number IS NOT NULL
GROUP BY permission_number
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- Contar permisos sin número
SELECT 
  COUNT(*) as permisos_sin_numero
FROM permissions
WHERE permission_number IS NULL OR permission_number = '';

-- Ver los últimos 10 permisos creados
SELECT 
  id,
  company_id,
  permission_number,
  status,
  created_at
FROM permissions
ORDER BY created_at DESC
LIMIT 10;






