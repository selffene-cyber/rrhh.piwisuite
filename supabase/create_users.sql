-- ============================================
-- SCRIPT DE CONFIGURACIÓN DE USUARIOS
-- ============================================
-- Este script crea la tabla user_profiles y las políticas RLS
-- 
-- IMPORTANTE: Los usuarios deben crearse primero desde el Dashboard de Supabase:
-- 1. Ve a Authentication > Users
-- 2. Click en "Add user" > "Create new user"
-- 3. Ingresa el email y password
-- 4. Marca "Auto Confirm User" para que no necesite verificar email
-- 5. Repite para cada usuario
--
-- Usuarios a crear manualmente:
-- 1. Super Usuario:
--    Email: jeans.selfene@outlook.com
--    Password: selfene1994AS#
--
-- 2. Usuario Normal:
--    Email: hmartinez@hlms.cl
--    Password: hlms2026
--
-- Después de crear los usuarios, ejecuta el script al final de este archivo
-- para asignar el rol de super_admin al usuario principal.
-- ============================================

-- Tabla para almacenar roles y metadata de usuarios
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email)
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
-- Eliminar trigger si existe antes de crearlo
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Función para crear perfil de usuario automáticamente cuando se crea un usuario en auth.users
-- Esto se ejecutará cuando Supabase Auth cree un nuevo usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'user', -- Rol por defecto
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING; -- Evitar error si el perfil ya existe
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS para user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para poder recrearlas)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON user_profiles;

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Política: Super admins pueden ver todos los perfiles
CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Política: Super admins pueden actualizar todos los perfiles
CREATE POLICY "Super admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Política: Super admins pueden insertar perfiles
CREATE POLICY "Super admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Política: Super admins pueden eliminar perfiles
CREATE POLICY "Super admins can delete profiles"
  ON user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================
-- DESPUÉS DE CREAR LOS USUARIOS MANUALMENTE,
-- EJECUTA ESTE SCRIPT PARA ASIGNAR ROLES:
-- ============================================

-- Asignar rol de super_admin al usuario principal
-- (Ejecuta esto DESPUÉS de crear el usuario jeans.selfene@outlook.com)
UPDATE user_profiles
SET role = 'super_admin'
WHERE email = 'jeans.selfene@outlook.com';

-- Verificar que los usuarios fueron creados correctamente
SELECT 
  id,
  email,
  role,
  full_name,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

