-- ============================================
-- MIGRACIÓN 029: Políticas RLS para Centros de Costos
-- ============================================
-- Políticas de seguridad para cost_centers y user_cost_centers
-- ============================================

-- Habilitar RLS
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cost_centers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA: cost_centers
-- ============================================

DROP POLICY IF EXISTS "Super admins see all cost_centers" ON cost_centers;
DROP POLICY IF EXISTS "Users see cost_centers of their companies" ON cost_centers;
DROP POLICY IF EXISTS "Super admins manage all cost_centers" ON cost_centers;
DROP POLICY IF EXISTS "Admins manage cost_centers of their companies" ON cost_centers;
DROP POLICY IF EXISTS "Users see assigned cost_centers" ON cost_centers;

-- SELECT: Super admin ve todos, usuarios ven solo de sus empresas
CREATE POLICY "Super admins see all cost_centers"
ON cost_centers FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see cost_centers of their companies"
ON cost_centers FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- INSERT: Solo super admin y admins pueden crear
CREATE POLICY "Super admins create cost_centers"
ON cost_centers FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Admins create cost_centers"
ON cost_centers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

-- UPDATE: Solo super admin y admins pueden actualizar
CREATE POLICY "Super admins update cost_centers"
ON cost_centers FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Admins update cost_centers"
ON cost_centers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

-- DELETE: Solo super admin y admins pueden eliminar
CREATE POLICY "Super admins delete cost_centers"
ON cost_centers FOR DELETE
USING (is_super_admin());

CREATE POLICY "Admins delete cost_centers"
ON cost_centers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

-- ============================================
-- POLÍTICAS PARA: user_cost_centers
-- ============================================

DROP POLICY IF EXISTS "Super admins see all user_cost_centers" ON user_cost_centers;
DROP POLICY IF EXISTS "Users see their own user_cost_centers" ON user_cost_centers;
DROP POLICY IF EXISTS "Admins see user_cost_centers of their companies" ON user_cost_centers;
DROP POLICY IF EXISTS "Super admins manage all user_cost_centers" ON user_cost_centers;
DROP POLICY IF EXISTS "Admins manage user_cost_centers of their companies" ON user_cost_centers;

-- SELECT: Super admin ve todos, admins ven de su empresa, usuarios ven los suyos
CREATE POLICY "Super admins see all user_cost_centers"
ON user_cost_centers FOR SELECT
USING (is_super_admin());

CREATE POLICY "Admins see user_cost_centers of their companies"
ON user_cost_centers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = user_cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

CREATE POLICY "Users see their own user_cost_centers"
ON user_cost_centers FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Solo super admin y admins pueden asignar
CREATE POLICY "Super admins create user_cost_centers"
ON user_cost_centers FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Admins create user_cost_centers"
ON user_cost_centers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = user_cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

-- UPDATE: Similar a INSERT
CREATE POLICY "Super admins update user_cost_centers"
ON user_cost_centers FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Admins update user_cost_centers"
ON user_cost_centers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = user_cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = user_cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

-- DELETE: Similar a UPDATE
CREATE POLICY "Super admins delete user_cost_centers"
ON user_cost_centers FOR DELETE
USING (is_super_admin());

CREATE POLICY "Admins delete user_cost_centers"
ON user_cost_centers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = user_cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

