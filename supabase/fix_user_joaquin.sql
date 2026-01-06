-- ============================================
-- DIAGNÓSTICO Y CORRECCIÓN DEL USUARIO
-- joaquin.hermoso@techsolutions.cl
-- ID: ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca
-- ============================================

-- ⚠️ IMPORTANTE: El error indica que el usuario NO existe en auth.users
-- Debes crear el usuario PRIMERO en Supabase Dashboard antes de ejecutar este script

-- ============================================
-- PASO 1: CREAR USUARIO EN SUPABASE AUTH (OBLIGATORIO)
-- ============================================
-- Ve a: Supabase Dashboard > Authentication > Users
-- 1. Click en "Add user" > "Create new user"
-- 2. Email: joaquin.hermoso@techsolutions.cl
-- 3. Password: colaborador1
-- 4. ✅ Marca "Auto Confirm User" (MUY IMPORTANTE)
-- 5. Click en "Create user"
-- 6. Copia el ID del usuario creado (debería ser: ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca)
-- 
-- Si el ID es diferente, actualiza el ID en este script antes de continuar
-- ============================================

-- PASO 2: Verificar estado actual (ejecuta después de crear el usuario en Auth)
SELECT 
  'user_profiles' as tabla,
  id,
  email,
  role,
  must_change_password,
  password_changed_at,
  created_at
FROM user_profiles
WHERE id = 'ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca'
   OR email = 'joaquin.hermoso@techsolutions.cl';

SELECT 
  'employees' as tabla,
  id,
  full_name,
  rut,
  email,
  user_id,
  company_id
FROM employees
WHERE user_id = 'ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca'
   OR email = 'joaquin.hermoso@techsolutions.cl';

-- ============================================
-- PASO 3: Crear/actualizar perfil (SOLO después de crear usuario en Auth)
-- ⚠️ NO ejecutes esto hasta que el usuario exista en auth.users
-- ============================================

-- Primero verifica que el usuario existe en auth.users ejecutando:
-- SELECT id, email FROM auth.users WHERE id = 'ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca';
-- Si no devuelve nada, el usuario NO existe y debes crearlo en el Dashboard

-- Si el usuario existe en auth.users, entonces ejecuta esto:
INSERT INTO user_profiles (
  id,
  email,
  role,
  must_change_password,
  password_changed_at
) VALUES (
  'ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca',
  'joaquin.hermoso@techsolutions.cl',
  'user',
  true,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = 'user',
  must_change_password = true,
  password_changed_at = NULL;

-- ============================================
-- PASO 4: Si el empleado existe pero no está vinculado
-- Ejecuta esto para vincular el usuario al empleado:
-- (Ajusta el WHERE según el ID del empleado)
-- ============================================

-- Primero, encuentra el empleado:
SELECT 
  id,
  full_name,
  rut,
  email,
  user_id,
  company_id
FROM employees
WHERE email = 'joaquin.hermoso@techsolutions.cl';

-- Luego, si el empleado existe y user_id es NULL, ejecuta:
-- (Reemplaza 'EMPLOYEE_ID_AQUI' con el ID real del empleado)
/*
UPDATE employees
SET user_id = 'ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca'
WHERE email = 'joaquin.hermoso@techsolutions.cl'
  AND (user_id IS NULL OR user_id != 'ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca');
*/

-- ============================================
-- PASO 5: Verificar que todo esté correcto
-- ============================================

SELECT 
  'Estado Final' as estado,
  up.id as user_id,
  up.email,
  up.role,
  up.must_change_password,
  e.id as employee_id,
  e.full_name,
  e.rut,
  e.user_id as employee_user_id,
  CASE 
    WHEN up.id IS NULL THEN '❌ No tiene perfil'
    WHEN e.id IS NULL THEN '❌ No tiene empleado vinculado'
    WHEN e.user_id IS NULL THEN '❌ Empleado no vinculado'
    WHEN e.user_id != up.id THEN '❌ IDs no coinciden'
    ELSE '✅ Todo correcto'
  END as diagnostico
FROM user_profiles up
LEFT JOIN employees e ON e.user_id = up.id OR e.email = up.email
WHERE up.id = 'ed0e8e2a-f6ec-4499-b96d-abf41e06a7ca'
   OR up.email = 'joaquin.hermoso@techsolutions.cl';
