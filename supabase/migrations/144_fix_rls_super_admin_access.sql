-- ==============================================================================
-- MIGRACION 144: Corregir RLS para super_admin que no esta en company_users
-- ==============================================================================
-- Los super_admin ven todas las empresas pero NO tienen registro en company_users.
-- Las politicas RLS usan company_users, por lo que super_admin no puede hacer INSERT.
-- Solucion: usar una funcion SQL que tambien verifique si el usuario es super_admin
-- en user_profiles, y crear politicas que usen esa funcion.
-- ==============================================================================

-- Funcion auxiliar: verifica si el usuario tiene acceso a una empresa
-- Retorna true si:
-- 1. El usuario tiene registro en company_users con rol permitido, O
-- 2. El usuario es super_admin en user_profiles
CREATE OR REPLACE FUNCTION user_has_company_access(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin tiene acceso a todas las empresas
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
    RETURN TRUE;
  END IF;

  -- Verificar acceso via company_users
  IF EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = auth.uid()
      AND company_id = company_uuid
      AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Funcion auxiliar: verifica si el usuario puede gestionar (no solo ver) una empresa
-- Retorna true si:
-- 1. El usuario tiene rol de gestion en company_users, O
-- 2. El usuario es super_admin en user_profiles
CREATE OR REPLACE FUNCTION user_can_manage_company(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin puede gestionar todo
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
    RETURN TRUE;
  END IF;

  -- Verificar rol de gestion en company_users
  IF EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = auth.uid()
      AND company_id = company_uuid
      AND role IN ('owner', 'admin', 'super_admin', 'ejecutivo', 'rrhh')
      AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- Aplicar politicas RLS usando las funciones auxiliares
-- ==============================================================================

-- work_schedules
DROP POLICY IF EXISTS "Users can view work schedules in their company" ON work_schedules;
DROP POLICY IF EXISTS "Users can manage work schedules in their company" ON work_schedules;

CREATE POLICY "Users can view work schedules in their company" ON work_schedules
  FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can manage work schedules in their company" ON work_schedules
  FOR ALL USING (user_can_manage_company(company_id))
  WITH CHECK (user_can_manage_company(company_id));

-- attendance_records
DROP POLICY IF EXISTS "Users can view attendance in their company" ON attendance_records;
DROP POLICY IF EXISTS "Workers can view their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Workers can insert their own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Workers can update their own attendance for today" ON attendance_records;
DROP POLICY IF EXISTS "Admins can manage attendance in their company" ON attendance_records;
DROP POLICY IF EXISTS "Users can manage attendance in their company" ON attendance_records;

CREATE POLICY "Users can view attendance in their company" ON attendance_records
  FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Workers can insert their own attendance" ON attendance_records
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND user_has_company_access(company_id)
  );

CREATE POLICY "Workers can update their own attendance for today" ON attendance_records
  FOR UPDATE USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND date = CURRENT_DATE
  );

CREATE POLICY "Managers can manage attendance in their company" ON attendance_records
  FOR ALL USING (user_can_manage_company(company_id))
  WITH CHECK (user_can_manage_company(company_id));

-- attendance_corrections
DROP POLICY IF EXISTS "Users can view corrections in their company" ON attendance_corrections;
DROP POLICY IF EXISTS "Workers can create their own corrections" ON attendance_corrections;
DROP POLICY IF EXISTS "Admins can manage corrections in their company" ON attendance_corrections;
DROP POLICY IF EXISTS "Users can manage corrections in their company" ON attendance_corrections;

CREATE POLICY "Users can view corrections in their company" ON attendance_corrections
  FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Workers can create their own corrections" ON attendance_corrections
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND user_has_company_access(company_id)
  );

CREATE POLICY "Managers can manage corrections in their company" ON attendance_corrections
  FOR ALL USING (user_can_manage_company(company_id))
  WITH CHECK (user_can_manage_company(company_id));

-- attendance_monthly_summary
DROP POLICY IF EXISTS "Users can view monthly summary in their company" ON attendance_monthly_summary;
DROP POLICY IF EXISTS "Admins can manage monthly summary in their company" ON attendance_monthly_summary;
DROP POLICY IF EXISTS "Users can manage monthly summary in their company" ON attendance_monthly_summary;

CREATE POLICY "Users can view monthly summary in their company" ON attendance_monthly_summary
  FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Managers can manage monthly summary in their company" ON attendance_monthly_summary
  FOR ALL USING (user_can_manage_company(company_id))
  WITH CHECK (user_can_manage_company(company_id));