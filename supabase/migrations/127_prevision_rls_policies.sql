-- ==============================================================================
-- MIGRACION 127: RLS policies para prevision_rates, prevision_limits,
--                payroll_employer_contributions y prevision_audit
-- Reforma Previsional 2026 - Fase 2
--
-- Politicas de Row Level Security para las nuevas tablas.
-- Solo administradores y ejecutivos pueden modificar tasas.
-- Todos los usuarios autenticados pueden leer tasas validadas.
-- ==============================================================================

-- Habilitar RLS en todas las tablas nuevas
ALTER TABLE prevision_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevision_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_employer_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevision_audit ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- prevision_rates: Politicas RLS
-- ==============================================================================

-- Todos los usuarios autenticados pueden leer tasas validadas
CREATE POLICY "Authenticated users can read validated prevision_rates"
ON prevision_rates FOR SELECT
TO authenticated
USING (true);

-- Solo admins pueden insertar tasas
CREATE POLICY "Only admins can insert prevision_rates"
ON prevision_rates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
);

-- Solo admins pueden actualizar tasas
CREATE POLICY "Only admins can update prevision_rates"
ON prevision_rates FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
);

-- Solo super_admin puede eliminar tasas (en casos excepcionales)
CREATE POLICY "Only super_admin can delete prevision_rates"
ON prevision_rates FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ==============================================================================
-- prevision_limits: Politicas RLS
-- ==============================================================================

-- Todos los usuarios autenticados pueden leer topes
CREATE POLICY "Authenticated users can read prevision_limits"
ON prevision_limits FOR SELECT
TO authenticated
USING (true);

-- Solo admins pueden insertar topes
CREATE POLICY "Only admins can insert prevision_limits"
ON prevision_limits FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
);

-- Solo admins pueden actualizar topes
CREATE POLICY "Only admins can update prevision_limits"
ON prevision_limits FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
);

-- Solo super_admin puede eliminar topes
CREATE POLICY "Only super_admin can delete prevision_limits"
ON prevision_limits FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ==============================================================================
-- payroll_employer_contributions: Politicas RLS
-- ==============================================================================

-- Los usuarios pueden leer aportes de sus companias
CREATE POLICY "Users can read employer contributions of their companies"
ON payroll_employer_contributions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM payroll_slips ps
    INNER JOIN employees e ON e.id = ps.employee_id
    WHERE ps.id = payroll_employer_contributions.payroll_slip_id
    AND e.company_id IN (
      SELECT c.id FROM companies c
      INNER JOIN company_users cu ON cu.company_id = c.id
      WHERE cu.user_id = auth.uid()
    )
  )
);

-- Solo admins/liquidadores pueden insertar aportes
CREATE POLICY "Only admins can insert employer contributions"
ON payroll_employer_contributions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
);

-- Solo admins pueden actualizar aportes
CREATE POLICY "Only admins can update employer contributions"
ON payroll_employer_contributions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
);

-- Solo super_admin puede eliminar aportes
CREATE POLICY "Only super_admin can delete employer contributions"
ON payroll_employer_contributions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ==============================================================================
-- prevision_audit: Politicas RLS
-- ==============================================================================

-- Solo admins pueden leer registros de auditoria
CREATE POLICY "Only admins can read prevision_audit"
ON prevision_audit FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'ejecutivo')
  )
);

-- El sistema puede insertar registros de auditoria (a traves de service_role)
-- Los usuarios autenticados tambien pueden insertar (para registrar calculos)
CREATE POLICY "Authenticated users can insert prevision_audit"
ON prevision_audit FOR INSERT
TO authenticated
WITH CHECK (true);

-- No se puede actualizar ni eliminar registros de auditoria
-- (No creamos policies de UPDATE ni DELETE para proteger la integridad del audit)