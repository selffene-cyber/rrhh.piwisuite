-- ============================================
-- MIGRACIÓN 071: Políticas de Storage para bucket signed-documents
-- ============================================
-- Permite a usuarios autenticados subir, leer, actualizar y eliminar
-- documentos PDF en el bucket signed-documents, específicamente en la
-- carpeta payroll/ para liquidaciones de sueldo.
-- ============================================

-- POLÍTICA 1: INSERT (Subir documentos)
-- Permite a usuarios autenticados subir archivos al bucket signed-documents
DROP POLICY IF EXISTS "Allow authenticated users to upload to signed-documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload to signed-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signed-documents' 
  AND (
    -- Permitir subir en cualquier carpeta dentro del bucket
    -- Esto incluye: {company_id}/payroll/, {company_id}/certificates/, etc.
    (storage.foldername(name))[1] IS NOT NULL
  )
);

-- POLÍTICA 2: SELECT (Leer documentos)
-- Permite a usuarios autenticados leer archivos del bucket signed-documents
DROP POLICY IF EXISTS "Allow authenticated users to read from signed-documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to read from signed-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signed-documents');

-- POLÍTICA 3: UPDATE (Actualizar documentos)
-- Permite a usuarios autenticados actualizar archivos en el bucket signed-documents
DROP POLICY IF EXISTS "Allow authenticated users to update signed-documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to update signed-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'signed-documents')
WITH CHECK (bucket_id = 'signed-documents');

-- POLÍTICA 4: DELETE (Eliminar documentos)
-- Permite a usuarios autenticados eliminar archivos del bucket signed-documents
DROP POLICY IF EXISTS "Allow authenticated users to delete from signed-documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete from signed-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'signed-documents');

