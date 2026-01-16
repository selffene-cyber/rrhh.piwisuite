-- =====================================================
-- Migración 090: Fix trigger para user_profiles
-- =====================================================
-- Propósito: Actualizar trigger para incluir full_name y default_company_id
-- =====================================================

-- Actualizar función del trigger para incluir full_name y default_company_id
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    role, 
    full_name,
    default_company_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    'user', -- Rol por defecto
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'default_company_id')::UUID, NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    default_company_id = COALESCE(EXCLUDED.default_company_id, user_profiles.default_company_id),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario sobre la función
COMMENT ON FUNCTION handle_new_user() IS 
'Trigger que crea automáticamente un perfil en user_profiles cuando se crea un usuario en auth.users.
Ahora incluye full_name y default_company_id desde user_metadata.';

-- =====================================================
-- Reparar user_profiles existentes
-- =====================================================

-- Vincular employees huérfanos con user_profiles existentes por email
UPDATE employees e
SET user_id = up.id
FROM user_profiles up
WHERE e.email = up.email
  AND e.user_id IS NULL
  AND up.id IS NOT NULL;

-- Actualizar user_profiles con datos de employees
UPDATE user_profiles up
SET 
  full_name = e.full_name,
  default_company_id = e.company_id,
  updated_at = NOW()
FROM employees e
WHERE up.id = e.user_id
  AND up.role = 'user'
  AND (
    up.full_name IS NULL 
    OR up.full_name = '' 
    OR up.default_company_id IS NULL
  );

-- =====================================================
-- Verificación
-- =====================================================

DO $$
DECLARE
  total_employees INTEGER;
  employees_with_user INTEGER;
  profiles_with_name INTEGER;
  profiles_with_company INTEGER;
  profiles_incomplete INTEGER;
BEGIN
  -- Contar estadísticas
  SELECT COUNT(*) INTO total_employees FROM employees;
  
  SELECT COUNT(*) INTO employees_with_user 
  FROM employees WHERE user_id IS NOT NULL;
  
  SELECT COUNT(*) INTO profiles_with_name 
  FROM user_profiles 
  WHERE role = 'user' 
    AND full_name IS NOT NULL 
    AND full_name != '';
  
  SELECT COUNT(*) INTO profiles_with_company 
  FROM user_profiles 
  WHERE role = 'user' 
    AND default_company_id IS NOT NULL;
  
  SELECT COUNT(*) INTO profiles_incomplete
  FROM user_profiles 
  WHERE role = 'user'
    AND (full_name IS NULL OR full_name = '' OR default_company_id IS NULL);

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migración 090 completada';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total empleados: %', total_employees;
  RAISE NOTICE 'Empleados con user_id: %', employees_with_user;
  RAISE NOTICE 'User profiles con nombre: %', profiles_with_name;
  RAISE NOTICE 'User profiles con empresa: %', profiles_with_company;
  RAISE NOTICE 'User profiles incompletos: %', profiles_incomplete;
  RAISE NOTICE '========================================';
  
  IF profiles_incomplete > 0 THEN
    RAISE NOTICE '⚠️  Hay % user profiles incompletos que necesitan atención manual', profiles_incomplete;
  ELSE
    RAISE NOTICE '✅ Todos los user profiles están completos';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- Query de verificación detallada
-- =====================================================

-- Ver estado de todos los empleados y sus user profiles
SELECT 
  e.full_name as empleado,
  e.email,
  e.company_id,
  CASE 
    WHEN e.user_id IS NULL THEN '❌ Sin user_id'
    ELSE '✅ Con user_id'
  END as tiene_user,
  up.full_name as nombre_profile,
  up.default_company_id as company_profile,
  CASE 
    WHEN e.user_id IS NULL THEN '❌ Sin vincular'
    WHEN up.full_name IS NULL OR up.full_name = '' THEN '⚠️ Sin nombre'
    WHEN up.default_company_id IS NULL THEN '⚠️ Sin empresa'
    ELSE '✅ Completo'
  END as estado
FROM employees e
LEFT JOIN user_profiles up ON e.user_id = up.id
ORDER BY e.created_at DESC
LIMIT 20;


