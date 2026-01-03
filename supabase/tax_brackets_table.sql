-- Tabla para almacenar tramos del Impuesto Único de Segunda Categoría
-- Los tramos se actualizan mensualmente según publicaciones del SII

CREATE TABLE IF NOT EXISTS tax_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('MENSUAL', 'QUINCENAL', 'SEMANAL', 'DIARIO')),
  brackets JSONB NOT NULL, -- Array de tramos: [{ desde, hasta, factor, cantidad_rebajar, tasa_efectiva }]
  source VARCHAR(50) DEFAULT 'sii_scraper',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- NOTA: No hay constraint UNIQUE para permitir historial completo de versiones
);

-- Índice para búsquedas rápidas por año/mes/período (ordenado por fecha descendente para obtener la versión más reciente)
CREATE INDEX IF NOT EXISTS idx_tax_brackets_period ON tax_brackets(year, month, period_type, created_at DESC);

-- Comentarios
COMMENT ON TABLE tax_brackets IS 'Tramos del Impuesto Único de Segunda Categoría por mes/año. Se guarda un historial completo de todas las versiones scrapeadas desde el SII.';
COMMENT ON COLUMN tax_brackets.brackets IS 'Array JSON con los tramos: [{"desde": number, "hasta": number|null, "factor": number, "cantidad_rebajar": number, "tasa_efectiva": string}]';
COMMENT ON COLUMN tax_brackets.period_type IS 'Tipo de período: MENSUAL, QUINCENAL, SEMANAL, DIARIO';
COMMENT ON COLUMN tax_brackets.created_at IS 'Fecha de creación del registro. Permite mantener historial completo de versiones.';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_tax_brackets_updated_at BEFORE UPDATE ON tax_brackets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

