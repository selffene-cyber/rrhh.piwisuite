-- ============================================
-- VERIFICAR ACCESO A /settings/usuarios-roles
-- ============================================

-- 1️⃣ Verificar rol de hmartinez en company_users
SELECT 
  '1️⃣ ROL EN EMPRESA' as paso,
  cu.role as rol_en_empresa,
  cu.status,
  CASE 
    WHEN cu.role IN ('owner', 'admin') THEN '✅ Acceso automático (admin/owner)'
    WHEN cu.role = 'ejecutivo' THEN '⚠️  Requiere permisos específicos'
    ELSE '❌ Sin acceso'
  END as acceso_middleware
FROM company_users cu
WHERE cu.user_id = (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl')
  AND cu.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';

-- 2️⃣ Verificar permisos de hmartinez
SELECT 
  '2️⃣ PERMISOS' as paso,
  CASE 
    WHEN perm.can_manage_users_roles = true THEN '✅ Puede gestionar usuarios y roles'
    ELSE '❌ NO puede gestionar usuarios y roles'
  END as permiso_requerido,
  perm.can_manage_users_roles
FROM user_permissions perm
WHERE perm.user_id = (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl')
  AND perm.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';

-- 3️⃣ Resumen de acceso
SELECT 
  '3️⃣ RESUMEN DE ACCESO' as paso,
  up.email,
  up.full_name,
  cu.role as rol_en_empresa,
  COALESCE(perm.can_manage_users_roles, false) as tiene_permiso,
  CASE 
    WHEN cu.role IN ('owner', 'admin') THEN '✅ ACCESO GARANTIZADO (admin/owner)'
    WHEN cu.role = 'ejecutivo' AND COALESCE(perm.can_manage_users_roles, false) = true 
      THEN '✅ ACCESO GARANTIZADO (ejecutivo con permiso)'
    WHEN cu.role = 'ejecutivo' AND COALESCE(perm.can_manage_users_roles, false) = false 
      THEN '❌ SIN ACCESO (ejecutivo sin permiso)'
    ELSE '❌ SIN ACCESO'
  END as resultado_final
FROM user_profiles up
JOIN company_users cu ON cu.user_id = up.id
LEFT JOIN user_permissions perm ON perm.user_id = up.id AND perm.company_id = cu.company_id
WHERE up.email = 'hmartinez@hlms.cl'
  AND cu.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';
