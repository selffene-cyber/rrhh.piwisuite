-- ============================================================
-- ⚠️ ESTE SCRIPT NO FUNCIONA DIRECTAMENTE ⚠️
-- ============================================================
-- ERROR: user_profiles.id requiere que el usuario exista en auth.users
-- 
-- 🔄 USA UNA DE ESTAS OPCIONES ALTERNATIVAS:
-- 
-- ⭐ OPCIÓN 1 (RECOMENDADA): FIX_HECTOR_OPCION_1_MANUAL.md
--    - Crear usuario desde el portal admin (/admin/users)
--    - Luego vincular con SQL simple
--    - Más fácil y segura
-- 
-- ⚙️ OPCIÓN 2 (AVANZADA): FIX_HECTOR_OPCION_2_AVANZADA.sql
--    - Requiere permisos de superusuario en Supabase
--    - Crea usuario en auth.users directamente
--    - Solo si tienes permisos especiales
-- ============================================================

-- ❌ ESTE CÓDIGO NO FUNCIONA (se deja para referencia)
-- WITH new_user AS (
--   INSERT INTO "public"."user_profiles" (...)
--   VALUES (gen_random_uuid(), ...)  -- ❌ Este UUID no existe en auth.users
--   RETURNING id
-- )
-- UPDATE "public"."employees" ...

-- ============================================================
-- ✅ SOLUCIÓN RECOMENDADA: Ver FIX_HECTOR_OPCION_1_MANUAL.md
-- ============================================================

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Ver los dos perfiles de Héctor
SELECT 
  id,
  email,
  role,
  full_name,
  default_company_id
FROM user_profiles
WHERE email IN ('hmarti2104@gmail.com', 'hmartinez@hlms.cl')
ORDER BY email;

-- Ver el empleado y su user_id
SELECT 
  id,
  full_name,
  email,
  user_id,
  company_id
FROM employees
WHERE id = 'b8cf133a-a6a9-4edf-afec-17fdf4e3e4d9';

-- ============================================================
-- RESULTADO ESPERADO
-- ============================================================
-- Héctor tendrá DOS usuarios:
-- 1. hmartinez@hlms.cl (admin) - Para administrar la empresa
-- 2. hmarti2104@gmail.com (user) - Para portal de trabajador
--
-- Puede usar cualquiera de los dos según lo que necesite hacer
-- ============================================================
