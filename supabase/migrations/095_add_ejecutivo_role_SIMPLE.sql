-- ============================================
-- MIGRACIÓN 095: Agregar rol 'ejecutivo' (VERSIÓN SIMPLE)
-- ============================================
-- Esta versión solo actualiza lo esencial y no falla si
-- algunas tablas no existen
-- ============================================

-- PASO 1: Ver roles actuales
DO $$
BEGIN
  RAISE NOTICE '🔍 Verificando roles existentes...';
END $$;

-- PASO 2: Limpiar datos - Convertir 'hr' a 'ejecutivo'
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

-- PASO 3: Actualizar constraint
ALTER TABLE company_users DROP CONSTRAINT IF EXISTS company_users_role_check;
ALTER TABLE company_users 
ADD CONSTRAINT company_users_role_check 
CHECK (role IN ('owner', 'admin', 'ejecutivo', 'user'));

DO $$
BEGIN
  RAISE NOTICE '✅ Constraint actualizado';
END $$;

-- PASO 4: Actualizar comentario
COMMENT ON COLUMN company_users.role IS 'Rol del usuario en la empresa: owner (propietario), admin (administrador), ejecutivo (recursos humanos), user (usuario)';

-- PASO 5: Actualizar políticas RLS - SOLO TABLAS QUE EXISTEN
-- ============================================

-- Overtime pacts (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_pacts') THEN
    -- Actualizar políticas
    EXECUTE 'DROP POLICY IF EXISTS "HR can create overtime pacts" ON overtime_pacts';
    EXECUTE 'DROP POLICY IF EXISTS "HR/Ejecutivo can create overtime pacts" ON overtime_pacts';
    EXECUTE 'CREATE POLICY "HR/Ejecutivo can create overtime pacts"
      ON overtime_pacts FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.company_id = overtime_pacts.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''ejecutivo'', ''admin'', ''owner'')
        )
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "HR can update overtime pacts" ON overtime_pacts';
    EXECUTE 'DROP POLICY IF EXISTS "HR/Ejecutivo can update overtime pacts" ON overtime_pacts';
    EXECUTE 'CREATE POLICY "HR/Ejecutivo can update overtime pacts"
      ON overtime_pacts FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.company_id = overtime_pacts.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''ejecutivo'', ''admin'', ''owner'')
        )
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "HR can delete overtime pacts" ON overtime_pacts';
    EXECUTE 'DROP POLICY IF EXISTS "HR/Ejecutivo can delete overtime pacts" ON overtime_pacts';
    EXECUTE 'CREATE POLICY "HR/Ejecutivo can delete overtime pacts"
      ON overtime_pacts FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.company_id = overtime_pacts.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''ejecutivo'', ''admin'', ''owner'')
        )
        AND status IN (''draft'', ''void'')
      )';
    
    RAISE NOTICE '✅ Políticas de overtime_pacts actualizadas';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  No se pudo actualizar overtime_pacts: %', SQLERRM;
END $$;

-- Overtime entries (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'overtime_entries') THEN
    EXECUTE 'DROP POLICY IF EXISTS "HR can create overtime entries" ON overtime_entries';
    EXECUTE 'DROP POLICY IF EXISTS "HR/Ejecutivo can create overtime entries" ON overtime_entries';
    EXECUTE 'CREATE POLICY "HR/Ejecutivo can create overtime entries"
      ON overtime_entries FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.company_id = overtime_entries.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''ejecutivo'', ''admin'', ''owner'')
        )
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "HR can update overtime entries" ON overtime_entries';
    EXECUTE 'DROP POLICY IF EXISTS "HR/Ejecutivo can update overtime entries" ON overtime_entries';
    EXECUTE 'CREATE POLICY "HR/Ejecutivo can update overtime entries"
      ON overtime_entries FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.company_id = overtime_entries.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''ejecutivo'', ''admin'', ''owner'')
        )
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "HR can delete overtime entries" ON overtime_entries';
    EXECUTE 'DROP POLICY IF EXISTS "HR/Ejecutivo can delete overtime entries" ON overtime_entries';
    EXECUTE 'CREATE POLICY "HR/Ejecutivo can delete overtime entries"
      ON overtime_entries FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.company_id = overtime_entries.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''ejecutivo'', ''admin'', ''owner'')
        )
        AND linked_payroll_id IS NULL
      )';
    
    RAISE NOTICE '✅ Políticas de overtime_entries actualizadas';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  No se pudo actualizar overtime_entries: %', SQLERRM;
END $$;

-- Certificates (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certificates') THEN
    EXECUTE 'DROP POLICY IF EXISTS "HR can create certificates" ON certificates';
    EXECUTE 'DROP POLICY IF EXISTS "HR/Ejecutivo can create certificates" ON certificates';
    EXECUTE 'CREATE POLICY "HR/Ejecutivo can create certificates"
      ON certificates FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM employees
          JOIN company_users ON company_users.company_id = employees.company_id
          WHERE employees.id = certificates.employee_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''admin'', ''ejecutivo'', ''owner'')
        )
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "HR can update certificates" ON certificates';
    EXECUTE 'DROP POLICY IF EXISTS "HR/Ejecutivo can update certificates" ON certificates';
    EXECUTE 'CREATE POLICY "HR/Ejecutivo can update certificates"
      ON certificates FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM employees
          JOIN company_users ON company_users.company_id = employees.company_id
          WHERE employees.id = certificates.employee_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''admin'', ''ejecutivo'', ''owner'')
        )
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "HR can delete certificates" ON certificates';
    EXECUTE 'DROP POLICY IF EXISTS "HR/Ejecutivo can delete certificates" ON certificates';
    EXECUTE 'CREATE POLICY "HR/Ejecutivo can delete certificates"
      ON certificates FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM employees
          JOIN company_users ON company_users.company_id = employees.company_id
          WHERE employees.id = certificates.employee_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''admin'', ''ejecutivo'', ''owner'')
        )
      )';
    
    RAISE NOTICE '✅ Políticas de certificates actualizadas';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  No se pudo actualizar certificates: %', SQLERRM;
END $$;

-- Contract annexes (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_annexes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin/HR can delete contract annexes" ON contract_annexes';
    EXECUTE 'DROP POLICY IF EXISTS "Admin/Ejecutivo can delete contract annexes" ON contract_annexes';
    EXECUTE 'CREATE POLICY "Admin/Ejecutivo can delete contract annexes"
      ON contract_annexes FOR DELETE
      USING (
        EXISTS (
          SELECT 1 
          FROM company_users
          WHERE company_users.company_id = contract_annexes.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''ejecutivo'', ''admin'', ''owner'')
        )
      )';
    
    RAISE NOTICE '✅ Políticas de contract_annexes actualizadas';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  No se pudo actualizar contract_annexes: %', SQLERRM;
END $$;

-- Digital signatures (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'digital_signatures') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin/HR can insert digital signatures" ON digital_signatures';
    EXECUTE 'DROP POLICY IF EXISTS "Admin/Ejecutivo can insert digital signatures" ON digital_signatures';
    EXECUTE 'CREATE POLICY "Admin/Ejecutivo can insert digital signatures"
      ON digital_signatures FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.company_id = digital_signatures.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''owner'', ''admin'', ''ejecutivo'')
        )
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "Admin/HR can update digital signatures" ON digital_signatures';
    EXECUTE 'DROP POLICY IF EXISTS "Admin/Ejecutivo can update digital signatures" ON digital_signatures';
    EXECUTE 'CREATE POLICY "Admin/Ejecutivo can update digital signatures"
      ON digital_signatures FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.company_id = digital_signatures.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''owner'', ''admin'', ''ejecutivo'')
        )
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "Admin/HR can delete digital signatures" ON digital_signatures';
    EXECUTE 'DROP POLICY IF EXISTS "Admin/Ejecutivo can delete digital signatures" ON digital_signatures';
    EXECUTE 'CREATE POLICY "Admin/Ejecutivo can delete digital signatures"
      ON digital_signatures FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.company_id = digital_signatures.company_id
          AND company_users.user_id = auth.uid()
          AND company_users.role IN (''owner'', ''admin'', ''ejecutivo'')
        )
      )';
    
    RAISE NOTICE '✅ Políticas de digital_signatures actualizadas';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  No se pudo actualizar digital_signatures: %', SQLERRM;
END $$;

-- PASO 6: Crear índice
CREATE INDEX IF NOT EXISTS idx_company_users_ejecutivo 
ON company_users(company_id, user_id) 
WHERE role = 'ejecutivo';

-- PASO 7: Verificación final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Rol "ejecutivo" agregado al sistema';
  RAISE NOTICE '✅ Constraint actualizado';
  RAISE NOTICE '✅ Políticas RLS actualizadas (tablas existentes)';
  RAISE NOTICE '✅ Índices creados';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ahora puedes asignar usuarios con rol "Ejecutivo"';
  RAISE NOTICE '============================================';
END $$;

-- Verificar el constraint final
SELECT 
  '🔍 CONSTRAINT FINAL:' as info,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conname = 'company_users_role_check';
