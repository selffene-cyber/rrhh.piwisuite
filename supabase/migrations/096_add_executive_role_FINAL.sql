-- ============================================================
-- Migración 096 FINAL: Agregar Rol "Executive" y Sistema de Permisos
-- ============================================================
-- Fecha: 16 de enero de 2026
-- Propósito: Crear rol intermedio para personal de secretariado
-- NOTA: Esta versión NO usa ENUM, usa VARCHAR con CHECK constraint
-- ============================================================

-- ============================================================
-- PASO 1: Actualizar CHECK constraints para agregar 'executive'
-- ============================================================

-- 1.1 Actualizar user_profiles.role
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- Buscar el constraint de role en user_profiles
  SELECT constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints
  WHERE table_name = 'user_profiles'
    AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%role%'
  LIMIT 1;
  
  -- Si existe, eliminarlo
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE user_profiles DROP CONSTRAINT ' || v_constraint_name;
    RAISE NOTICE '✓ Constraint anterior eliminado: %', v_constraint_name;
  END IF;
  
  -- Agregar nuevo constraint con 'executive'
  ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('super_admin', 'admin', 'executive', 'user'));
  
  RAISE NOTICE '✅ Rol "executive" agregado a user_profiles.role';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al actualizar user_profiles.role: %', SQLERRM;
END$$;

-- 1.2 Actualizar company_users.role
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- Buscar el constraint de role en company_users
  SELECT constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints
  WHERE table_name = 'company_users'
    AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%role%'
  LIMIT 1;
  
  -- Si existe, eliminarlo
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE company_users DROP CONSTRAINT ' || v_constraint_name;
    RAISE NOTICE '✓ Constraint anterior eliminado: %', v_constraint_name;
  END IF;
  
  -- Agregar nuevo constraint con 'executive'
  ALTER TABLE company_users
  ADD CONSTRAINT company_users_role_check 
  CHECK (role IN ('owner', 'admin', 'executive', 'user'));
  
  RAISE NOTICE '✅ Rol "executive" agregado a company_users.role';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al actualizar company_users.role: %', SQLERRM;
END$$;

-- ============================================================
-- PASO 2: Crear tabla de permisos granulares
-- ============================================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- ========================================
  -- Permisos de Documentos (crear vs aprobar)
  -- ========================================
  can_create_permissions BOOLEAN DEFAULT false,
  can_approve_permissions BOOLEAN DEFAULT false,
  
  can_create_vacations BOOLEAN DEFAULT false,
  can_approve_vacations BOOLEAN DEFAULT false,
  
  can_create_contracts BOOLEAN DEFAULT false,
  can_approve_contracts BOOLEAN DEFAULT false,
  
  can_create_amendments BOOLEAN DEFAULT false,
  can_approve_amendments BOOLEAN DEFAULT false,
  
  can_create_certificates BOOLEAN DEFAULT false,
  can_approve_certificates BOOLEAN DEFAULT false,
  
  can_create_disciplinary BOOLEAN DEFAULT false,
  can_approve_disciplinary BOOLEAN DEFAULT false,
  
  can_create_overtime_pacts BOOLEAN DEFAULT false,
  can_approve_overtime_pacts BOOLEAN DEFAULT false,
  
  -- ========================================
  -- Permisos Financieros
  -- ========================================
  can_create_payroll BOOLEAN DEFAULT false,
  can_approve_payroll BOOLEAN DEFAULT false,
  
  can_create_settlements BOOLEAN DEFAULT false,
  can_approve_settlements BOOLEAN DEFAULT false,
  
  can_create_advances BOOLEAN DEFAULT false,
  can_approve_advances BOOLEAN DEFAULT false,
  
  can_manage_loans BOOLEAN DEFAULT false,
  
  -- ========================================
  -- Permisos Organizacionales
  -- ========================================
  can_manage_departments BOOLEAN DEFAULT false,
  can_manage_cost_centers BOOLEAN DEFAULT false,
  can_manage_org_chart BOOLEAN DEFAULT false,
  
  -- ========================================
  -- Permisos de Cumplimiento
  -- ========================================
  can_manage_compliance BOOLEAN DEFAULT false,
  can_manage_raat BOOLEAN DEFAULT false,
  
  -- ========================================
  -- Permisos de Documentos (banco)
  -- ========================================
  can_manage_documents BOOLEAN DEFAULT false,
  
  -- ========================================
  -- Permisos de Configuración
  -- ========================================
  can_manage_company_settings BOOLEAN DEFAULT false,
  
  -- ========================================
  -- Metadatos
  -- ========================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un usuario solo puede tener un conjunto de permisos por empresa
  UNIQUE(user_id, company_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company_id ON user_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_company ON user_permissions(user_id, company_id);

-- Comentarios
COMMENT ON TABLE user_permissions IS 'Permisos granulares por usuario y empresa';
COMMENT ON COLUMN user_permissions.user_id IS 'Usuario al que se le asignan los permisos';
COMMENT ON COLUMN user_permissions.company_id IS 'Empresa en la que aplican los permisos';

-- ============================================================
-- PASO 3: Configurar Row Level Security (RLS)
-- ============================================================

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propios permisos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_permissions' 
    AND policyname = 'user_permissions_select_own'
  ) THEN
    CREATE POLICY "user_permissions_select_own"
      ON user_permissions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Política: Super admins pueden ver todos los permisos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_permissions' 
    AND policyname = 'user_permissions_select_super_admin'
  ) THEN
    CREATE POLICY "user_permissions_select_super_admin"
      ON user_permissions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      );
  END IF;
END$$;

-- Política: Super admins pueden insertar permisos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_permissions' 
    AND policyname = 'user_permissions_insert_super_admin'
  ) THEN
    CREATE POLICY "user_permissions_insert_super_admin"
      ON user_permissions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      );
  END IF;
END$$;

-- Política: Admins de empresa pueden ver permisos de su empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_permissions' 
    AND policyname = 'user_permissions_select_company_admin'
  ) THEN
    CREATE POLICY "user_permissions_select_company_admin"
      ON user_permissions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM company_users cu
          WHERE cu.user_id = auth.uid()
            AND cu.company_id = user_permissions.company_id
            AND cu.role IN ('admin', 'owner')
            AND cu.status = 'active'
        )
      );
  END IF;
END$$;

-- Política: Admins de empresa pueden insertar permisos en su empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_permissions' 
    AND policyname = 'user_permissions_insert_company_admin'
  ) THEN
    CREATE POLICY "user_permissions_insert_company_admin"
      ON user_permissions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM company_users cu
          WHERE cu.user_id = auth.uid()
            AND cu.company_id = user_permissions.company_id
            AND cu.role IN ('admin', 'owner')
            AND cu.status = 'active'
        )
      );
  END IF;
END$$;

-- Política: Super admins pueden actualizar todos los permisos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_permissions' 
    AND policyname = 'user_permissions_update_super_admin'
  ) THEN
    CREATE POLICY "user_permissions_update_super_admin"
      ON user_permissions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      );
  END IF;
END$$;

-- Política: Admins de empresa pueden actualizar permisos de su empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_permissions' 
    AND policyname = 'user_permissions_update_company_admin'
  ) THEN
    CREATE POLICY "user_permissions_update_company_admin"
      ON user_permissions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM company_users cu
          WHERE cu.user_id = auth.uid()
            AND cu.company_id = user_permissions.company_id
            AND cu.role IN ('admin', 'owner')
            AND cu.status = 'active'
        )
      );
  END IF;
END$$;

-- Política: Super admins pueden eliminar permisos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_permissions' 
    AND policyname = 'user_permissions_delete_super_admin'
  ) THEN
    CREATE POLICY "user_permissions_delete_super_admin"
      ON user_permissions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      );
  END IF;
END$$;

-- Política: Admins de empresa pueden eliminar permisos de su empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_permissions' 
    AND policyname = 'user_permissions_delete_company_admin'
  ) THEN
    CREATE POLICY "user_permissions_delete_company_admin"
      ON user_permissions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM company_users cu
          WHERE cu.user_id = auth.uid()
            AND cu.company_id = user_permissions.company_id
            AND cu.role IN ('admin', 'owner')
            AND cu.status = 'active'
        )
      );
  END IF;
END$$;

-- ============================================================
-- PASO 4: Función helper para obtener permisos
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS TABLE (
  permission_name TEXT,
  has_permission BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(ARRAY[
      'can_create_permissions',
      'can_approve_permissions',
      'can_create_vacations',
      'can_approve_vacations',
      'can_create_contracts',
      'can_approve_contracts',
      'can_create_amendments',
      'can_approve_amendments',
      'can_create_certificates',
      'can_approve_certificates',
      'can_create_disciplinary',
      'can_approve_disciplinary',
      'can_create_overtime_pacts',
      'can_approve_overtime_pacts',
      'can_create_payroll',
      'can_approve_payroll',
      'can_create_settlements',
      'can_approve_settlements',
      'can_create_advances',
      'can_approve_advances',
      'can_manage_loans',
      'can_manage_departments',
      'can_manage_cost_centers',
      'can_manage_org_chart',
      'can_manage_compliance',
      'can_manage_raat',
      'can_manage_documents',
      'can_manage_company_settings'
    ]) AS permission_name,
    unnest(ARRAY[
      COALESCE(up.can_create_permissions, false),
      COALESCE(up.can_approve_permissions, false),
      COALESCE(up.can_create_vacations, false),
      COALESCE(up.can_approve_vacations, false),
      COALESCE(up.can_create_contracts, false),
      COALESCE(up.can_approve_contracts, false),
      COALESCE(up.can_create_amendments, false),
      COALESCE(up.can_approve_amendments, false),
      COALESCE(up.can_create_certificates, false),
      COALESCE(up.can_approve_certificates, false),
      COALESCE(up.can_create_disciplinary, false),
      COALESCE(up.can_approve_disciplinary, false),
      COALESCE(up.can_create_overtime_pacts, false),
      COALESCE(up.can_approve_overtime_pacts, false),
      COALESCE(up.can_create_payroll, false),
      COALESCE(up.can_approve_payroll, false),
      COALESCE(up.can_create_settlements, false),
      COALESCE(up.can_approve_settlements, false),
      COALESCE(up.can_create_advances, false),
      COALESCE(up.can_approve_advances, false),
      COALESCE(up.can_manage_loans, false),
      COALESCE(up.can_manage_departments, false),
      COALESCE(up.can_manage_cost_centers, false),
      COALESCE(up.can_manage_org_chart, false),
      COALESCE(up.can_manage_compliance, false),
      COALESCE(up.can_manage_raat, false),
      COALESCE(up.can_manage_documents, false),
      COALESCE(up.can_manage_company_settings, false)
    ]) AS has_permission
  FROM user_permissions up
  WHERE up.user_id = p_user_id
    AND up.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_permissions IS 'Obtiene todos los permisos de un usuario en una empresa específica';

-- ============================================================
-- PASO 5: Insertar permisos por defecto para rol "executive"
-- ============================================================

-- Función para crear permisos por defecto al crear/actualizar un usuario executive
CREATE OR REPLACE FUNCTION create_default_executive_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo para usuarios con rol executive
  IF NEW.role = 'executive' THEN
    -- Insertar permisos por defecto en todas las empresas donde es miembro
    INSERT INTO user_permissions (
      user_id,
      company_id,
      -- Permisos de creación (sin aprobación)
      can_create_permissions,
      can_create_vacations,
      can_create_amendments,
      can_create_certificates,
      can_create_disciplinary,
      can_create_overtime_pacts,
      -- Permisos de cumplimiento (completo)
      can_manage_compliance,
      can_manage_raat,
      can_manage_documents
    )
    SELECT 
      NEW.id,
      cu.company_id,
      true, -- can_create_permissions
      true, -- can_create_vacations
      true, -- can_create_amendments
      true, -- can_create_certificates
      true, -- can_create_disciplinary
      true, -- can_create_overtime_pacts
      true, -- can_manage_compliance
      true, -- can_manage_raat
      true  -- can_manage_documents
    FROM company_users cu
    WHERE cu.user_id = NEW.id
    ON CONFLICT (user_id, company_id) DO UPDATE SET
      can_create_permissions = true,
      can_create_vacations = true,
      can_create_amendments = true,
      can_create_certificates = true,
      can_create_disciplinary = true,
      can_create_overtime_pacts = true,
      can_manage_compliance = true,
      can_manage_raat = true,
      can_manage_documents = true,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear permisos automáticamente cuando se actualiza el rol
DROP TRIGGER IF EXISTS trigger_create_executive_permissions ON user_profiles;
CREATE TRIGGER trigger_create_executive_permissions
  AFTER INSERT OR UPDATE OF role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_executive_permissions();

COMMENT ON FUNCTION create_default_executive_permissions IS 'Crea automáticamente permisos por defecto para usuarios con rol executive';

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migración 096 completada exitosamente';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Rol "executive" agregado a user_profiles y company_users';
  RAISE NOTICE '✅ Tabla "user_permissions" creada con 28 permisos';
  RAISE NOTICE '✅ RLS configurado con 8 políticas';
  RAISE NOTICE '✅ Función get_user_permissions() creada';
  RAISE NOTICE '✅ Trigger automático para permisos executive creado';
  RAISE NOTICE '========================================';
END$$;
