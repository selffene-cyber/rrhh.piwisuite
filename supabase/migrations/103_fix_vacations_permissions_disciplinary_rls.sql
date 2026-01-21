-- =====================================================
-- MIGRACIÓN 103: Corregir políticas RLS para vacaciones, permisos y amonestaciones
-- =====================================================
-- 
-- Esta migración actualiza las políticas RLS de las tablas:
-- - vacations
-- - permissions
-- - disciplinary_actions
-- 
-- Para permitir que usuarios con permisos granulares puedan crear documentos
-- =====================================================

-- ============================================
-- VACATIONS - Políticas RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view vacations from their companies" ON vacations;
DROP POLICY IF EXISTS "Users can insert vacations for their companies" ON vacations;
DROP POLICY IF EXISTS "Users can update vacations from their companies" ON vacations;
DROP POLICY IF EXISTS "Users can delete vacations from their companies" ON vacations;

-- SELECT
CREATE POLICY "Users can view vacations from their companies"
ON vacations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    WHERE e.id = vacations.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND cu.role IN ('owner', 'admin', 'executive')
  )
);

-- INSERT
CREATE POLICY "Users can insert vacations for their companies"
ON vacations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = vacations.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
      OR (cu.role = 'executive' AND up.can_create_vacations = true)
    )
  )
);

-- UPDATE
CREATE POLICY "Users can update vacations from their companies"
ON vacations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = vacations.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
      OR (cu.role = 'executive' AND up.can_approve_vacations = true)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = vacations.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
      OR (cu.role = 'executive' AND up.can_approve_vacations = true)
    )
  )
);

-- DELETE
CREATE POLICY "Users can delete vacations from their companies"
ON vacations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    WHERE e.id = vacations.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
    )
  )
);

-- ============================================
-- PERMISSIONS - Políticas RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view permissions from their companies" ON permissions;
DROP POLICY IF EXISTS "Users can insert permissions for their companies" ON permissions;
DROP POLICY IF EXISTS "Users can update permissions from their companies" ON permissions;
DROP POLICY IF EXISTS "Users can delete permissions from their companies" ON permissions;

-- SELECT
CREATE POLICY "Users can view permissions from their companies"
ON permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    WHERE e.id = permissions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND cu.role IN ('owner', 'admin', 'executive')
  )
);

-- INSERT
CREATE POLICY "Users can insert permissions for their companies"
ON permissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = permissions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
      OR (cu.role = 'executive' AND up.can_create_permissions = true)
    )
  )
);

-- UPDATE
CREATE POLICY "Users can update permissions from their companies"
ON permissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = permissions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
      OR (cu.role = 'executive' AND up.can_approve_permissions = true)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = permissions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
      OR (cu.role = 'executive' AND up.can_approve_permissions = true)
    )
  )
);

-- DELETE
CREATE POLICY "Users can delete permissions from their companies"
ON permissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    WHERE e.id = permissions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
    )
  )
);

-- ============================================
-- DISCIPLINARY_ACTIONS - Políticas RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view disciplinary actions from their companies" ON disciplinary_actions;
DROP POLICY IF EXISTS "Users can insert disciplinary actions for their companies" ON disciplinary_actions;
DROP POLICY IF EXISTS "Users can update disciplinary actions from their companies" ON disciplinary_actions;
DROP POLICY IF EXISTS "Users can delete disciplinary actions from their companies" ON disciplinary_actions;

-- SELECT
CREATE POLICY "Users can view disciplinary actions from their companies"
ON disciplinary_actions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    WHERE e.id = disciplinary_actions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND cu.role IN ('owner', 'admin', 'executive')
  )
);

-- INSERT
CREATE POLICY "Users can insert disciplinary actions for their companies"
ON disciplinary_actions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = disciplinary_actions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
      OR (cu.role = 'executive' AND up.can_create_disciplinary = true)
    )
  )
);

-- UPDATE
CREATE POLICY "Users can update disciplinary actions from their companies"
ON disciplinary_actions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = disciplinary_actions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
      OR (cu.role = 'executive' AND up.can_approve_disciplinary = true)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = disciplinary_actions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
      OR (cu.role = 'executive' AND up.can_approve_disciplinary = true)
    )
  )
);

-- DELETE
CREATE POLICY "Users can delete disciplinary actions from their companies"
ON disciplinary_actions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    WHERE e.id = disciplinary_actions.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR cu.role IN ('owner', 'admin')
    )
  )
);

-- ============================================
-- FINALIZACIÓN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración 103 completada exitosamente';
  RAISE NOTICE '📋 Políticas RLS actualizadas para:';
  RAISE NOTICE '  - vacations: Executive con can_create_vacations puede crear';
  RAISE NOTICE '  - permissions: Executive con can_create_permissions puede crear';
  RAISE NOTICE '  - disciplinary_actions: Executive con can_create_disciplinary puede crear';
  RAISE NOTICE '  - UPDATE requiere can_approve_* correspondiente';
  RAISE NOTICE '  - DELETE solo Admin/Owner/Super Admin';
END $$;
