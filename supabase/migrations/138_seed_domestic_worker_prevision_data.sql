-- ==============================================================================
-- MIGRACION 138: Seed datos previsionales para casa particular (idempotente)
-- ==============================================================================
-- Esta migracion inserta las tasas y limites previsionales para el regimen
-- de casa particular. Es idempotente: si los datos ya existen, los salta.
-- ==============================================================================

-- ==============================================================================
-- PASO 1: Tasas previsionales para casa particular
-- ==============================================================================

-- AFC Trabajador Casa Particular: 0% (NO descuenta al trabajador)
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFC_TRABAJADOR_CASA_PARTICULAR', '2025-01-01', NULL, 0.00, 'trabajador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15 - Casa particular no cotiza AFC trabajador', 'internal_validated', 'validated');
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'Ya existe: AFC_TRABAJADOR_CASA_PARTICULAR';
WHEN exclusion_violation THEN RAISE NOTICE 'Rango solapado: AFC_TRABAJADOR_CASA_PARTICULAR';
END; $$;

-- AFC Empleador Casa Particular: 3.0%
-- Desglose: 2.2% Cuenta Individual + 0.8% Fondo Solidario
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('AFC_EMPLEADOR_CASA_PARTICULAR', '2025-01-01', NULL, 3.00, 'empleador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15 - Casa particular empleador 3%', 'internal_validated', 'validated');
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'Ya existe: AFC_EMPLEADOR_CASA_PARTICULAR';
WHEN exclusion_violation THEN RAISE NOTICE 'Rango solapado: AFC_EMPLEADOR_CASA_PARTICULAR';
END; $$;

-- Indemnizacion a todo evento Casa Particular: 1.11%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR', '2025-01-01', NULL, 1.11, 'empleador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 - Indemnizacion a todo evento casa particular', 'internal_validated', 'validated');
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'Ya existe: INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR';
WHEN exclusion_violation THEN RAISE NOTICE 'Rango solapado: INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR';
END; $$;

-- Ley 16.744 ISL para Casa Particular: 0.93%
DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('LEY16744_ISL_CASA_PARTICULAR', '2025-01-01', NULL, 0.93, 'empleador', 'imponible_afp', 'ISL', 'Ley 16.744 - ISL casa particular 0.93%', 'internal_validated', 'validated');
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'Ya existe: LEY16744_ISL_CASA_PARTICULAR';
WHEN exclusion_violation THEN RAISE NOTICE 'Rango solapado: LEY16744_ISL_CASA_PARTICULAR';
END; $$;

-- ==============================================================================
-- PASO 2: Tasa patronal total Reforma Previsional (agosto 2026+)
-- ==============================================================================
-- Para casa particular y trabajadores regulares, desde agosto 2026 la tasa patronal
-- previsional total es 3.5% (que incluye SIS + Cuenta Individual + CRP).
-- NO se debe sumar SIS ni CRP por separado cuando esta tasa total aplica.

DO $$ BEGIN
  INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
  VALUES ('EMPLOYER_PENSION_REFORM_TOTAL', '2026-08-01', NULL, 3.50, 'empleador', 'imponible_afp', 'AFP', 'Ley 21.735 - Aporte previsional patronal total agosto 2026', 'internal_validated', 'pending');
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'Ya existe: EMPLOYER_PENSION_REFORM_TOTAL';
WHEN exclusion_violation THEN RAISE NOTICE 'Rango solapado: EMPLOYER_PENSION_REFORM_TOTAL';
END; $$;

-- ==============================================================================
-- PASO 3: Limites previsionales
-- ==============================================================================

-- Ingreso Minimo Mensual para Trabajador de Casa Particular (mayo 2026+)
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RMI_TRAB_CASA_PART', '2026-05-01', NULL, 553553, 'pesos', 'Ley 21.587 - Ingreso minimo casa particular', 'pending');
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'Ya existe: RMI_TRAB_CASA_PART';
WHEN exclusion_violation THEN RAISE NOTICE 'Rango solapado: RMI_TRAB_CASA_PART';
END; $$;

-- Ingreso Minimo Mensual para Trabajador Dependiente (mayo 2026+)
-- Primero cerrar el rango del registro existente que tiene valid_to = NULL
UPDATE prevision_limits
SET valid_to = '2026-04-30'
WHERE limit_code = 'RMI_TRAB_DEPE'
  AND valid_from = '2026-01-01'
  AND valid_to IS NULL;

-- Luego insertar el nuevo rango
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('RMI_TRAB_DEPE', '2026-05-01', NULL, 553553, 'pesos', 'Ley 21.587 - Ingreso minimo dependiente', 'pending');
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'Ya existe: RMI_TRAB_DEPE';
WHEN exclusion_violation THEN RAISE NOTICE 'Rango solapado: RMI_TRAB_DEPE';
END; $$;

-- Jornada ordinaria maxima semanal (referencia)
-- Nota: unit debe ser 'pesos' porque el check constraint prevision_limits_unit_check
-- solo permite 'pesos'. El campo amount=42 representa horas semanales.
DO $$ BEGIN
  INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
  VALUES ('MAX_WEEKLY_HOURS', '2025-01-01', NULL, 42, 'pesos', 'Codigo del Trabajo Art 22 - Jornada ordinaria maxima (42 horas semanales)', 'validated');
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'Ya existe: MAX_WEEKLY_HOURS';
WHEN exclusion_violation THEN RAISE NOTICE 'Rango solapado: MAX_WEEKLY_HOURS';
END; $$;