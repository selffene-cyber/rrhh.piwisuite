-- ==============================================================================
-- MIGRACION 141: Agregar columnas de aportes del empleador a settlements
-- ==============================================================================
-- El settlementService intenta insertar employer_sis, employer_afp_account,
-- employer_crp, employer_afc, employer_total y sus rates, pero estas columnas
-- no existian en la tabla settlements, causando error:
-- "Could not find the 'employer_afc' column of 'settlements' in the schema cache"
-- ==============================================================================

ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS employer_sis DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS employer_sis_rate DECIMAL(8, 6) NOT NULL DEFAULT 0;
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS employer_afp_account DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS employer_afp_account_rate DECIMAL(8, 6) NOT NULL DEFAULT 0;
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS employer_crp DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS employer_crp_rate DECIMAL(8, 6) NOT NULL DEFAULT 0;
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS employer_afc DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS employer_afc_rate DECIMAL(8, 6) NOT NULL DEFAULT 0;
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS employer_total DECIMAL(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN settlements.employer_sis IS 'Aporte empleador SIS (Seguro de Invalidez y Sobrevivencia)';
COMMENT ON COLUMN settlements.employer_sis_rate IS 'Tasa SIS empleador (porcentaje)';
COMMENT ON COLUMN settlements.employer_afp_account IS 'Aporte empleador AFP cuenta individual';
COMMENT ON COLUMN settlements.employer_afp_account_rate IS 'Tasa empleador AFP cuenta individual (porcentaje)';
COMMENT ON COLUMN settlements.employer_crp IS 'Aporte empleador CRP (Cotizacion de Rentabilidad Protegida)';
COMMENT ON COLUMN settlements.employer_crp_rate IS 'Tasa CRP empleador (porcentaje)';
COMMENT ON COLUMN settlements.employer_afc IS 'Aporte empleador AFC (Seguro de Cesantia)';
COMMENT ON COLUMN settlements.employer_afc_rate IS 'Tasa AFC empleador (porcentaje)';
COMMENT ON COLUMN settlements.employer_total IS 'Total aportes del empleador';