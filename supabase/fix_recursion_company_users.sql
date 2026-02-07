-- ============================================
-- FIX URGENTE: Eliminar política recursiva
-- ============================================

-- 1️⃣ ELIMINAR la política problemática que causa recursión
DROP POLICY IF EXISTS "Admins see company users" ON company_users;

-- 2️⃣ Verificar que se eliminó
DO $$
BEGIN
  RAISE NOTICE '✅ Política recursiva eliminada';
END $$;

-- 3️⃣ Crear función auxiliar que consulta sin RLS
CREATE OR REPLACE FUNCTION user_is_company_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM company_users
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND role IN ('owner', 'admin', 'ejecutivo')
    AND status = 'active'
  );
$$;

-- 4️⃣ Crear política correcta usando la función
CREATE POLICY "Admins see company users v2"
  ON company_users
  FOR SELECT
  USING (
    user_is_company_admin(company_id)
  );

-- 5️⃣ Verificación
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Política corregida sin recursión';
  RAISE NOTICE '✅ Función auxiliar creada';
  RAISE NOTICE '============================================';
END $$;

-- 6️⃣ Ver políticas SELECT actuales
SELECT 
  '📋 POLÍTICAS SELECT' as info,
  policyname
FROM pg_policies
WHERE tablename = 'company_users'
AND cmd = 'SELECT'
ORDER BY policyname;
