-- ============================================
-- MIGRACIÓN 083: Corrección final de acceso para owners/admins
-- ============================================
-- Esta migración asegura que owners/admins puedan acceder a:
-- - Trabajadores (employees)
-- - Centros de costo (cost_centers)
-- - Departamentos (departments)
-- ============================================

-- ============================================
-- PASO 1: Asegurar políticas RLS de company_users
-- ============================================
-- CRÍTICO: Los usuarios deben poder ver sus propias asignaciones para que isCompanyAdmin funcione

DROP POLICY IF EXISTS "Users see their company assignments" ON company_users;
CREATE POLICY "Users see their company assignments"
ON company_users FOR SELECT
USING (user_id = auth.uid());

-- ============================================
-- PASO 2: Simplificar políticas RLS de employees
-- ============================================

DROP POLICY IF EXISTS "Users see employees of their cost centers" ON employees;

-- Recrear política más permisiva para admins
DROP POLICY IF EXISTS "Admins see all employees of their companies" ON employees;
CREATE POLICY "Admins see all employees of their companies"
ON employees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = employees.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

-- Política para usuarios regulares (solo si no son admin)
CREATE POLICY "Users see employees of their cost centers"
ON employees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = employees.company_id
      AND cu.status = 'active'
      AND cu.role NOT IN ('owner', 'admin')
  )
  AND (
    cost_center_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM user_cost_centers ucc
      WHERE ucc.user_id = auth.uid()
        AND ucc.company_id = employees.company_id
        AND ucc.cost_center_id = employees.cost_center_id
    )
  )
);

-- ============================================
-- PASO 3: Simplificar políticas RLS de cost_centers
-- ============================================

DROP POLICY IF EXISTS "Admins see cost_centers of their companies" ON cost_centers;
CREATE POLICY "Admins see cost_centers of their companies"
ON cost_centers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins insert cost_centers in their companies" ON cost_centers;
CREATE POLICY "Admins insert cost_centers in their companies"
ON cost_centers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins update cost_centers of their companies" ON cost_centers;
CREATE POLICY "Admins update cost_centers of their companies"
ON cost_centers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

DROP POLICY IF EXISTS "Admins delete cost_centers of their companies" ON cost_centers;
CREATE POLICY "Admins delete cost_centers of their companies"
ON cost_centers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = cost_centers.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

-- ============================================
-- PASO 4: Simplificar políticas RLS de departments
-- ============================================

DROP POLICY IF EXISTS "Users see departments of their companies" ON departments;
CREATE POLICY "Users see departments of their companies"
ON departments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = departments.company_id
      AND cu.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users insert departments in their companies" ON departments;
CREATE POLICY "Users insert departments in their companies"
ON departments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = departments.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users update departments of their companies" ON departments;
CREATE POLICY "Users update departments of their companies"
ON departments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = departments.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = departments.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users delete departments of their companies" ON departments;
CREATE POLICY "Users delete departments of their companies"
ON departments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = departments.company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  )
);

-- ============================================
-- PASO 5: Consulta de verificación final
-- ============================================
SELECT 
  'Estado del usuario hmartinez@hlms.cl' as verificacion,
  au.email,
  c.name as empresa,
  cu.role as rol,
  cu.status as estado,
  user_belongs_to_company(au.id, c.id) as pertenece,
  is_company_admin(au.id, c.id) as es_admin,
  (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.id) as total_empleados,
  (SELECT COUNT(*) FROM cost_centers cc WHERE cc.company_id = c.id) as total_cc,
  (SELECT COUNT(*) FROM departments d WHERE d.company_id = c.id) as total_dept
FROM auth.users au
JOIN company_users cu ON cu.user_id = au.id
JOIN companies c ON c.id = cu.company_id
WHERE au.email = 'hmartinez@hlms.cl'
ORDER BY c.name;


