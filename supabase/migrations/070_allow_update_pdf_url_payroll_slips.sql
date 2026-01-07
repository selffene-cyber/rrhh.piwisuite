-- Permitir actualizar pdf_url en payroll_slips para usuarios de la empresa
-- Esta política permite actualizar solo el campo pdf_url (y otros campos permitidos)
-- cuando el usuario pertenece a la empresa del empleado de la liquidación

DROP POLICY IF EXISTS "Users can update pdf_url in payroll_slips" ON payroll_slips;

CREATE POLICY "Users can update pdf_url in payroll_slips"
ON payroll_slips FOR UPDATE
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

