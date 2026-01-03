-- Políticas de Storage para el bucket company-assets
-- IMPORTANTE: Ejecuta cada política por separado en Supabase SQL Editor
-- O créalas manualmente desde Storage → Policies → New Policy

-- ============================================
-- POLÍTICA 1: INSERT (Subir logos)
-- ============================================
-- Ejecuta esta primera:
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- ============================================
-- POLÍTICA 2: SELECT (Leer logos públicamente)
-- ============================================
-- Ejecuta esta segunda:
CREATE POLICY "Allow public to read logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- ============================================
-- POLÍTICA 3: DELETE (Eliminar logos)
-- ============================================
-- Ejecuta esta tercera:
CREATE POLICY "Allow authenticated users to delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');

-- ============================================
-- POLÍTICA 4: UPDATE (Actualizar logos) - Opcional
-- ============================================
-- Ejecuta esta cuarta (opcional):
CREATE POLICY "Allow authenticated users to update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets')
WITH CHECK (bucket_id = 'company-assets');
