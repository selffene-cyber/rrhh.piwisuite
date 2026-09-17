-- ==============================================================================
-- MIGRACION 143: Corregir RLS para work_schedules, attendance_records, etc.
-- ==============================================================================
-- Las politicas RLS usan role IN ('owner', 'admin') pero el sistema usa 'super_admin'
-- y otros roles que tambien necesitan acceso. Ademas, la politica FOR ALL necesita
-- WITH CHECK explicito para INSERT.
-- ==============================================================================

-- Eliminar politicas existentes de work_schedules
DROP POLICY IF EXISTS "Users can view work schedules in their company" ON work_schedules;
DROP POLICY IF EXISTS "Admins can manage work schedules in their company" ON work_schedules;

-- Crear politicas corregidas para work_schedules
CREATE POLICY "Users can view work schedules in their company" ON work_schedules
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage work schedules in their company" ON work_schedules
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin', 'ejecutivo', 'rrhh')
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin', 'ejecutivo', 'rrhh')
    )
  );

-- Eliminar y recrear politicas de attendance_records
DROP POLICY IF EXISTS "Admins can manage attendance in their company" ON attendance_records;

CREATE POLICY "Users can manage attendance in their company" ON attendance_records
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin', 'ejecutivo', 'rrhh')
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin', 'ejecutivo', 'rrhh')
    )
  );

-- Eliminar y recrear politicas de attendance_corrections
DROP POLICY IF EXISTS "Admins can manage corrections in their company" ON attendance_corrections;

CREATE POLICY "Users can manage corrections in their company" ON attendance_corrections
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin', 'ejecutivo', 'rrhh')
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin', 'ejecutivo', 'rrhh')
    )
  );

-- Eliminar y recrear politicas de attendance_monthly_summary
DROP POLICY IF EXISTS "Admins can manage monthly summary in their company" ON attendance_monthly_summary;

CREATE POLICY "Users can manage monthly summary in their company" ON attendance_monthly_summary
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin', 'ejecutivo', 'rrhh')
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin', 'ejecutivo', 'rrhh')
    )
  );