-- ============================================
-- MIGRACIÓN 110: Agregar rol 'ejecutivo' y arreglar RLS
-- ============================================
-- Fecha: 2026-02-05
-- Descripción: 
-- 1. Agrega el rol 'ejecutivo' a company_users
-- 2. Actualiza políticas RLS para user_permissions
-- 3. Crea función para evitar recursión en company_users
-- 4. Actualiza políticas RLS de company_users

-- ==================================================
-- PARTE 1: AGREGAR ROL 'EJECUTIVO' A COMPANY_USERS
-- ==================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '1️⃣ Agregando rol ejecutivo...';
  RAISE NOTICE '============================================';
END $$;

-- Limpiar datos: Convertir 'hr' a 'ejecutivo' si existe
UPDATE company_users
SET role = 'ejecutivo'
WHERE role = 'hr';

-- Convertir cualquier otro valor inválido a 'user'
UPDATE company_users
SET role = 'user'
WHERE role NOT IN ('owner', 'admin', 'ejecutivo', 'user');

-- Actualizar constraint para incluir 'ejecutivo'
ALTER TABLE company_users DROP CONSTRAINT IF EXISTS company_users_role_check;
ALTER TABLE company_users 
ADD CONSTRAINT company_users_role_check 
CHECK (role IN ('owner', 'admin', 'ejecutivo', 'user'));

-- Actualizar comentario
COMMENT ON COLUMN company_users.role IS 'Rol del usuario en la empresa: owner (propietario), admin (administrador), ejecutivo (recursos humanos), user (usuario)';

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_company_users_ejecutivo 
ON company_users(company_id, user_id) 
WHERE role = 'ejecutivo';

-- ==================================================
-- PARTE 2: FIX POLÍTICAS RLS DE USER_PERMISSIONS
-- ==================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '2️⃣ Actualizando RLS de user_permissions...';
  RAISE NOTICE '============================================';
END $$;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "users_can_view_own_permissions" ON user_permissions;
DROP POLICY IF EXISTS "users_can_view_permissions_in_their_companies" ON user_permissions;
DROP POLICY IF EXISTS "admins_can_view_all_permissions" ON user_permissions;
DROP POLICY IF EXISTS "admins_can_manage_permissions" ON user_permissions;
DROP POLICY IF EXISTS "company_admins_can_manage_permissions" ON user_permissions;
DROP POLICY IF EXISTS "super_admins_can_view_all_permissions" ON user_permissions;
DROP POLICY IF EXISTS "company_admins_can_view_permissions" ON user_permissions;
DROP POLICY IF EXISTS "super_admins_can_manage_permissions" ON user_permissions;

-- Habilitar RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Política: Super admins pueden ver todos los permisos
CREATE POLICY "super_admins_can_view_all_permissions"
  ON user_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Política: Usuarios pueden ver sus propios permisos
CREATE POLICY "users_can_view_own_permissions"
  ON user_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- Política: Admins/Owners/Ejecutivos de la empresa pueden ver permisos de su empresa
CREATE POLICY "company_admins_can_view_permissions"
  ON user_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = user_permissions.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

-- Política: Super admins pueden insertar/actualizar cualquier permiso
CREATE POLICY "super_admins_can_manage_permissions"
  ON user_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Política: Admins/Owners pueden gestionar permisos de su empresa
CREATE POLICY "company_admins_can_manage_permissions"
  ON user_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = user_permissions.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin')
      AND company_users.status = 'active'
    )
  );

-- ==================================================
-- PARTE 3: FIX RECURSIÓN EN COMPANY_USERS
-- ==================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '3️⃣ Creando función sin recursión...';
  RAISE NOTICE '============================================';
END $$;

-- Crear función auxiliar que consulta sin RLS
CREATE OR REPLACE FUNCTION user_is_company_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM company_users
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND role IN ('owner', 'admin', 'ejecutivo')
    AND status = 'active'
  );
$$;

-- Eliminar política recursiva si existe
DROP POLICY IF EXISTS "Admins see company users" ON company_users;
DROP POLICY IF EXISTS "Admins see company users v2" ON company_users;

-- Crear política correcta usando la función
CREATE POLICY "Admins see company users v2"
  ON company_users
  FOR SELECT
  USING (
    user_is_company_admin(company_id)
  );

-- ==================================================
-- VERIFICACIÓN FINAL
-- ==================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Migración 110 completada exitosamente';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Rol "ejecutivo" agregado';
  RAISE NOTICE '✅ Políticas RLS de user_permissions actualizadas';
  RAISE NOTICE '✅ Función sin recursión creada';
  RAISE NOTICE '✅ Política RLS de company_users arreglada';
  RAISE NOTICE '============================================';
END $$;
