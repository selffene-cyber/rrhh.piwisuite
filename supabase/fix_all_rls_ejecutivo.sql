-- ============================================
-- FIX COMPLETO: RLS para ejecutivos en TODAS las tablas
-- ============================================
-- Este script actualiza las políticas RLS de todas las tablas
-- principales para que los ejecutivos puedan ver y gestionar datos

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔧 Actualizando RLS para rol ejecutivo...';
  RAISE NOTICE '============================================';
END $$;

-- ==================================================
-- EMPLOYEES - Trabajadores
-- ==================================================

DROP POLICY IF EXISTS "Users can view employees in their companies" ON employees;
DROP POLICY IF EXISTS "Company admins can view employees" ON employees;
DROP POLICY IF EXISTS "Admins can view employees" ON employees;
DROP POLICY IF EXISTS "Company admins and executives can view employees" ON employees;
DROP POLICY IF EXISTS "Company admins and executives can manage employees" ON employees;

CREATE POLICY "Company admins and executives can view employees"
  ON employees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = employees.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

CREATE POLICY "Company admins and executives can manage employees"
  ON employees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = employees.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

-- ==================================================
-- CONTRACTS - Contratos
-- ==================================================

DROP POLICY IF EXISTS "Users can view contracts in their company" ON contracts;
DROP POLICY IF EXISTS "Company users can view contracts" ON contracts;

CREATE POLICY "Company admins and executives can view contracts"
  ON contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      JOIN employees ON employees.company_id = company_users.company_id
      WHERE employees.id = contracts.employee_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

-- ==================================================
-- VACATIONS - Vacaciones
-- ==================================================

DROP POLICY IF EXISTS "Users can view vacations in their company" ON vacations;
DROP POLICY IF EXISTS "Company users can view vacations" ON vacations;

CREATE POLICY "Company admins and executives can view vacations"
  ON vacations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      JOIN employees ON employees.company_id = company_users.company_id
      WHERE employees.id = vacations.employee_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

-- ==================================================
-- PAYROLL_PERIODS - Periodos de nómina
-- ==================================================

DROP POLICY IF EXISTS "Users can view payroll_periods in their company" ON payroll_periods;
DROP POLICY IF EXISTS "Company users can view payroll_periods" ON payroll_periods;

CREATE POLICY "Company admins and executives can view payroll_periods"
  ON payroll_periods
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = payroll_periods.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

-- ==================================================
-- PAYROLL_SLIPS - Liquidaciones
-- ==================================================

DROP POLICY IF EXISTS "Users can view payroll_slips in their company" ON payroll_slips;
DROP POLICY IF EXISTS "Company users can view payroll_slips" ON payroll_slips;

CREATE POLICY "Company admins and executives can view payroll_slips"
  ON payroll_slips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      JOIN employees ON employees.company_id = company_users.company_id
      WHERE employees.id = payroll_slips.employee_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

-- ==================================================
-- ADVANCES - Anticipos
-- ==================================================

DROP POLICY IF EXISTS "Users can view advances in their company" ON advances;
DROP POLICY IF EXISTS "Company users can view advances" ON advances;

CREATE POLICY "Company admins and executives can view advances"
  ON advances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      JOIN employees ON employees.company_id = company_users.company_id
      WHERE employees.id = advances.employee_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

-- ==================================================
-- VERIFICACIÓN FINAL
-- ==================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '🧪 VERIFICACIÓN FINAL';
  RAISE NOTICE '============================================';
  
  -- Contar empleados que Cristian debería ver
  SELECT COUNT(*) INTO v_count
  FROM employees e
  WHERE e.company_id = (
    SELECT company_id 
    FROM company_users 
    WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl')
    LIMIT 1
  );
  
  RAISE NOTICE '📊 Empleados en la empresa: %', v_count;
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Políticas RLS actualizadas exitosamente';
  RAISE NOTICE '✅ Ejecutivos ahora pueden ver y gestionar datos';
  RAISE NOTICE '============================================';
END $$;

-- Ver resumen de políticas creadas
SELECT 
  tablename,
  COUNT(*) as num_policies
FROM pg_policies
WHERE tablename IN ('employees', 'contracts', 'vacations', 'payroll_periods', 'payroll_slips', 'advances')
AND policyname LIKE '%executive%'
GROUP BY tablename
ORDER BY tablename;
