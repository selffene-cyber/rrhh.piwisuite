-- Permitir que los empleados vean sus propios documentos
-- Esta migración agrega políticas RLS para que los trabajadores puedan ver sus propios:
-- - Pactos de horas extra
-- - Anticipos
-- - Liquidaciones de sueldo

-- Eliminar política si existe y crear nueva
DROP POLICY IF EXISTS "Employees can view their own overtime pacts" ON overtime_pacts;

-- Política para que empleados vean sus propios pactos
CREATE POLICY "Employees can view their own overtime pacts"
  ON overtime_pacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = overtime_pacts.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Eliminar política si existe y crear nueva
DROP POLICY IF EXISTS "Employees can view their own overtime entries" ON overtime_entries;

-- Política para que empleados vean sus propios registros de horas extra
CREATE POLICY "Employees can view their own overtime entries"
  ON overtime_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = overtime_entries.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Eliminar política si existe y crear nueva
DROP POLICY IF EXISTS "Employees can view their own advances" ON advances;

-- Política para que empleados vean sus propios anticipos
CREATE POLICY "Employees can view their own advances"
  ON advances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = advances.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Eliminar política si existe y crear nueva
DROP POLICY IF EXISTS "Employees can view their own payroll slips" ON payroll_slips;

-- Política para que empleados vean sus propias liquidaciones
CREATE POLICY "Employees can view their own payroll slips"
  ON payroll_slips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = payroll_slips.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Eliminar política si existe y crear nueva
DROP POLICY IF EXISTS "Employees can view their own contract annexes" ON contract_annexes;

-- Política para que empleados vean sus propios anexos de contratos
CREATE POLICY "Employees can view their own contract annexes"
  ON contract_annexes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = contract_annexes.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Eliminar política si existe y crear nueva
DROP POLICY IF EXISTS "Employees can view their own contracts" ON contracts;

-- Política para que empleados vean sus propios contratos
CREATE POLICY "Employees can view their own contracts"
  ON contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = contracts.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Eliminar política si existe y crear nueva
DROP POLICY IF EXISTS "Employees can view their own loans" ON loans;

-- Política para que empleados vean sus propios préstamos
CREATE POLICY "Employees can view their own loans"
  ON loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = loans.employee_id
      AND employees.user_id = auth.uid()
    )
  );

