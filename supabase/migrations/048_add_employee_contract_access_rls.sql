-- ============================================
-- MIGRACIÓN 048: Permitir a trabajadores ver sus propios contratos
-- ============================================
-- Agrega política RLS para que los trabajadores puedan ver sus propios contratos
-- basándose en la relación employees.user_id = auth.uid()
-- ============================================

-- Política para que trabajadores vean sus propios contratos
CREATE POLICY "Employees can see their own contracts"
ON contracts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = contracts.employee_id
      AND e.user_id = auth.uid()
  )
);

-- Comentario
COMMENT ON POLICY "Employees can see their own contracts" ON contracts IS 
'Permite a los trabajadores ver sus propios contratos basándose en la relación employees.user_id = auth.uid()';

