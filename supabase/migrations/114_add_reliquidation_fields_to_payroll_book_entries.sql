-- Migración 114: Agregar campos de reliquidación a payroll_book_entries
-- Fecha: 2025-01-04
-- Descripción: Permite identificar entradas del LRE que corresponden a reliquidaciones pagadas

-- Agregar campos para identificar reliquidaciones en el LRE
ALTER TABLE payroll_book_entries 
ADD COLUMN IF NOT EXISTS is_reliquidation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reliquidation_id UUID REFERENCES payroll_reliquidations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reference_period_year INTEGER,
ADD COLUMN IF NOT EXISTS reference_period_month INTEGER;

-- Índice para búsquedas por reliquidación
CREATE INDEX IF NOT EXISTS idx_payroll_book_entries_reliquidation ON payroll_book_entries(reliquidation_id);
CREATE INDEX IF NOT EXISTS idx_payroll_book_entries_reference_period ON payroll_book_entries(reference_period_year, reference_period_month);

-- Comentarios para documentación
COMMENT ON COLUMN payroll_book_entries.is_reliquidation IS 'Indica si esta entrada corresponde a una reliquidación pagada en este período';
COMMENT ON COLUMN payroll_book_entries.reliquidation_id IS 'Referencia a la reliquidación que generó esta entrada';
COMMENT ON COLUMN payroll_book_entries.reference_period_year IS 'Año del período original de la liquidación reliquidada';
COMMENT ON COLUMN payroll_book_entries.reference_period_month IS 'Mes del período original de la liquidación reliquidada';
