-- ============================================
-- MIGRACIÓN 042: Permitir que trabajadores vean su empresa
-- ============================================
-- Agrega política RLS para que los trabajadores puedan ver la empresa
-- a la que pertenecen (necesario para el portal del trabajador)
-- ============================================

-- Política: Los trabajadores pueden ver su propia empresa
-- Verifica si el usuario está vinculado a un empleado que pertenece a la empresa
-- Usa la columna company_id de la tabla employees
CREATE POLICY "Employees can see their company"
ON companies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.user_id = auth.uid()
      AND e.company_id IS NOT NULL
      AND e.company_id = companies.id
  )
);

-- Comentario
COMMENT ON POLICY "Employees can see their company" ON companies IS 
'Permite que los trabajadores vinculados vean la empresa a la que pertenecen, necesario para el portal del trabajador';

