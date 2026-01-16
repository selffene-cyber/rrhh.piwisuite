-- =====================================================
-- MIGRACIÓN 102: Corregir políticas RLS para certificados
-- =====================================================
-- 
-- Esta migración actualiza las políticas RLS de la tabla certificates
-- para permitir que usuarios con permisos granulares puedan crear certificados
-- =====================================================

-- ============================================
-- PASO 1: Eliminar políticas existentes
-- ============================================

DROP POLICY IF EXISTS "Users can view certificates from their companies" ON certificates;
DROP POLICY IF EXISTS "Users can insert certificates for their companies" ON certificates;
DROP POLICY IF EXISTS "Users can update certificates from their companies" ON certificates;
DROP POLICY IF EXISTS "Users can delete certificates from their companies" ON certificates;

-- ============================================
-- PASO 2: Crear política SELECT mejorada
-- ============================================

CREATE POLICY "Users can view certificates from their companies"
ON certificates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    WHERE e.id = certificates.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND cu.role IN ('owner', 'admin', 'executive')
  )
);

-- ============================================
-- PASO 3: Crear política INSERT mejorada
-- ============================================

CREATE POLICY "Users can insert certificates for their companies"
ON certificates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = certificates.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      -- Super admins pueden crear
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR
      -- Admin/Owner pueden crear
      cu.role IN ('owner', 'admin')
      OR
      -- Executive con permiso puede crear
      (cu.role = 'executive' AND up.can_create_certificates = true)
    )
  )
);

-- ============================================
-- PASO 4: Crear política UPDATE mejorada
-- ============================================

CREATE POLICY "Users can update certificates from their companies"
ON certificates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = certificates.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      -- Super admins pueden actualizar
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR
      -- Admin/Owner pueden actualizar
      cu.role IN ('owner', 'admin')
      OR
      -- Executive con permiso puede actualizar (aprobar/firmar)
      (cu.role = 'executive' AND up.can_approve_certificates = true)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    LEFT JOIN user_permissions up ON up.user_id = cu.user_id AND up.company_id = cu.company_id
    WHERE e.id = certificates.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR
      cu.role IN ('owner', 'admin')
      OR
      (cu.role = 'executive' AND up.can_approve_certificates = true)
    )
  )
);

-- ============================================
-- PASO 5: Crear política DELETE mejorada
-- ============================================

CREATE POLICY "Users can delete certificates from their companies"
ON certificates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees e
    INNER JOIN company_users cu ON cu.company_id = e.company_id
    WHERE e.id = certificates.employee_id
    AND cu.user_id = auth.uid()
    AND cu.status = 'active'
    AND (
      -- Solo super admins, admin y owner pueden eliminar
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
      OR
      cu.role IN ('owner', 'admin')
    )
  )
);

-- ============================================
-- FINALIZACIÓN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración 102 completada exitosamente';
  RAISE NOTICE '📋 Políticas RLS de certificates actualizadas:';
  RAISE NOTICE '  - SELECT: Admin/Owner/Executive pueden ver';
  RAISE NOTICE '  - INSERT: Admin/Owner + Executive con can_create_certificates';
  RAISE NOTICE '  - UPDATE: Admin/Owner + Executive con can_approve_certificates';
  RAISE NOTICE '  - DELETE: Solo Admin/Owner/Super Admin';
END $$;
