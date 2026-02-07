-- ============================================
-- VERIFICACIÓN COMPLETA: Cristian Cofre
-- ============================================

-- 1️⃣ Ver perfil de usuario
SELECT 
  '1️⃣ PERFIL DE USUARIO' as paso,
  id,
  email,
  full_name,
  role as rol_sistema,
  default_company_id
FROM user_profiles
WHERE email = 'cristian.cofre@hlms.cl';

-- 2️⃣ Ver asignación en company_users
SELECT 
  '2️⃣ ASIGNACIÓN EN EMPRESA' as paso,
  cu.user_id,
  cu.company_id,
  cu.role as rol_en_empresa,
  cu.status,
  c.name as nombre_empresa,
  c.rut as rut_empresa
FROM company_users cu
JOIN companies c ON c.id = cu.company_id
WHERE cu.user_id = (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl');

-- 3️⃣ Ver permisos
SELECT 
  '3️⃣ PERMISOS' as paso,
  user_id,
  company_id,
  can_create_permissions,
  can_create_vacations,
  can_create_certificates,
  can_manage_compliance,
  can_manage_raat,
  can_manage_documents
FROM user_permissions
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl');

-- 4️⃣ Ver si existe en auth.users
SELECT 
  '4️⃣ AUTH.USERS' as paso,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'cristian.cofre@hlms.cl';

-- 5️⃣ COMPARAR CON USUARIO QUE SÍ APARECE (hmartinez)
SELECT 
  '5️⃣ USUARIO QUE SÍ APARECE (REFERENCIA)' as paso,
  cu.user_id,
  up.email,
  up.full_name,
  cu.role as rol_en_empresa,
  cu.status,
  c.name as nombre_empresa
FROM company_users cu
JOIN user_profiles up ON up.id = cu.user_id
JOIN companies c ON c.id = cu.company_id
WHERE up.email = 'hmartinez@hlms.cl'
  AND c.id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';

-- 6️⃣ TODOS LOS USUARIOS DE LA EMPRESA (filtro que usa la página)
SELECT 
  '6️⃣ TODOS LOS USUARIOS DE LA EMPRESA' as paso,
  cu.user_id,
  up.email,
  up.full_name,
  cu.role as rol_en_empresa,
  cu.status,
  cu.created_at
FROM company_users cu
LEFT JOIN user_profiles up ON up.id = cu.user_id
WHERE cu.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
  AND cu.status = 'active'
ORDER BY cu.created_at DESC;
