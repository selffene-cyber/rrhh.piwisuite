-- Agregar columna para número de folio correlativo
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS folio_number VARCHAR(50);

-- Función para generar folio según tipo de certificado
CREATE OR REPLACE FUNCTION generate_certificate_folio()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  next_number INTEGER;
BEGIN
  -- Determinar prefijo según tipo
  CASE NEW.certificate_type
    WHEN 'antiguedad' THEN prefix := 'CertA-';
    WHEN 'renta' THEN prefix := 'CertR-';
    WHEN 'vigencia' THEN prefix := 'CertVL-';
    ELSE prefix := 'CERT-';
  END CASE;

  -- Obtener el siguiente número correlativo para este tipo y empresa
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(folio_number FROM LENGTH(prefix) + 1) AS INTEGER
    )
  ), 0) + 1
  INTO next_number
  FROM certificates
  WHERE company_id = NEW.company_id
    AND certificate_type = NEW.certificate_type
    AND folio_number IS NOT NULL
    AND folio_number ~ ('^' || prefix || '[0-9]+$');

  -- Generar folio
  NEW.folio_number := prefix || LPAD(next_number::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar folio automáticamente
CREATE TRIGGER set_certificate_folio
  BEFORE INSERT ON certificates
  FOR EACH ROW
  WHEN (NEW.folio_number IS NULL OR NEW.folio_number = '')
  EXECUTE FUNCTION generate_certificate_folio();

-- Comentario
COMMENT ON FUNCTION generate_certificate_folio() IS 'Genera folio correlativo automático para certificados según tipo y empresa';

