-- ============================================
-- MIGRACIÓN 076: Permitir a trabajadores ver sus propios certificados
-- ============================================
-- Agregar política RLS para que trabajadores puedan ver sus propios certificados
-- ============================================

-- Política: Los trabajadores pueden ver sus propios certificados
CREATE POLICY "Employees can view their own certificates"
  ON certificates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = certificates.employee_id
      AND e.user_id = auth.uid()
    )
  );

-- Comentario
COMMENT ON POLICY "Employees can view their own certificates" ON certificates IS 
'Permite a trabajadores ver solo sus propios certificados mediante la relación employee.user_id = auth.uid()';





