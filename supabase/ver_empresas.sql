-- ============================================
-- VER TODAS LAS EMPRESAS Y SUS COMPANY_ID
-- ============================================

SELECT 
  id as company_id,
  name as nombre_empresa,
  rut,
  employer_name as razon_social,
  city as ciudad,
  status as estado,
  created_at as fecha_creacion
FROM companies
ORDER BY created_at DESC;

-- Ver cuál empresa tiene el ID usado en el script
SELECT 
  '🎯 EMPRESA DEL SCRIPT ACTUAL:' as info,
  id as company_id,
  name as nombre_empresa,
  rut,
  employer_name as razon_social
FROM companies
WHERE id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';
