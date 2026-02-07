-- ============================================
-- CREAR USUARIO: cristian.cofre@hlms.cl
-- EMPRESA: HLMS (be575ba9-e1f8-449c-a875-ff19607b1d11)
-- ROL: Ejecutivo
-- ============================================
-- ⚠️ EJECUTA TODO ESTE ARCHIVO EN SUPABASE SQL EDITOR
-- ============================================

-- PASO 1: Crear perfil en user_profiles
INSERT INTO "public"."user_profiles" (
  "id", 
  "email", 
  "role", 
  "full_name", 
  "created_at", 
  "updated_at", 
  "default_company_id", 
  "preferred_language", 
  "must_change_password", 
  "password_changed_at"
) 
VALUES (
  (SELECT id FROM auth.users WHERE email = 'cristian.cofre@hlms.cl'),
  'cristian.cofre@hlms.cl',
  'user',  -- Rol del sistema (user es el estándar)
  'Cristian Cofre',
  NOW(),
  NOW(),
  'be575ba9-e1f8-449c-a875-ff19607b1d11',  -- Empresa HLMS
  'es',
  'true',  -- Debe cambiar contraseña en primer login
  null
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  default_company_id = EXCLUDED.default_company_id,
  updated_at = NOW();

-- PASO 2: Asignar a empresa con rol EJECUTIVO
INSERT INTO "public"."company_users" (
  "user_id",
  "company_id",
  "role",
  "status",
  "invited_by",
  "invited_at",
  "joined_at",
  "created_at",
  "updated_at"
)
VALUES (
  (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl'),
  'be575ba9-e1f8-449c-a875-ff19607b1d11',  -- Empresa HLMS
  'ejecutivo',  -- 🎯 ROL EJECUTIVO
  'active',
  'ec53173d-740e-44a8-b0ab-1f2a154a52c9',  -- hmartinez@hlms.cl (quien invita)
  NOW(),
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (user_id, company_id) DO UPDATE
SET 
  role = 'ejecutivo',
  status = 'active',
  updated_at = NOW();

-- ============================================
-- VERIFICACIÓN: Ver resultado
-- ============================================
SELECT 
  '✅ USUARIO CREADO EXITOSAMENTE' as resultado,
  up.email,
  up.role as rol_sistema,
  up.full_name,
  c.name as empresa,
  cu.role as rol_en_empresa,
  cu.status as estado
FROM user_profiles up
JOIN company_users cu ON cu.user_id = up.id
JOIN companies c ON c.id = cu.company_id
WHERE up.email = 'cristian.cofre@hlms.cl';

-- ============================================
-- RESUMEN FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Usuario cristian.cofre@hlms.cl configurado:';
  RAISE NOTICE '   - Perfil creado en user_profiles';
  RAISE NOTICE '   - Asignado a empresa HLMS';
  RAISE NOTICE '   - Rol: EJECUTIVO';
  RAISE NOTICE '   - Estado: ACTIVO';
  RAISE NOTICE '   - Debe cambiar contraseña en primer login';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ahora puedes verlo en: /settings/usuarios-roles';
  RAISE NOTICE '============================================';
END $$;
