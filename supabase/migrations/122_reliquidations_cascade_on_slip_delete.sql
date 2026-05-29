-- Migración 122: Cambiar FK de reliquidaciones a ON DELETE CASCADE
-- Permite eliminar liquidaciones que tienen reliquidaciones asociadas
-- Sin esto, eliminar una liquidación falla por FK constraint

-- Eliminar FK existente
ALTER TABLE payroll_reliquidations
  DROP CONSTRAINT payroll_reliquidations_reference_payroll_slip_id_fkey;

-- Crear FK con CASCADE
ALTER TABLE payroll_reliquidations
  ADD CONSTRAINT payroll_reliquidations_reference_payroll_slip_id_fkey
  FOREIGN KEY (reference_payroll_slip_id)
  REFERENCES payroll_slips(id) ON DELETE CASCADE;

-- Actualizar política DELETE para permitir eliminar reliquidaciones emitidas/pagadas
-- cuando se elimina la liquidación original (cascada automática)
DROP POLICY IF EXISTS "Only admins can delete issued reliquidations" ON payroll_reliquidations;

CREATE POLICY "Admins can delete reliquidations of their companies"
  ON payroll_reliquidations
  FOR DELETE
  USING (
    user_has_company_access(company_id)
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  );