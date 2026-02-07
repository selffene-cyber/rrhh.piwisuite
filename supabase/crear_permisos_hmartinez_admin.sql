-- ============================================
-- CREAR PERMISOS PARA hmartinez@hlms.cl
-- ============================================
-- Como admin, debe tener acceso completo

INSERT INTO user_permissions (
  id,
  user_id,
  company_id,
  
  -- Gestión de usuarios y roles
  can_manage_users_roles,
  
  -- Permisos
  can_create_permissions,
  can_approve_permissions,
  can_view_employees,
  can_view_employee_details,
  can_view_employee_salary,
  
  -- Vacaciones
  can_create_vacations,
  can_approve_vacations,
  
  -- Contratos y anexos
  can_view_contracts,
  can_create_contracts,
  can_approve_contracts,
  can_edit_contracts,
  can_delete_contracts,
  can_download_contracts,
  can_create_amendments,
  can_approve_amendments,
  
  -- Certificados
  can_create_certificates,
  can_approve_certificates,
  can_download_certificates,
  
  -- Amonestaciones
  can_create_disciplinary,
  can_approve_disciplinary,
  
  -- Horas extras
  can_create_overtime_pacts,
  can_approve_overtime_pacts,
  
  -- Liquidaciones
  can_create_payroll,
  can_approve_payroll,
  can_download_payroll,
  
  -- Finiquitos
  can_create_settlements,
  can_approve_settlements,
  can_download_settlements,
  
  -- Anticipos
  can_create_advances,
  can_approve_advances,
  
  -- Préstamos
  can_view_loans,
  can_create_loans,
  can_edit_loans,
  can_delete_loans,
  can_download_loans,
  can_manage_loans,
  
  -- Cumplimientos
  can_view_compliance,
  can_create_compliance,
  can_edit_compliance,
  can_delete_compliance,
  can_download_compliance_reports,
  can_manage_compliance,
  
  -- RAAT
  can_view_raat,
  can_create_raat,
  can_edit_raat,
  can_delete_raat,
  can_download_raat_reports,
  can_manage_raat,
  
  -- Banco de documentos
  can_view_documents,
  can_upload_documents,
  can_download_documents,
  can_edit_documents,
  can_delete_documents,
  can_manage_document_categories,
  can_manage_documents,
  
  -- Departamentos
  can_view_departments,
  can_create_departments,
  can_edit_departments,
  can_delete_departments,
  can_manage_departments,
  
  -- Centros de costo
  can_view_cost_centers,
  can_create_cost_centers,
  can_edit_cost_centers,
  can_delete_cost_centers,
  can_assign_cost_centers,
  
  -- Organigrama
  can_view_org_chart,
  can_edit_org_chart,
  can_download_org_chart,
  can_manage_org_chart,
  
  -- Configuración
  can_edit_company_settings,
  can_manage_indicators,
  can_manage_signatures,
  can_manage_tax_brackets,
  can_manage_company_settings,
  can_download_employee_documents,
  
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl'),
  'be575ba9-e1f8-449c-a875-ff19607b1d11',
  
  -- Todos los permisos en TRUE para admin
  true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true,
  
  NOW(),
  NOW()
)
ON CONFLICT (user_id, company_id) 
DO UPDATE SET
  can_manage_users_roles = true,
  can_approve_permissions = true,
  can_approve_vacations = true,
  can_approve_contracts = true,
  can_approve_certificates = true,
  can_approve_disciplinary = true,
  can_approve_overtime_pacts = true,
  can_approve_payroll = true,
  can_approve_settlements = true,
  can_approve_advances = true,
  updated_at = NOW();

-- Verificación
SELECT 
  '✅ PERMISOS DE HMARTINEZ' as resultado,
  up.email,
  up.full_name,
  cu.role as rol_en_empresa,
  perm.can_manage_users_roles,
  perm.can_approve_vacations,
  perm.can_approve_payroll
FROM user_profiles up
JOIN company_users cu ON cu.user_id = up.id
LEFT JOIN user_permissions perm ON perm.user_id = up.id AND perm.company_id = cu.company_id
WHERE up.email = 'hmartinez@hlms.cl'
  AND cu.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';
