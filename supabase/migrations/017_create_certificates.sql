-- Tabla para certificados laborales
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  certificate_type VARCHAR(50) NOT NULL CHECK (certificate_type IN ('antiguedad', 'renta', 'vigencia', 'contratos')),
  issue_date DATE NOT NULL,
  purpose TEXT,
  -- Campos específicos para certificado de renta
  months_period INTEGER CHECK (months_period IN (3, 6, 12)),
  -- Campos específicos para certificado de vigencia
  valid_until DATE,
  -- Folio/QR (opcional)
  folio_number VARCHAR(50),
  qr_code TEXT,
  -- Estado
  status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'void')),
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_certificates_company ON certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_certificates_employee ON certificates(employee_id);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(certificate_type);
CREATE INDEX IF NOT EXISTS idx_certificates_issue_date ON certificates(issue_date);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_certificates_updated_at();

-- Comentarios
COMMENT ON TABLE certificates IS 'Registro de certificados laborales emitidos';
COMMENT ON COLUMN certificates.certificate_type IS 'Tipo de certificado: antiguedad, renta, vigencia, contratos';
COMMENT ON COLUMN certificates.months_period IS 'Período en meses para certificado de renta (3, 6 o 12)';
COMMENT ON COLUMN certificates.folio_number IS 'Número de folio del certificado (opcional)';
COMMENT ON COLUMN certificates.qr_code IS 'Código QR del certificado (opcional)';

