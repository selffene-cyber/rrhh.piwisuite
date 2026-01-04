-- Habilitar RLS
ALTER TABLE permission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA: permission_types
-- ============================================

-- Todos pueden leer los tipos de permisos (catálogo público)
CREATE POLICY "Anyone can read permission_types"
ON permission_types FOR SELECT
USING (true);

-- Solo super admins pueden gestionar tipos
CREATE POLICY "Super admins manage permission_types"
ON permission_types FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ============================================
-- POLÍTICAS PARA: permissions
-- ============================================

-- Super admins ven todos los permisos
CREATE POLICY "Super admins see all permissions"
ON permissions FOR SELECT
USING (is_super_admin());

-- Usuarios ven permisos de sus empresas
CREATE POLICY "Users see permissions of their companies"
ON permissions FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- Super admins gestionan todos los permisos
CREATE POLICY "Super admins manage all permissions"
ON permissions FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Usuarios pueden crear permisos en sus empresas
CREATE POLICY "Users create permissions in their companies"
ON permissions FOR INSERT
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- Usuarios pueden actualizar permisos en sus empresas
-- Nota: Las restricciones de estado se manejan a nivel de aplicación
CREATE POLICY "Users update permissions in their companies"
ON permissions FOR UPDATE
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- Usuarios pueden eliminar permisos en sus empresas (solo si están en draft o void)
CREATE POLICY "Users delete permissions in their companies"
ON permissions FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id) AND
  status IN ('draft', 'void')
);

