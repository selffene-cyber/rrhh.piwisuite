-- ============================================
-- MIGRACIÓN 121: Agregar columnas de bonos, movilización y colación a settlements
-- ============================================

ALTER TABLE settlements ADD COLUMN IF NOT EXISTS bonuses_payout DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS transportation_payout DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS meal_allowance_payout DECIMAL(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN settlements.bonuses_payout IS 'Total de bonos proporcionales del último mes';
COMMENT ON COLUMN settlements.transportation_payout IS 'Movilización proporcional (haber no imponible)';
COMMENT ON COLUMN settlements.meal_allowance_payout IS 'Colación proporcional (haber no imponible)';