-- ============================================
-- MIGRACIÓN 052: Permitir a empleados crear permisos para sí mismos
-- ============================================
-- Agrega una política RLS adicional para que los empleados puedan crear
-- solicitudes de permiso para sí mismos desde el portal del trabajador
-- ============================================

-- Política para que empleados puedan crear permisos para sí mismos
-- Verifica que el usuario autenticado sea el user_id del empleado
-- y que el company_id del permiso coincida con el company_id del empleado
CREATE POLICY "Employees create permissions for themselves"
ON permissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employees
    WHERE employees.user_id = auth.uid()
      AND employees.id = permissions.employee_id
      AND employees.company_id = permissions.company_id
  )
);

-- Política para que empleados puedan ver sus propios permisos
CREATE POLICY "Employees see their own permissions"
ON permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM employees
    WHERE employees.user_id = auth.uid()
      AND employees.id = permissions.employee_id
      AND employees.company_id = permissions.company_id
  )
);

-- Política para que empleados puedan actualizar sus propios permisos
-- (solo si están en estado 'requested' o 'draft')
CREATE POLICY "Employees update their own permissions"
ON permissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM employees
    WHERE employees.user_id = auth.uid()
      AND employees.id = permissions.employee_id
      AND employees.company_id = permissions.company_id
  )
  AND permissions.status IN ('requested', 'draft')
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employees
    WHERE employees.user_id = auth.uid()
      AND employees.id = permissions.employee_id
      AND employees.company_id = permissions.company_id
  )
  AND permissions.status IN ('requested', 'draft')
);

