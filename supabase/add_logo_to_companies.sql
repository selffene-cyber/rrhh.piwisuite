-- Agregar campo para logo de la empresa
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Comentario para documentación
COMMENT ON COLUMN companies.logo_url IS 'URL del logo de la empresa almacenado en Supabase Storage';



