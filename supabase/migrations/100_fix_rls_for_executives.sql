-- =====================================================
-- Migración 100: Arreglar RLS para Executives
-- =====================================================
-- Fecha: 2026-01-16
-- Descripción: Actualiza las políticas RLS para que los executives
--              puedan ver y gestionar empleados según sus permisos
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 Iniciando migración 100: RLS para Executives...';
END $$;

-- =====================================================
-- PASO 1: Actualizar política de SELECT para employees
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '👁️ Actualizando política SELECT de employees...';
END $$;

-- Eliminar política antigua
DROP POLICY IF EXISTS "Admins see all employees of their companies" ON employees;

-- Crear nueva política que incluye 'executive'
CREATE POLICY "Admins see all employees of their companies"
ON employees
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = employees.company_id
      AND cu.role IN ('owner', 'admin', 'executive')  -- ⭐ Agregado 'executive'
      AND cu.status = 'active'
  )
);

-- =====================================================
-- PASO 2: Actualizar política de INSERT para employees
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '➕ Actualizando política INSERT de employees...';
END $$;

-- Eliminar política antigua
DROP POLICY IF EXISTS "Admins insert employees in their companies" ON employees;

-- Crear nueva política que permite a executives crear empleados
CREATE POLICY "Admins insert employees in their companies"
ON employees
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = employees.company_id
      AND cu.role IN ('owner', 'admin', 'executive')  -- ⭐ Agregado 'executive'
      AND cu.status = 'active'
  )
);

-- =====================================================
-- PASO 3: Actualizar política de UPDATE para employees
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✏️ Actualizando política UPDATE de employees...';
END $$;

-- Eliminar política antigua
DROP POLICY IF EXISTS "Admins update employees of their companies" ON employees;

-- Crear nueva política que permite a executives actualizar empleados
CREATE POLICY "Admins update employees of their companies"
ON employees
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = employees.company_id
      AND cu.role IN ('owner', 'admin', 'executive')  -- ⭐ Agregado 'executive'
      AND cu.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = employees.company_id
      AND cu.role IN ('owner', 'admin', 'executive')  -- ⭐ Agregado 'executive'
      AND cu.status = 'active'
  )
);

-- =====================================================
-- PASO 4: Actualizar política de DELETE para employees
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🗑️ Actualizando política DELETE de employees...';
END $$;

-- Eliminar política antigua
DROP POLICY IF EXISTS "Admins delete employees of their companies" ON employees;

-- Crear nueva política que permite a executives eliminar empleados
CREATE POLICY "Admins delete employees of their companies"
ON employees
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = employees.company_id
      AND cu.role IN ('owner', 'admin', 'executive')  -- ⭐ Agregado 'executive'
      AND cu.status = 'active'
  )
);

-- =====================================================
-- RESUMEN
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migración 100 completada exitosamente!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Políticas RLS actualizadas:';
  RAISE NOTICE '   • SELECT: Executives pueden ver empleados';
  RAISE NOTICE '   • INSERT: Executives pueden crear empleados';
  RAISE NOTICE '   • UPDATE: Executives pueden actualizar empleados';
  RAISE NOTICE '   • DELETE: Executives pueden eliminar empleados';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ NOTA: Los permisos granulares se controlan en la aplicación';
  RAISE NOTICE '   mediante la tabla user_permissions y el hook useUserPermissions';
END $$;
