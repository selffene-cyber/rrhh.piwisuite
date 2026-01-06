-- ============================================
-- MIGRACIÓN 051: Configurar bucket de Storage para documentos firmados
-- ============================================
-- NOTA: Esta migración solo documenta las políticas necesarias.
-- Las políticas de Storage deben crearse desde la UI de Supabase:
-- Storage → Policies → New Policy
-- 
-- O ejecutarse manualmente con permisos de superusuario.
-- ============================================

-- Si el bucket está configurado como público, las políticas pueden no ser necesarias.
-- Sin embargo, si necesitas controlar quién puede subir/eliminar, crea estas políticas:

-- ============================================
-- INSTRUCCIONES PARA CREAR EL BUCKET:
-- ============================================
-- 1. Ve a Supabase Dashboard → Storage
-- 2. Haz clic en "New bucket"
-- 3. Nombre: signed-documents
-- 4. Configuración:
--    - Público: Sí (para que los PDFs sean accesibles vía URL)
--    - File size limit: 10MB (o según tus necesidades)
--    - Allowed MIME types: application/pdf

-- Estructura de carpetas dentro del bucket:
-- signed-documents/
--   {company_id}/
--     certificates/
--       {certificate_id}.pdf
--     vacations/
--       {vacation_id}.pdf
--     permissions/
--       {permission_id}.pdf

-- ============================================
-- INSTRUCCIONES PARA CREAR POLÍTICAS DESDE LA UI:
-- ============================================
-- 1. Ve a Supabase Dashboard → Storage → Policies
-- 2. Selecciona el bucket 'signed-documents'
-- 3. Crea las siguientes políticas:

-- POLÍTICA 1: INSERT (Subir documentos firmados)
-- Name: Allow auth users to upload signed docs
-- Allowed operation: INSERT
-- Target roles: authenticated
-- USING expression: bucket_id = 'signed-documents'
-- WITH CHECK expression: bucket_id = 'signed-documents'

-- POLÍTICA 2: SELECT (Leer documentos - solo si el bucket NO es público)
-- Name: Allow public to read signed docs
-- Allowed operation: SELECT
-- Target roles: public
-- USING expression: bucket_id = 'signed-documents'
-- (Esta política solo es necesaria si el bucket NO es público)

-- POLÍTICA 3: UPDATE (Actualizar documentos)
-- Name: Allow auth users to update signed docs
-- Allowed operation: UPDATE
-- Target roles: authenticated
-- USING expression: bucket_id = 'signed-documents'
-- WITH CHECK expression: bucket_id = 'signed-documents'

-- POLÍTICA 4: DELETE (Eliminar documentos)
-- Name: Allow auth users to delete signed docs
-- Allowed operation: DELETE
-- Target roles: authenticated
-- USING expression: bucket_id = 'signed-documents'

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- - Si el bucket es PÚBLICO, la política de SELECT no es estrictamente necesaria
--   para la lectura, pero puede ser útil para control de acceso más granular.
-- - Las políticas de INSERT, UPDATE y DELETE son necesarias para que la API
--   pueda gestionar los documentos firmados.
-- - Los documentos se organizan por company_id y tipo de documento para
--   facilitar la gestión y el acceso.

