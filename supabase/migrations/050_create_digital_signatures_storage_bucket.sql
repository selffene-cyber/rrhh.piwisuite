-- ============================================
-- MIGRACIÓN 050: Configurar bucket de Storage para firmas digitales
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
-- INSTRUCCIONES PARA CREAR POLÍTICAS DESDE LA UI:
-- ============================================
-- 1. Ve a Supabase Dashboard → Storage → Policies
-- 2. Selecciona el bucket 'digital-signatures'
-- 3. Crea las siguientes políticas:

-- POLÍTICA 1: INSERT (Subir firmas)
-- Name: Allow authenticated users to upload digital signatures
-- Allowed operation: INSERT
-- Target roles: authenticated
-- USING expression: bucket_id = 'digital-signatures'
-- WITH CHECK expression: bucket_id = 'digital-signatures'

-- POLÍTICA 2: SELECT (Leer firmas - solo si el bucket NO es público)
-- Name: Allow public to read digital signatures
-- Allowed operation: SELECT
-- Target roles: public
-- USING expression: bucket_id = 'digital-signatures'
-- (Nota: Si el bucket es público, esta política no es necesaria)

-- POLÍTICA 3: UPDATE (Actualizar firmas)
-- Name: Allow authenticated users to update digital signatures
-- Allowed operation: UPDATE
-- Target roles: authenticated
-- USING expression: bucket_id = 'digital-signatures'
-- WITH CHECK expression: bucket_id = 'digital-signatures'

-- POLÍTICA 4: DELETE (Eliminar firmas)
-- Name: Allow authenticated users to delete digital signatures
-- Allowed operation: DELETE
-- Target roles: authenticated
-- USING expression: bucket_id = 'digital-signatures'

-- ============================================
-- Si prefieres ejecutar las políticas manualmente con permisos de superusuario:
-- ============================================
-- Ejecuta cada política por separado en Supabase SQL Editor con permisos de superusuario

-- POLÍTICA 1: INSERT
/*
CREATE POLICY "Allow authenticated users to upload digital signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'digital-signatures');
*/

-- POLÍTICA 2: SELECT (solo si el bucket NO es público)
/*
CREATE POLICY "Allow public to read digital signatures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'digital-signatures');
*/

-- POLÍTICA 3: UPDATE
/*
CREATE POLICY "Allow authenticated users to update digital signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'digital-signatures')
WITH CHECK (bucket_id = 'digital-signatures');
*/

-- POLÍTICA 4: DELETE
/*
CREATE POLICY "Allow authenticated users to delete digital signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'digital-signatures');
*/

