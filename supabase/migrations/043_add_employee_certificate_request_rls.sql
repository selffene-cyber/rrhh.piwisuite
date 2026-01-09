-- ============================================
-- MIGRACIÓN 043: Política RLS para que trabajadores puedan solicitar certificados
-- ============================================
-- Permite que los trabajadores (employees) puedan crear solicitudes de certificados
-- con status 'requested' para sí mismos
-- ============================================

-- Política: Los trabajadores pueden crear solicitudes de certificados para sí mismos
CREATE POLICY "Employees can request certificates for themselves"
  ON certificates
  FOR INSERT
  WITH CHECK (
    -- Verificar que el usuario está vinculado a un empleado
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = certificates.employee_id
        AND employees.user_id = auth.uid()
    )
    -- Solo permitir crear solicitudes (status = 'requested')
    AND certificates.status = 'requested'
    -- El certificado debe ser para el mismo empleado vinculado al usuario
    AND certificates.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Política: Los trabajadores pueden ver sus propias solicitudes de certificados
CREATE POLICY "Employees can view their own certificate requests"
  ON certificates
  FOR SELECT
  USING (
    -- Verificar que el usuario está vinculado al empleado del certificado
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = certificates.employee_id
        AND employees.user_id = auth.uid()
    )
  );








