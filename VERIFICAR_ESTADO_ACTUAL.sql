-- =====================================================
-- VERIFICAR ESTADO ACTUAL DE hmartinez@hlms.cl
-- =====================================================
-- Ejecuta esto en Supabase Dashboard → SQL Editor
-- Te mostrará toda la información necesaria
-- =====================================================

-- 1. Usuario en auth.users
SELECT 
  '1. USUARIO AUTH' as seccion,
  id as user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'hmartinez@hlms.cl';

-- 2. Roles administrativos
SELECT 
  '2. ROLES ADMIN' as seccion,
  cu.role,
  cu.status,
  c.name as company_name,
  c.id as company_id
FROM company_users cu
JOIN companies c ON c.id = cu.company_id
WHERE cu.user_id = (SELECT id FROM auth.users WHERE email = 'hmartinez@hlms.cl');

-- 3. Empleado vinculado (si existe)
SELECT 
  '3. EMPLEADO VINCULADO' as seccion,
  e.id as employee_id,
  e.full_name,
  e.email as employee_email,
  e.user_id,
  c.name as company_name,
  CASE 
    WHEN e.user_id IS NOT NULL THEN '⚠️ VINCULADO (PROBLEMA)'
    ELSE '✅ NO VINCULADO'
  END as estado
FROM employees e
JOIN companies c ON c.id = e.company_id
WHERE e.user_id = (SELECT id FROM auth.users WHERE email = 'hmartinez@hlms.cl')
   OR e.email = 'hmartinez@hlms.cl';

-- 4. Diagnóstico
SELECT 
  '4. DIAGNÓSTICO' as seccion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hmartinez@hlms.cl')
    ) THEN '❌ PROBLEMA: Usuario admin está vinculado como empleado'
    ELSE '✅ OK: Usuario admin NO está vinculado como empleado'
  END as diagnostico,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hmartinez@hlms.cl')
    ) THEN 'SOLUCIÓN: Ejecutar migración 092 para desvincular'
    ELSE 'Todo está correcto, no necesita cambios'
  END as accion_recomendada;


