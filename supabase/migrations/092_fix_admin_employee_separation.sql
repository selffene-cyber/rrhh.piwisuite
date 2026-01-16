-- =====================================================
-- Migración 092: Separar usuario admin de empleado
-- =====================================================
-- Propósito: Desvincular hmartinez@hlms.cl de employees
--           y cambiar email del empleado a hmarti2104@gmail.com
-- =====================================================

-- Paso 1: Buscar el user_id de hmartinez@hlms.cl
DO $$
DECLARE
  v_admin_user_id UUID;
  v_employee_id UUID;
  v_employee_name TEXT;
  v_company_id UUID;
BEGIN
  -- Buscar el user_id del admin
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = 'hmartinez@hlms.cl';

  IF v_admin_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No se encontró usuario auth con email hmartinez@hlms.cl';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Usuario admin encontrado: %', v_admin_user_id;

  -- Buscar el empleado vinculado a este user_id
  SELECT id, full_name, company_id 
  INTO v_employee_id, v_employee_name, v_company_id
  FROM employees
  WHERE user_id = v_admin_user_id;

  IF v_employee_id IS NULL THEN
    RAISE NOTICE '⚠️  No se encontró empleado vinculado a este usuario';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Empleado encontrado: % (ID: %)', v_employee_name, v_employee_id;
  RAISE NOTICE '   Company ID: %', v_company_id;

  -- Paso 2: Desvincular el user_id del empleado
  UPDATE employees
  SET user_id = NULL
  WHERE id = v_employee_id;

  RAISE NOTICE '✅ user_id desvinculado del empleado';

  -- Paso 3: Cambiar el email del empleado
  UPDATE employees
  SET email = 'hmarti2104@gmail.com'
  WHERE id = v_employee_id;

  RAISE NOTICE '✅ Email del empleado cambiado a: hmarti2104@gmail.com';

  -- Paso 4: Verificación final
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE CAMBIOS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuario Admin:';
  RAISE NOTICE '  Email: hmartinez@hlms.cl';
  RAISE NOTICE '  User ID: %', v_admin_user_id;
  RAISE NOTICE '  Rol: admin (en company_users)';
  RAISE NOTICE '';
  RAISE NOTICE 'Empleado:';
  RAISE NOTICE '  Nombre: %', v_employee_name;
  RAISE NOTICE '  Email: hmarti2104@gmail.com (NUEVO)';
  RAISE NOTICE '  User ID: NULL (DESVINCULADO)';
  RAISE NOTICE '  Company ID: %', v_company_id;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SIGUIENTE PASO:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. El usuario hmartinez@hlms.cl ahora solo es ADMIN';
  RAISE NOTICE '2. El empleado tiene email hmarti2104@gmail.com';
  RAISE NOTICE '3. Si quieres que el empleado acceda al portal:';
  RAISE NOTICE '   - Crea usuario para hmarti2104@gmail.com';
  RAISE NOTICE '   - Usa la opción "Crear Usuario" en la ficha del empleado';
  RAISE NOTICE '========================================';

END $$;


