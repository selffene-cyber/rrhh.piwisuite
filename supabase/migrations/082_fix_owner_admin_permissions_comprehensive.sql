-- ============================================
-- MIGRACIÓN 082: Corregir permisos completos para owners/admins
-- ============================================
-- Esta migración asegura que owners/admins puedan hacer TODO excepto:
-- - Modificar nivel de usuarios (solo super_admin)
-- - Asignar usuarios a empresas (solo super_admin)
-- ============================================

-- ============================================
-- PASO 1: Corregir rol del usuario hmartinez@hlms.cl
-- ============================================
DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_current_role VARCHAR(20);
  v_current_status VARCHAR(20);
BEGIN
  -- Buscar el ID del usuario por email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'hmartinez@hlms.cl'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario hmartinez@hlms.cl no encontrado en auth.users';
    RETURN;
  END IF;
  
  -- Buscar todas las empresas y asignar al usuario como owner en cada una
  FOR v_company_id IN 
    SELECT id FROM companies ORDER BY created_at ASC
  LOOP
    -- Verificar si existe la relación en company_users
    SELECT role, status INTO v_current_role, v_current_status
    FROM company_users
    WHERE user_id = v_user_id
      AND company_id = v_company_id
    LIMIT 1;
    
    IF v_current_role IS NULL THEN
      -- Crear la relación si no existe
      INSERT INTO company_users (user_id, company_id, role, status, joined_at)
      VALUES (v_user_id, v_company_id, 'owner', 'active', NOW())
      ON CONFLICT (user_id, company_id) DO NOTHING;
      RAISE NOTICE 'Relación creada: usuario % asignado como owner a empresa %', v_user_id, v_company_id;
    ELSIF v_current_role NOT IN ('owner', 'admin') OR v_current_status != 'active' THEN
      -- Actualizar el rol y status si no es owner/admin o no está activo
      UPDATE company_users
      SET role = 'owner',
          status = 'active',
          updated_at = NOW()
      WHERE user_id = v_user_id
        AND company_id = v_company_id;
      RAISE NOTICE 'Rol actualizado: usuario % ahora es owner y está active en empresa %', v_user_id, v_company_id;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- PASO 2: Asegurar que las funciones RLS funcionen correctamente
-- ============================================

-- Mejorar la función user_belongs_to_company para que sea más robusta
CREATE OR REPLACE FUNCTION user_belongs_to_company(
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
  
  -- Verificar si el usuario pertenece a la empresa
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
-- PASO 6: Función de diagnóstico
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
BEGIN
  RAISE NOTICE '=== DIAGNÓSTICO DE PERMISOS PARA hmartinez@hlms.cl ===';
  FOR v_result IN 
    SELECT * FROM check_user_employee_permissions('hmartinez@hlms.cl')
  LOOP
    RAISE NOTICE 'Usuario ID: %', v_result.user_id;
    RAISE NOTICE 'Email: %', v_result.email;
    RAISE NOTICE 'Empresa ID: %', v_result.company_id;
    RAISE NOTICE 'Nombre Empresa: %', v_result.company_name;
    RAISE NOTICE 'Rol en Empresa: %', v_result.role_in_company;
    RAISE NOTICE 'Status en Empresa: %', v_result.status_in_company;
    RAISE NOTICE 'Puede crear empleados: %', v_result.can_create_employees;
    RAISE NOTICE 'Puede gestionar CC: %', v_result.can_manage_cost_centers;
    RAISE NOTICE 'Puede gestionar departamentos: %', v_result.can_manage_departments;
    RAISE NOTICE 'Puede gestionar firmas: %', v_result.can_manage_signatures;
    RAISE NOTICE 'Razón: %', v_result.reason;
  END LOOP;
END $$;

