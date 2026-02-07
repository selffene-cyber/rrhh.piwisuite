-- Migración 113: RLS para Reliquidaciones de Remuneraciones
-- Fecha: 2025-01-04
-- Descripción: Políticas de seguridad para reliquidaciones

-- Habilitar RLS
ALTER TABLE payroll_reliquidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_reliquidation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_reliquidation_deltas ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar acceso a empresa
CREATE OR REPLACE FUNCTION user_has_company_access(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND (
      up.role = 'super_admin'
      OR up.role = 'admin'
      OR EXISTS (
        SELECT 1
        FROM company_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_uuid
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para payroll_reliquidations

-- SELECT: Usuarios con acceso a la empresa pueden ver reliquidaciones
CREATE POLICY "Users can view reliquidations of their companies"
  ON payroll_reliquidations
  FOR SELECT
  USING (
    user_has_company_access(company_id)
  );

-- INSERT: Usuarios con acceso a la empresa pueden crear reliquidaciones
CREATE POLICY "Users can create reliquidations for their companies"
  ON payroll_reliquidations
  FOR INSERT
  WITH CHECK (
    user_has_company_access(company_id)
    AND created_by = auth.uid()
  );

-- UPDATE: Usuarios con acceso a la empresa pueden actualizar reliquidaciones
CREATE POLICY "Users can update reliquidations of their companies"
  ON payroll_reliquidations
  FOR UPDATE
  USING (
    user_has_company_access(company_id)
  )
  WITH CHECK (
    user_has_company_access(company_id)
  );

-- DELETE: Solo super_admin y admin pueden eliminar reliquidaciones emitidas
CREATE POLICY "Only admins can delete issued reliquidations"
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
    AND status IN ('draft', 'approved') -- Solo borradores o aprobadas, no emitidas/pagadas
  );

-- Políticas para payroll_reliquidation_items

-- SELECT: Usuarios pueden ver ítems de reliquidaciones de sus empresas
CREATE POLICY "Users can view reliquidation items of their companies"
  ON payroll_reliquidation_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM payroll_reliquidations pr
      WHERE pr.id = payroll_reliquidation_items.reliquidation_id
      AND user_has_company_access(pr.company_id)
    )
  );

-- INSERT: Usuarios pueden crear ítems de reliquidaciones de sus empresas
CREATE POLICY "Users can create reliquidation items for their companies"
  ON payroll_reliquidation_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM payroll_reliquidations pr
      WHERE pr.id = payroll_reliquidation_items.reliquidation_id
      AND user_has_company_access(pr.company_id)
    )
  );

-- UPDATE: Usuarios pueden actualizar ítems de reliquidaciones de sus empresas
CREATE POLICY "Users can update reliquidation items of their companies"
  ON payroll_reliquidation_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM payroll_reliquidations pr
      WHERE pr.id = payroll_reliquidation_items.reliquidation_id
      AND user_has_company_access(pr.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM payroll_reliquidations pr
      WHERE pr.id = payroll_reliquidation_items.reliquidation_id
      AND user_has_company_access(pr.company_id)
    )
  );

-- DELETE: Usuarios pueden eliminar ítems de reliquidaciones de sus empresas (solo borradores)
CREATE POLICY "Users can delete reliquidation items of draft reliquidations"
  ON payroll_reliquidation_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM payroll_reliquidations pr
      WHERE pr.id = payroll_reliquidation_items.reliquidation_id
      AND user_has_company_access(pr.company_id)
      AND pr.status = 'draft'
    )
  );

-- Políticas para payroll_reliquidation_deltas

-- SELECT: Usuarios pueden ver deltas de reliquidaciones de sus empresas
CREATE POLICY "Users can view reliquidation deltas of their companies"
  ON payroll_reliquidation_deltas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM payroll_reliquidations pr
      WHERE pr.id = payroll_reliquidation_deltas.reliquidation_id
      AND user_has_company_access(pr.company_id)
    )
  );

-- INSERT: Usuarios pueden crear deltas de reliquidaciones de sus empresas
CREATE POLICY "Users can create reliquidation deltas for their companies"
  ON payroll_reliquidation_deltas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM payroll_reliquidations pr
      WHERE pr.id = payroll_reliquidation_deltas.reliquidation_id
      AND user_has_company_access(pr.company_id)
    )
  );

-- UPDATE: Usuarios pueden actualizar deltas de reliquidaciones de sus empresas
CREATE POLICY "Users can update reliquidation deltas of their companies"
  ON payroll_reliquidation_deltas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM payroll_reliquidations pr
      WHERE pr.id = payroll_reliquidation_deltas.reliquidation_id
      AND user_has_company_access(pr.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM payroll_reliquidations pr
      WHERE pr.id = payroll_reliquidation_deltas.reliquidation_id
      AND user_has_company_access(pr.company_id)
    )
  );

-- DELETE: Solo admins pueden eliminar deltas
CREATE POLICY "Only admins can delete reliquidation deltas"
  ON payroll_reliquidation_deltas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
    )
  );

-- Política especial: Trabajadores pueden ver sus propias reliquidaciones
CREATE POLICY "Employees can view their own reliquidations"
  ON payroll_reliquidations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.id = payroll_reliquidations.employee_id
      AND e.user_id = auth.uid()
    )
  );
