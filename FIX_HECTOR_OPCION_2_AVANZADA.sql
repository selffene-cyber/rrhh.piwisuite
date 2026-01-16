-- ============================================================
-- OPCIÓN 2: Crear Usuario usando Función de Supabase (AVANZADA)
-- ============================================================
-- ⚠️ ADVERTENCIA: Requiere permisos especiales en Supabase
-- ⚠️ Solo funciona si tienes la extensión supabase_admin habilitada
-- ============================================================

-- PASO 0: Verificar si tienes los permisos necesarios
-- Ejecuta esto primero para ver si puedes usar esta opción:
SELECT current_user, current_setting('is_superuser');

-- Si no eres superuser, usa la OPCIÓN 1 (crear desde el portal admin)
-- ============================================================

-- PASO 1: Crear el usuario en auth.users usando función de Supabase
-- Esta función solo existe si tienes permisos de superusuario
DO $$
DECLARE
  new_user_id uuid;
  temp_password text := 'Temporal2026!'; -- Contraseña temporal
BEGIN
  -- Intentar crear el usuario en auth
  -- NOTA: Esta función puede no estar disponible dependiendo de tu configuración
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'hmarti2104@gmail.com',
    crypt(temp_password, gen_salt('bf')), -- Encriptar contraseña
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Héctor Leandro Martínez Solar"}'::jsonb,
    false,
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Crear el perfil en user_profiles
  INSERT INTO public.user_profiles (
    id,
    email,
    role,
    full_name,
    default_company_id,
    preferred_language,
    must_change_password,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'hmarti2104@gmail.com',
    'user',
    'Héctor Leandro Martínez Solar',
    'be575ba9-e1f8-449c-a875-ff19607b1d11',
    'es',
    true,
    NOW(),
    NOW()
  );

  -- Actualizar el empleado
  UPDATE public.employees
  SET 
    user_id = new_user_id,
    updated_at = NOW()
  WHERE id = 'b8cf133a-a6a9-4edf-afec-17fdf4e3e4d9';

  RAISE NOTICE 'Usuario creado exitosamente con ID: %', new_user_id;
  RAISE NOTICE 'Contraseña temporal: %', temp_password;
END $$;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 
  e.full_name AS empleado,
  e.email AS email_empleado,
  up.email AS email_usuario,
  up.role AS rol_usuario,
  e.user_id,
  up.must_change_password
FROM employees e
LEFT JOIN user_profiles up ON e.user_id = up.id
WHERE e.id = 'b8cf133a-a6a9-4edf-afec-17fdf4e3e4d9';

-- ============================================================
-- SI ESTE SCRIPT FALLA CON ERROR DE PERMISOS
-- ============================================================
-- Usa la OPCIÓN 1: Crear el usuario desde el portal admin
-- Es más seguro y no requiere permisos especiales
-- ============================================================
