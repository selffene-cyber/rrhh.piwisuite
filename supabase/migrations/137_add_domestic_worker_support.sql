-- ==============================================================================
-- MIGRACION 137: Soporte para Trabajadora de Casa Particular
-- ==============================================================================
-- Agrega worker_type, domestic_worker_mode, gratification_type, weekly_hours,
-- law16744_config, y campos de salario minimo proporcional.
-- Tambien agrega tasas previsionales para casa particular y reforma previsional.
-- ==============================================================================

-- ============================================
-- PASO 1: Agregar worker_type a employees
-- ============================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS worker_type TEXT NOT NULL DEFAULT 'REGULAR'
  CHECK (worker_type IN ('REGULAR', 'DOMESTIC_WORKER'));

COMMENT ON COLUMN employees.worker_type IS
  'Tipo de trabajador: REGULAR (dependiente comun) o DOMESTIC_WORKER (casa particular)';

-- ============================================
-- PASO 2: Agregar domestic_worker_mode a employees
-- ============================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS domestic_worker_mode TEXT
  CHECK (domestic_worker_mode IS NULL OR domestic_worker_mode IN ('LIVE_IN', 'LIVE_OUT'));

COMMENT ON COLUMN employees.domestic_worker_mode IS
  'Modalidad de casa particular: LIVE_IN (puertas adentro) o LIVE_OUT (puertas afuera). Solo si worker_type = DOMESTIC_WORKER';

-- ============================================
-- PASO 3: Agregar gratification_type a employees
-- ============================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS gratification_type TEXT NOT NULL DEFAULT 'LEGAL_ARTICLE_50'
  CHECK (gratification_type IN ('NONE', 'LEGAL_ARTICLE_47', 'LEGAL_ARTICLE_50', 'CONTRACTUAL'));

COMMENT ON COLUMN employees.gratification_type IS
  'Tipo de gratificacion: NONE (sin gratificacion), LEGAL_ARTICLE_47 (25% sin tope), LEGAL_ARTICLE_50 (25% con tope), CONTRACTUAL (monto pactado)';

-- ============================================
-- PASO 4: Agregar campos de jornada para casa particular
-- ============================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS weekly_hours DECIMAL(5,2);

COMMENT ON COLUMN employees.weekly_hours IS
  'Horas semanales efectivas del contrato. Para casa particular puertas afuera: 26.25';

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS max_weekly_hours DECIMAL(5,2) DEFAULT 42.0;

COMMENT ON COLUMN employees.max_weekly_hours IS
  'Jornada ordinaria maxima legal en horas semanales (42 por defecto)';

-- ============================================
-- PASO 5: Agregar config Ley 16.744 a employees
-- ============================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS law16744_organism TEXT
  CHECK (law16744_organism IS NULL OR law16744_organism IN ('MUTUAL', 'ISL'));

COMMENT ON COLUMN employees.law16744_organism IS
  'Organismo administrador Ley 16.744: MUTUAL o ISL (Instituto de Seguridad Laboral). Para casa particular suele ser ISL';

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS law16744_rate DECIMAL(5,3);

COMMENT ON COLUMN employees.law16744_rate IS
  'Tasa Ley 16.744 en porcentaje. Para casa particular con ISL: 0.93. Puede variar si hay tasa adicional';

-- ============================================
-- PASO 6: Agregar campos de salario minimo proporcional
-- ============================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS minimum_wage_type TEXT NOT NULL DEFAULT 'FULL'
  CHECK (minimum_wage_type IN ('FULL', 'PROPORTIONAL'));

COMMENT ON COLUMN employees.minimum_wage_type IS
  'FULL: salario minimo completo. PROPORTIONAL: proporcional a jornada parcial (casa particular puertas afuera)';

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS target_net_salary DECIMAL(12,2);

COMMENT ON COLUMN employees.target_net_salary IS
  'Liquid objetivo mensual. Si se configura, se usa para calculo inverso bruto->liquido';

-- ============================================
-- PASO 7: Constraint de consistencia
-- ============================================

-- Si worker_type es DOMESTIC_WORKER, domestic_worker_mode es obligatorio
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_domestic_worker_mode;
ALTER TABLE employees
ADD CONSTRAINT check_domestic_worker_mode
CHECK (
  worker_type = 'REGULAR' OR
  domestic_worker_mode IS NOT NULL
);

-- Si worker_type es DOMESTIC_WORKER, gratification debe ser NONE
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_domestic_gratification;
ALTER TABLE employees
ADD CONSTRAINT check_domestic_gratification
CHECK (
  worker_type = 'REGULAR' OR
  gratification_type = 'NONE'
);

-- Si worker_type es DOMESTIC_WORKER, afc_applicable debe ser FALSE
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_domestic_afc;
ALTER TABLE employees
ADD CONSTRAINT check_domestic_afc
CHECK (
  worker_type = 'REGULAR' OR
  afc_applicable = FALSE
);

-- si minimum_wage_type es PROPORTIONAL, weekly_hours es obligatorio
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_proportional_wage_hours;
ALTER TABLE employees
ADD CONSTRAINT check_proportional_wage_hours
CHECK (
  minimum_wage_type = 'FULL' OR
  weekly_hours IS NOT NULL
);

-- ============================================
-- PASO 8: Actualizar constraint previsional
-- ==============================================================================

-- Para DOMESTIC_WORKER con AFP, afp y health_system son obligatorios
-- Para DOMESTIC_WORKER con OTRO_REGIMEN, afp y health_system deben ser NULL
-- Para REGULAR, se mantienen las reglas existentes

-- Eliminar constraint anterior que obligaba a OTRO_REGIMEN a no tener AFP
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_other_regime_no_afp;

-- Nuevo constraint: si es OTRO_REGIMEN, afp y health_system deben ser NULL
-- Si es AFP (regular o domestic_worker), afp y health_system deben estar definidos
ALTER TABLE employees
ADD CONSTRAINT check_other_regime_no_afp
CHECK (
  previsional_regime = 'AFP' OR
  (afp IS NULL AND health_system IS NULL)
);

-- ============================================
-- PASO 9: Actualizar trabajadores existentes
-- ============================================

-- Todos los trabajadores existentes quedan como REGULAR con gratificacion LEGAL_ARTICLE_50
UPDATE employees
SET
  worker_type = 'REGULAR',
  gratification_type = 'LEGAL_ARTICLE_50',
  minimum_wage_type = 'FULL'
WHERE worker_type IS NULL OR worker_type = 'REGULAR';

-- ============================================
-- PASO 10: Índices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_worker_type
  ON employees(worker_type);

CREATE INDEX IF NOT EXISTS idx_employees_gratification_type
  ON employees(gratification_type);

-- ============================================
-- PASO 11: Agregar conceptos previsionales para casa particular
-- ==============================================================================

-- AFC Trabajador Casa Particular: 0% (NO descuenta al trabajador)
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFC_TRABAJADOR_CASA_PARTICULAR', '2025-01-01', NULL, 0.00, 'trabajador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15 - Casa particular no cotiza AFC trabajador', 'internal_validated', 'validated');

-- AFC Empleador Casa Particular: 3.0%
-- Desglose: 2.2% Cuenta Individual + 0.8% Fondo Solidario
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('AFC_EMPLEADOR_CASA_PARTICULAR', '2025-01-01', NULL, 3.00, 'empleador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 Art 15 - Casa particular empleador 3%', 'internal_validated', 'validated');

-- Indemnizacion a todo evento Casa Particular: 1.11%
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('INDEMNIZACION_A_TODO_EVENTO_CASA_PARTICULAR', '2025-01-01', NULL, 1.11, 'empleador', 'imponible_seg_ces', 'AFC', 'Ley 19.728 - Indemnizacion a todo evento casa particular', 'internal_validated', 'validated');

-- Ley 16.744 ISL para Casa Particular: 0.93%
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('LEY16744_ISL_CASA_PARTICULAR', '2025-01-01', NULL, 0.93, 'empleador', 'imponible_afp', 'ISL', 'Ley 16.744 - ISL casa particular 0.93%', 'internal_validated', 'validated');

-- ============================================
-- PASO 12: Tasa patronal total Reforma Previsional (agosto 2026+)
-- ==============================================================================
-- Para casa particular y trabajadores regulares, desde agosto 2026 la tasa patronal
-- previsional total es 3.5% (que incluye SIS + Cuenta Individual + CRP).
-- NO se debe sumar SIS ni CRP por separado cuando esta tasa total aplica.

-- Tasa patronal previsional total desde agosto 2026: 3.5%
-- Esto REEMPLAZA a SIS (2.00%), AFP_EMPLEADOR_CUENTA_INDIVIDUAL (0.10%) y CRP (0.90%)
-- que individualmente suman 3.0%. La tasa de 3.5% incluye un incremento adicional.
INSERT INTO prevision_rates (concept_code, valid_from, valid_to, rate, financing_party, taxable_base_type, collection_entity, legal_reference, data_source, validation_status)
VALUES ('EMPLOYER_PENSION_REFORM_TOTAL', '2026-08-01', NULL, 3.50, 'empleador', 'imponible_afp', 'AFP', 'Ley 21.735 - Aporte previsional patronal total agosto 2026', 'internal_validated', 'pending');

-- ============================================
-- PASO 13: Salario minimo para casa particular
-- ==============================================================================

-- Ingreso Minimo Mensual para Trabajador de Casa Particular (mayo 2026+)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RMI_TRAB_CASA_PART', '2026-05-01', NULL, 553553, 'pesos', 'Ley 21.587 - Ingreso minimo casa particular', 'pending');

-- Ingreso Minimo Mensual para Trabajador Dependiente (mayo 2026+)
-- Actualizar el existente si es necesario, pero no modificar el historical
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('RMI_TRAB_DEPE', '2026-05-01', NULL, 553553, 'pesos', 'Ley 21.587 - Ingreso minimo dependiente', 'pending');

-- Jornada ordinaria maxima semanal (referencia)
INSERT INTO prevision_limits (limit_code, valid_from, valid_to, amount, unit, legal_reference, validation_status)
VALUES ('MAX_WEEKLY_HOURS', '2025-01-01', NULL, 42, 'horas', 'Codigo del Trabajo Art 22 - Jornada ordinaria maxima', 'validated');

-- ============================================
-- NOTAS IMPORTANTES
-- ==============================================================================
-- 1. worker_type = 'DOMESTIC_WORKER' con previsional_regime = 'AFP' usa AFP UNO/FONASA
--    pero con reglas especiales de AFC y Ley 16.744
-- 2. Para casa particular: gratification_type debe ser NONE
-- 3. Para casa particular: afc_applicable debe ser FALSE
-- 4. La tasa patronal total de reforma previsional (3.5%) reemplaza SIS+CRP+Cuenta Individual
--    cuando se usa con DOMESTIC_WORKER. Para trabajadores regulares, se mantiene la estructura
--    separada (SIS + Cuenta Individual + CRP).
-- 5. El campo target_net_salary es el liquido pactado/objetivo, para calculo inverso bruto->liquido
-- ==============================================================================