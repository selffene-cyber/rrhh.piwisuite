-- ============================================
-- MIGRACIÓN 084: Soporte para Regímenes Previsionales Especiales
-- ============================================
-- Agrega soporte para DIPRECA, CAPREDENA y otros regímenes
-- sin afectar el flujo AFP/Previred existente
-- ============================================

-- ============================================
-- PASO 1: Agregar nuevas columnas a employees
-- ============================================

-- Tipo de régimen previsional (AFP por defecto para compatibilidad)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS previsional_regime TEXT NOT NULL DEFAULT 'AFP'
  CHECK (previsional_regime IN ('AFP', 'OTRO_REGIMEN'));

-- Tipo específico de régimen especial (solo si previsional_regime = 'OTRO_REGIMEN')
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS other_regime_type TEXT
  CHECK (other_regime_type IN ('DIPRECA', 'CAPREDENA', 'SIN_PREVISION', 'OTRO'));

-- Tasas manuales para régimen especial (porcentajes)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manual_pension_rate DECIMAL(5,2);

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manual_health_rate DECIMAL(5,2);

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manual_employer_rate DECIMAL(5,2);

-- Base de cálculo para régimen especial
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manual_base_type TEXT
  CHECK (manual_base_type IN ('imponible', 'sueldo_base'));

-- Etiqueta personalizada para la glosa en liquidación
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manual_regime_label TEXT;

-- Control de AFC (Seguro de Cesantía)
-- TRUE por defecto para mantener comportamiento actual
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS afc_applicable BOOLEAN NOT NULL DEFAULT TRUE;

-- Código de régimen especial (ej: D9113 para HOSPITAL DIPRECA)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS other_regime_code TEXT;

-- Nota legal/contractual para régimen especial
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS other_regime_note TEXT;

-- ============================================
-- PASO 1.5: Hacer columnas AFP/Health opcionales
-- ============================================

-- Las columnas afp y health_system deben ser NULL para trabajadores con OTRO_REGIMEN
-- porque no usan el sistema AFP/Previred
ALTER TABLE employees 
ALTER COLUMN afp DROP NOT NULL;

ALTER TABLE employees 
ALTER COLUMN health_system DROP NOT NULL;

-- ============================================
-- PASO 2: Comentarios de documentación
-- ============================================

COMMENT ON COLUMN employees.previsional_regime IS 'Tipo de régimen previsional: AFP (Previred) o OTRO_REGIMEN (DIPRECA, CAPREDENA, etc.)';
COMMENT ON COLUMN employees.other_regime_type IS 'Subtipo de régimen especial: DIPRECA, CAPREDENA, SIN_PREVISION, OTRO';
COMMENT ON COLUMN employees.manual_pension_rate IS 'Porcentaje de cotización previsional del trabajador (solo OTRO_REGIMEN)';
COMMENT ON COLUMN employees.manual_health_rate IS 'Porcentaje de cotización de salud (solo OTRO_REGIMEN)';
COMMENT ON COLUMN employees.manual_employer_rate IS 'Porcentaje de cotización del empleador (solo OTRO_REGIMEN, opcional)';
COMMENT ON COLUMN employees.manual_base_type IS 'Base de cálculo: imponible o sueldo_base (solo OTRO_REGIMEN)';
COMMENT ON COLUMN employees.manual_regime_label IS 'Etiqueta personalizada para mostrar en liquidación (ej: "Cotización DIPRECA")';
COMMENT ON COLUMN employees.afc_applicable IS 'Si aplica AFC (Seguro de Cesantía). FALSE para DIPRECA, empleados públicos, etc.';
COMMENT ON COLUMN employees.other_regime_code IS 'Código de régimen (ej: D9113). Para trazabilidad y reportes.';
COMMENT ON COLUMN employees.other_regime_note IS 'Observación legal/contractual sobre el régimen especial';

-- ============================================
-- PASO 3: Constraint de validación
-- ============================================

-- Eliminar constraints si existen (para hacer la migración idempotente)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_other_regime_completeness;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_afp_regime_clean;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_other_regime_no_afc;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_afp_regime_required;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_other_regime_no_afp;

-- Si es OTRO_REGIMEN, los campos obligatorios deben estar completos
ALTER TABLE employees 
ADD CONSTRAINT check_other_regime_completeness
CHECK (
  previsional_regime = 'AFP' OR 
  (
    other_regime_type IS NOT NULL AND
    manual_pension_rate IS NOT NULL AND
    manual_health_rate IS NOT NULL AND
    manual_base_type IS NOT NULL
  )
);

-- Si es AFP, los campos de régimen especial deben estar vacíos
ALTER TABLE employees 
ADD CONSTRAINT check_afp_regime_clean
CHECK (
  previsional_regime = 'OTRO_REGIMEN' OR 
  (
    other_regime_type IS NULL AND
    manual_pension_rate IS NULL AND
    manual_health_rate IS NULL AND
    manual_employer_rate IS NULL AND
    manual_base_type IS NULL AND
    manual_regime_label IS NULL AND
    other_regime_code IS NULL
  )
);

-- Si es OTRO_REGIMEN, AFC debe ser FALSE
ALTER TABLE employees 
ADD CONSTRAINT check_other_regime_no_afc
CHECK (
  previsional_regime = 'AFP' OR 
  afc_applicable = FALSE
);

-- Si es AFP, debe tener afp y health_system definidos
ALTER TABLE employees 
ADD CONSTRAINT check_afp_regime_required
CHECK (
  previsional_regime = 'OTRO_REGIMEN' OR 
  (afp IS NOT NULL AND health_system IS NOT NULL)
);

-- Si es OTRO_REGIMEN, afp y health_system deben ser NULL
ALTER TABLE employees 
ADD CONSTRAINT check_other_regime_no_afp
CHECK (
  previsional_regime = 'AFP' OR 
  (afp IS NULL AND health_system IS NULL)
);

-- ============================================
-- PASO 4: Migración de datos existentes
-- ============================================

-- Todos los trabajadores existentes quedan como AFP (comportamiento actual)
UPDATE employees 
SET 
  previsional_regime = 'AFP',
  afc_applicable = TRUE
WHERE previsional_regime IS NULL;

-- ============================================
-- PASO 5: Índices para performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_previsional_regime 
  ON employees(previsional_regime);

CREATE INDEX IF NOT EXISTS idx_employees_other_regime_type 
  ON employees(other_regime_type) 
  WHERE other_regime_type IS NOT NULL;

-- ============================================
-- PASO 6: Función helper para obtener glosa de régimen
-- ============================================

CREATE OR REPLACE FUNCTION get_regime_label(
  p_previsional_regime TEXT,
  p_other_regime_type TEXT,
  p_manual_regime_label TEXT,
  p_afp TEXT
) RETURNS TEXT AS $$
BEGIN
  IF p_previsional_regime = 'OTRO_REGIMEN' THEN
    -- Si hay etiqueta personalizada, usarla
    IF p_manual_regime_label IS NOT NULL THEN
      RETURN p_manual_regime_label;
    END IF;
    
    -- Sino, usar etiqueta por defecto según tipo
    RETURN CASE p_other_regime_type
      WHEN 'DIPRECA' THEN 'Cotización DIPRECA'
      WHEN 'CAPREDENA' THEN 'Cotización CAPREDENA'
      WHEN 'SIN_PREVISION' THEN 'Sin Previsión'
      ELSE 'Cotización Previsional'
    END;
  ELSE
    -- AFP: retornar nombre de la AFP
    RETURN 'AFP ' || COALESCE(p_afp, 'PROVIDA');
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- PASO 7: Vista de auditoría para regímenes especiales
-- ============================================

CREATE OR REPLACE VIEW v_employees_special_regime AS
SELECT 
  e.id,
  e.full_name,
  e.rut,
  e.company_id,
  c.name as company_name,
  e.previsional_regime,
  e.other_regime_type,
  e.manual_pension_rate,
  e.manual_health_rate,
  e.manual_employer_rate,
  e.manual_base_type,
  get_regime_label(
    e.previsional_regime, 
    e.other_regime_type, 
    e.manual_regime_label, 
    e.afp
  ) as regime_display_label,
  e.other_regime_code,
  e.afc_applicable,
  e.status,
  e.created_at,
  e.updated_at
FROM employees e
JOIN companies c ON c.id = e.company_id
WHERE e.previsional_regime = 'OTRO_REGIMEN'
ORDER BY e.full_name;

-- ============================================
-- PASO 8: Función de validación de cambio de régimen
-- ============================================

CREATE OR REPLACE FUNCTION validate_regime_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si cambia el régimen previsional
  IF OLD.previsional_regime IS DISTINCT FROM NEW.previsional_regime THEN
    
    -- Verificar si hay liquidaciones en el período actual
    -- (Implementar según tu lógica de payroll)
    
    -- Por ahora, solo registrar el cambio en un log
    -- Puedes expandir esto según necesites
    
    RAISE NOTICE 'Cambio de régimen previsional detectado para trabajador %: % → %', 
      NEW.rut, 
      OLD.previsional_regime, 
      NEW.previsional_regime;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar cambios de régimen
DROP TRIGGER IF EXISTS trg_validate_regime_change ON employees;
CREATE TRIGGER trg_validate_regime_change
  BEFORE UPDATE ON employees
  FOR EACH ROW
  WHEN (OLD.previsional_regime IS DISTINCT FROM NEW.previsional_regime)
  EXECUTE FUNCTION validate_regime_change();

-- ============================================
-- PASO 9: Consulta de verificación
-- ============================================

-- Verificar que todos los trabajadores existentes quedaron como AFP
SELECT 
  COUNT(*) as total_employees,
  COUNT(*) FILTER (WHERE previsional_regime = 'AFP') as afp_regime,
  COUNT(*) FILTER (WHERE previsional_regime = 'OTRO_REGIMEN') as other_regime,
  COUNT(*) FILTER (WHERE afc_applicable = TRUE) as con_afc,
  COUNT(*) FILTER (WHERE afc_applicable = FALSE) as sin_afc
FROM employees;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Todos los trabajadores existentes quedan como AFP (sin cambios)
-- 2. Los nuevos campos tienen constraints que aseguran consistencia
-- 3. AFC se controla por el campo afc_applicable
-- 4. Para OTRO_REGIMEN, AFC siempre es FALSE
-- 5. La vista v_employees_special_regime facilita auditorías
-- 6. El trigger registra cambios de régimen (expandible)
-- ============================================

