-- ============================================
-- FIX: Agregar rol 'ejecutivo' y recuperar usuarios huérfanos
-- ============================================
-- Ejecuta este script en tu consola SQL de Supabase
-- ============================================

-- PASO 1: Agregar rol 'ejecutivo' al CHECK constraint de company_users
-- ============================================
DO $$ 
BEGIN
  -- Eliminar constraint existente
  ALTER TABLE company_users DROP CONSTRAINT IF EXISTS company_users_role_check;
  
  -- Agregar nuevo constraint con 'ejecutivo'
  ALTER TABLE company_users 
  ADD CONSTRAINT company_users_role_check 
  CHECK (role IN ('owner', 'admin', 'ejecutivo', 'user'));
  
  RAISE NOTICE 'Constraint actualizado: ahora company_users acepta rol ejecutivo';
END $$;

-- PASO 2: Verificar usuarios en auth.users que no tienen perfil
-- ============================================
SELECT 
  'USUARIOS HUÉRFANOS (en auth.users pero sin user_profiles):' as tipo,
  au.id,
  au.email,
  au.created_at,
  au.confirmed_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ORDER BY au.created_at DESC;

-- PASO 3: Verificar específicamente cristian.cofre@hlms.cl
-- ============================================
SELECT 
  'ESTADO DE cristian.cofre@hlms.cl:' as verificacion,
  au.id as auth_user_id,
  au.email,
  au.confirmed_at,
  up.id as has_profile,
  up.role as profile_role,
  up.full_name,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'company_id', cu.company_id,
        'role', cu.role,
        'status', cu.status,
        'company_name', c.name
      )
    )
    FROM company_users cu
    LEFT JOIN companies c ON cu.company_id = c.id
    WHERE cu.user_id = au.id),
    '[]'::json
  ) as companies
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.email = 'cristian.cofre@hlms.cl';

-- PASO 4: Crear perfiles faltantes para usuarios huérfanos
-- ============================================
-- IMPORTANTE: Este INSERT solo creará perfiles si no existen
INSERT INTO user_profiles (id, email, role, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'user' as role, -- Rol por defecto
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Mostrar cuántos perfiles se crearon
SELECT 
  'Perfiles creados:' as resultado,
  COUNT(*) as cantidad
FROM user_profiles up
INNER JOIN auth.users au ON up.id = au.id
WHERE up.created_at > NOW() - INTERVAL '1 minute';

-- PASO 5: OPCIONAL - Actualizar políticas RLS para incluir 'ejecutivo'
-- ============================================
-- Las políticas que usan 'hr' ahora funcionarán con 'ejecutivo'
-- Si quieres mantener compatibilidad con 'hr', ejecuta:
COMMENT ON CONSTRAINT company_users_role_check ON company_users IS 
'Roles permitidos: owner (propietario), admin (administrador), ejecutivo (recursos humanos/hr), user (usuario)';

-- PASO 6: Verificar que todo está OK
-- ============================================
SELECT 
  'RESUMEN FINAL:' as tipo,
  'Usuarios en auth.users' as categoria,
  COUNT(*) as cantidad
FROM auth.users
UNION ALL
SELECT 
  'RESUMEN FINAL:' as tipo,
  'Usuarios con perfil' as categoria,
  COUNT(*) as cantidad
FROM user_profiles
UNION ALL
SELECT 
  'RESUMEN FINAL:' as tipo,
  'Usuarios SIN perfil' as categoria,
  COUNT(*) as cantidad
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- PASO 7: Mostrar todos los usuarios con su estado completo
-- ============================================
SELECT 
  au.email,
  up.role as perfil_rol,
  up.full_name,
  CASE 
    WHEN up.id IS NULL THEN '❌ SIN PERFIL'
    ELSE '✅ CON PERFIL'
  END as tiene_perfil,
  (SELECT COUNT(*) FROM company_users cu WHERE cu.user_id = au.id) as empresas_asignadas,
  au.created_at as fecha_creacion
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;

-- ============================================
-- INSTRUCCIONES PARA ASIGNAR USUARIOS A EMPRESAS
-- ============================================
-- Si después de ejecutar este script el usuario cristian.cofre@hlms.cl
-- ya tiene perfil pero no aparece en tu empresa, ejecuta:
--
-- INSERT INTO company_users (user_id, company_id, role, status, joined_at)
-- VALUES (
--   (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl'),
--   'TU_COMPANY_ID_AQUI',
--   'ejecutivo',  -- o el rol que desees
--   'active',
--   NOW()
-- )
-- ON CONFLICT (user_id, company_id) DO NOTHING;
--
-- Para obtener TU_COMPANY_ID, ejecuta:
-- SELECT id, name FROM companies;
