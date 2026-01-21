-- =====================================================
-- MIGRACIÓN 101: Agregar permisos granulares de Préstamos y Configuración
-- =====================================================
-- 
-- Esta migración:
-- 1. Reemplaza can_manage_loans con permisos granulares de préstamos
-- 2. Reemplaza can_manage_company_settings con permisos granulares de configuración
-- 3. Actualiza los permisos por defecto para cada rol
-- 4. Actualiza el trigger create_default_executive_permissions()
--
-- Permisos de Préstamos:
-- - can_view_loans: Ver lista de préstamos
-- - can_create_loans: Crear nuevos préstamos
-- - can_edit_loans: Editar préstamos existentes
-- - can_delete_loans: Eliminar préstamos
-- - can_download_loans: Descargar PDF de préstamos
--
-- Permisos de Configuración:
-- - can_edit_company_settings: Editar datos de empresa (RUT, razón social, etc.)
-- - can_manage_indicators: Gestionar indicadores económicos (UF, UTM, etc.)
-- - can_manage_signatures: Gestionar firmas digitales
-- - can_manage_tax_brackets: Gestionar tramos tributarios
-- - can_manage_users_roles: Gestionar usuarios y roles
-- =====================================================

-- ============================================
-- PASO 1: Agregar nuevas columnas de préstamos
-- ============================================

DO $$
BEGIN
  -- Agregar permisos de préstamos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_view_loans') THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_loans BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_view_loans agregada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_create_loans') THEN
    ALTER TABLE user_permissions ADD COLUMN can_create_loans BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_create_loans agregada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_edit_loans') THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_loans BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_edit_loans agregada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_delete_loans') THEN
    ALTER TABLE user_permissions ADD COLUMN can_delete_loans BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_delete_loans agregada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_download_loans') THEN
    ALTER TABLE user_permissions ADD COLUMN can_download_loans BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_download_loans agregada';
  END IF;
END $$;

-- ============================================
-- PASO 2: Agregar nuevas columnas de configuración
-- ============================================

DO $$
BEGIN
  -- Agregar permisos de configuración
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_edit_company_settings') THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_company_settings BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_edit_company_settings agregada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_manage_indicators') THEN
    ALTER TABLE user_permissions ADD COLUMN can_manage_indicators BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_manage_indicators agregada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_manage_signatures') THEN
    ALTER TABLE user_permissions ADD COLUMN can_manage_signatures BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_manage_signatures agregada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_manage_tax_brackets') THEN
    ALTER TABLE user_permissions ADD COLUMN can_manage_tax_brackets BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_manage_tax_brackets agregada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_permissions' AND column_name = 'can_manage_users_roles') THEN
    ALTER TABLE user_permissions ADD COLUMN can_manage_users_roles BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna can_manage_users_roles agregada';
  END IF;
END $$;

-- ============================================
-- PASO 3: Migrar datos existentes de can_manage_loans a permisos granulares
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migrando permisos de préstamos existentes...';
  
  -- Si tenía can_manage_loans = true, darle todos los permisos de préstamos
  UPDATE user_permissions
  SET 
    can_view_loans = true,
    can_create_loans = true,
    can_edit_loans = true,
    can_delete_loans = true,
    can_download_loans = true
  WHERE can_manage_loans = true;

  RAISE NOTICE 'Permisos de préstamos migrados exitosamente';
END $$;

-- ============================================
-- PASO 4: Migrar datos existentes de can_manage_company_settings a permisos granulares
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migrando permisos de configuración existentes...';
  
  -- Si tenía can_manage_company_settings = true, darle todos los permisos de configuración
  UPDATE user_permissions
  SET 
    can_edit_company_settings = true,
    can_manage_indicators = true,
    can_manage_signatures = true,
    can_manage_tax_brackets = true,
    can_manage_users_roles = true
  WHERE can_manage_company_settings = true;

  RAISE NOTICE 'Permisos de configuración migrados exitosamente';
END $$;

-- ============================================
-- PASO 5: Actualizar permisos por defecto para super_admin
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Actualizando permisos de super_admin...';
  
  UPDATE user_permissions
  SET 
    -- Préstamos: acceso total
    can_view_loans = true,
    can_create_loans = true,
    can_edit_loans = true,
    can_delete_loans = true,
    can_download_loans = true,
    -- Configuración: acceso total
    can_edit_company_settings = true,
    can_manage_indicators = true,
    can_manage_signatures = true,
    can_manage_tax_brackets = true,
    can_manage_users_roles = true
  WHERE user_id IN (
    SELECT id FROM user_profiles WHERE role = 'super_admin'
  );

  RAISE NOTICE 'Permisos de super_admin actualizados';
END $$;

-- ============================================
-- PASO 6: Actualizar permisos por defecto para admin
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Actualizando permisos de admin...';
  
  UPDATE user_permissions up
  SET 
    -- Préstamos: acceso total
    can_view_loans = true,
    can_create_loans = true,
    can_edit_loans = true,
    can_delete_loans = true,
    can_download_loans = true,
    -- Configuración: acceso total
    can_edit_company_settings = true,
    can_manage_indicators = true,
    can_manage_signatures = true,
    can_manage_tax_brackets = true,
    can_manage_users_roles = true
  WHERE EXISTS (
    SELECT 1 FROM company_users cu 
    WHERE cu.user_id = up.user_id 
    AND cu.company_id = up.company_id 
    AND cu.role IN ('admin', 'owner')
  );

  RAISE NOTICE 'Permisos de admin actualizados';
END $$;

-- ============================================
-- PASO 7: Actualizar permisos por defecto para executive
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Actualizando permisos de executive...';
  
  UPDATE user_permissions up
  SET 
    -- Préstamos: puede ver, crear y descargar, pero NO editar/eliminar
    can_view_loans = true,
    can_create_loans = true,
    can_edit_loans = false,
    can_delete_loans = false,
    can_download_loans = true,
    -- Configuración: sin acceso
    can_edit_company_settings = false,
    can_manage_indicators = false,
    can_manage_signatures = false,
    can_manage_tax_brackets = false,
    can_manage_users_roles = false
  WHERE EXISTS (
    SELECT 1 FROM company_users cu 
    WHERE cu.user_id = up.user_id 
    AND cu.company_id = up.company_id 
    AND cu.role = 'executive'
  );

  RAISE NOTICE 'Permisos de executive actualizados';
END $$;

-- ============================================
-- PASO 8: Actualizar trigger create_default_executive_permissions
-- ============================================

CREATE OR REPLACE FUNCTION create_default_executive_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo proceder si el rol es 'executive'
  IF NEW.role = 'executive' THEN
    -- Insertar o actualizar permisos del ejecutivo
    INSERT INTO user_permissions (
      user_id,
      company_id,
      -- Vista y acceso
      can_view_employees,
      can_view_employee_details,
      can_view_employee_salary,
      can_view_contracts,
      -- Descargas
      can_download_contracts,
      can_download_payroll,
      can_download_certificates,
      can_download_settlements,
      can_download_employee_documents,
      -- Permisos
      can_create_permissions,
      can_approve_permissions,
      -- Vacaciones
      can_create_vacations,
      can_approve_vacations,
      -- Contratos
      can_create_contracts,
      can_approve_contracts,
      can_edit_contracts,
      can_delete_contracts,
      -- Anexos
      can_create_amendments,
      can_approve_amendments,
      -- Certificados
      can_create_certificates,
      can_approve_certificates,
      -- Amonestaciones
      can_create_disciplinary,
      can_approve_disciplinary,
      -- Pactos de horas extras
      can_create_overtime_pacts,
      can_approve_overtime_pacts,
      -- Liquidaciones
      can_create_payroll,
      can_approve_payroll,
      -- Finiquitos
      can_create_settlements,
      can_approve_settlements,
      -- Anticipos
      can_create_advances,
      can_approve_advances,
      -- Préstamos (granular)
      can_view_loans,
      can_create_loans,
      can_edit_loans,
      can_delete_loans,
      can_download_loans,
      -- Cumplimiento
      can_view_compliance,
      can_create_compliance,
      can_edit_compliance,
      can_delete_compliance,
      can_download_compliance_reports,
      -- RAAT
      can_view_raat,
      can_create_raat,
      can_edit_raat,
      can_delete_raat,
      can_download_raat_reports,
      -- Banco de Documentos
      can_view_documents,
      can_upload_documents,
      can_download_documents,
      can_edit_documents,
      can_delete_documents,
      can_manage_document_categories,
      -- Departamentos
      can_view_departments,
      can_create_departments,
      can_edit_departments,
      can_delete_departments,
      -- Centros de Costo
      can_view_cost_centers,
      can_create_cost_centers,
      can_edit_cost_centers,
      can_delete_cost_centers,
      can_assign_cost_centers,
      -- Organigrama
      can_view_org_chart,
      can_edit_org_chart,
      can_download_org_chart,
      -- Configuración (granular)
      can_edit_company_settings,
      can_manage_indicators,
      can_manage_signatures,
      can_manage_tax_brackets,
      can_manage_users_roles,
      -- DEPRECATED (mantener por compatibilidad)
      can_manage_loans,
      can_manage_company_settings
    ) VALUES (
      NEW.user_id,
      NEW.company_id,
      -- Vista y acceso: ✅ Puede ver trabajadores y detalles básicos
      TRUE,  -- can_view_employees
      TRUE,  -- can_view_employee_details
      FALSE, -- can_view_employee_salary (NO puede ver salarios)
      TRUE,  -- can_view_contracts
      -- Descargas: ✅ Puede descargar documentos pero NO liquidaciones/finiquitos
      TRUE,  -- can_download_contracts
      FALSE, -- can_download_payroll (NO puede descargar liquidaciones)
      TRUE,  -- can_download_certificates
      FALSE, -- can_download_settlements (NO puede descargar finiquitos)
      FALSE, -- can_download_employee_documents
      -- Permisos: ✅ Crear pero NO aprobar
      TRUE,  -- can_create_permissions
      FALSE, -- can_approve_permissions
      -- Vacaciones: ✅ Crear pero NO aprobar
      TRUE,  -- can_create_vacations
      FALSE, -- can_approve_vacations
      -- Contratos: ❌ NO puede gestionar contratos
      FALSE, -- can_create_contracts
      FALSE, -- can_approve_contracts
      FALSE, -- can_edit_contracts
      FALSE, -- can_delete_contracts
      -- Anexos: ✅ Crear pero NO aprobar
      TRUE,  -- can_create_amendments
      FALSE, -- can_approve_amendments
      -- Certificados: ✅ Crear pero NO aprobar
      TRUE,  -- can_create_certificates
      FALSE, -- can_approve_certificates
      -- Amonestaciones: ✅ Crear pero NO aprobar
      TRUE,  -- can_create_disciplinary
      FALSE, -- can_approve_disciplinary
      -- Pactos de horas extras: ✅ Crear pero NO aprobar
      TRUE,  -- can_create_overtime_pacts
      FALSE, -- can_approve_overtime_pacts
      -- Liquidaciones: ❌ Sin acceso
      FALSE, -- can_create_payroll
      FALSE, -- can_approve_payroll
      -- Finiquitos: ❌ Sin acceso
      FALSE, -- can_create_settlements
      FALSE, -- can_approve_settlements
      -- Anticipos: ❌ Sin acceso
      FALSE, -- can_create_advances
      FALSE, -- can_approve_advances
      -- Préstamos (granular): ✅ Ver, crear y descargar, pero NO editar/eliminar
      TRUE,  -- can_view_loans
      TRUE,  -- can_create_loans
      FALSE, -- can_edit_loans
      FALSE, -- can_delete_loans
      TRUE,  -- can_download_loans
      -- Cumplimiento: ✅ Ver y crear, pero NO editar/eliminar
      TRUE,  -- can_view_compliance
      TRUE,  -- can_create_compliance
      FALSE, -- can_edit_compliance
      FALSE, -- can_delete_compliance
      TRUE,  -- can_download_compliance_reports
      -- RAAT: ✅ Ver y crear, pero NO editar/eliminar
      TRUE,  -- can_view_raat
      TRUE,  -- can_create_raat
      FALSE, -- can_edit_raat
      FALSE, -- can_delete_raat
      TRUE,  -- can_download_raat_reports
      -- Banco de Documentos: ✅ Ver, subir y descargar, pero NO editar/eliminar
      TRUE,  -- can_view_documents
      TRUE,  -- can_upload_documents
      TRUE,  -- can_download_documents
      FALSE, -- can_edit_documents
      FALSE, -- can_delete_documents
      TRUE,  -- can_manage_document_categories
      -- Departamentos: ✅ Ver y crear, pero NO editar/eliminar
      TRUE,  -- can_view_departments
      TRUE,  -- can_create_departments
      FALSE, -- can_edit_departments
      FALSE, -- can_delete_departments
      -- Centros de Costo: ✅ Ver y crear, pero NO editar/eliminar/asignar
      TRUE,  -- can_view_cost_centers
      TRUE,  -- can_create_cost_centers
      FALSE, -- can_edit_cost_centers
      FALSE, -- can_delete_cost_centers
      FALSE, -- can_assign_cost_centers
      -- Organigrama: ✅ Solo ver y descargar
      TRUE,  -- can_view_org_chart
      FALSE, -- can_edit_org_chart
      TRUE,  -- can_download_org_chart
      -- Configuración (granular): ❌ Sin acceso a configuración
      FALSE, -- can_edit_company_settings
      FALSE, -- can_manage_indicators
      FALSE, -- can_manage_signatures
      FALSE, -- can_manage_tax_brackets
      FALSE, -- can_manage_users_roles
      -- DEPRECATED (mantener por compatibilidad)
      FALSE, -- can_manage_loans
      FALSE  -- can_manage_company_settings
    )
    ON CONFLICT (user_id, company_id) 
    DO UPDATE SET
      -- Vista y acceso
      can_view_employees = EXCLUDED.can_view_employees,
      can_view_employee_details = EXCLUDED.can_view_employee_details,
      can_view_employee_salary = EXCLUDED.can_view_employee_salary,
      can_view_contracts = EXCLUDED.can_view_contracts,
      -- Descargas
      can_download_contracts = EXCLUDED.can_download_contracts,
      can_download_payroll = EXCLUDED.can_download_payroll,
      can_download_certificates = EXCLUDED.can_download_certificates,
      can_download_settlements = EXCLUDED.can_download_settlements,
      can_download_employee_documents = EXCLUDED.can_download_employee_documents,
      -- Permisos
      can_create_permissions = EXCLUDED.can_create_permissions,
      can_approve_permissions = EXCLUDED.can_approve_permissions,
      -- Vacaciones
      can_create_vacations = EXCLUDED.can_create_vacations,
      can_approve_vacations = EXCLUDED.can_approve_vacations,
      -- Contratos
      can_create_contracts = EXCLUDED.can_create_contracts,
      can_approve_contracts = EXCLUDED.can_approve_contracts,
      can_edit_contracts = EXCLUDED.can_edit_contracts,
      can_delete_contracts = EXCLUDED.can_delete_contracts,
      -- Anexos
      can_create_amendments = EXCLUDED.can_create_amendments,
      can_approve_amendments = EXCLUDED.can_approve_amendments,
      -- Certificados
      can_create_certificates = EXCLUDED.can_create_certificates,
      can_approve_certificates = EXCLUDED.can_approve_certificates,
      -- Amonestaciones
      can_create_disciplinary = EXCLUDED.can_create_disciplinary,
      can_approve_disciplinary = EXCLUDED.can_approve_disciplinary,
      -- Pactos de horas extras
      can_create_overtime_pacts = EXCLUDED.can_create_overtime_pacts,
      can_approve_overtime_pacts = EXCLUDED.can_approve_overtime_pacts,
      -- Liquidaciones
      can_create_payroll = EXCLUDED.can_create_payroll,
      can_approve_payroll = EXCLUDED.can_approve_payroll,
      -- Finiquitos
      can_create_settlements = EXCLUDED.can_create_settlements,
      can_approve_settlements = EXCLUDED.can_approve_settlements,
      -- Anticipos
      can_create_advances = EXCLUDED.can_create_advances,
      can_approve_advances = EXCLUDED.can_approve_advances,
      -- Préstamos (granular)
      can_view_loans = EXCLUDED.can_view_loans,
      can_create_loans = EXCLUDED.can_create_loans,
      can_edit_loans = EXCLUDED.can_edit_loans,
      can_delete_loans = EXCLUDED.can_delete_loans,
      can_download_loans = EXCLUDED.can_download_loans,
      -- Cumplimiento
      can_view_compliance = EXCLUDED.can_view_compliance,
      can_create_compliance = EXCLUDED.can_create_compliance,
      can_edit_compliance = EXCLUDED.can_edit_compliance,
      can_delete_compliance = EXCLUDED.can_delete_compliance,
      can_download_compliance_reports = EXCLUDED.can_download_compliance_reports,
      -- RAAT
      can_view_raat = EXCLUDED.can_view_raat,
      can_create_raat = EXCLUDED.can_create_raat,
      can_edit_raat = EXCLUDED.can_edit_raat,
      can_delete_raat = EXCLUDED.can_delete_raat,
      can_download_raat_reports = EXCLUDED.can_download_raat_reports,
      -- Banco de Documentos
      can_view_documents = EXCLUDED.can_view_documents,
      can_upload_documents = EXCLUDED.can_upload_documents,
      can_download_documents = EXCLUDED.can_download_documents,
      can_edit_documents = EXCLUDED.can_edit_documents,
      can_delete_documents = EXCLUDED.can_delete_documents,
      can_manage_document_categories = EXCLUDED.can_manage_document_categories,
      -- Departamentos
      can_view_departments = EXCLUDED.can_view_departments,
      can_create_departments = EXCLUDED.can_create_departments,
      can_edit_departments = EXCLUDED.can_edit_departments,
      can_delete_departments = EXCLUDED.can_delete_departments,
      -- Centros de Costo
      can_view_cost_centers = EXCLUDED.can_view_cost_centers,
      can_create_cost_centers = EXCLUDED.can_create_cost_centers,
      can_edit_cost_centers = EXCLUDED.can_edit_cost_centers,
      can_delete_cost_centers = EXCLUDED.can_delete_cost_centers,
      can_assign_cost_centers = EXCLUDED.can_assign_cost_centers,
      -- Organigrama
      can_view_org_chart = EXCLUDED.can_view_org_chart,
      can_edit_org_chart = EXCLUDED.can_edit_org_chart,
      can_download_org_chart = EXCLUDED.can_download_org_chart,
      -- Configuración (granular)
      can_edit_company_settings = EXCLUDED.can_edit_company_settings,
      can_manage_indicators = EXCLUDED.can_manage_indicators,
      can_manage_signatures = EXCLUDED.can_manage_signatures,
      can_manage_tax_brackets = EXCLUDED.can_manage_tax_brackets,
      can_manage_users_roles = EXCLUDED.can_manage_users_roles,
      -- DEPRECATED
      can_manage_loans = EXCLUDED.can_manage_loans,
      can_manage_company_settings = EXCLUDED.can_manage_company_settings,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que el trigger existe (ya debería existir de migraciones anteriores)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_executive_role_change' 
    AND tgrelid = 'company_users'::regclass
  ) THEN
    CREATE TRIGGER on_executive_role_change
      AFTER INSERT OR UPDATE OF role ON company_users
      FOR EACH ROW
      EXECUTE FUNCTION create_default_executive_permissions();
    RAISE NOTICE 'Trigger on_executive_role_change creado';
  ELSE
    RAISE NOTICE 'Trigger on_executive_role_change ya existe';
  END IF;
END $$;

-- ============================================
-- FINALIZACIÓN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración 101 completada exitosamente';
  RAISE NOTICE '📋 Resumen:';
  RAISE NOTICE '  - Agregados 5 permisos granulares de préstamos';
  RAISE NOTICE '  - Agregados 5 permisos granulares de configuración';
  RAISE NOTICE '  - Datos migrados desde can_manage_loans y can_manage_company_settings';
  RAISE NOTICE '  - Permisos actualizados para super_admin, admin y executive';
  RAISE NOTICE '  - Trigger create_default_executive_permissions() actualizado';
END $$;
