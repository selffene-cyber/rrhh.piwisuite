-- =====================================================
-- Migración 098: Agregar Permisos Granulares
-- =====================================================
-- Fecha: 2026-01-16
-- Descripción: Agrega permisos más granulares para:
--   - Vista de trabajadores y niveles de detalle
--   - Descargas de documentos específicos
--   - Gestión completa de contratos
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 Iniciando migración 098: Permisos Granulares...';
END $$;

-- =====================================================
-- PASO 1: Agregar nuevas columnas de permisos de VISTA
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '📋 Agregando permisos de VISTA...';
END $$;

ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS can_view_employees BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_view_employee_details BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_view_employee_salary BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_view_contracts BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PASO 2: Agregar nuevas columnas de permisos de DESCARGA
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '💾 Agregando permisos de DESCARGA...';
END $$;

ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS can_download_contracts BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_payroll BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_certificates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_settlements BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_employee_documents BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PASO 3: Agregar nuevas columnas de gestión de CONTRATOS
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '📝 Agregando permisos de CONTRATOS...';
END $$;

ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS can_edit_contracts BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_delete_contracts BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PASO 4: Actualizar permisos por defecto para SUPER_ADMIN
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '👑 Actualizando permisos de SUPER_ADMIN...';
END $$;

UPDATE user_permissions 
SET 
  -- Vista
  can_view_employees = TRUE,
  can_view_employee_details = TRUE,
  can_view_employee_salary = TRUE,
  can_view_contracts = TRUE,
  -- Descarga
  can_download_contracts = TRUE,
  can_download_payroll = TRUE,
  can_download_certificates = TRUE,
  can_download_settlements = TRUE,
  can_download_employee_documents = TRUE,
  -- Contratos
  can_edit_contracts = TRUE,
  can_delete_contracts = TRUE
WHERE user_id IN (
  SELECT id FROM user_profiles WHERE role = 'super_admin'
);

-- =====================================================
-- PASO 5: Actualizar permisos por defecto para ADMIN
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔑 Actualizando permisos de ADMIN...';
END $$;

UPDATE user_permissions 
SET 
  -- Vista
  can_view_employees = TRUE,
  can_view_employee_details = TRUE,
  can_view_employee_salary = TRUE,
  can_view_contracts = TRUE,
  -- Descarga
  can_download_contracts = TRUE,
  can_download_payroll = TRUE,
  can_download_certificates = TRUE,
  can_download_settlements = TRUE,
  can_download_employee_documents = TRUE,
  -- Contratos
  can_edit_contracts = TRUE,
  can_delete_contracts = TRUE
WHERE user_id IN (
  SELECT id FROM user_profiles WHERE role = 'admin'
);

-- =====================================================
-- PASO 6: Actualizar permisos por defecto para EXECUTIVE
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '💼 Actualizando permisos de EXECUTIVE...';
END $$;

UPDATE user_permissions 
SET 
  -- Vista: puede ver trabajadores y detalles, pero NO salarios
  can_view_employees = TRUE,
  can_view_employee_details = TRUE,
  can_view_employee_salary = FALSE,
  can_view_contracts = TRUE,
  -- Descarga: puede descargar documentos generales, pero NO financieros
  can_download_contracts = TRUE,
  can_download_payroll = FALSE,
  can_download_certificates = TRUE,
  can_download_settlements = FALSE,
  can_download_employee_documents = TRUE,
  -- Contratos: puede crear pero NO editar/eliminar
  can_create_contracts = TRUE,
  can_edit_contracts = FALSE,
  can_delete_contracts = FALSE
WHERE user_id IN (
  SELECT id FROM user_profiles WHERE role = 'executive'
);

-- =====================================================
-- PASO 7: Actualizar función de permisos por defecto
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '⚙️ Actualizando función create_default_executive_permissions...';
END $$;

CREATE OR REPLACE FUNCTION create_default_executive_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el rol es 'executive', crear permisos por defecto
  IF NEW.role = 'executive' THEN
    INSERT INTO user_permissions (
      user_id,
      company_id,
      -- Vista
      can_view_employees,
      can_view_employee_details,
      can_view_employee_salary,
      can_view_contracts,
      -- Descarga
      can_download_contracts,
      can_download_payroll,
      can_download_certificates,
      can_download_settlements,
      can_download_employee_documents,
      -- Documentos
      can_create_permissions,
      can_approve_permissions,
      can_create_vacations,
      can_approve_vacations,
      can_create_contracts,
      can_approve_contracts,
      can_edit_contracts,
      can_delete_contracts,
      can_create_amendments,
      can_approve_amendments,
      can_create_certificates,
      can_approve_certificates,
      can_create_disciplinary,
      can_approve_disciplinary,
      can_create_overtime_pacts,
      can_approve_overtime_pacts,
      -- Finanzas
      can_create_payroll,
      can_approve_payroll,
      can_create_settlements,
      can_approve_settlements,
      can_create_advances,
      can_approve_advances,
      can_manage_loans,
      -- Organización
      can_manage_departments,
      can_manage_cost_centers,
      can_manage_org_chart,
      -- Cumplimiento
      can_manage_compliance,
      can_manage_raat,
      can_manage_documents,
      -- Configuración
      can_manage_company_settings
    )
    SELECT 
      NEW.user_id,
      NEW.company_id,
      -- Vista: puede ver trabajadores y detalles, pero NO salarios
      TRUE,  -- can_view_employees
      TRUE,  -- can_view_employee_details
      FALSE, -- can_view_employee_salary
      TRUE,  -- can_view_contracts
      -- Descarga: documentos generales SÍ, financieros NO
      TRUE,  -- can_download_contracts
      FALSE, -- can_download_payroll
      TRUE,  -- can_download_certificates
      FALSE, -- can_download_settlements
      TRUE,  -- can_download_employee_documents
      -- Documentos: puede CREAR pero NO aprobar
      TRUE,  -- can_create_permissions
      FALSE, -- can_approve_permissions
      TRUE,  -- can_create_vacations
      FALSE, -- can_approve_vacations
      TRUE,  -- can_create_contracts
      FALSE, -- can_approve_contracts
      FALSE, -- can_edit_contracts
      FALSE, -- can_delete_contracts
      TRUE,  -- can_create_amendments
      FALSE, -- can_approve_amendments
      TRUE,  -- can_create_certificates
      FALSE, -- can_approve_certificates
      TRUE,  -- can_create_disciplinary
      FALSE, -- can_approve_disciplinary
      TRUE,  -- can_create_overtime_pacts
      FALSE, -- can_approve_overtime_pacts
      -- Finanzas: sin acceso
      FALSE, -- can_create_payroll
      FALSE, -- can_approve_payroll
      FALSE, -- can_create_settlements
      FALSE, -- can_approve_settlements
      FALSE, -- can_create_advances
      FALSE, -- can_approve_advances
      FALSE, -- can_manage_loans
      -- Organización: sin acceso
      FALSE, -- can_manage_departments
      FALSE, -- can_manage_cost_centers
      FALSE, -- can_manage_org_chart
      -- Cumplimiento: acceso completo
      TRUE,  -- can_manage_compliance
      TRUE,  -- can_manage_raat
      TRUE,  -- can_manage_documents
      -- Configuración: sin acceso
      FALSE  -- can_manage_company_settings
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RESUMEN
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migración 098 completada exitosamente!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Nuevos permisos agregados:';
  RAISE NOTICE '   • 4 permisos de VISTA (trabajadores, detalles, salarios, contratos)';
  RAISE NOTICE '   • 5 permisos de DESCARGA (contratos, liquidaciones, certificados, finiquitos, documentos)';
  RAISE NOTICE '   • 2 permisos de CONTRATOS (editar, eliminar)';
  RAISE NOTICE '';
  RAISE NOTICE '👥 Permisos actualizados para todos los roles existentes';
  RAISE NOTICE '⚙️ Función de permisos por defecto actualizada';
END $$;
