-- ============================================
-- DIAGNÓSTICO: Ver roles existentes antes de migración
-- ============================================
-- Ejecuta este script ANTES de la migración 095
-- para ver qué valores de 'role' existen actualmente
-- ============================================

-- Ver distribución de roles actuales
SELECT 
  '📊 DISTRIBUCIÓN DE ROLES ACTUALES' as titulo,
  role as rol,
  COUNT(*) as cantidad,
  STRING_AGG(DISTINCT cu.user_id::text, ', ') as user_ids_muestra
FROM company_users cu
GROUP BY role
ORDER BY COUNT(*) DESC;

-- Ver usuarios con rol 'hr' (si existen)
SELECT 
  '🔍 USUARIOS CON ROL "HR"' as titulo,
  cu.role,
  up.email,
  up.full_name,
  c.name as empresa
FROM company_users cu
LEFT JOIN user_profiles up ON up.id = cu.user_id
LEFT JOIN companies c ON c.id = cu.company_id
WHERE cu.role = 'hr';

-- Ver usuarios con roles NO estándar
SELECT 
  '⚠️  USUARIOS CON ROLES NO ESTÁNDAR' as titulo,
  cu.role,
  up.email,
  up.full_name,
  c.name as empresa
FROM company_users cu
LEFT JOIN user_profiles up ON up.id = cu.user_id
LEFT JOIN companies c ON c.id = cu.company_id
WHERE cu.role NOT IN ('owner', 'admin', 'user');

-- Verificar constraint actual
SELECT 
  '🔧 CONSTRAINT ACTUAL' as titulo,
  conname as nombre_constraint,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conname = 'company_users_role_check';

-- Resumen de lo que se hará en la migración
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📋 RESUMEN DE ACCIONES A REALIZAR:';
  RAISE NOTICE '============================================';
  RAISE NOTICE '1. Convertir rol "hr" → "ejecutivo"';
  RAISE NOTICE '2. Convertir roles inválidos → "user"';
  RAISE NOTICE '3. Actualizar constraint para permitir "ejecutivo"';
  RAISE NOTICE '4. Actualizar políticas RLS';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Si todo se ve bien, ejecuta: 095_add_ejecutivo_role.sql';
  RAISE NOTICE '============================================';
END $$;
