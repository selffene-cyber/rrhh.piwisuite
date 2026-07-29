-- ==============================================================================
-- MIGRACION 123: Tabla prevision_rates
-- Reforma Previsional 2026 - Fase 2
--
-- Tabla de tasas previsionales con vigencia temporal.
-- Cada tasa tiene fecha de inicio y fin, evitando solapamientos.
-- La API de Previred solo se usa para validacion, no como fuente de verdad.
-- La fuente oficial es esta tabla con validation_status = 'validated'.
--
-- Requiere: extension btree_gist
-- ==============================================================================

-- Crear extension si no existe (necesaria para EXCLUDE con &&)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Tabla principal de tasas previsionales
CREATE TABLE IF NOT EXISTS prevision_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_code VARCHAR(50) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  rate DECIMAL(8,6) NOT NULL,
  financing_party VARCHAR(20) NOT NULL 
    CHECK (financing_party IN ('trabajador', 'empleador')),
  taxable_base_type VARCHAR(50) NOT NULL 
    CHECK (taxable_base_type IN (
      'imponible_afp', 'imponible_ips', 'imponible_seg_ces',
      'imponible_salud', 'imponible_general', 'sueldo_base'
    )),
  collection_entity VARCHAR(50) NOT NULL,
  legal_reference VARCHAR(200),
  data_source VARCHAR(50) NOT NULL 
    CHECK (data_source IN ('previred_api', 'internal_validated', 'manual_entry', 'sii_scraper')),
  validation_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (validation_status IN ('pending', 'validated', 'rejected', 'expired')),
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Restriccion: no permitir vigencias superpuestas para el mismo concepto
  CONSTRAINT prevision_rates_no_overlap 
    EXCLUDE USING gist (
      concept_code WITH =,
      daterange(valid_from, COALESCE(valid_to, '9999-12-31')) WITH &&
    )
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_prevision_rates_concept ON prevision_rates(concept_code, valid_from);
CREATE INDEX IF NOT EXISTS idx_prevision_rates_valid ON prevision_rates(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_prevision_rates_status ON prevision_rates(validation_status);
CREATE INDEX IF NOT EXISTS idx_prevision_rates_concept_status ON prevision_rates(concept_code, validation_status);

-- Comentarios
COMMENT ON TABLE prevision_rates IS 'Tasas previsionales con vigencia temporal. La fuente oficial del sistema. La API de Previred solo se usa para validacion.';
COMMENT ON COLUMN prevision_rates.concept_code IS 'Codigo del concepto previsional (ej: SIS, CRP, AFP_TRABAJADOR_PROVIDA)';
COMMENT ON COLUMN prevision_rates.valid_from IS 'Fecha de inicio de vigencia de la tasa';
COMMENT ON COLUMN prevision_rates.valid_to IS 'Fecha de fin de vigencia. NULL significa vigente indefinidamente';
COMMENT ON COLUMN prevision_rates.rate IS 'Porcentaje de la tasa (ej: 1.49 para 1.49%, 11.45 para 11.45%)';
COMMENT ON COLUMN prevision_rates.financing_party IS 'Quien paga: trabajador o empleador';
COMMENT ON COLUMN prevision_rates.taxable_base_type IS 'Base imponible sobre la que se aplica: imponible_afp, imponible_ips, imponible_seg_ces, imponible_salud, imponible_general, sueldo_base';
COMMENT ON COLUMN prevision_rates.collection_entity IS 'Entidad recaudadora: AFP, IPS, AFC, FONASA, etc.';
COMMENT ON COLUMN prevision_rates.legal_reference IS 'Referencia legal (ej: DL 3500 Art 15, Ley 21.735)';
COMMENT ON COLUMN prevision_rates.data_source IS 'Origen de los datos: previred_api, internal_validated, manual_entry, sii_scraper';
COMMENT ON COLUMN prevision_rates.validation_status IS 'pending: ingresada sin validar. validated: validada y lista para usar. rejected: rechazada. expired: reemplazada por tasa mas reciente.';
COMMENT ON COLUMN prevision_rates.validated_by IS 'UUID del usuario que validó la tasa';
COMMENT ON COLUMN prevision_rates.validated_at IS 'Fecha y hora de validacion';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_prevision_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prevision_rates_updated_at 
  BEFORE UPDATE ON prevision_rates
  FOR EACH ROW EXECUTE FUNCTION update_prevision_rates_updated_at();