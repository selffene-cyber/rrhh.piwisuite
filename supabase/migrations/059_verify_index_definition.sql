-- Verificar la definición exacta del índice
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'permissions'
  AND indexname = 'idx_permissions_number';

-- Ver la estructura del índice en pg_index
SELECT 
  i.relname as index_name,
  a.attname as column_name,
  am.amname as index_type
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_am am ON i.relam = am.oid
LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relname = 'permissions'
  AND i.relname = 'idx_permissions_number'
ORDER BY a.attnum;






