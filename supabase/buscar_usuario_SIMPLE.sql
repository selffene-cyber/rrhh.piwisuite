-- ============================================
-- BUSCAR USUARIO POR EMAIL - VERSIÓN SIMPLE
-- ============================================
-- INSTRUCCIONES:
-- Reemplaza 'cristian.cofre@hlms.cl' con el email que buscas
-- en TODAS las consultas de abajo
-- ============================================

-- 1️⃣ BUSCAR EN AUTH.USERS
SELECT 
  '1️⃣ AUTH.USERS' as ubicacion,
  id,
  email,
  created_at,
  confirmed_at,
  last_sign_in_at,
  CASE 
    WHEN confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '⚠️ Sin confirmar'
  END as estado
FROM auth.users
WHERE email ILIKE 'cristian.cofre@hlms.cl';  -- ⚠️ CAMBIA AQUÍ EL EMAIL

-- 2️⃣ BUSCAR EN USER_PROFILES
SELECT 
  '2️⃣ USER_PROFILES' as ubicacion,
  id,
  email,
  role,
  full_name,
  created_at
FROM user_profiles
WHERE email ILIKE 'cristian.cofre@hlms.cl';  -- ⚠️ CAMBIA AQUÍ EL EMAIL

-- 3️⃣ BUSCAR EN COMPANY_USERS (asignaciones a empresas)
SELECT 
  '3️⃣ COMPANY_USERS' as ubicacion,
  up.email,
  c.name as empresa,
  cu.role as rol_en_empresa,
  cu.status,
  cu.joined_at
FROM company_users cu
JOIN user_profiles up ON up.id = cu.user_id
LEFT JOIN companies c ON c.id = cu.company_id
WHERE up.email ILIKE 'cristian.cofre@hlms.cl';  -- ⚠️ CAMBIA AQUÍ EL EMAIL

-- 4️⃣ BUSCAR EN EMPLOYEES (trabajadores)
SELECT 
  '4️⃣ EMPLOYEES' as ubicacion,
  e.email,
  e.full_name,
  e.rut,
  e.position,
  c.name as empresa,
  e.status,
  CASE 
    WHEN e.user_id IS NOT NULL THEN '✅ Tiene usuario'
    ELSE '❌ Sin usuario'
  END as tiene_acceso_portal
FROM employees e
LEFT JOIN companies c ON c.id = e.company_id
WHERE e.email ILIKE 'cristian.cofre@hlms.cl';  -- ⚠️ CAMBIA AQUÍ EL EMAIL

-- 5️⃣ RESUMEN
SELECT 
  '5️⃣ RESUMEN' as tipo,
  (SELECT COUNT(*) FROM auth.users WHERE email ILIKE 'cristian.cofre@hlms.cl') as en_auth,
  (SELECT COUNT(*) FROM user_profiles WHERE email ILIKE 'cristian.cofre@hlms.cl') as en_profiles,
  (SELECT COUNT(*) FROM company_users cu JOIN user_profiles up ON cu.user_id = up.id WHERE up.email ILIKE 'cristian.cofre@hlms.cl') as en_empresas,
  (SELECT COUNT(*) FROM employees WHERE email ILIKE 'cristian.cofre@hlms.cl') as como_empleado;

-- ============================================
-- 💡 COMANDOS ÚTILES SEGÚN EL PROBLEMA
-- ============================================

/*
-- SI EXISTE EN AUTH PERO SIN PERFIL:
INSERT INTO user_profiles (id, email, role, full_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'cristian.cofre@hlms.cl'),
  'cristian.cofre@hlms.cl',
  'user',
  'Cristian Cofre'
)
ON CONFLICT (id) DO NOTHING;

-- SI EXISTE CON PERFIL PERO SIN EMPRESA:
INSERT INTO company_users (user_id, company_id, role, status, joined_at)
VALUES (
  (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl'),
  'be575ba9-e1f8-449c-a875-ff19607b1d11',  -- Tu company_id
  'ejecutivo',
  'active',
  NOW()
)
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = 'ejecutivo', status = 'active';

-- SI NECESITAS ELIMINAR TODO:
DELETE FROM auth.users WHERE email = 'cristian.cofre@hlms.cl';
-- (Esto eliminará también perfil y asignaciones por CASCADE)
*/
