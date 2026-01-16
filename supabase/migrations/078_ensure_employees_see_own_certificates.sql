-- ============================================
-- MIGRACIÓN 078: Asegurar que trabajadores vean sus propios certificados
-- ============================================
-- Forzar que la política funcione correctamente eliminando y recreándola
-- ============================================

-- Eliminar todas las políticas SELECT existentes para trabajadores
DROP POLICY IF EXISTS "Employees can view their own certificate requests" ON certificates;
DROP POLICY IF EXISTS "Employees can view their own certificates" ON certificates;

-- Recrear la política de forma más simple y directa
-- Esta política permite que cualquier trabajador vea sus propios certificados
CREATE POLICY "Employees can view their own certificate requests"
  ON certificates
  FOR SELECT
  USING (
    -- Verificar que el certificado pertenece a un empleado cuyo user_id coincide con auth.uid()
    EXISTS (
      SELECT 1 
      FROM employees e
      WHERE e.id = certificates.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- Comentario
COMMENT ON POLICY "Employees can view their own certificate requests" ON certificates IS 
'Permite a trabajadores ver todos sus propios certificados (cualquier status) mediante la relación employee.user_id = auth.uid()';

-- Verificar que la política se creó correctamente
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'certificates' 
  AND policyname = 'Employees can view their own certificate requests';





