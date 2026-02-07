-- ============================================
-- FIX: Políticas RLS para user_permissions
-- ============================================
-- Problema: Error 406 al intentar leer user_permissions
-- Solución: Crear/actualizar políticas RLS

-- 1️⃣ Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "users_can_view_own_permissions" ON user_permissions;
DROP POLICY IF EXISTS "users_can_view_permissions_in_their_companies" ON user_permissions;
DROP POLICY IF EXISTS "admins_can_view_all_permissions" ON user_permissions;
DROP POLICY IF EXISTS "admins_can_manage_permissions" ON user_permissions;
DROP POLICY IF EXISTS "company_admins_can_manage_permissions" ON user_permissions;

-- 2️⃣ Habilitar RLS en la tabla
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- 3️⃣ Política: Super admins pueden ver todos los permisos
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

-- 4️⃣ Política: Usuarios pueden ver sus propios permisos
CREATE POLICY "users_can_view_own_permissions"
  ON user_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- 5️⃣ Política: Admins/Owners de la empresa pueden ver permisos de su empresa
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

-- 6️⃣ Política: Super admins pueden insertar/actualizar cualquier permiso
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

-- 7️⃣ Política: Admins/Owners pueden gestionar permisos de su empresa
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

-- 8️⃣ Verificación
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Políticas RLS para user_permissions actualizadas';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Super admins: Ver y gestionar todos los permisos';
  RAISE NOTICE '✅ Usuarios: Ver sus propios permisos';
  RAISE NOTICE '✅ Admins/Owners/Ejecutivos: Ver permisos de su empresa';
  RAISE NOTICE '✅ Admins/Owners: Gestionar permisos de su empresa';
  RAISE NOTICE '============================================';
END $$;
