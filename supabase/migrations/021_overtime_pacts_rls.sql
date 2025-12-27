-- RLS Policies para overtime_pacts
ALTER TABLE overtime_pacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_entries ENABLE ROW LEVEL SECURITY;

-- Políticas para overtime_pacts
-- Los usuarios pueden ver los pactos de su empresa
CREATE POLICY "Users can view overtime pacts from their company"
  ON overtime_pacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_pacts.company_id
      AND company_users.user_id = auth.uid()
    )
  );

-- Solo HR/Admin pueden crear pactos
CREATE POLICY "HR can create overtime pacts"
  ON overtime_pacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_pacts.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('hr', 'admin', 'owner')
    )
  );

-- Solo HR/Admin pueden actualizar pactos
CREATE POLICY "HR can update overtime pacts"
  ON overtime_pacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_pacts.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('hr', 'admin', 'owner')
    )
  );

-- Solo HR/Admin pueden eliminar pactos (solo si están en draft o void)
CREATE POLICY "HR can delete overtime pacts"
  ON overtime_pacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_pacts.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('hr', 'admin', 'owner')
    )
    AND status IN ('draft', 'void')
  );

-- Políticas para overtime_entries
-- Los usuarios pueden ver los registros de horas extra de su empresa
CREATE POLICY "Users can view overtime entries from their company"
  ON overtime_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_entries.company_id
      AND company_users.user_id = auth.uid()
    )
  );

-- Solo HR/Admin pueden crear registros
CREATE POLICY "HR can create overtime entries"
  ON overtime_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_entries.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('hr', 'admin', 'owner')
    )
  );

-- Solo HR/Admin pueden actualizar registros
CREATE POLICY "HR can update overtime entries"
  ON overtime_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_entries.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('hr', 'admin', 'owner')
    )
  );

-- Solo HR/Admin pueden eliminar registros (solo si no están liquidados)
CREATE POLICY "HR can delete overtime entries"
  ON overtime_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_entries.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('hr', 'admin', 'owner')
    )
    AND linked_payroll_id IS NULL
  );

