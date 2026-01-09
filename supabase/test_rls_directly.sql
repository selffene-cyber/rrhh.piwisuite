-- Script para probar las políticas RLS directamente
-- Esto simula lo que hace la API cuando consulta certificados

-- 1. Verificar si el usuario está en company_users
SELECT 
  cu.user_id,
  cu.company_id,
  cu.role,
  cu.status,
  'Usuario en company_users' as tipo
FROM company_users cu
WHERE cu.user_id = '484c93c1-3844-4013-9a35-32501d869d9a'
  AND cu.company_id = 'ff6dc123-e5db-4ce3-9aea-45c16f6473b6'

UNION ALL

-- 2. Verificar si el usuario está vinculado al employee
SELECT 
  e.user_id as user_id,
  e.company_id,
  'employee' as role,
  'active' as status,
  'Usuario vinculado a employee' as tipo
FROM employees e
WHERE e.id = '93c5d679-7bd4-4670-88e1-05de3d29b349'
  AND e.user_id = '484c93c1-3844-4013-9a35-32501d869d9a';

-- 3. Probar la consulta que hace la API (simulando RLS)
-- Esto debería mostrar qué certificados puede ver el usuario con RLS activo
-- Nota: Esto debe ejecutarse como el usuario autenticado, no como superuser

-- 4. Verificar la política "Employees can view their own certificate requests"
-- Esta consulta debería devolver los certificados si la política funciona
SELECT 
  c.id,
  c.status,
  c.employee_id,
  c.created_at,
  'Debería ser visible por política Employees can view their own certificate requests' as razon
FROM certificates c
WHERE c.employee_id IN (
  SELECT id FROM employees WHERE user_id = '484c93c1-3844-4013-9a35-32501d869d9a'
)
ORDER BY c.created_at DESC;





