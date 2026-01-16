-- Políticas de Storage - EJECUTAR UNA POR UNA
-- Copia y pega cada bloque en Supabase SQL Editor y ejecuta por separado

-- ============================================
-- POLÍTICA 1: INSERT (Subir logos)
-- ============================================
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');



