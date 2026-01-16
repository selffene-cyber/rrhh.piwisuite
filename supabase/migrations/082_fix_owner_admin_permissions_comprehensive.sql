-- ============================================
-- MIGRACIÓN 082: Corregir permisos completos para owners/admins
-- ============================================
-- Esta migración asegura que owners/admins puedan hacer TODO excepto:
-- - Modificar nivel de usuarios (solo super_admin)
-- - Asignar usuarios a empresas (solo super_admin)
-- ============================================

-- ============================================
-- PASO 1: Corregir rol del usuario hmartinez@hlms.cl
-- IMPORTANTE: Solo corrige las empresas donde YA está asignado, NO lo asigna a nuevas empresas
-- ============================================
DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_current_role VARCHAR(20);
  v_current_status VARCHAR(20);
BEGIN
  -- Buscar el ID del usuario por email
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = 'hmartinez@hlms.cl'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario hmartinez@hlms.cl no encontrado en auth.users';
    RETURN;
  END IF;
  
  -- Solo verificar/corregir las empresas donde YA está asignado (NO asignar a nuevas)
  FOR v_company_id IN 
    SELECT company_id 
    FROM company_users 
    WHERE user_id = v_user_id
    ORDER BY created_at ASC
  LOOP
    -- Verificar el rol y status actual
    SELECT role, status INTO v_current_role, v_current_status
    FROM company_users
    WHERE user_id = v_user_id
      AND company_id = v_company_id
    LIMIT 1;
    
    IF v_current_role NOT IN ('owner', 'admin') OR v_current_status != 'active' THEN
      -- Actualizar el rol y status si no es owner/admin o no está activo
      UPDATE company_users
      SET role = 'owner',
          status = 'active',
          updated_at = NOW()
      WHERE user_id = v_user_id
        AND company_id = v_company_id;
      RAISE NOTICE 'Rol actualizado: usuario % ahora es owner y está active en empresa %', v_user_id, v_company_id;
    ELSE
      RAISE NOTICE 'Usuario % ya tiene rol % y status % correctos en empresa %', v_user_id, v_current_role, v_current_status, v_company_id;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- PASO 2: Asegurar que las funciones RLS funcionen correctamente
-- ============================================

-- Mejorar la función user_belongs_to_company para que sea más robusta
-- IMPORTANTE: Esta función NO debe retornar true para super_admins aquí
-- porque las políticas RLS de companies ya tienen una política separada para super_admins
CREATE OR REPLACE FUNCTION user_belongs_to_company(
  p_user_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar si el usuario pertenece a la empresa
  -- NO incluir verificación de super_admin aquí, eso se maneja en las políticas RLS
  RETURN EXISTS (
    SELECT 1 
    FROM company_users
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mejorar la función is_company_admin para que sea más robusta
CREATE OR REPLACE FUNCTION is_company_admin(
  p_user_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Si el usuario es super_admin, siempre retorna true
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id AND role = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si el usuario es admin/owner de la empresa
  RETURN EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = p_user_id
      AND cu.company_id = p_company_id
      AND cu.role IN ('owner', 'admin')
      AND cu.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PASO 3: Asegurar políticas RLS para cost_centers
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Super admins see all cost_centers" ON cost_centers;
DROP POLICY IF EXISTS "Admins see cost_centers of their companies" ON cost_centers;
DROP POLICY IF EXISTS "Users see cost_centers they have access to" ON cost_centers;
DROP POLICY IF EXISTS "Super admins insert all cost_centers" ON cost_centers;
DROP POLICY IF EXISTS "Admins insert cost_centers in their companies" ON cost_centers;
DROP POLICY IF EXISTS "Super admins update all cost_centers" ON cost_centers;
DROP POLICY IF EXISTS "Admins update cost_centers of their companies" ON cost_centers;
DROP POLICY IF EXISTS "Super admins delete all cost_centers" ON cost_centers;
DROP POLICY IF EXISTS "Admins delete cost_centers of their companies" ON cost_centers;

-- SELECT: Super admin ve todos, admins ven todos de su empresa
CREATE POLICY "Super admins see all cost_centers"
ON cost_centers FOR SELECT
USING (is_super_admin());

CREATE POLICY "Admins see cost_centers of their companies"
ON cost_centers FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

-- INSERT: Super admin puede insertar en cualquier empresa, admins en su empresa
CREATE POLICY "Super admins insert all cost_centers"
ON cost_centers FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Admins insert cost_centers in their companies"
ON cost_centers FOR INSERT
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

-- UPDATE: Similar a INSERT
CREATE POLICY "Super admins update all cost_centers"
ON cost_centers FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Admins update cost_centers of their companies"
ON cost_centers FOR UPDATE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

-- DELETE: Similar a UPDATE
CREATE POLICY "Super admins delete all cost_centers"
ON cost_centers FOR DELETE
USING (is_super_admin());

CREATE POLICY "Admins delete cost_centers of their companies"
ON cost_centers FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

-- ============================================
-- PASO 4: Asegurar políticas RLS para digital_signatures
-- ============================================

-- Habilitar RLS si no está habilitado
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Super admins see all digital_signatures" ON digital_signatures;
DROP POLICY IF EXISTS "Users see digital_signatures of their companies" ON digital_signatures;
DROP POLICY IF EXISTS "Super admins manage all digital_signatures" ON digital_signatures;
DROP POLICY IF EXISTS "Admins manage digital_signatures of their companies" ON digital_signatures;

-- SELECT: Super admin ve todos, usuarios ven de sus empresas
CREATE POLICY "Super admins see all digital_signatures"
ON digital_signatures FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see digital_signatures of their companies"
ON digital_signatures FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- INSERT/UPDATE/DELETE: Super admin gestiona todos, admins gestionan de su empresa
CREATE POLICY "Super admins manage all digital_signatures"
ON digital_signatures FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Admins manage digital_signatures of their companies"
ON digital_signatures FOR ALL
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

-- ============================================
-- PASO 5: Asegurar políticas RLS para departments (ya deberían estar, pero las verificamos)
-- ============================================

-- Las políticas de departments ya están en la migración 035, pero las verificamos
-- Si no existen, las creamos

DO $$
BEGIN
  -- Verificar si existe la política de SELECT para usuarios
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'departments' 
      AND policyname = 'Users see departments of their companies'
  ) THEN
    CREATE POLICY "Users see departments of their companies"
    ON departments FOR SELECT
    USING (user_belongs_to_company(auth.uid(), company_id));
  END IF;
  
  -- Verificar si existe la política de INSERT para usuarios
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'departments' 
      AND policyname = 'Users insert departments in their companies'
  ) THEN
    CREATE POLICY "Users insert departments in their companies"
    ON departments FOR INSERT
    WITH CHECK (user_belongs_to_company(auth.uid(), company_id));
  END IF;
END $$;

-- ============================================
-- PASO 6: Verificar y corregir políticas RLS de companies
-- ============================================

-- Asegurar que las políticas RLS de companies estén correctas
-- Eliminar políticas existentes si hay conflictos
DROP POLICY IF EXISTS "Super admins see all companies" ON companies;
DROP POLICY IF EXISTS "Users see their companies" ON companies;

-- SELECT: Super admin ve todas, usuarios ven solo sus empresas asignadas
CREATE POLICY "Super admins see all companies"
ON companies FOR SELECT
USING (is_super_admin());

CREATE POLICY "Users see their companies"
ON companies FOR SELECT
USING (user_belongs_to_company(auth.uid(), id));

-- ============================================
-- PASO 6.5: Verificar y corregir políticas RLS de employees
-- ============================================

-- Asegurar que las políticas RLS de employees permitan a owners/admins ver y gestionar trabajadores
-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Super admins see all employees" ON employees;
DROP POLICY IF EXISTS "Admins see all employees of their companies" ON employees;
DROP POLICY IF EXISTS "Users see employees of their cost centers" ON employees;
DROP POLICY IF EXISTS "Super admins insert all employees" ON employees;
DROP POLICY IF EXISTS "Admins insert employees in their companies" ON employees;
DROP POLICY IF EXISTS "Users insert employees in their cost centers" ON employees;
DROP POLICY IF EXISTS "Super admins update all employees" ON employees;
DROP POLICY IF EXISTS "Admins update employees of their companies" ON employees;
DROP POLICY IF EXISTS "Users update employees of their cost centers" ON employees;
DROP POLICY IF EXISTS "Super admins delete all employees" ON employees;
DROP POLICY IF EXISTS "Admins delete employees of their companies" ON employees;
DROP POLICY IF EXISTS "Users delete employees of their cost centers" ON employees;

-- SELECT: Super admin ve todos, admins/owners ven todos de su empresa
-- IMPORTANTE: Esta política debe ser la primera y más permisiva para owners/admins
CREATE POLICY "Super admins see all employees"
ON employees FOR SELECT
USING (is_super_admin());

-- Política simplificada para owners/admins: pueden ver TODOS los empleados de su empresa
CREATE POLICY "Admins see all employees of their companies"
ON employees FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

-- Esta política es para usuarios regulares (no admins) que solo ven empleados de sus CC
-- Se mantiene pero no afecta a owners/admins porque la política anterior tiene prioridad
CREATE POLICY "Users see employees of their cost centers"
ON employees FOR SELECT
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND NOT is_company_admin(auth.uid(), company_id)
  AND (
    -- Si el trabajador no tiene CC asignado, no lo ven usuarios regulares
    (cost_center_id IS NOT NULL AND user_has_cost_center_access(auth.uid(), company_id, cost_center_id))
  )
);

-- INSERT: Super admin puede insertar en cualquier empresa, admins/owners en su empresa
CREATE POLICY "Super admins insert all employees"
ON employees FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Admins insert employees in their companies"
ON employees FOR INSERT
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

-- UPDATE: Similar a INSERT
CREATE POLICY "Super admins update all employees"
ON employees FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Admins update employees of their companies"
ON employees FOR UPDATE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

-- DELETE: Similar a UPDATE
CREATE POLICY "Super admins delete all employees"
ON employees FOR DELETE
USING (is_super_admin());

CREATE POLICY "Admins delete employees of their companies"
ON employees FOR DELETE
USING (
  user_belongs_to_company(auth.uid(), company_id)
  AND is_company_admin(auth.uid(), company_id)
);

-- ============================================
-- PASO 7: Función de diagnóstico
-- ============================================
CREATE OR REPLACE FUNCTION check_user_employee_permissions(p_user_email TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  company_id UUID,
  company_name TEXT,
  role_in_company VARCHAR(20),
  status_in_company VARCHAR(20),
  can_create_employees BOOLEAN,
  can_manage_cost_centers BOOLEAN,
  can_manage_departments BOOLEAN,
  can_manage_signatures BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar el usuario
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = p_user_email
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retornar información del usuario y sus permisos
  RETURN QUERY
  SELECT 
    au.id::UUID as user_id,
    au.email::TEXT,
    c.id::UUID as company_id,
    COALESCE(c.name, '')::TEXT as company_name,
    cu.role::VARCHAR(20) as role_in_company,
    cu.status::VARCHAR(20) as status_in_company,
    (cu.role IN ('owner', 'admin') AND cu.status = 'active')::BOOLEAN as can_create_employees,
    (cu.role IN ('owner', 'admin') AND cu.status = 'active')::BOOLEAN as can_manage_cost_centers,
    (cu.role IN ('owner', 'admin') AND cu.status = 'active')::BOOLEAN as can_manage_departments,
    (cu.role IN ('owner', 'admin') AND cu.status = 'active')::BOOLEAN as can_manage_signatures,
    CASE 
      WHEN cu.role IS NULL THEN 'Usuario no asignado a ninguna empresa'
      WHEN cu.status != 'active' THEN 'Usuario no está activo en la empresa'
      WHEN cu.role NOT IN ('owner', 'admin') THEN 'Usuario no tiene rol owner o admin'
      ELSE 'Usuario tiene permisos correctos'
    END::TEXT as reason
  FROM auth.users au
  LEFT JOIN company_users cu ON cu.user_id = au.id AND cu.status = 'active'
  LEFT JOIN companies c ON c.id = cu.company_id
  WHERE au.id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION check_user_employee_permissions IS 
'Función de diagnóstico para verificar los permisos de un usuario. Ejemplo: SELECT * FROM check_user_employee_permissions(''hmartinez@hlms.cl'');';

-- Ejecutar diagnóstico para el usuario
DO $$
DECLARE
  v_result RECORD;
  v_user_id UUID;
  v_employee_count INTEGER;
  v_belongs BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  RAISE NOTICE '=== DIAGNÓSTICO DE PERMISOS PARA hmartinez@hlms.cl ===';
  
  -- Obtener user_id
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = 'hmartinez@hlms.cl'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario no encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Usuario ID: %', v_user_id;
  
  -- Verificar empresas asignadas
  FOR v_result IN 
    SELECT 
      cu.company_id,
      cu.role,
      cu.status,
      c.name as company_name
    FROM company_users cu
    JOIN companies c ON c.id = cu.company_id
    WHERE cu.user_id = v_user_id
  LOOP
    RAISE NOTICE '--- Empresa: % (ID: %) ---', v_result.company_name, v_result.company_id;
    RAISE NOTICE 'Rol: %, Status: %', v_result.role, v_result.status;
    
    -- Probar funciones
    SELECT user_belongs_to_company(v_user_id, v_result.company_id) INTO v_belongs;
    SELECT is_company_admin(v_user_id, v_result.company_id) INTO v_is_admin;
    
    RAISE NOTICE 'user_belongs_to_company: %', v_belongs;
    RAISE NOTICE 'is_company_admin: %', v_is_admin;
    
    -- Contar empleados que debería poder ver
    SELECT COUNT(*) INTO v_employee_count
    FROM employees e
    WHERE e.company_id = v_result.company_id;
    
    RAISE NOTICE 'Total empleados en empresa: %', v_employee_count;
  END LOOP;
  
  -- Diagnóstico completo
  FOR v_result IN 
    SELECT * FROM check_user_employee_permissions('hmartinez@hlms.cl')
  LOOP
    RAISE NOTICE '--- RESUMEN ---';
    RAISE NOTICE 'Email: %', v_result.email;
    RAISE NOTICE 'Empresa: %', v_result.company_name;
    RAISE NOTICE 'Rol: %, Status: %', v_result.role_in_company, v_result.status_in_company;
    RAISE NOTICE 'Puede crear empleados: %', v_result.can_create_employees;
    RAISE NOTICE 'Puede gestionar CC: %', v_result.can_manage_cost_centers;
    RAISE NOTICE 'Puede gestionar departamentos: %', v_result.can_manage_departments;
    RAISE NOTICE 'Puede gestionar firmas: %', v_result.can_manage_signatures;
    RAISE NOTICE 'Razón: %', v_result.reason;
  END LOOP;
END $$;

-- ============================================
-- PASO 8: Mostrar diagnóstico en formato tabla
-- ============================================
-- Esta consulta mostrará los resultados del diagnóstico de forma visible
SELECT * FROM check_user_employee_permissions('hmartinez@hlms.cl');

-- Verificar empresas asignadas y permisos
SELECT 
  au.email,
  c.name as empresa,
  cu.role as rol,
  cu.status as estado,
  user_belongs_to_company(au.id, c.id) as pertenece_a_empresa,
  is_company_admin(au.id, c.id) as es_admin,
  (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.id) as total_empleados
FROM auth.users au
JOIN company_users cu ON cu.user_id = au.id
JOIN companies c ON c.id = cu.company_id
WHERE au.email = 'hmartinez@hlms.cl'
ORDER BY c.name;

-- ============================================
-- PASO 9: Verificar acceso directo a empleados (simulando RLS)
-- ============================================
-- Esta consulta simula lo que vería el usuario con las políticas RLS aplicadas
-- Ejecuta esto como el usuario para verificar si puede ver empleados
DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_employee_count INTEGER;
BEGIN
  -- Obtener user_id
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = 'hmartinez@hlms.cl'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario no encontrado';
    RETURN;
  END IF;
  
  -- Para cada empresa asignada, verificar si puede ver empleados
  FOR v_company_id IN 
    SELECT company_id 
    FROM company_users 
    WHERE user_id = v_user_id 
      AND status = 'active'
  LOOP
    -- Contar empleados que debería poder ver según las políticas RLS
    SELECT COUNT(*) INTO v_employee_count
    FROM employees e
    WHERE e.company_id = v_company_id
      AND user_belongs_to_company(v_user_id, e.company_id)
      AND is_company_admin(v_user_id, e.company_id);
    
    RAISE NOTICE 'Empresa %: Puede ver % empleados (según políticas RLS)', v_company_id, v_employee_count;
  END LOOP;
END $$;

-- Consulta para verificar políticas RLS activas en employees
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

