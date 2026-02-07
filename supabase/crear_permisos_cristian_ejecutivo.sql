-- ============================================
-- CREAR PERMISOS DE EJECUTIVO PARA CRISTIAN COFRE
-- ============================================
-- Este script crea los permisos granulares basados en el rol Ejecutivo
-- ============================================

-- PASO 1: Verificar que Cristian esté en company_users
SELECT 
  '1️⃣ VERIFICAR CRISTIAN EN COMPANY_USERS:' as paso,
  up.email,
  cu.role as rol_empresa,
  cu.status,
  c.name as empresa
FROM user_profiles up
JOIN company_users cu ON cu.user_id = up.id
JOIN companies c ON c.id = cu.company_id
WHERE up.email = 'cristian.cofre@hlms.cl';

-- PASO 2: Obtener el user_id de Cristian
SELECT 
  '2️⃣ USER_ID DE CRISTIAN:' as paso,
  id as user_id,
  email
FROM user_profiles
WHERE email = 'cristian.cofre@hlms.cl';

-- PASO 3: Crear permisos de EJECUTIVO en user_permissions
INSERT INTO "public"."user_permissions" (
  "id",
  "user_id",
  "company_id",
  -- Permisos
  "can_create_permissions", "can_approve_permissions",
  "can_create_vacations", "can_approve_vacations",
  "can_create_contracts", "can_approve_contracts",
  "can_create_amendments", "can_approve_amendments",
  "can_create_certificates", "can_approve_certificates",
  "can_create_disciplinary", "can_approve_disciplinary",
  "can_create_overtime_pacts", "can_approve_overtime_pacts",
  "can_create_payroll", "can_approve_payroll",
  "can_create_settlements", "can_approve_settlements",
  "can_create_advances", "can_approve_advances",
  "can_manage_loans",
  "can_manage_departments",
  "can_manage_cost_centers",
  "can_manage_org_chart",
  "can_manage_compliance",
  "can_manage_raat",
  "can_manage_documents",
  "can_manage_company_settings",
  -- Permisos de visualización
  "can_view_employees", "can_view_employee_details", "can_view_employee_salary",
  "can_view_contracts", "can_download_contracts",
  "can_download_payroll",
  "can_download_certificates",
  "can_download_settlements",
  "can_download_employee_documents",
  "can_edit_contracts", "can_delete_contracts",
  "can_view_compliance", "can_create_compliance", "can_edit_compliance", "can_delete_compliance",
  "can_download_compliance_reports",
  "can_view_raat", "can_create_raat", "can_edit_raat", "can_delete_raat",
  "can_download_raat_reports",
  "can_view_documents", "can_upload_documents", "can_download_documents",
  "can_edit_documents", "can_delete_documents",
  "can_manage_document_categories",
  "can_view_departments", "can_create_departments", "can_edit_departments", "can_delete_departments",
  "can_view_cost_centers", "can_create_cost_centers", "can_edit_cost_centers",
  "can_delete_cost_centers", "can_assign_cost_centers",
  "can_view_org_chart", "can_edit_org_chart", "can_download_org_chart",
  "can_view_loans", "can_create_loans", "can_edit_loans", "can_delete_loans", "can_download_loans",
  "can_edit_company_settings",
  "can_manage_indicators",
  "can_manage_signatures",
  "can_manage_tax_brackets",
  "can_manage_users_roles",
  "created_at",
  "updated_at"
)
VALUES (
  gen_random_uuid(),  -- Generar nuevo ID
  (SELECT id FROM user_profiles WHERE email = 'cristian.cofre@hlms.cl'),  -- user_id de Cristian
  'be575ba9-e1f8-449c-a875-ff19607b1d11',  -- company_id (HECTOR LEANDRO MARTINEZ SOLAR)
  -- Permisos de EJECUTIVO (basados en el ejemplo)
  'true', 'false',   -- Permisos: crear pero no aprobar
  'true', 'false',   -- Vacaciones: crear pero no aprobar
  'false', 'false',  -- Contratos: sin permisos
  'true', 'false',   -- Anexos: crear pero no aprobar
  'true', 'false',   -- Certificados: crear pero no aprobar
  'true', 'false',   -- Disciplinarias: crear pero no aprobar
  'true', 'false',   -- Horas extras: crear pero no aprobar
  'false', 'false',  -- Liquidaciones: sin permisos
  'false', 'false',  -- Finiquitos: sin permisos
  'false', 'false',  -- Anticipos: sin permisos
  'false',           -- Préstamos: sin gestión
  'true',            -- Departamentos: puede gestionar
  'false',           -- Centros de costo: sin gestión
  'true',            -- Organigrama: puede gestionar
  'true',            -- Compliance: puede gestionar
  'true',            -- RAAT: puede gestionar
  'true',            -- Documentos: puede gestionar
  'false',           -- Configuración empresa: sin permisos
  -- Permisos de visualización
  'true', 'true', 'false',  -- Ver empleados y detalles, pero NO salarios
  'false', 'false',         -- Contratos: sin visualización
  'false',                  -- Liquidaciones: sin descarga
  'true',                   -- Certificados: puede descargar
  'false',                  -- Finiquitos: sin descarga
  'false',                  -- Documentos empleados: sin descarga
  'false', 'false',         -- Contratos: sin editar/eliminar
  'true', 'true', 'true', 'false',  -- Compliance: ver, crear, editar (no eliminar)
  'true',                   -- Compliance reports: descargar
  'true', 'true', 'true', 'false',  -- RAAT: ver, crear, editar (no eliminar)
  'true',                   -- RAAT reports: descargar
  'true', 'true', 'true',   -- Documentos: ver, subir, descargar
  'true', 'true',           -- Documentos: editar, eliminar
  'false',                  -- Categorías documentos: sin gestión
  'true', 'true', 'true', 'true',  -- Departamentos: CRUD completo
  'false', 'true', 'true', 'true', 'false',  -- Centros costo: ver, crear, editar, eliminar (no asignar)
  'true', 'true', 'true',   -- Organigrama: ver, editar, descargar
  'true', 'false', 'false', 'false', 'false',  -- Préstamos: solo ver
  'false',                  -- Configuración empresa: sin editar
  'false',                  -- Indicadores: sin gestión
  'false',                  -- Firmas: sin gestión
  'false',                  -- Tramos tributarios: sin gestión
  'false',                  -- Usuarios y roles: sin gestión
  NOW(),
  NOW()
)
ON CONFLICT (user_id, company_id) DO UPDATE
SET
  -- Actualizar todos los permisos si ya existe
  can_create_permissions = EXCLUDED.can_create_permissions,
  can_create_vacations = EXCLUDED.can_create_vacations,
  can_create_amendments = EXCLUDED.can_create_amendments,
  can_create_certificates = EXCLUDED.can_create_certificates,
  can_create_disciplinary = EXCLUDED.can_create_disciplinary,
  can_create_overtime_pacts = EXCLUDED.can_create_overtime_pacts,
  can_manage_departments = EXCLUDED.can_manage_departments,
  can_manage_org_chart = EXCLUDED.can_manage_org_chart,
  can_manage_compliance = EXCLUDED.can_manage_compliance,
  can_manage_raat = EXCLUDED.can_manage_raat,
  can_manage_documents = EXCLUDED.can_manage_documents,
  can_view_employees = EXCLUDED.can_view_employees,
  can_view_employee_details = EXCLUDED.can_view_employee_details,
  can_download_certificates = EXCLUDED.can_download_certificates,
  can_view_compliance = EXCLUDED.can_view_compliance,
  can_create_compliance = EXCLUDED.can_create_compliance,
  can_edit_compliance = EXCLUDED.can_edit_compliance,
  can_download_compliance_reports = EXCLUDED.can_download_compliance_reports,
  can_view_raat = EXCLUDED.can_view_raat,
  can_create_raat = EXCLUDED.can_create_raat,
  can_edit_raat = EXCLUDED.can_edit_raat,
  can_download_raat_reports = EXCLUDED.can_download_raat_reports,
  can_view_documents = EXCLUDED.can_view_documents,
  can_upload_documents = EXCLUDED.can_upload_documents,
  can_download_documents = EXCLUDED.can_download_documents,
  can_edit_documents = EXCLUDED.can_edit_documents,
  can_delete_documents = EXCLUDED.can_delete_documents,
  can_view_departments = EXCLUDED.can_view_departments,
  can_create_departments = EXCLUDED.can_create_departments,
  can_edit_departments = EXCLUDED.can_edit_departments,
  can_delete_departments = EXCLUDED.can_delete_departments,
  can_view_cost_centers = EXCLUDED.can_view_cost_centers,
  can_create_cost_centers = EXCLUDED.can_create_cost_centers,
  can_edit_cost_centers = EXCLUDED.can_edit_cost_centers,
  can_delete_cost_centers = EXCLUDED.can_delete_cost_centers,
  can_view_org_chart = EXCLUDED.can_view_org_chart,
  can_edit_org_chart = EXCLUDED.can_edit_org_chart,
  can_download_org_chart = EXCLUDED.can_download_org_chart,
  can_view_loans = EXCLUDED.can_view_loans,
  updated_at = NOW();

-- PASO 4: Verificar resultado
SELECT 
  '4️⃣ VERIFICACIÓN FINAL:' as paso,
  up.email,
  up.full_name,
  c.name as empresa,
  cu.role as rol_en_empresa,
  CASE 
    WHEN uperm.id IS NOT NULL THEN '✅ Permisos creados'
    ELSE '❌ Sin permisos'
  END as tiene_permisos,
  uperm.can_create_permissions,
  uperm.can_create_vacations,
  uperm.can_create_certificates,
  uperm.can_manage_compliance,
  uperm.can_manage_raat,
  uperm.can_manage_documents
FROM user_profiles up
JOIN company_users cu ON cu.user_id = up.id
JOIN companies c ON c.id = cu.company_id
LEFT JOIN user_permissions uperm ON uperm.user_id = up.id AND uperm.company_id = cu.company_id
WHERE up.email = 'cristian.cofre@hlms.cl';

-- Resumen
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PERMISOS DE EJECUTIVO CREADOS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Usuario: cristian.cofre@hlms.cl';
  RAISE NOTICE 'Rol: Ejecutivo';
  RAISE NOTICE 'Empresa: HECTOR LEANDRO MARTINEZ SOLAR';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Permisos otorgados:';
  RAISE NOTICE '  ✅ Crear permisos, vacaciones, certificados';
  RAISE NOTICE '  ✅ Gestionar compliance, RAAT, documentos';
  RAISE NOTICE '  ✅ Gestionar departamentos y organigrama';
  RAISE NOTICE '  ✅ Ver empleados (sin salarios)';
  RAISE NOTICE '  ❌ NO puede aprobar ni gestionar liquidaciones';
  RAISE NOTICE '  ❌ NO puede gestionar usuarios/roles';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Ahora debería aparecer en: /settings/usuarios-roles';
  RAISE NOTICE '============================================';
END $$;
