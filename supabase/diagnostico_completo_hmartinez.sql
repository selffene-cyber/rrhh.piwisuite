-- ============================================
-- DIAGNÓSTICO COMPLETO: hmartinez@hlms.cl
-- ============================================

-- 1️⃣ Perfil y rol de sistema de hmartinez
SELECT 
  '1️⃣ PERFIL DE HMARTINEZ' as paso,
  id as user_id,
  email,
  full_name,
  role as rol_sistema,
  default_company_id
FROM user_profiles
WHERE email = 'hmartinez@hlms.cl';

-- 2️⃣ Rol de hmartinez en la empresa
SELECT 
  '2️⃣ ROL EN EMPRESA' as paso,
  cu.role as rol_en_empresa,
  cu.status,
  c.name as empresa,
  c.id as company_id
FROM company_users cu
JOIN companies c ON c.id = cu.company_id
WHERE cu.user_id = (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl')
  AND cu.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';

-- 3️⃣ ¿Puede hmartinez ver company_users? (simulación de política RLS)
SELECT 
  '3️⃣ PUEDE VER COMPANY_USERS' as paso,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM company_users
      WHERE company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
      AND user_id = (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl')
      AND role IN ('owner', 'admin', 'ejecutivo')
      AND status = 'active'
    ) THEN 'SÍ - Tiene acceso como admin/owner/ejecutivo'
    ELSE 'NO - No tiene acceso'
  END as resultado;

-- 4️⃣ Todos los usuarios que DEBERÍA ver hmartinez
SELECT 
  '4️⃣ USUARIOS QUE DEBERÍA VER' as paso,
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

-- 5️⃣ Verificar user_permissions de hmartinez
SELECT 
  '5️⃣ PERMISOS DE HMARTINEZ' as paso,
  up.user_id,
  up.company_id,
  up.can_manage_users_roles,
  up.can_view_employees,
  up.can_view_employee_details
FROM user_permissions up
WHERE up.user_id = (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl')
  AND up.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';

-- 6️⃣ Verificar user_permissions de Cristian
SELECT 
  '6️⃣ PERMISOS DE CRISTIAN' as paso,
  up.user_id,
  up.company_id,
  up.can_manage_users_roles,
  up.can_view_employees,
  up.can_view_employee_details
FROM user_permissions up
WHERE up.user_id = (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl')
  AND up.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';

-- 7️⃣ Verificar políticas RLS de user_permissions
SELECT 
  '7️⃣ POLÍTICAS RLS DE USER_PERMISSIONS' as paso,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as condition
FROM pg_policies
WHERE tablename = 'user_permissions'
ORDER BY policyname;

-- 8️⃣ Prueba de acceso RLS para hmartinez viendo permisos de Cristian
-- Esta query simula lo que hace el frontend
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = json_build_object('sub', (SELECT id::text FROM user_profiles WHERE email = 'hmartinez@hlms.cl'))::text;

SELECT 
  '8️⃣ SIMULACIÓN: hmartinez lee permisos de Cristian' as paso,
  up.user_id,
  up.company_id,
  prof.email,
  prof.full_name
FROM user_permissions up
JOIN user_profiles prof ON prof.id = up.user_id
WHERE up.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11'
  AND prof.email = 'cristian.cofre@hlms.cl';

RESET ROLE;
