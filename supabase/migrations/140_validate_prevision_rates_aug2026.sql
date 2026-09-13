-- ==============================================================================
-- MIGRACION 140: Validar tasas previsionales para agosto 2026+
-- ==============================================================================
-- Esta migracion actualiza las tasas pendientes a validated y asegura que
-- todas las tasas y topes necesarios existan para el calculo de liquidaciones
-- a partir de agosto 2026 (reforma previsional).
-- ==============================================================================

-- ============================================
-- PASO 1: Actualizar tasas pending a validated
-- ============================================

-- SIS: 2.00% desde agosto 2026 (Ley 21.735)
UPDATE prevision_rates
SET validation_status = 'validated',
    data_source = 'internal_validated'
WHERE concept_code = 'SIS'
  AND valid_from = '2026-08-01'
  AND rate = 2.00
  AND validation_status = 'pending';

-- CRP: 0.90% desde agosto 2026 (Ley 21.735 Art 5)
UPDATE prevision_rates
SET validation_status = 'validated',
    data_source = 'internal_validated'
WHERE concept_code = 'CRP'
  AND valid_from = '2026-08-01'
  AND rate = 0.90
  AND validation_status = 'pending';

-- EMPLOYER_PENSION_REFORM_TOTAL: 3.50% desde agosto 2026
UPDATE prevision_rates
SET validation_status = 'validated',
    data_source = 'internal_validated'
WHERE concept_code = 'EMPLOYER_PENSION_REFORM_TOTAL'
  AND valid_from = '2026-08-01'
  AND rate = 3.50
  AND validation_status = 'pending';

-- ============================================
-- PASO 2: Actualizar topes pending a validated (enero 2026+)
-- ============================================

-- RTI AFP (tope imponible AFP)
UPDATE prevision_limits
SET validation_status = 'validated'
WHERE limit_code = 'RTI_AFP'
  AND valid_from = '2026-01-01'
  AND validation_status = 'pending';

-- RTI IPS (tope imponible IPS/salud)
UPDATE prevision_limits
SET validation_status = 'validated'
WHERE limit_code = 'RTI_IPS'
  AND valid_from = '2026-01-01'
  AND validation_status = 'pending';

-- RTI SEG_CES (tope imponible seguro de cesantia)
UPDATE prevision_limits
SET validation_status = 'validated'
WHERE limit_code = 'RTI_SEG_CES'
  AND valid_from = '2026-01-01'
  AND validation_status = 'pending';

-- UF
UPDATE prevision_limits
SET validation_status = 'validated'
WHERE limit_code = 'UF'
  AND valid_from = '2026-01-01'
  AND validation_status = 'pending';

-- UTM
UPDATE prevision_limits
SET validation_status = 'validated'
WHERE limit_code = 'UTM'
  AND valid_from = '2026-01-01'
  AND validation_status = 'pending';

-- RMI Trabajador Dependiente
UPDATE prevision_limits
SET validation_status = 'validated'
WHERE limit_code = 'RMI_TRAB_DEPE'
  AND valid_from = '2026-01-01'
  AND validation_status = 'pending';

-- ============================================
-- PASO 3: Insertar tasas faltantes si no existen (idempotente)
-- Usamos DO $$ BEGIN ... EXCEPTION WHEN exclusion_violation ... END; $$
-- porque prevision_rates usa exclusion constraints, no unique constraints
-- ============================================

-- AFP TRABAJADOR HABITAT 11.27% (vigente desde agosto 2025, sin fecha fin)
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFP_TRABAJADOR_HABITAT', '2025-08-01', NULL, 11.27, 'trabajador', 'imponible_afp', 'AFP Habitat', 'Comision SAFP agosto 2025', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFP_TRABAJADOR_HABITAT already exists, skipping';
END; $$;

-- AFP TRABAJADOR PROVIDA 11.45%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFP_TRABAJADOR_PROVIDA', '2025-08-01', NULL, 11.45, 'trabajador', 'imponible_afp', 'AFP Provida', 'Comision SAFP agosto 2025', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFP_TRABAJADOR_PROVIDA already exists, skipping';
END; $$;

-- AFP TRABAJADOR MODELO 10.58%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFP_TRABAJADOR_MODELO', '2025-08-01', NULL, 10.58, 'trabajador', 'imponible_afp', 'AFP Modelo', 'Comision SAFP agosto 2025', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFP_TRABAJADOR_MODELO already exists, skipping';
END; $$;

-- AFP TRABAJADOR CAPITAL 11.64%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFP_TRABAJADOR_CAPITAL', '2025-08-01', NULL, 11.64, 'trabajador', 'imponible_afp', 'AFP Capital', 'Comision SAFP agosto 2025', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFP_TRABAJADOR_CAPITAL already exists, skipping';
END; $$;

-- AFP EMPLEADOR CUENTA INDIVIDUAL 0.10% (desde agosto 2025)
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFP_EMPLEADOR_CUENTA_INDIVIDUAL', '2025-08-01', NULL, 0.10, 'empleador', 'imponible_afp', 'AFP', 'Ley 21.327 - AFP Empleador', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFP_EMPLEADOR_CUENTA_INDIVIDUAL already exists, skipping';
END; $$;

-- SIS 1.49% (historico, hasta septiembre 2025)
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('SIS', '2019-07-01', '2025-09-30', 1.49, 'empleador', 'imponible_afp', 'SCIS', 'Tasa historica SIS', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'SIS historical already exists, skipping';
END; $$;

-- SIS 1.88% (octubre 2025 - junio 2026)
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('SIS', '2025-10-01', '2026-06-30', 1.88, 'empleador', 'imponible_afp', 'SCIS', 'Resolucion SAFP oct 2025', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'SIS 1.88% already exists, skipping';
END; $$;

-- SIS 1.62% (julio 2026)
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('SIS', '2026-07-01', '2026-07-31', 1.62, 'empleador', 'imponible_afp', 'SCIS', 'Resolucion SAFP jul 2026', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'SIS 1.62% already exists, skipping';
END; $$;

-- SIS 2.00% (agosto 2026+, reforma previsional)
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('SIS', '2026-08-01', NULL, 2.00, 'empleador', 'imponible_afp', 'SCIS', 'Ley 21.735 - Reforma Previsional 2026', 'internal_validated', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'SIS 2.00% already exists, skipping';
END; $$;

-- CRP 0.90% (agosto 2026+, reforma previsional)
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('CRP', '2026-08-01', NULL, 0.90, 'empleador', 'imponible_afp', 'AFP', 'Ley 21.735 Art 5 - Reforma Previsional 2026', 'internal_validated', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'CRP already exists, skipping';
END; $$;

-- FONASA 7%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('FONASA', '2025-01-01', NULL, 7.00, 'trabajador', 'imponible_ips', 'FONASA', 'Ley 18.469', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'FONASA already exists, skipping';
END; $$;

-- AFC TRABAJADOR INDEFINIDO 0.60%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFC_TRABAJADOR_INDEFINIDO', '2025-08-01', NULL, 0.60, 'trabajador', 'imponible_seg_ces', 'SCIS', 'Ley 19.728 AFC', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFC_TRABAJADOR_INDEFINIDO already exists, skipping';
END; $$;

-- AFC TRABAJADOR PLAZO FIJO 0.00%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFC_TRABAJADOR_PLAZO_FIJO', '2025-08-01', NULL, 0.00, 'trabajador', 'imponible_seg_ces', 'SCIS', 'Ley 19.728 AFC plazo fijo', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFC_TRABAJADOR_PLAZO_FIJO already exists, skipping';
END; $$;

-- AFC EMPLEADOR INDEFINIDO 2.40%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFC_EMPLEADOR_INDEFINIDO', '2025-08-01', NULL, 2.40, 'empleador', 'imponible_seg_ces', 'SCIS', 'Ley 19.728 AFC', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFC_EMPLEADOR_INDEFINIDO already exists, skipping';
END; $$;

-- AFC EMPLEADOR PLAZO FIJO 3.00%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFC_EMPLEADOR_PLAZO_FIJO', '2025-08-01', NULL, 3.00, 'empleador', 'imponible_seg_ces', 'SCIS', 'Ley 19.728 AFC plazo fijo', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFC_EMPLEADOR_PLAZO_FIJO already exists, skipping';
END; $$;

-- EMPLOYER_PENSION_REFORM_TOTAL 3.50% (agosto 2026+)
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('EMPLOYER_PENSION_REFORM_TOTAL', '2026-08-01', NULL, 3.50, 'empleador', 'imponible_afp', 'AFP', 'Ley 21.735 - Reforma Previsional 2026', 'internal_validated', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'EMPLOYER_PENSION_REFORM_TOTAL already exists, skipping';
END; $$;

-- AFC TRABAJADOR TEMPORAL 0.00%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFC_TRABAJADOR_TEMPORAL', '2025-08-01', NULL, 0.00, 'trabajador', 'imponible_seg_ces', 'SCIS', 'Ley 19.728 AFC temporal', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFC_TRABAJADOR_TEMPORAL already exists, skipping';
END; $$;

-- AFC EMPLEADOR TEMPORAL 3.00%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFC_EMPLEADOR_TEMPORAL', '2025-08-01', NULL, 3.00, 'empleador', 'imponible_seg_ces', 'SCIS', 'Ley 19.728 AFC temporal', 'previred_api', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'AFC_EMPLEADOR_TEMPORAL already exists, skipping';
END; $$;

-- ============================================
-- PASO 4: Insertar topes faltantes si no existen (idempotente)
-- ============================================

-- RTI AFP 2025 (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RTI_AFP', '2025-08-01', '2025-12-31', 2351824, 'pesos', 'DFL 3500 Art 50', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'RTI_AFP 2025 already exists, skipping';
END; $$;

-- RTI AFP 2026+ (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RTI_AFP', '2026-01-01', NULL, 2351824, 'pesos', 'DFL 3500 Art 50', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'RTI_AFP 2026 already exists, skipping';
END; $$;

-- RTI IPS 2025 (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RTI_IPS', '2025-08-01', '2025-12-31', 1835024, 'pesos', 'DL 2763 Art 7', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'RTI_IPS 2025 already exists, skipping';
END; $$;

-- RTI IPS 2026+ (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RTI_IPS', '2026-01-01', NULL, 1835024, 'pesos', 'DL 2763 Art 7', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'RTI_IPS 2026 already exists, skipping';
END; $$;

-- RTI SEG_CES 2025 (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RTI_SEG_CES', '2025-08-01', '2025-12-31', 352774, 'pesos', 'Ley 19.728 Art 15', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'RTI_SEG_CES 2025 already exists, skipping';
END; $$;

-- RTI SEG_CES 2026+ (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RTI_SEG_CES', '2026-01-01', NULL, 352774, 'pesos', 'Ley 19.728 Art 15', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'RTI_SEG_CES 2026 already exists, skipping';
END; $$;

-- UF 2025 (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('UF', '2025-08-01', '2025-12-31', 38023.67, 'pesos', 'Banco Central', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'UF 2025 already exists, skipping';
END; $$;

-- UF 2026+ (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('UF', '2026-01-01', NULL, 39023.67, 'pesos', 'Banco Central', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'UF 2026 already exists, skipping';
END; $$;

-- UTM 2025 (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('UTM', '2025-08-01', '2025-12-31', 69345, 'pesos', 'Banco Central', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'UTM 2025 already exists, skipping';
END; $$;

-- UTM 2026+ (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('UTM', '2026-01-01', NULL, 70571, 'pesos', 'Banco Central', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'UTM 2026 already exists, skipping';
END; $$;

-- RMI Trabajador Dependiente 2025 (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RMI_TRAB_DEPE', '2025-08-01', '2025-12-31', 260000, 'pesos', 'DL 2763 Art 7', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'RMI_TRAB_DEPE 2025 already exists, skipping';
END; $$;

-- RMI Trabajador Dependiente 2026+ (validado)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RMI_TRAB_DEPE', '2026-01-01', NULL, 260000, 'pesos', 'DL 2763 Art 7', 'validated');
EXCEPTION WHEN exclusion_violation THEN
  RAISE NOTICE 'RMI_TRAB_DEPE 2026 already exists, skipping';
END; $$;

-- ============================================
-- PASO 5: Refrescar esquema de PostgREST
-- ============================================
NOTIFY pgrst, 'reload schema';