-- Habilitar RLS
ALTER TABLE riohs_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_actions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA: riohs_rules
-- ============================================

-- Super admins ven todas las reglas
CREATE POLICY "Super admins see all riohs_rules"
ON riohs_rules FOR SELECT
USING (is_super_admin());

-- Usuarios ven reglas de sus empresas
CREATE POLICY "Users see riohs_rules of their companies"
ON riohs_rules FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- Super admins gestionan todas las reglas
CREATE POLICY "Super admins manage all riohs_rules"
ON riohs_rules FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Usuarios gestionan reglas de sus empresas
CREATE POLICY "Users manage riohs_rules of their companies"
ON riohs_rules FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- POLÍTICAS PARA: disciplinary_actions
-- ============================================

-- Super admins ven todas las amonestaciones
CREATE POLICY "Super admins see all disciplinary_actions"
ON disciplinary_actions FOR SELECT
USING (is_super_admin());

-- Usuarios ven amonestaciones de sus empresas
CREATE POLICY "Users see disciplinary_actions of their companies"
ON disciplinary_actions FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- Super admins gestionan todas las amonestaciones
CREATE POLICY "Super admins manage all disciplinary_actions"
ON disciplinary_actions FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Usuarios pueden crear amonestaciones en sus empresas
CREATE POLICY "Users create disciplinary_actions in their companies"
ON disciplinary_actions FOR INSERT
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- Usuarios pueden actualizar amonestaciones en sus empresas
-- Nota: Las restricciones de estado se manejan a nivel de aplicación
CREATE POLICY "Users update disciplinary_actions in their companies"
ON disciplinary_actions FOR UPDATE
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- Usuarios pueden eliminar amonestaciones en sus empresas (solo si están en draft o void)
CREATE POLICY "Users delete disciplinary_actions in their companies"
ON disciplinary_actions FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id) AND
  status IN ('draft', 'void')
);

