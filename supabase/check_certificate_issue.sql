-- Script para verificar el problema con certificados
-- Reemplaza '71164ee0-806f-4b6b-b8f9-88c91958ec5e' con el ID del certificado que no aparece

-- 1. Verificar si el certificado existe
SELECT 
  id,
  status,
  employee_id,
  company_id,
  certificate_type,
  created_at,
  requested_at,
  requested_by
FROM certificates 
WHERE id = '71164ee0-806f-4b6b-b8f9-88c91958ec5e';

-- 2. Verificar el employee_id del certificado
SELECT 
  e.id as employee_id,
  e.user_id,
  e.full_name,
  e.rut
FROM employees e
WHERE e.id = (
  SELECT employee_id FROM certificates WHERE id = '71164ee0-806f-4b6b-b8f9-88c91958ec5e'
);

-- 3. Verificar todos los certificados del trabajador (sin RLS, usando service role)
-- Esto nos dirá si el problema es RLS o algo más
SELECT 
  id,
  status,
  employee_id,
  created_at,
  requested_at
FROM certificates 
WHERE employee_id = '93c5d679-7bd4-4670-88e1-05de3d29b349'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar si el usuario está en company_users (para la política "Users can view certificates from their company")
SELECT 
  cu.user_id,
  cu.company_id,
  cu.role,
  cu.status
FROM company_users cu
WHERE cu.user_id = '484c93c1-3844-4013-9a35-32501d869d9a'
  AND cu.company_id = 'ff6dc123-e5db-4ce3-9aea-45c16f6473b6';





