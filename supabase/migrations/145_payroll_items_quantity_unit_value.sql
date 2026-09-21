-- ==============================================================================
-- MIGRACION 145: Agregar campos de cantidad y valor unitario a payroll_items
-- ==============================================================================
-- Permite almacenar el desglose de bonos calculados por cantidad × valor unitario
-- (Factor Recarga, Bono Feriado, etc.) manteniendo trazabilidad del cálculo.
-- ==============================================================================

ALTER TABLE payroll_items
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(12, 2);

ALTER TABLE payroll_items
  ADD COLUMN IF NOT EXISTS unit_value DECIMAL(12, 2);

ALTER TABLE payroll_items
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN payroll_items.quantity IS 'Cantidad de unidades para bonos calculados (ej: factores de recarga)';
COMMENT ON COLUMN payroll_items.unit_value IS 'Valor unitario del bono (monto por unidad)';
COMMENT ON COLUMN payroll_items.metadata IS 'Metadatos adicionales del item (formato JSON flexible)';