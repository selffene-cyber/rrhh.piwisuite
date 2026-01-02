-- ============================================
-- MIGRACIÓN 026: Políticas RLS para Libro de Remuneraciones
-- ============================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE payroll_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_book_entries ENABLE ROW LEVEL SECURITY;

-- Políticas para payroll_books
-- Los usuarios solo pueden ver/gestionar libros de su empresa
CREATE POLICY "Users can view payroll books of their company"
  ON payroll_books
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create payroll books for their company"
  ON payroll_books
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can update payroll books of their company"
  ON payroll_books
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete payroll books of their company"
  ON payroll_books
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

-- Políticas para payroll_book_entries
CREATE POLICY "Users can view payroll book entries of their company"
  ON payroll_book_entries
  FOR SELECT
  USING (
    payroll_book_id IN (
      SELECT id FROM payroll_books
      WHERE company_id IN (
        SELECT company_id FROM company_users
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can create payroll book entries for their company"
  ON payroll_book_entries
  FOR INSERT
  WITH CHECK (
    payroll_book_id IN (
      SELECT id FROM payroll_books
      WHERE company_id IN (
        SELECT company_id FROM company_users
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Admins can update payroll book entries of their company"
  ON payroll_book_entries
  FOR UPDATE
  USING (
    payroll_book_id IN (
      SELECT id FROM payroll_books
      WHERE company_id IN (
        SELECT company_id FROM company_users
        WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Admins can delete payroll book entries of their company"
  ON payroll_book_entries
  FOR DELETE
  USING (
    payroll_book_id IN (
      SELECT id FROM payroll_books
      WHERE company_id IN (
        SELECT company_id FROM company_users
        WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('owner', 'admin')
      )
    )
  );

