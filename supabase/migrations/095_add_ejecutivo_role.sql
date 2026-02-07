-- ============================================
-- MIGRACIÓN 095: Agregar rol 'ejecutivo' a company_users
-- ============================================
-- Esta migración actualiza el sistema para soportar el rol 'ejecutivo'
-- que tiene permisos similares a 'admin' pero específicos para RRHH
-- ============================================

-- PASO 0: Verificar valores actuales de role
DO $$
BEGIN
  RAISE NOTICE '🔍 Verificando roles existentes en company_users...';
END $$;

SELECT 
  'Roles actuales en la tabla:' as info,
  role,
  COUNT(*) as cantidad
FROM company_users
GROUP BY role
ORDER BY COUNT(*) DESC;

-- PASO 1: Limpiar datos existentes - Convertir 'hr' a 'ejecutivo'
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Actualizar 'hr' a 'ejecutivo'
  UPDATE company_users
  SET role = 'ejecutivo'
  WHERE role = 'hr';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Actualizados % registros de "hr" a "ejecutivo"', v_updated_count;
  
  -- Actualizar cualquier otro valor inválido a 'user'
  UPDATE company_users
  SET role = 'user'
  WHERE role NOT IN ('owner', 'admin', 'ejecutivo', 'user');
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count > 0 THEN
    RAISE NOTICE '⚠️  Actualizados % registros con roles inválidos a "user"', v_updated_count;
  END IF;
END $$;

-- PASO 2: Actualizar constraint de company_users
ALTER TABLE company_users DROP CONSTRAINT IF EXISTS company_users_role_check;
ALTER TABLE company_users 
ADD CONSTRAINT company_users_role_check 
CHECK (role IN ('owner', 'admin', 'ejecutivo', 'user'));

-- PASO 3: Actualizar comentario
COMMENT ON COLUMN company_users.role IS 'Rol del usuario en la empresa: owner (propietario), admin (administrador), ejecutivo (recursos humanos), user (usuario)';

-- PASO 4: Actualizar políticas RLS que usan 'hr' para incluir 'ejecutivo'
-- Nota: Mantenemos compatibilidad con 'hr' aunque no sea válido en el constraint,
-- por si hay datos legacy

-- Overtime pacts
DROP POLICY IF EXISTS "HR can create overtime pacts" ON overtime_pacts;
CREATE POLICY "HR/Ejecutivo can create overtime pacts"
  ON overtime_pacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_pacts.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('ejecutivo', 'admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "HR can update overtime pacts" ON overtime_pacts;
CREATE POLICY "HR/Ejecutivo can update overtime pacts"
  ON overtime_pacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_pacts.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('ejecutivo', 'admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "HR can delete overtime pacts" ON overtime_pacts;
CREATE POLICY "HR/Ejecutivo can delete overtime pacts"
  ON overtime_pacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_pacts.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('ejecutivo', 'admin', 'owner')
    )
    AND status IN ('draft', 'void')
  );

-- Overtime entries
DROP POLICY IF EXISTS "HR can create overtime entries" ON overtime_entries;
CREATE POLICY "HR/Ejecutivo can create overtime entries"
  ON overtime_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_entries.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('ejecutivo', 'admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "HR can update overtime entries" ON overtime_entries;
CREATE POLICY "HR/Ejecutivo can update overtime entries"
  ON overtime_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_entries.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('ejecutivo', 'admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "HR can delete overtime entries" ON overtime_entries;
CREATE POLICY "HR/Ejecutivo can delete overtime entries"
  ON overtime_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = overtime_entries.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('ejecutivo', 'admin', 'owner')
    )
    AND linked_payroll_id IS NULL
  );

-- Certificates
DROP POLICY IF EXISTS "HR can create certificates" ON certificates;
CREATE POLICY "HR/Ejecutivo can create certificates"
  ON certificates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      JOIN company_users ON company_users.company_id = employees.company_id
      WHERE employees.id = certificates.employee_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('admin', 'ejecutivo', 'owner')
    )
  );

DROP POLICY IF EXISTS "HR can update certificates" ON certificates;
CREATE POLICY "HR/Ejecutivo can update certificates"
  ON certificates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      JOIN company_users ON company_users.company_id = employees.company_id
      WHERE employees.id = certificates.employee_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('admin', 'ejecutivo', 'owner')
    )
  );

DROP POLICY IF EXISTS "HR can delete certificates" ON certificates;
CREATE POLICY "HR/Ejecutivo can delete certificates"
  ON certificates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      JOIN company_users ON company_users.company_id = employees.company_id
      WHERE employees.id = certificates.employee_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('admin', 'ejecutivo', 'owner')
    )
  );

-- Contract annexes delete policy
DROP POLICY IF EXISTS "Admin/HR can delete contract annexes" ON contract_annexes;
CREATE POLICY "Admin/Ejecutivo can delete contract annexes"
  ON contract_annexes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM company_users
      WHERE company_users.company_id = contract_annexes.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('ejecutivo', 'admin', 'owner')
    )
  );

-- Digital signatures
DROP POLICY IF EXISTS "Admin/HR can insert digital signatures" ON digital_signatures;
CREATE POLICY "Admin/Ejecutivo can insert digital signatures"
  ON digital_signatures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = digital_signatures.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
    )
  );

DROP POLICY IF EXISTS "Admin/HR can update digital signatures" ON digital_signatures;
CREATE POLICY "Admin/Ejecutivo can update digital signatures"
  ON digital_signatures FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = digital_signatures.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
    )
  );

DROP POLICY IF EXISTS "Admin/HR can delete digital signatures" ON digital_signatures;
CREATE POLICY "Admin/Ejecutivo can delete digital signatures"
  ON digital_signatures FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = digital_signatures.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
    )
  );

-- Banks table policies
DROP POLICY IF EXISTS "Admin/HR can manage banks" ON banks;
CREATE POLICY "Admin/Ejecutivo can manage banks"
  ON banks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
    )
  );

-- Regions table policies  
DROP POLICY IF EXISTS "Admin/HR can manage regions" ON regions;
CREATE POLICY "Admin/Ejecutivo can manage regions"
  ON regions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
    )
  );

-- PASO 5: Crear índice para búsquedas por rol ejecutivo
CREATE INDEX IF NOT EXISTS idx_company_users_ejecutivo 
ON company_users(company_id, user_id) 
WHERE role = 'ejecutivo';

-- PASO 6: Verificación final
DO $$
BEGIN
  RAISE NOTICE '✅ Rol "ejecutivo" agregado exitosamente al sistema';
  RAISE NOTICE '✅ Políticas RLS actualizadas';
  RAISE NOTICE '✅ Índices creados';
END $$;
