-- ============================================
-- MIGRACIÓN 066: RLS Policies para Módulo de Cumplimientos
-- ============================================
-- Crea las políticas de Row Level Security para las tablas de cumplimientos
-- ============================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA: compliance_items
-- ============================================

-- SELECT: Super admin ve todos, usuarios ven solo de sus empresas
CREATE POLICY "Super admins see all compliance_items"
ON compliance_items FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see compliance_items of their companies"
ON compliance_items FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- INSERT: Super admin puede insertar en cualquier empresa, admins/owners en su empresa
CREATE POLICY "Super admins insert all compliance_items"
ON compliance_items FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Admins insert compliance_items in their companies"
ON compliance_items FOR INSERT
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- UPDATE: Similar a INSERT
CREATE POLICY "Super admins update all compliance_items"
ON compliance_items FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Admins update compliance_items of their companies"
ON compliance_items FOR UPDATE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- DELETE: Similar a UPDATE
CREATE POLICY "Super admins delete all compliance_items"
ON compliance_items FOR DELETE
USING (is_super_admin());

CREATE POLICY "Admins delete compliance_items of their companies"
ON compliance_items FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- ============================================
-- POLÍTICAS PARA: worker_compliance
-- ============================================

-- SELECT: Super admin ve todos, admins/owners ven todos de su empresa, usuarios ven solo los de trabajadores de sus CC, trabajadores ven solo los suyos
CREATE POLICY "Super admins see all worker_compliance"
ON worker_compliance FOR SELECT
USING (is_super_admin());

CREATE POLICY "Admins see worker_compliance of their companies"
ON worker_compliance FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- Usuarios ven cumplimientos de trabajadores de sus CC
CREATE POLICY "Users see worker_compliance of their cost centers"
ON worker_compliance FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = worker_compliance.employee_id
      AND e.company_id = worker_compliance.company_id
      AND (
        e.cost_center_id IS NULL AND is_company_admin(auth.uid(), company_id)
        OR (
          e.cost_center_id IS NOT NULL 
          AND user_has_cost_center_access(auth.uid(), company_id, e.cost_center_id)
        )
      )
  )
);

-- Trabajadores ven solo sus propios cumplimientos
CREATE POLICY "Employees see their own worker_compliance"
ON worker_compliance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = worker_compliance.employee_id
      AND e.user_id = auth.uid()
      AND e.company_id = worker_compliance.company_id
  )
);

-- INSERT: Super admin, admins/owners pueden insertar, trabajadores pueden insertar los suyos
CREATE POLICY "Super admins insert all worker_compliance"
ON worker_compliance FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Admins insert worker_compliance in their companies"
ON worker_compliance FOR INSERT
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

CREATE POLICY "Employees insert their own worker_compliance"
ON worker_compliance FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id
      AND e.user_id = auth.uid()
      AND e.company_id = company_id
  )
);

-- UPDATE: Similar a INSERT
CREATE POLICY "Super admins update all worker_compliance"
ON worker_compliance FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Admins update worker_compliance of their companies"
ON worker_compliance FOR UPDATE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

CREATE POLICY "Employees update their own worker_compliance"
ON worker_compliance FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id
      AND e.user_id = auth.uid()
      AND e.company_id = company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id
      AND e.user_id = auth.uid()
      AND e.company_id = company_id
  )
);

-- DELETE: Similar a UPDATE
CREATE POLICY "Super admins delete all worker_compliance"
ON worker_compliance FOR DELETE
USING (is_super_admin());

CREATE POLICY "Admins delete worker_compliance of their companies"
ON worker_compliance FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- ============================================
-- POLÍTICAS PARA: compliance_notifications
-- ============================================

-- SELECT: Super admin ve todas, usuarios ven solo de su empresa, trabajadores ven solo las suyas
CREATE POLICY "Super admins see all compliance_notifications"
ON compliance_notifications FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see compliance_notifications of their companies"
ON compliance_notifications FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Employees see their own compliance_notifications"
ON compliance_notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id
      AND e.user_id = auth.uid()
      AND e.company_id = company_id
  )
);

-- INSERT: Solo sistema (super admin) puede insertar notificaciones automáticas
CREATE POLICY "System insert compliance_notifications"
ON compliance_notifications FOR INSERT
WITH CHECK (is_super_admin());

-- UPDATE: Trabajadores pueden marcar como leída, admins pueden actualizar
CREATE POLICY "Employees update their own compliance_notifications"
ON compliance_notifications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id
      AND e.user_id = auth.uid()
      AND e.company_id = company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = employee_id
      AND e.user_id = auth.uid()
      AND e.company_id = company_id
  )
);

CREATE POLICY "Admins update compliance_notifications of their companies"
ON compliance_notifications FOR UPDATE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- DELETE: Solo admins pueden eliminar
CREATE POLICY "Admins delete compliance_notifications of their companies"
ON compliance_notifications FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- ============================================
-- POLÍTICAS PARA: compliance_assignments
-- ============================================

-- SELECT: Super admin ve todas, admins/owners ven solo de su empresa
CREATE POLICY "Super admins see all compliance_assignments"
ON compliance_assignments FOR SELECT
USING (is_super_admin());

CREATE POLICY "Admins see compliance_assignments of their companies"
ON compliance_assignments FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- INSERT: Solo admins/owners pueden crear asignaciones
CREATE POLICY "Super admins insert all compliance_assignments"
ON compliance_assignments FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Admins insert compliance_assignments in their companies"
ON compliance_assignments FOR INSERT
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- UPDATE: Similar a INSERT
CREATE POLICY "Super admins update all compliance_assignments"
ON compliance_assignments FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Admins update compliance_assignments of their companies"
ON compliance_assignments FOR UPDATE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

-- DELETE: Similar a UPDATE
CREATE POLICY "Super admins delete all compliance_assignments"
ON compliance_assignments FOR DELETE
USING (is_super_admin());

CREATE POLICY "Admins delete compliance_assignments of their companies"
ON compliance_assignments FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    is_company_admin(auth.uid(), company_id)
    OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = company_id
        AND cu.role IN ('owner', 'admin')
        AND cu.status = 'active'
    )
  )
);

