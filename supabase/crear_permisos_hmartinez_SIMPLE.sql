-- ============================================
-- CREAR PERMISOS PARA hmartinez@hlms.cl (SIMPLE)
-- ============================================

-- Primero, verificar qué columnas tiene la tabla
DO $$
BEGIN
  RAISE NOTICE '📋 Creando permisos para hmartinez@hlms.cl...';
END $$;

-- Insertar o actualizar permisos (solo los campos esenciales)
INSERT INTO user_permissions (
  user_id,
  company_id,
  -- Permisos esenciales para admin
  can_manage_users_roles,
  can_view_employees,
  can_view_employee_details,
  can_view_employee_salary,
  can_create_permissions,
  can_approve_permissions,
  can_create_vacations,
  can_approve_vacations,
  can_create_contracts,
  can_approve_contracts,
  can_create_payroll,
  can_approve_payroll,
  can_create_settlements,
  can_approve_settlements,
  can_manage_company_settings,
  can_edit_company_settings,
  can_manage_indicators,
  can_manage_signatures,
  can_manage_tax_brackets,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM user_profiles WHERE email = 'hmartinez@hlms.cl'),
  'be575ba9-e1f8-449c-a875-ff19607b1d11',
  -- Todos en TRUE
  true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true,
  true, true, true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id, company_id) 
DO UPDATE SET
  can_manage_users_roles = true,
  can_view_employees = true,
  can_view_employee_details = true,
  can_view_employee_salary = true,
  can_approve_permissions = true,
  can_approve_vacations = true,
  can_approve_contracts = true,
  can_approve_payroll = true,
  can_approve_settlements = true,
  can_manage_company_settings = true,
  can_edit_company_settings = true,
  updated_at = NOW();

-- Verificación
SELECT 
  '✅ RESULTADO' as paso,
  up.email,
  up.full_name,
  cu.role as rol_en_empresa,
  perm.can_manage_users_roles as puede_gestionar_usuarios,
  perm.can_approve_vacations as puede_aprobar_vacaciones,
  perm.can_approve_payroll as puede_aprobar_nomina,
  CASE 
    WHEN perm.can_manage_users_roles = true THEN '✅ PUEDE ACCEDER A USUARIOS Y ROLES'
    ELSE '❌ NO PUEDE ACCEDER'
  END as resultado
FROM user_profiles up
JOIN company_users cu ON cu.user_id = up.id
LEFT JOIN user_permissions perm ON perm.user_id = up.id AND perm.company_id = cu.company_id
WHERE up.email = 'hmartinez@hlms.cl'
  AND cu.company_id = 'be575ba9-e1f8-449c-a875-ff19607b1d11';
