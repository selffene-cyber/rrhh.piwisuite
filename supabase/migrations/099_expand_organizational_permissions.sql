-- =====================================================
-- Migración 099: Expandir Permisos Organizacionales
-- =====================================================
-- Fecha: 2026-01-16
-- Descripción: Expande permisos de "gestión completa" a permisos granulares para:
--   - Cumplimiento (5 permisos)
--   - RAAT (5 permisos)
--   - Banco de Documentos (6 permisos)
--   - Departamentos (4 permisos)
--   - Centros de Costo (5 permisos)
--   - Organigrama (3 permisos)
-- Total: 28 nuevos permisos granulares
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 Iniciando migración 099: Permisos Organizacionales Granulares...';
END $$;

-- =====================================================
-- PASO 1: Agregar permisos de CUMPLIMIENTO (5)
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Agregando permisos de CUMPLIMIENTO...';
END $$;

ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS can_view_compliance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_create_compliance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_edit_compliance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_delete_compliance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_compliance_reports BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PASO 2: Agregar permisos de RAAT (5)
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔍 Agregando permisos de RAAT...';
END $$;

ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS can_view_raat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_create_raat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_edit_raat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_delete_raat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_raat_reports BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PASO 3: Agregar permisos de BANCO DE DOCUMENTOS (6)
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '📁 Agregando permisos de BANCO DE DOCUMENTOS...';
END $$;

ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS can_view_documents BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_upload_documents BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_documents BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_edit_documents BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_delete_documents BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_manage_document_categories BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PASO 4: Agregar permisos de DEPARTAMENTOS (4)
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🏢 Agregando permisos de DEPARTAMENTOS...';
END $$;

ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS can_view_departments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_create_departments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_edit_departments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_delete_departments BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PASO 5: Agregar permisos de CENTROS DE COSTO (5)
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '💰 Agregando permisos de CENTROS DE COSTO...';
END $$;

ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS can_view_cost_centers BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_create_cost_centers BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_edit_cost_centers BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_delete_cost_centers BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_assign_cost_centers BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PASO 6: Agregar permisos de ORGANIGRAMA (3)
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🌳 Agregando permisos de ORGANIGRAMA...';
END $$;

ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS can_view_org_chart BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_edit_org_chart BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_download_org_chart BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PASO 7: Migrar permisos antiguos a nuevos (SUPER_ADMIN)
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '👑 Migrando permisos de SUPER_ADMIN...';
END $$;

-- Migrar can_manage_compliance → nuevos permisos granulares
UPDATE user_permissions 
SET 
  can_view_compliance = TRUE,
  can_create_compliance = TRUE,
  can_edit_compliance = TRUE,
  can_delete_compliance = TRUE,
  can_download_compliance_reports = TRUE
WHERE can_manage_compliance = TRUE;

-- Migrar can_manage_raat → nuevos permisos granulares
UPDATE user_permissions 
SET 
  can_view_raat = TRUE,
  can_create_raat = TRUE,
  can_edit_raat = TRUE,
  can_delete_raat = TRUE,
  can_download_raat_reports = TRUE
WHERE can_manage_raat = TRUE;

-- Migrar can_manage_documents → nuevos permisos granulares
UPDATE user_permissions 
SET 
  can_view_documents = TRUE,
  can_upload_documents = TRUE,
  can_download_documents = TRUE,
  can_edit_documents = TRUE,
  can_delete_documents = TRUE,
  can_manage_document_categories = TRUE
WHERE can_manage_documents = TRUE;

-- Migrar can_manage_departments → nuevos permisos granulares
UPDATE user_permissions 
SET 
  can_view_departments = TRUE,
  can_create_departments = TRUE,
  can_edit_departments = TRUE,
  can_delete_departments = TRUE
WHERE can_manage_departments = TRUE;

-- Migrar can_manage_cost_centers → nuevos permisos granulares
UPDATE user_permissions 
SET 
  can_view_cost_centers = TRUE,
  can_create_cost_centers = TRUE,
  can_edit_cost_centers = TRUE,
  can_delete_cost_centers = TRUE,
  can_assign_cost_centers = TRUE
WHERE can_manage_cost_centers = TRUE;

-- Migrar can_manage_org_chart → nuevos permisos granulares
UPDATE user_permissions 
SET 
  can_view_org_chart = TRUE,
  can_edit_org_chart = TRUE,
  can_download_org_chart = TRUE
WHERE can_manage_org_chart = TRUE;

-- =====================================================
-- PASO 8: Configurar permisos por defecto para ADMIN
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔑 Configurando permisos de ADMIN...';
END $$;

UPDATE user_permissions 
SET 
  -- Cumplimiento
  can_view_compliance = TRUE,
  can_create_compliance = TRUE,
  can_edit_compliance = TRUE,
  can_delete_compliance = TRUE,
  can_download_compliance_reports = TRUE,
  -- RAAT
  can_view_raat = TRUE,
  can_create_raat = TRUE,
  can_edit_raat = TRUE,
  can_delete_raat = TRUE,
  can_download_raat_reports = TRUE,
  -- Banco de Documentos
  can_view_documents = TRUE,
  can_upload_documents = TRUE,
  can_download_documents = TRUE,
  can_edit_documents = TRUE,
  can_delete_documents = TRUE,
  can_manage_document_categories = TRUE,
  -- Departamentos
  can_view_departments = TRUE,
  can_create_departments = TRUE,
  can_edit_departments = TRUE,
  can_delete_departments = TRUE,
  -- Centros de Costo
  can_view_cost_centers = TRUE,
  can_create_cost_centers = TRUE,
  can_edit_cost_centers = TRUE,
  can_delete_cost_centers = TRUE,
  can_assign_cost_centers = TRUE,
  -- Organigrama
  can_view_org_chart = TRUE,
  can_edit_org_chart = TRUE,
  can_download_org_chart = TRUE
WHERE user_id IN (
  SELECT id FROM user_profiles WHERE role = 'admin'
);

-- =====================================================
-- PASO 9: Configurar permisos por defecto para EXECUTIVE
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '💼 Configurando permisos de EXECUTIVE...';
END $$;

UPDATE user_permissions 
SET 
  -- Cumplimiento: puede ver y crear, pero NO editar/eliminar
  can_view_compliance = TRUE,
  can_create_compliance = TRUE,
  can_edit_compliance = FALSE,
  can_delete_compliance = FALSE,
  can_download_compliance_reports = TRUE,
  -- RAAT: puede ver y crear, pero NO editar/eliminar
  can_view_raat = TRUE,
  can_create_raat = TRUE,
  can_edit_raat = FALSE,
  can_delete_raat = FALSE,
  can_download_raat_reports = TRUE,
  -- Banco de Documentos: puede ver, subir y descargar, pero NO editar/eliminar
  can_view_documents = TRUE,
  can_upload_documents = TRUE,
  can_download_documents = TRUE,
  can_edit_documents = FALSE,
  can_delete_documents = FALSE,
  can_manage_document_categories = FALSE,
  -- Departamentos: solo ver
  can_view_departments = TRUE,
  can_create_departments = FALSE,
  can_edit_departments = FALSE,
  can_delete_departments = FALSE,
  -- Centros de Costo: solo ver
  can_view_cost_centers = TRUE,
  can_create_cost_centers = FALSE,
  can_edit_cost_centers = FALSE,
  can_delete_cost_centers = FALSE,
  can_assign_cost_centers = FALSE,
  -- Organigrama: solo ver y descargar
  can_view_org_chart = TRUE,
  can_edit_org_chart = FALSE,
  can_download_org_chart = TRUE
WHERE user_id IN (
  SELECT id FROM user_profiles WHERE role = 'executive'
);

-- =====================================================
-- PASO 10: Actualizar función de permisos por defecto
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
      -- Cumplimiento: puede ver y crear, pero NO editar/eliminar
      TRUE,  -- can_view_compliance
      TRUE,  -- can_create_compliance
      FALSE, -- can_edit_compliance
      FALSE, -- can_delete_compliance
      TRUE,  -- can_download_compliance_reports
      -- RAAT: puede ver y crear, pero NO editar/eliminar
      TRUE,  -- can_view_raat
      TRUE,  -- can_create_raat
      FALSE, -- can_edit_raat
      FALSE, -- can_delete_raat
      TRUE,  -- can_download_raat_reports
      -- Banco de Documentos: puede ver, subir y descargar, pero NO editar/eliminar
      TRUE,  -- can_view_documents
      TRUE,  -- can_upload_documents
      TRUE,  -- can_download_documents
      FALSE, -- can_edit_documents
      FALSE, -- can_delete_documents
      FALSE, -- can_manage_document_categories
      -- Departamentos: solo ver
      TRUE,  -- can_view_departments
      FALSE, -- can_create_departments
      FALSE, -- can_edit_departments
      FALSE, -- can_delete_departments
      -- Centros de Costo: solo ver
      TRUE,  -- can_view_cost_centers
      FALSE, -- can_create_cost_centers
      FALSE, -- can_edit_cost_centers
      FALSE, -- can_delete_cost_centers
      FALSE, -- can_assign_cost_centers
      -- Organigrama: solo ver y descargar
      TRUE,  -- can_view_org_chart
      FALSE, -- can_edit_org_chart
      TRUE,  -- can_download_org_chart
      -- Configuración: sin acceso
      FALSE  -- can_manage_company_settings
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PASO 11: OPCIONAL - Eliminar columnas antiguas
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🗑️ Limpieza de columnas antiguas (comentado por seguridad)...';
  RAISE NOTICE '   Si deseas eliminar las columnas antiguas, descomenta el código SQL';
END $$;

-- DESCOMENTA ESTAS LÍNEAS SOLO DESPUÉS DE VERIFICAR QUE TODO FUNCIONA
-- ALTER TABLE user_permissions 
-- DROP COLUMN IF EXISTS can_manage_compliance,
-- DROP COLUMN IF EXISTS can_manage_raat,
-- DROP COLUMN IF EXISTS can_manage_documents,
-- DROP COLUMN IF EXISTS can_manage_departments,
-- DROP COLUMN IF EXISTS can_manage_cost_centers,
-- DROP COLUMN IF EXISTS can_manage_org_chart;

-- =====================================================
-- RESUMEN
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migración 099 completada exitosamente!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Nuevos permisos granulares agregados:';
  RAISE NOTICE '   • 5 permisos de CUMPLIMIENTO';
  RAISE NOTICE '   • 5 permisos de RAAT';
  RAISE NOTICE '   • 6 permisos de BANCO DE DOCUMENTOS';
  RAISE NOTICE '   • 4 permisos de DEPARTAMENTOS';
  RAISE NOTICE '   • 5 permisos de CENTROS DE COSTO';
  RAISE NOTICE '   • 3 permisos de ORGANIGRAMA';
  RAISE NOTICE '   TOTAL: 28 nuevos permisos';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Permisos migrados automáticamente desde columnas antiguas';
  RAISE NOTICE '👥 Permisos actualizados para todos los roles existentes';
  RAISE NOTICE '⚙️ Función de permisos por defecto actualizada';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ NOTA: Las columnas antiguas (can_manage_*) NO han sido eliminadas';
  RAISE NOTICE '   Elimínalas manualmente después de verificar que todo funciona';
END $$;
