-- ============================================
-- BUSCAR USUARIO POR EMAIL EN TODA LA BASE DE DATOS
-- ============================================
-- Reemplaza 'EMAIL_A_BUSCAR' con el email que quieres buscar
-- Ejemplo: 'cristian.cofre@hlms.cl'
-- ============================================

-- Variable para buscar (CAMBIA ESTO)
\set email_buscar 'cristian.cofre@hlms.cl'

-- ============================================
-- 1. BUSCAR EN AUTH.USERS (Supabase Auth)
-- ============================================
SELECT 
  '🔍 1. AUTH.USERS' as tabla,
  id as user_id,
  email,
  created_at as fecha_creacion,
  confirmed_at as confirmado,
  email_confirmed_at,
  last_sign_in_at as ultimo_login,
  CASE 
    WHEN confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '⚠️  Sin confirmar'
  END as estado
FROM auth.users
WHERE email ILIKE '%cristian.cofre%'  -- Cambia aquí el email
ORDER BY created_at DESC;

-- ============================================
-- 2. BUSCAR EN USER_PROFILES
-- ============================================
SELECT 
  '🔍 2. USER_PROFILES' as tabla,
  id as profile_id,
  email,
  role as rol_sistema,
  full_name as nombre_completo,
  default_company_id,
  must_change_password,
  created_at as fecha_creacion,
  CASE 
    WHEN role = 'super_admin' THEN '👑 Super Admin'
    WHEN role = 'admin' THEN '🔧 Admin'
    WHEN role = 'user' THEN '👤 Usuario'
    ELSE '❓ ' || role
  END as tipo_usuario
FROM user_profiles
WHERE email ILIKE '%cristian.cofre%'  -- Cambia aquí el email
ORDER BY created_at DESC;

-- ============================================
-- 3. BUSCAR EN COMPANY_USERS (Asignaciones a Empresas)
-- ============================================
SELECT 
  '🔍 3. COMPANY_USERS' as tabla,
  cu.id as assignment_id,
  up.email,
  c.name as empresa,
  cu.role as rol_en_empresa,
  cu.status as estado,
  cu.joined_at as fecha_asignacion,
  CASE 
    WHEN cu.role = 'owner' THEN '👑 Propietario'
    WHEN cu.role = 'admin' THEN '🔧 Administrador'
    WHEN cu.role = 'ejecutivo' THEN '💼 Ejecutivo'
    WHEN cu.role = 'user' THEN '👤 Usuario'
    ELSE '❓ ' || cu.role
  END as tipo_rol
FROM company_users cu
JOIN user_profiles up ON up.id = cu.user_id
LEFT JOIN companies c ON c.id = cu.company_id
WHERE up.email ILIKE '%cristian.cofre%'  -- Cambia aquí el email
ORDER BY cu.created_at DESC;

-- ============================================
-- 4. BUSCAR EN EMPLOYEES (Trabajadores)
-- ============================================
SELECT 
  '🔍 4. EMPLOYEES' as tabla,
  e.id as employee_id,
  e.email,
  e.full_name as nombre_completo,
  e.rut,
  e.position as cargo,
  c.name as empresa,
  e.status as estado,
  e.user_id as vinculado_a_user,
  e.hire_date as fecha_contratacion,
  CASE 
    WHEN e.user_id IS NOT NULL THEN '✅ Tiene acceso al portal'
    ELSE '❌ Sin acceso al portal'
  END as tiene_usuario
FROM employees e
LEFT JOIN companies c ON c.id = e.company_id
WHERE e.email ILIKE '%cristian.cofre%'  -- Cambia aquí el email
ORDER BY e.created_at DESC;

-- ============================================
-- 5. RESUMEN COMPLETO
-- ============================================
SELECT 
  '📊 RESUMEN COMPLETO' as tipo,
  (SELECT COUNT(*) FROM auth.users WHERE email ILIKE '%cristian.cofre%') as en_auth_users,
  (SELECT COUNT(*) FROM user_profiles WHERE email ILIKE '%cristian.cofre%') as en_user_profiles,
  (SELECT COUNT(*) FROM company_users cu JOIN user_profiles up ON cu.user_id = up.id WHERE up.email ILIKE '%cristian.cofre%') as asignaciones_empresas,
  (SELECT COUNT(*) FROM employees WHERE email ILIKE '%cristian.cofre%') as como_empleado;

-- ============================================
-- 6. DATOS COMPLETOS (TODO EN UNA VISTA)
-- ============================================
SELECT 
  '📋 DATOS COMPLETOS' as resumen,
  au.id as auth_user_id,
  au.email,
  au.created_at as fecha_creacion_auth,
  au.confirmed_at as email_confirmado,
  up.id as profile_id,
  up.role as rol_sistema,
  up.full_name,
  up.default_company_id,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'empresa', c.name,
        'rol', cu.role,
        'estado', cu.status,
        'fecha_asignacion', cu.joined_at
      )
    )
    FROM company_users cu
    LEFT JOIN companies c ON c.id = cu.company_id
    WHERE cu.user_id = au.id),
    '[]'::json
  ) as empresas_asignadas,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'empresa', c.name,
        'cargo', e.position,
        'estado', e.status,
        'tiene_user_id', e.user_id IS NOT NULL
      )
    )
    FROM employees e
    LEFT JOIN companies c ON c.id = e.company_id
    WHERE e.email = au.email),
    '[]'::json
  ) as como_empleado
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE au.email ILIKE '%cristian.cofre%'  -- Cambia aquí el email
ORDER BY au.created_at DESC;

-- ============================================
-- 7. DIAGNÓSTICO Y RECOMENDACIONES
-- ============================================
DO $$
DECLARE
  v_email TEXT := 'cristian.cofre@hlms.cl';  -- Cambia aquí el email
  v_in_auth BOOLEAN;
  v_in_profiles BOOLEAN;
  v_company_count INTEGER;
  v_employee_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔍 DIAGNÓSTICO PARA: %', v_email;
  RAISE NOTICE '============================================';
  
  -- Verificar en auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email ILIKE v_email) INTO v_in_auth;
  IF v_in_auth THEN
    RAISE NOTICE '✅ Usuario EXISTE en auth.users';
  ELSE
    RAISE NOTICE '❌ Usuario NO existe en auth.users';
  END IF;
  
  -- Verificar en user_profiles
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE email ILIKE v_email) INTO v_in_profiles;
  IF v_in_profiles THEN
    RAISE NOTICE '✅ Usuario TIENE perfil en user_profiles';
  ELSE
    RAISE NOTICE '❌ Usuario NO tiene perfil en user_profiles';
  END IF;
  
  -- Contar asignaciones a empresas
  SELECT COUNT(*) INTO v_company_count
  FROM company_users cu
  JOIN user_profiles up ON cu.user_id = up.id
  WHERE up.email ILIKE v_email;
  
  IF v_company_count > 0 THEN
    RAISE NOTICE '✅ Usuario asignado a % empresa(s)', v_company_count;
  ELSE
    RAISE NOTICE '⚠️  Usuario NO está asignado a ninguna empresa';
  END IF;
  
  -- Contar registros como empleado
  SELECT COUNT(*) INTO v_employee_count
  FROM employees WHERE email ILIKE v_email;
  
  IF v_employee_count > 0 THEN
    RAISE NOTICE '✅ Usuario registrado como empleado (% veces)', v_employee_count;
  ELSE
    RAISE NOTICE '⚠️  Usuario NO está registrado como empleado';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 RECOMENDACIONES:';
  RAISE NOTICE '============================================';
  
  -- Recomendaciones basadas en el estado
  IF v_in_auth AND NOT v_in_profiles THEN
    RAISE NOTICE '👉 Usuario existe en auth pero sin perfil → Crear perfil';
  ELSIF v_in_auth AND v_in_profiles AND v_company_count = 0 THEN
    RAISE NOTICE '👉 Usuario tiene perfil pero sin empresas → Asignar a empresa';
  ELSIF NOT v_in_auth THEN
    RAISE NOTICE '👉 Usuario NO existe → Puede crear uno nuevo sin problemas';
    RAISE NOTICE '   (El error debe ser por otro motivo)';
  ELSIF v_in_auth AND v_in_profiles AND v_company_count > 0 THEN
    RAISE NOTICE '👉 Usuario completamente configurado → Solo asignar a empresa nueva si es necesario';
  END IF;
  
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- COMANDOS ÚTILES
-- ============================================
/*

-- Si el usuario existe pero sin perfil, crear perfil:
INSERT INTO user_profiles (id, email, role, full_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'cristian.cofre@hlms.cl'),
  'cristian.cofre@hlms.cl',
  'user',
  'Cristian Cofre'
)
ON CONFLICT (id) DO NOTHING;

-- Si el usuario existe pero sin empresa, asignar a empresa:
INSERT INTO company_users (user_id, company_id, role, status, joined_at)
VALUES (
  (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl'),
  'TU_COMPANY_ID_AQUI',  -- Cambia esto
  'ejecutivo',
  'active',
  NOW()
)
ON CONFLICT (user_id, company_id) DO UPDATE
SET role = 'ejecutivo', status = 'active';

-- Si necesitas eliminar el usuario completamente:
-- CUIDADO: Esto eliminará todo (auth, perfil, asignaciones)
DELETE FROM auth.users WHERE email = 'cristian.cofre@hlms.cl';
-- (Los demás registros se eliminarán por CASCADE)

*/
