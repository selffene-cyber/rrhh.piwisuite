-- Políticas de Storage para el bucket documents
-- IMPORTANTE: Ejecuta cada política por separado en Supabase SQL Editor
-- O créalas manualmente desde Storage → Policies → New Policy

-- ============================================
-- POLÍTICA 1: INSERT (Subir documentos)
-- ============================================
-- Ejecuta esta primera:
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- ============================================
-- POLÍTICA 2: SELECT (Leer documentos)
-- ============================================
-- Ejecuta esta segunda:
CREATE POLICY "Allow authenticated users to read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Si quieres que los documentos sean públicos (accesibles sin autenticación), usa esta versión:
-- CREATE POLICY "Allow public to read documents"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'documents');

-- ============================================
-- POLÍTICA 3: DELETE (Eliminar documentos)
-- ============================================
-- Ejecuta esta tercera:
CREATE POLICY "Allow authenticated users to delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- ============================================
-- POLÍTICA 4: UPDATE (Actualizar documentos)
-- ============================================
-- Ejecuta esta cuarta (opcional):
CREATE POLICY "Allow authenticated users to update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');









