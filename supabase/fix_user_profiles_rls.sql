-- Script para corregir problemas con user_profiles y RLS
-- Ejecuta este script si obtienes errores 500 al intentar acceder a user_profiles

-- Primero, verificar que la tabla existe y tiene la estructura correcta
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    CREATE TABLE user_profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
      full_name VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(email)
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
  END IF;
END $$;

-- Deshabilitar RLS temporalmente para diagnosticar
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON user_profiles;

-- Crear políticas más simples y permisivas para empezar
-- Política: Todos los usuarios autenticados pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Política: Todos los usuarios autenticados pueden ver todos los perfiles (temporal, para debugging)
-- Esto nos permitirá ver si el problema es con las políticas o con otra cosa
CREATE POLICY "Authenticated users can view all profiles"
  ON user_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Habilitar RLS nuevamente
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Verificar que los usuarios existentes tengan perfiles
-- Si no tienen perfiles, crearlos manualmente
INSERT INTO user_profiles (id, email, role, full_name)
SELECT 
  id,
  email,
  'user' as role,
  COALESCE(raw_user_meta_data->>'full_name', '') as full_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Asignar rol de super_admin al usuario principal
UPDATE user_profiles
SET role = 'super_admin'
WHERE email = 'jeans.selfene@outlook.com';

-- Verificar los perfiles creados
SELECT 
  id,
  email,
  role,
  full_name,
  created_at
FROM user_profiles
ORDER BY created_at DESC;


