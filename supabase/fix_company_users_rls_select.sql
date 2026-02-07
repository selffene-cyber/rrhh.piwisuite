-- ============================================
-- FIX: Política RLS faltante para company_users
-- ============================================
-- PROBLEMA: Admins/Owners/Ejecutivos no pueden ver otros usuarios de su empresa
-- SOLUCIÓN: Agregar política SELECT para que vean todos los usuarios de su empresa

-- 1️⃣ Crear política: Admins/Owners/Ejecutivos pueden ver usuarios de su empresa
CREATE POLICY "Admins see company users"
  ON company_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM company_users cu
      WHERE cu.user_id = auth.uid()
      AND cu.company_id = company_users.company_id
      AND cu.role IN ('owner', 'admin', 'ejecutivo')
      AND cu.status = 'active'
    )
  );

-- 2️⃣ Verificación
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Política RLS creada para company_users';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Admins/Owners/Ejecutivos ahora pueden ver';
  RAISE NOTICE '   TODOS los usuarios de su empresa';
  RAISE NOTICE '============================================';
END $$;

-- 3️⃣ Verificar políticas SELECT actuales
SELECT 
  '📋 POLÍTICAS SELECT ACTUALES' as info,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'company_users'
AND cmd = 'SELECT'
ORDER BY policyname;
