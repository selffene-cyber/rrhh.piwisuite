-- ============================================
-- MIGRACIÓN 077: Corregir conflicto de políticas RLS para certificados
-- ============================================
-- Asegurar que los trabajadores puedan ver sus propios certificados
-- incluso si fueron creados recientemente
-- ============================================

-- Eliminar política duplicada de la migración 076 si existe
DROP POLICY IF EXISTS "Employees can view their own certificates" ON certificates;

-- Asegurar que la política de la migración 043 esté activa y funcione correctamente
-- Esta política permite que los trabajadores vean sus propios certificados
DROP POLICY IF EXISTS "Employees can view their own certificate requests" ON certificates;

-- Recrear la política de forma más explícita y con mejor rendimiento
CREATE POLICY "Employees can view their own certificate requests"
  ON certificates
  FOR SELECT
  USING (
    -- Verificar que el usuario está vinculado al empleado del certificado
    -- Usar una subconsulta más eficiente
    certificates.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Comentario
COMMENT ON POLICY "Employees can view their own certificate requests" ON certificates IS 
'Permite a trabajadores ver todos sus propios certificados (independientemente del status) mediante la relación employee.user_id = auth.uid()';
