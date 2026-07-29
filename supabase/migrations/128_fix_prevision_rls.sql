-- ==============================================================================
-- MIGRACION 128: Correccion de politicas RLS para tablas previsionales
-- Reforma Previsional 2026 - Fase 2
--
-- CORRECCIONES respecto a migracion 127:
-- 1. user_profiles usa columna "id" (no "user_id") como FK a auth.users(id)
-- 2. user_profiles.role usa 'super_admin', 'admin', 'executive' (no 'ejecutivo')
-- 3. Se usan funciones helper existentes (is_super_admin, user_belongs_to_company)
-- 4. Todas las politicas son idempotentes (DROP POLICY IF EXISTS antes de CREATE)
-- 5. No se modifican tablas, solo politicas RLS
-- ==============================================================================

-- Habilitar RLS en todas las tablas nuevas (reemplaza a migracion 127)
ALTER TABLE prevision_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevision_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_employer_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevision_audit ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- prevision_rates: Politicas RLS
-- ==============================================================================

-- Lectura: todos los usuarios autenticados (necesario para calculos de liquidacion)
DROP POLICY IF EXISTS "Authenticated users can read validated prevision_rates" ON prevision_rates;
CREATE POLICY "Authenticated users can read validated prevision_rates"
ON prevision_rates FOR SELECT
TO authenticated
USING (true);

-- Insercion: super_admin, admin o executive en user_profiles
DROP POLICY IF EXISTS "Only admins can insert prevision_rates" ON prevision_rates;
CREATE POLICY "Only admins can insert prevision_rates"
ON prevision_rates FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'executive')
  )
);

-- Actualizacion: super_admin, admin o executive en user_profiles
DROP POLICY IF EXISTS "Only admins can update prevision_rates" ON prevision_rates;
CREATE POLICY "Only admins can update prevision_rates"
ON prevision_rates FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'executive')
  )
)
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'executive')
  )
);

-- Eliminacion: solo super_admin
DROP POLICY IF EXISTS "Only super_admin can delete prevision_rates" ON prevision_rates;
CREATE POLICY "Only super_admin can delete prevision_rates"
ON prevision_rates FOR DELETE
TO authenticated
USING (is_super_admin());

-- ==============================================================================
-- prevision_limits: Politicas RLS
-- ==============================================================================

-- Lectura: todos los usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can read prevision_limits" ON prevision_limits;
CREATE POLICY "Authenticated users can read prevision_limits"
ON prevision_limits FOR SELECT
TO authenticated
USING (true);

-- Insercion: super_admin, admin o executive
DROP POLICY IF EXISTS "Only admins can insert prevision_limits" ON prevision_limits;
CREATE POLICY "Only admins can insert prevision_limits"
ON prevision_limits FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'executive')
  )
);

-- Actualizacion: super_admin, admin o executive
DROP POLICY IF EXISTS "Only admins can update prevision_limits" ON prevision_limits;
CREATE POLICY "Only admins can update prevision_limits"
ON prevision_limits FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'executive')
  )
)
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'executive')
  )
);

-- Eliminacion: solo super_admin
DROP POLICY IF EXISTS "Only super_admin can delete prevision_limits" ON prevision_limits;
CREATE POLICY "Only super_admin can delete prevision_limits"
ON prevision_limits FOR DELETE
TO authenticated
USING (is_super_admin());

-- ==============================================================================
-- payroll_employer_contributions: Politicas RLS
-- Acceso basado en compania a traves de payroll_slips -> employees -> company_users
-- ==============================================================================

-- Lectura: usuarios que pertenecen a la compania del empleado
DROP POLICY IF EXISTS "Users can read employer contributions of their companies" ON payroll_employer_contributions;
CREATE POLICY "Users can read employer contributions of their companies"
ON payroll_employer_contributions FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM payroll_slips ps
    INNER JOIN employees e ON e.id = ps.employee_id
    WHERE ps.id = payroll_employer_contributions.payroll_slip_id
    AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

-- Insercion: super_admin, admin o ejecutivo de la compania
DROP POLICY IF EXISTS "Only admins can insert employer contributions" ON payroll_employer_contributions;
CREATE POLICY "Only admins can insert employer contributions"
ON payroll_employer_contributions FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'executive')
  )
);

-- Actualizacion: super_admin, admin o ejecutivo de la compania
DROP POLICY IF EXISTS "Only admins can update employer contributions" ON payroll_employer_contributions;
CREATE POLICY "Only admins can update employer contributions"
ON payroll_employer_contributions FOR UPDATE
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM payroll_slips ps
    INNER JOIN employees e ON e.id = ps.employee_id
    WHERE ps.id = payroll_employer_contributions.payroll_slip_id
    AND user_belongs_to_company(auth.uid(), e.company_id)
  )
)
WITH CHECK (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'executive')
  )
);

-- Eliminacion: solo super_admin
DROP POLICY IF EXISTS "Only super_admin can delete employer contributions" ON payroll_employer_contributions;
CREATE POLICY "Only super_admin can delete employer contributions"
ON payroll_employer_contributions FOR DELETE
TO authenticated
USING (is_super_admin());

-- ==============================================================================
-- prevision_audit: Politicas RLS
-- Tabla de solo insercion (no UPDATE ni DELETE)
-- ==============================================================================

-- Lectura: super_admin, admin o executive
DROP POLICY IF EXISTS "Only admins can read prevision_audit" ON prevision_audit;
CREATE POLICY "Only admins can read prevision_audit"
ON prevision_audit FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'executive')
  )
);

-- Insercion: usuarios autenticados (el sistema registra auditorias automaticamente)
DROP POLICY IF EXISTS "Authenticated users can insert prevision_audit" ON prevision_audit;
CREATE POLICY "Authenticated users can insert prevision_audit"
ON prevision_audit FOR INSERT
TO authenticated
WITH CHECK (true);

-- No se crean politicas de UPDATE ni DELETE para proteger integridad del audit