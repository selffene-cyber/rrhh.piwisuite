-- ============================================
-- MIGRACIÓN 030: Actualizar RLS de employees para Centros de Costo
-- ============================================
-- Actualizar políticas RLS para filtrar por CC (con excepción para admin)
-- ============================================

-- Función auxiliar para verificar si un usuario es admin de una empresa
CREATE OR REPLACE FUNCTION is_company_admin(
  p_user_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = p_user_id
      AND cu.company_id = p_company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar para verificar si un usuario tiene acceso a un CC
CREATE OR REPLACE FUNCTION user_has_cost_center_access(
  p_user_id UUID,
  p_company_id UUID,
  p_cost_center_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Si es admin, tiene acceso a todos los CC
  IF is_company_admin(p_user_id, p_company_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Si no es admin, verificar si tiene el CC asignado
  RETURN EXISTS (
    SELECT 1 FROM user_cost_centers ucc
    WHERE ucc.user_id = p_user_id
      AND ucc.company_id = p_company_id
      AND ucc.cost_center_id = p_cost_center_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar políticas existentes de employees
DROP POLICY IF EXISTS "Super admins see all employees" ON employees;
DROP POLICY IF EXISTS "Users see employees of their companies" ON employees;
DROP POLICY IF EXISTS "Super admins insert all employees" ON employees;
DROP POLICY IF EXISTS "Users insert employees in their companies" ON employees;
DROP POLICY IF EXISTS "Super admins update all employees" ON employees;
DROP POLICY IF EXISTS "Users update employees of their companies" ON employees;
DROP POLICY IF EXISTS "Super admins delete all employees" ON employees;
DROP POLICY IF EXISTS "Users delete employees of their companies" ON employees;
DROP POLICY IF EXISTS "Super admins manage all employees" ON employees;
DROP POLICY IF EXISTS "Users manage employees of their companies" ON employees;

-- SELECT: Super admin ve todos, admins ven todos de su empresa, usuarios solo de sus CC
CREATE POLICY "Super admins see all employees"
ON employees FOR SELECT
USING (is_super_admin());

CREATE POLICY "Admins see all employees of their companies"
ON employees FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

CREATE POLICY "Users see employees of their cost centers"
ON employees FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    -- Si el trabajador no tiene CC asignado, solo admins pueden verlo
    (cost_center_id IS NULL AND is_company_admin(auth.uid(), company_id))
    OR
    -- Si tiene CC, verificar acceso
    (cost_center_id IS NOT NULL AND user_has_cost_center_access(auth.uid(), company_id, cost_center_id))
  )
);

-- INSERT: Super admin puede insertar en cualquier empresa, admins en su empresa, usuarios solo en sus CC
CREATE POLICY "Super admins insert all employees"
ON employees FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Admins insert employees in their companies"
ON employees FOR INSERT
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

CREATE POLICY "Users insert employees in their cost centers"
ON employees FOR INSERT
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    -- Si no se asigna CC, solo admins pueden crear
    (cost_center_id IS NULL AND is_company_admin(auth.uid(), company_id))
    OR
    -- Si se asigna CC, verificar acceso
    (cost_center_id IS NOT NULL AND user_has_cost_center_access(auth.uid(), company_id, cost_center_id))
  )
);

-- UPDATE: Similar a INSERT
CREATE POLICY "Super admins update all employees"
ON employees FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Admins update employees of their companies"
ON employees FOR UPDATE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

CREATE POLICY "Users update employees of their cost centers"
ON employees FOR UPDATE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    (cost_center_id IS NULL AND is_company_admin(auth.uid(), company_id))
    OR
    (cost_center_id IS NOT NULL AND user_has_cost_center_access(auth.uid(), company_id, cost_center_id))
  )
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    -- Si se cambia el CC, verificar acceso al nuevo CC
    (cost_center_id IS NULL AND is_company_admin(auth.uid(), company_id))
    OR
    (cost_center_id IS NOT NULL AND user_has_cost_center_access(auth.uid(), company_id, cost_center_id))
  )
);

-- DELETE: Similar a UPDATE
CREATE POLICY "Super admins delete all employees"
ON employees FOR DELETE
USING (is_super_admin());

CREATE POLICY "Admins delete employees of their companies"
ON employees FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

CREATE POLICY "Users delete employees of their cost centers"
ON employees FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND (
    (cost_center_id IS NULL AND is_company_admin(auth.uid(), company_id))
    OR
    (cost_center_id IS NOT NULL AND user_has_cost_center_access(auth.uid(), company_id, cost_center_id))
  )
);





