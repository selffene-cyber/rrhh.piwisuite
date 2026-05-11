-- ============================================
-- MIGRACIÓN 121: Ampliar cálculo de finiquitos con gratificación, descuentos legales e información previsional
-- ============================================

-- Haberes imponibles adicionales
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS gratification DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS bonuses_payout DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS taxable_earnings_total DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Haberes no imponibles
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS transportation_payout DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS meal_allowance_payout DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS non_taxable_earnings_total DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Descuentos legales
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS afp_total DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS afp_10 DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS afp_additional DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS health_total DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS unemployment_insurance DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS legal_deductions_total DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Impuesto único
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS taxable_base_for_tax DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS unique_tax DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Otros descuentos total
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS other_deductions_total DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Comentarios
COMMENT ON COLUMN settlements.gratification IS 'Gratificación legal proporcional (25% o tope 4.75*IMM/12)';
COMMENT ON COLUMN settlements.bonuses_payout IS 'Total de bonos proporcionales del último mes';
COMMENT ON COLUMN settlements.taxable_earnings_total IS 'Total haberes imponibles (sueldo + gratificación + bonos)';
COMMENT ON COLUMN settlements.transportation_payout IS 'Movilización proporcional (haber no imponible)';
COMMENT ON COLUMN settlements.meal_allowance_payout IS 'Colación proporcional (haber no imponible)';
COMMENT ON COLUMN settlements.non_taxable_earnings_total IS 'Total haberes no imponibles (movilización + colación)';
COMMENT ON COLUMN settlements.afp_total IS 'Descuento total AFP del trabajador';
COMMENT ON COLUMN settlements.afp_10 IS 'Cotización AFP 10% obligatoria';
COMMENT ON COLUMN settlements.afp_additional IS 'Cotización AFP adicional (comisión + seguro)';
COMMENT ON COLUMN settlements.health_total IS 'Descuento total de salud (FONASA 7% o ISAPRE en UF)';
COMMENT ON COLUMN settlements.unemployment_insurance IS 'Seguro de cesantía trabajador (AFC)';
COMMENT ON COLUMN settlements.legal_deductions_total IS 'Total descuentos legales (AFP + Salud + AFC)';
COMMENT ON COLUMN settlements.taxable_base_for_tax IS 'Renta líquida imponible (base imponible - descuentos legales)';
COMMENT ON COLUMN settlements.unique_tax IS 'Impuesto único a la renta';
COMMENT ON COLUMN settlements.other_deductions_total IS 'Total otros descuentos (préstamos + anticipos)';