-- ============================================
-- FIX: Políticas RLS de employees para ejecutivos
-- ============================================

-- 1️⃣ Ver políticas actuales de employees
SELECT 
  '📋 POLÍTICAS ACTUALES DE EMPLOYEES' as info,
  policyname,
  cmd as comando,
  SUBSTRING(qual::text, 1, 100) as condicion
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY cmd, policyname;

-- 2️⃣ Eliminar políticas antiguas si es necesario
DROP POLICY IF EXISTS "Users can view employees in their companies" ON employees;
DROP POLICY IF EXISTS "Company admins can view employees" ON employees;
DROP POLICY IF EXISTS "Admins can view employees" ON employees;

-- 3️⃣ Crear política: Admins/Owners/Ejecutivos pueden ver empleados de su empresa
CREATE POLICY "Company admins and executives can view employees"
  ON employees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM company_users
      WHERE company_users.company_id = employees.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

-- 4️⃣ Crear política: Admins/Owners/Ejecutivos pueden crear/actualizar empleados
CREATE POLICY "Company admins and executives can manage employees"
  ON employees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM company_users
      WHERE company_users.company_id = employees.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin', 'ejecutivo')
      AND company_users.status = 'active'
    )
  );

-- 5️⃣ Verificación: Probar si Cristian puede ver empleados
SELECT 
  '🧪 PRUEBA: ¿Cristian puede ver empleados?' as test,
  e.id,
  e.full_name,
  e.rut,
  e.company_id,
  c.name as empresa
FROM employees e
JOIN companies c ON c.id = e.company_id
WHERE e.company_id = (
  SELECT company_id 
  FROM company_users 
  WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl')
  LIMIT 1
)
LIMIT 5;

-- 6️⃣ Ver políticas finales
SELECT 
  '✅ POLÍTICAS FINALES' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'employees'
AND cmd IN ('SELECT', '*')
ORDER BY policyname;

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Políticas RLS de employees actualizadas';
  RAISE NOTICE '✅ Ejecutivos ahora pueden ver empleados';
  RAISE NOTICE '============================================';
END $$;
