-- Migración para permitir historial de tramos del Impuesto Único
-- Elimina el constraint UNIQUE para permitir múltiples versiones por mes/año/período

-- Eliminar el constraint UNIQUE existente
ALTER TABLE tax_brackets DROP CONSTRAINT IF EXISTS tax_brackets_year_month_period_type_key;

-- Agregar índice para búsquedas rápidas (sin UNIQUE)
CREATE INDEX IF NOT EXISTS idx_tax_brackets_latest ON tax_brackets(year, month, period_type, created_at DESC);

-- Comentario actualizado
COMMENT ON TABLE tax_brackets IS 'Tramos del Impuesto Único de Segunda Categoría por mes/año. Se guarda un historial completo de todas las versiones scrapeadas.';

