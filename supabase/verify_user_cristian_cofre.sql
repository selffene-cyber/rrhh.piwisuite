-- ============================================
-- VERIFICAR Y RECUPERAR: cristian.cofre@hlms.cl
-- ============================================
-- Este script verifica el estado completo del usuario
-- y proporciona comandos para recuperarlo si es necesario
-- ============================================

-- PASO 1: Verificar existencia en auth.users
SELECT 
  '1️⃣ VERIFICAR EN AUTH.USERS:' as paso,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Usuario EXISTE en auth.users'
    ELSE '❌ Usuario NO EXISTE en auth.users'
  END as resultado,
  STRING_AGG(id::text, ', ') as user_ids,
  STRING_AGG(email, ', ') as emails,
  STRING_AGG(confirmed_at::text, ', ') as confirmaciones
FROM auth.users
WHERE email = 'cristian.cofre@hlms.cl';

-- PASO 2: Verificar existencia en user_profiles
SELECT 
  '2️⃣ VERIFICAR EN USER_PROFILES:' as paso,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Usuario TIENE perfil'
    ELSE '❌ Usuario NO TIENE perfil'
  END as resultado,
  STRING_AGG(id::text, ', ') as profile_ids,
  STRING_AGG(role, ', ') as roles,
  STRING_AGG(full_name, ', ') as nombres
FROM user_profiles
WHERE email = 'cristian.cofre@hlms.cl';

-- PASO 3: Verificar asignaciones a empresas
SELECT 
  '3️⃣ VERIFICAR ASIGNACIONES A EMPRESAS:' as paso,
  COALESCE(COUNT(*)::text, '0') as total_empresas,
  STRING_AGG(DISTINCT c.name, ', ') as empresas,
  STRING_AGG(DISTINCT cu.role, ', ') as roles_en_empresas
FROM user_profiles up
LEFT JOIN company_users cu ON cu.user_id = up.id
LEFT JOIN companies c ON c.id = cu.company_id
WHERE up.email = 'cristian.cofre@hlms.cl';

-- PASO 4: Obtener el ID del usuario para uso posterior
\set user_email 'cristian.cofre@hlms.cl'
SELECT 
  '4️⃣ DATOS COMPLETOS DEL USUARIO:' as paso,
  au.id as auth_user_id,
  au.email,
  au.created_at as fecha_creacion_auth,
  au.confirmed_at,
  au.email_confirmed_at,
  up.id as profile_id,
  up.role as perfil_rol,
  up.full_name,
  up.created_at as fecha_creacion_profile
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE au.email = 'cristian.cofre@hlms.cl';

-- PASO 5: Listar TODAS las empresas disponibles
SELECT 
  '5️⃣ EMPRESAS DISPONIBLES EN EL SISTEMA:' as info,
  id as company_id,
  name as empresa,
  rut,
  owner_id,
  status
FROM companies
ORDER BY created_at DESC;

-- ============================================
-- SOLUCIONES SEGÚN EL PROBLEMA
-- ============================================

-- SOLUCIÓN A: Si el usuario NO existe en user_profiles, crear el perfil
-- ============================================
DO $$
DECLARE
  v_auth_user_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  -- Obtener ID del usuario en auth.users
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'cristian.cofre@hlms.cl';

  IF v_auth_user_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: Usuario NO existe en auth.users. Debe ser creado primero.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Usuario encontrado en auth.users: %', v_auth_user_id;

  -- Verificar si tiene perfil
  SELECT EXISTS(
    SELECT 1 FROM user_profiles WHERE id = v_auth_user_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE NOTICE '⚠️  Usuario NO tiene perfil. Creando...';
    
    INSERT INTO user_profiles (id, email, role, full_name, created_at, updated_at)
    VALUES (
      v_auth_user_id,
      'cristian.cofre@hlms.cl',
      'user', -- Rol por defecto
      'Cristian Cofre', -- Ajusta el nombre si es necesario
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Perfil creado exitosamente';
  ELSE
    RAISE NOTICE '✅ Usuario YA tiene perfil';
  END IF;
END $$;

-- SOLUCIÓN B: Asignar usuario a tu empresa (AJUSTA EL COMPANY_ID)
-- ============================================
-- INSTRUCCIONES:
-- 1. Ejecuta la consulta del PASO 5 para ver tu company_id
-- 2. Reemplaza 'TU_COMPANY_ID_AQUI' con el ID real de tu empresa
-- 3. Ejecuta este bloque

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID := 'TU_COMPANY_ID_AQUI'::UUID; -- ⚠️ CAMBIA ESTO
  v_assignment_exists BOOLEAN;
BEGIN
  -- Obtener ID del usuario
  SELECT id INTO v_user_id
  FROM user_profiles
  WHERE email = 'cristian.cofre@hlms.cl';

  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: Usuario no tiene perfil. Ejecuta primero la SOLUCIÓN A.';
    RETURN;
  END IF;

  -- Verificar si ya está asignado
  SELECT EXISTS(
    SELECT 1 FROM company_users 
    WHERE user_id = v_user_id AND company_id = v_company_id
  ) INTO v_assignment_exists;

  IF v_assignment_exists THEN
    RAISE NOTICE '✅ Usuario YA está asignado a esta empresa';
  ELSE
    RAISE NOTICE '⚠️  Asignando usuario a la empresa...';
    
    INSERT INTO company_users (user_id, company_id, role, status, joined_at, created_at, updated_at)
    VALUES (
      v_user_id,
      v_company_id,
      'ejecutivo', -- Cambia el rol si deseas: 'owner', 'admin', 'ejecutivo', 'user'
      'active',
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Usuario asignado exitosamente como EJECUTIVO';
  END IF;
END $$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT 
  '✅ VERIFICACIÓN FINAL:' as resultado,
  au.email,
  up.role as perfil_sistema,
  up.full_name,
  COALESCE(json_agg(
    json_build_object(
      'empresa', c.name,
      'rol', cu.role,
      'estado', cu.status
    ) ORDER BY c.name
  ) FILTER (WHERE c.name IS NOT NULL), '[]'::json) as empresas_asignadas
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN company_users cu ON cu.user_id = up.id
LEFT JOIN companies c ON c.id = cu.company_id
WHERE au.email = 'cristian.cofre@hlms.cl'
GROUP BY au.email, up.role, up.full_name;

-- ============================================
-- COMANDOS RÁPIDOS PARA COPIAR Y PEGAR
-- ============================================
/*

-- Ver todas las empresas:
SELECT id, name, rut FROM companies;

-- Asignar cristian.cofre@hlms.cl a una empresa específica:
INSERT INTO company_users (user_id, company_id, role, status, joined_at)
VALUES (
  (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl'),
  'PEGA_AQUI_EL_COMPANY_ID',
  'ejecutivo',
  'active',
  NOW()
)
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = 'ejecutivo', status = 'active', updated_at = NOW();

-- Verificar que todo está OK:
SELECT 
  up.email,
  up.full_name,
  c.name as empresa,
  cu.role,
  cu.status
FROM user_profiles up
JOIN company_users cu ON cu.user_id = up.id
JOIN companies c ON c.id = cu.company_id
WHERE up.email = 'cristian.cofre@hlms.cl';

*/
