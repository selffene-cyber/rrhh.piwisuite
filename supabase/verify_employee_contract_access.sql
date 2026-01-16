-- ============================================
-- SCRIPT DE VERIFICACIÓN: Permisos de trabajador para ver contratos
-- ============================================
-- Este script verifica si un trabajador puede ver sus propios contratos
-- ============================================

-- 1. Verificar que la política RLS existe
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'contracts'
  AND policyname = 'Employees can see their own contracts';

-- 2. Verificar el contrato y el trabajador asociado
-- Reemplaza 'bd092bad-affc-423c-ad22-a3d9ae61f302' con el ID del contrato si es diferente
SELECT 
  c.id as contract_id,
  c.contract_number,
  c.status as contract_status,
  c.start_date,
  c.end_date,
  e.id as employee_id,
  e.full_name,
  e.rut,
  e.user_id as employee_user_id,
  e.company_id,
  CASE 
    WHEN e.user_id IS NULL THEN '❌ Trabajador NO tiene user_id vinculado'
    ELSE '✅ Trabajador tiene user_id vinculado'
  END as user_id_status
FROM contracts c
JOIN employees e ON e.id = c.employee_id
WHERE c.id = 'bd092bad-affc-423c-ad22-a3d9ae61f302';

-- 3. Verificar si el trabajador tiene usuario en auth.users
-- Reemplaza el user_id del paso anterior
SELECT 
  e.id as employee_id,
  e.full_name,
  e.user_id,
  au.id as auth_user_id,
  au.email as auth_email,
  CASE 
    WHEN au.id IS NULL THEN '❌ No existe usuario en auth.users con ese ID'
    WHEN au.id = e.user_id THEN '✅ user_id coincide con auth.users'
    ELSE '❌ user_id NO coincide'
  END as verification_status
FROM employees e
LEFT JOIN auth.users au ON au.id = e.user_id
WHERE e.id = '93c5d679-7bd4-4670-88e1-05de3d29b349';

-- 4. Verificar todas las políticas RLS de contracts
SELECT 
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'Tiene condición USING'
    ELSE 'Sin condición USING'
  END as has_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Tiene condición WITH CHECK'
    ELSE 'Sin condición WITH CHECK'
  END as has_with_check
FROM pg_policies
WHERE tablename = 'contracts'
ORDER BY policyname;

-- 5. Probar la política manualmente (simular como trabajador)
-- Esto verifica si la política funcionaría para el user_id del trabajador
-- Reemplaza 'USER_ID_DEL_TRABAJADOR' con el user_id del paso 3
/*
SELECT 
  c.id,
  c.contract_number,
  c.status,
  c.start_date,
  e.full_name,
  e.user_id
FROM contracts c
JOIN employees e ON e.id = c.employee_id
WHERE e.user_id = 'USER_ID_DEL_TRABAJADOR'  -- Reemplaza con el user_id real
  AND c.status IN ('active', 'signed');
*/







