-- ============================================
-- MIGRACIÓN 005: Políticas RLS (Row Level Security)
-- ============================================
-- Políticas de seguridad para todas las tablas relevantes
-- ============================================

-- Habilitar RLS en todas las tablas necesarias
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA: companies
-- ============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Super admins see all companies" ON companies;
DROP POLICY IF EXISTS "Users see their companies" ON companies;
DROP POLICY IF EXISTS "Super admins manage all companies" ON companies;
DROP POLICY IF EXISTS "Owners manage their companies" ON companies;

-- SELECT: Super admin ve todas, usuarios ven solo sus empresas
CREATE POLICY "Super admins see all companies"
ON companies FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see their companies"
ON companies FOR SELECT
USING (user_belongs_to_company(auth.uid(), id));

-- INSERT: Solo super admin puede crear empresas
CREATE POLICY "Super admins create companies"
ON companies FOR INSERT
WITH CHECK (is_super_admin());

-- UPDATE: Super admin puede actualizar todas, owners solo las suyas
CREATE POLICY "Super admins update all companies"
ON companies FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Owners update their companies"
ON companies FOR UPDATE
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND role = 'owner'
      AND status = 'active'
  )
)
WITH CHECK (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND role = 'owner'
      AND status = 'active'
  )
);

-- DELETE: Solo super admin puede eliminar empresas
CREATE POLICY "Super admins delete companies"
ON companies FOR DELETE
USING (is_super_admin());

-- ============================================
-- POLÍTICAS PARA: company_users
-- ============================================

DROP POLICY IF EXISTS "Users see their company assignments" ON company_users;
DROP POLICY IF EXISTS "Super admins see all company_users" ON company_users;
DROP POLICY IF EXISTS "Super admins manage company_users" ON company_users;
DROP POLICY IF EXISTS "Owners manage company_users of their company" ON company_users;

-- SELECT: Usuarios ven sus propias asignaciones, super admin ve todas
CREATE POLICY "Users see their company assignments"
ON company_users FOR SELECT
USING (user_id = auth.uid() OR user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Super admins see all company_users"
ON company_users FOR SELECT
USING (is_super_admin());

-- INSERT: Super admin y owners pueden crear asignaciones
CREATE POLICY "Super admins insert company_users"
ON company_users FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Owners insert company_users"
ON company_users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = company_users.company_id
      AND cu.role = 'owner'
      AND cu.status = 'active'
  )
);

-- UPDATE: Super admin y owners pueden actualizar
CREATE POLICY "Super admins update company_users"
ON company_users FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Owners update company_users"
ON company_users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = company_users.company_id
      AND cu.role = 'owner'
      AND cu.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = company_users.company_id
      AND cu.role = 'owner'
      AND cu.status = 'active'
  )
);

-- DELETE: Super admin y owners pueden eliminar
CREATE POLICY "Super admins delete company_users"
ON company_users FOR DELETE
USING (is_super_admin());

CREATE POLICY "Owners delete company_users"
ON company_users FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = company_users.company_id
      AND cu.role = 'owner'
      AND cu.status = 'active'
  )
);

-- ============================================
-- POLÍTICAS PARA: employees
-- ============================================

DROP POLICY IF EXISTS "Super admins see all employees" ON employees;
DROP POLICY IF EXISTS "Users see employees of their companies" ON employees;
DROP POLICY IF EXISTS "Super admins manage all employees" ON employees;
DROP POLICY IF EXISTS "Users manage employees of their companies" ON employees;

-- SELECT: Super admin ve todos, usuarios ven solo de sus empresas
CREATE POLICY "Super admins see all employees"
ON employees FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see employees of their companies"
ON employees FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- INSERT: Super admin puede insertar en cualquier empresa, usuarios solo en sus empresas
CREATE POLICY "Super admins insert all employees"
ON employees FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Users insert employees in their companies"
ON employees FOR INSERT
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- UPDATE: Similar a INSERT
CREATE POLICY "Super admins update all employees"
ON employees FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users update employees of their companies"
ON employees FOR UPDATE
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- DELETE: Similar a UPDATE
CREATE POLICY "Super admins delete all employees"
ON employees FOR DELETE
USING (is_super_admin());

CREATE POLICY "Users delete employees of their companies"
ON employees FOR DELETE
USING (user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- POLÍTICAS PARA: payroll_periods
-- ============================================

DROP POLICY IF EXISTS "Super admins see all payroll_periods" ON payroll_periods;
DROP POLICY IF EXISTS "Users see payroll_periods of their companies" ON payroll_periods;
DROP POLICY IF EXISTS "Super admins manage all payroll_periods" ON payroll_periods;
DROP POLICY IF EXISTS "Users manage payroll_periods of their companies" ON payroll_periods;

CREATE POLICY "Super admins see all payroll_periods"
ON payroll_periods FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see payroll_periods of their companies"
ON payroll_periods FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Super admins manage all payroll_periods"
ON payroll_periods FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage payroll_periods of their companies"
ON payroll_periods FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- POLÍTICAS PARA: payroll_slips
-- ============================================

DROP POLICY IF EXISTS "Super admins see all payroll_slips" ON payroll_slips;
DROP POLICY IF EXISTS "Users see payroll_slips of their companies" ON payroll_slips;
DROP POLICY IF EXISTS "Super admins manage all payroll_slips" ON payroll_slips;
DROP POLICY IF EXISTS "Users manage payroll_slips of their companies" ON payroll_slips;

-- Para payroll_slips necesitamos verificar a través de employees
CREATE POLICY "Super admins see all payroll_slips"
ON payroll_slips FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see payroll_slips of their companies"
ON payroll_slips FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = payroll_slips.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

CREATE POLICY "Super admins manage all payroll_slips"
ON payroll_slips FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage payroll_slips of their companies"
ON payroll_slips FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = payroll_slips.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = payroll_slips.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

-- ============================================
-- POLÍTICAS PARA: payroll_items
-- ============================================

DROP POLICY IF EXISTS "Super admins see all payroll_items" ON payroll_items;
DROP POLICY IF EXISTS "Users see payroll_items of their companies" ON payroll_items;
DROP POLICY IF EXISTS "Super admins manage all payroll_items" ON payroll_items;
DROP POLICY IF EXISTS "Users manage payroll_items of their companies" ON payroll_items;

-- Para payroll_items necesitamos verificar a través de payroll_slips -> employees
CREATE POLICY "Super admins see all payroll_items"
ON payroll_items FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see payroll_items of their companies"
ON payroll_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM payroll_slips ps
    JOIN employees e ON e.id = ps.employee_id
    WHERE ps.id = payroll_items.payroll_slip_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

CREATE POLICY "Super admins manage all payroll_items"
ON payroll_items FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage payroll_items of their companies"
ON payroll_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM payroll_slips ps
    JOIN employees e ON e.id = ps.employee_id
    WHERE ps.id = payroll_items.payroll_slip_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM payroll_slips ps
    JOIN employees e ON e.id = ps.employee_id
    WHERE ps.id = payroll_items.payroll_slip_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

-- ============================================
-- POLÍTICAS PARA: contracts
-- ============================================

DROP POLICY IF EXISTS "Super admins see all contracts" ON contracts;
DROP POLICY IF EXISTS "Users see contracts of their companies" ON contracts;
DROP POLICY IF EXISTS "Super admins manage all contracts" ON contracts;
DROP POLICY IF EXISTS "Users manage contracts of their companies" ON contracts;

CREATE POLICY "Super admins see all contracts"
ON contracts FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see contracts of their companies"
ON contracts FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Super admins manage all contracts"
ON contracts FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage contracts of their companies"
ON contracts FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- POLÍTICAS PARA: advances
-- ============================================

DROP POLICY IF EXISTS "Super admins see all advances" ON advances;
DROP POLICY IF EXISTS "Users see advances of their companies" ON advances;
DROP POLICY IF EXISTS "Super admins manage all advances" ON advances;
DROP POLICY IF EXISTS "Users manage advances of their companies" ON advances;

CREATE POLICY "Super admins see all advances"
ON advances FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see advances of their companies"
ON advances FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Super admins manage all advances"
ON advances FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage advances of their companies"
ON advances FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- POLÍTICAS PARA: loans
-- ============================================

DROP POLICY IF EXISTS "Super admins see all loans" ON loans;
DROP POLICY IF EXISTS "Users see loans of their companies" ON loans;
DROP POLICY IF EXISTS "Super admins manage all loans" ON loans;
DROP POLICY IF EXISTS "Users manage loans of their companies" ON loans;

-- Para loans verificamos a través de employees
CREATE POLICY "Super admins see all loans"
ON loans FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see loans of their companies"
ON loans FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = loans.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

CREATE POLICY "Super admins manage all loans"
ON loans FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage loans of their companies"
ON loans FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = loans.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = loans.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

-- ============================================
-- POLÍTICAS PARA: vacations
-- ============================================

DROP POLICY IF EXISTS "Super admins see all vacations" ON vacations;
DROP POLICY IF EXISTS "Users see vacations of their companies" ON vacations;
DROP POLICY IF EXISTS "Super admins manage all vacations" ON vacations;
DROP POLICY IF EXISTS "Users manage vacations of their companies" ON vacations;

-- Para vacations verificamos a través de employees
CREATE POLICY "Super admins see all vacations"
ON vacations FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see vacations of their companies"
ON vacations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = vacations.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

CREATE POLICY "Super admins manage all vacations"
ON vacations FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage vacations of their companies"
ON vacations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = vacations.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = vacations.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

-- ============================================
-- POLÍTICAS PARA: medical_leaves
-- ============================================

DROP POLICY IF EXISTS "Super admins see all medical_leaves" ON medical_leaves;
DROP POLICY IF EXISTS "Users see medical_leaves of their companies" ON medical_leaves;
DROP POLICY IF EXISTS "Super admins manage all medical_leaves" ON medical_leaves;
DROP POLICY IF EXISTS "Users manage medical_leaves of their companies" ON medical_leaves;

-- Para medical_leaves verificamos a través de employees
CREATE POLICY "Super admins see all medical_leaves"
ON medical_leaves FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see medical_leaves of their companies"
ON medical_leaves FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = medical_leaves.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

CREATE POLICY "Super admins manage all medical_leaves"
ON medical_leaves FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage medical_leaves of their companies"
ON medical_leaves FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = medical_leaves.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = medical_leaves.employee_id
      AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

-- ============================================
-- POLÍTICAS PARA: alerts
-- ============================================

DROP POLICY IF EXISTS "Super admins see all alerts" ON alerts;
DROP POLICY IF EXISTS "Users see alerts of their companies" ON alerts;
DROP POLICY IF EXISTS "Super admins manage all alerts" ON alerts;
DROP POLICY IF EXISTS "Users manage alerts of their companies" ON alerts;

CREATE POLICY "Super admins see all alerts"
ON alerts FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see alerts of their companies"
ON alerts FOR SELECT
USING (company_id IS NULL OR user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Super admins manage all alerts"
ON alerts FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users manage alerts of their companies"
ON alerts FOR ALL
USING (company_id IS NULL OR user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (company_id IS NULL OR user_belongs_to_company(auth.uid(), company_id));

