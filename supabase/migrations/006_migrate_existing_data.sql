-- ============================================
-- MIGRACIÓN 006: Migrar datos existentes
-- ============================================
-- Este script migra la aplicación mono-empresa a multi-tenant
-- Asigna usuarios existentes a empresas existentes
-- ============================================

-- Paso 1: Asegurar que exista una empresa
-- Si no hay empresas, esta migración no puede continuar
DO $$
DECLARE
  v_company_count INTEGER;
  v_company_id UUID;
  v_super_admin_id UUID;
  v_admin_id UUID;
BEGIN
  -- Contar empresas existentes
  SELECT COUNT(*) INTO v_company_count FROM companies;
  
  IF v_company_count = 0 THEN
    RAISE EXCEPTION 'No hay empresas en la base de datos. Por favor crea al menos una empresa antes de ejecutar esta migración.';
  END IF;
  
  -- Si hay más de una empresa, usar la primera
  SELECT id INTO v_company_id FROM companies ORDER BY created_at ASC LIMIT 1;
  
  -- Buscar IDs de usuarios por email
  SELECT id INTO v_super_admin_id 
  FROM auth.users 
  WHERE email = 'jeans.selfene@outlook.com'
  LIMIT 1;
  
  SELECT id INTO v_admin_id 
  FROM auth.users 
  WHERE email = 'hmartinez@hlms.cl'
  LIMIT 1;
  
  -- Paso 2: Asignar empresa existente a todos los usuarios activos
  -- Solo si no están ya asignados
  INSERT INTO company_users (user_id, company_id, role, status, joined_at)
  SELECT 
    up.id as user_id,
    v_company_id as company_id,
    CASE 
      -- jeans.selfene@outlook.com es owner (puede ser super_admin pero también owner de la empresa)
      WHEN up.id = COALESCE(v_super_admin_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN 'owner'
      -- hmartinez@hlms.cl es owner/admin de la empresa
      WHEN up.id = COALESCE(v_admin_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN 'owner'
      -- Otros usuarios según su rol en user_profiles
      WHEN up.role = 'super_admin' THEN 'owner'
      WHEN up.role = 'admin' THEN 'admin'
      ELSE 'user'
    END as role,
    'active' as status,
    NOW() as joined_at
  FROM user_profiles up
  WHERE NOT EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = up.id AND cu.company_id = v_company_id
  );
  
  -- Paso 3: Establecer owner_id en companies si no está definido
  -- Priorizar jeans.selfene@outlook.com, luego hmartinez@hlms.cl, luego cualquier owner
  UPDATE companies c
  SET owner_id = COALESCE(
    v_super_admin_id,
    v_admin_id,
    (SELECT user_id FROM company_users cu WHERE cu.company_id = c.id AND cu.role = 'owner' LIMIT 1)
  )
  WHERE id = v_company_id AND owner_id IS NULL;
  
  -- Paso 4: Establecer default_company_id en user_profiles
  UPDATE user_profiles up
  SET default_company_id = (
    SELECT company_id
    FROM company_users cu
    WHERE cu.user_id = up.id
      AND cu.status = 'active'
    ORDER BY 
      CASE WHEN cu.role = 'owner' THEN 1 ELSE 2 END,
      cu.created_at ASC
    LIMIT 1
  )
  WHERE default_company_id IS NULL
    AND EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.user_id = up.id AND cu.status = 'active'
    );
  
  -- Paso 5: Asegurar que jeans.selfene@outlook.com sea super_admin
  UPDATE user_profiles
  SET role = 'super_admin'
  WHERE id = COALESCE(v_super_admin_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (role IS NULL OR role != 'super_admin');
  
  RAISE NOTICE 'Migración completada exitosamente.';
  RAISE NOTICE 'Empresa ID: %', v_company_id;
  RAISE NOTICE 'Super Admin ID: %', v_super_admin_id;
  RAISE NOTICE 'Admin ID: %', v_admin_id;
  
END $$;

-- Verificar resultados
SELECT 
  'Empresas' as tipo,
  COUNT(*)::text as cantidad
FROM companies
UNION ALL
SELECT 
  'Usuarios asignados a empresas' as tipo,
  COUNT(*)::text as cantidad
FROM company_users
UNION ALL
SELECT 
  'Usuarios con empresa por defecto' as tipo,
  COUNT(*)::text as cantidad
FROM user_profiles
WHERE default_company_id IS NOT NULL
UNION ALL
SELECT 
  'Empresas con owner' as tipo,
  COUNT(*)::text as cantidad
FROM companies
WHERE owner_id IS NOT NULL;

-- Mostrar asignaciones de usuarios a empresas
SELECT 
  up.email,
  up.role as system_role,
  c.name as company_name,
  cu.role as company_role,
  cu.status
FROM user_profiles up
JOIN company_users cu ON cu.user_id = up.id
JOIN companies c ON c.id = cu.company_id
ORDER BY up.email, c.name;

