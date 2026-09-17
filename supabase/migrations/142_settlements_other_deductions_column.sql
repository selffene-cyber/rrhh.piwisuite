-- ==============================================================================
-- MIGRACION 142: Agregar columna other_deductions faltante a settlements
-- ==============================================================================
-- El settlementService inserta 'other_deductions' pero esta columna no existia
-- en ninguna migracion, causando error:
-- "Could not find the 'other_deductions' column of 'settlements' in the schema cache"
-- ==============================================================================

ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN settlements.other_deductions IS 'Otros descuentos individuales (prestamos, anticipos, etc.)';