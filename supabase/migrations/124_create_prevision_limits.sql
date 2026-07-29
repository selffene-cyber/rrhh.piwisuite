-- ==============================================================================
-- MIGRACION 124: Tabla prevision_limits
-- Reforma Previsional 2026 - Fase 2
--
-- Tabla de topes imponibles con vigencia temporal.
-- Almacena RTIAfp, RTIIps, RTISegCes, UF, UTM, RMI, etc.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS prevision_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_code VARCHAR(50) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  amount DECIMAL(12,2) NOT NULL,
  unit VARCHAR(10) NOT NULL CHECK (unit IN ('pesos', 'uf', 'utm')),
  legal_reference VARCHAR(200),
  validation_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (validation_status IN ('pending', 'validated', 'rejected', 'expired')),
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Restriccion: no permitir vigencias superpuestas para el mismo tope
  CONSTRAINT prevision_limits_no_overlap 
    EXCLUDE USING gist (
      limit_code WITH =,
      daterange(valid_from, COALESCE(valid_to, '9999-12-31')) WITH &&
    )
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_prevision_limits_code ON prevision_limits(limit_code, valid_from);
CREATE INDEX IF NOT EXISTS idx_prevision_limits_valid ON prevision_limits(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_prevision_limits_status ON prevision_limits(validation_status);

-- Comentarios
COMMENT ON TABLE prevision_limits IS 'Topes imponibles con vigencia temporal. RTIAfp, RTIIps, RTISegCes, UF, UTM, RMI, etc.';
COMMENT ON COLUMN prevision_limits.limit_code IS 'Codigo del tope (ej: RTI_AFP, RTI_IPS, RTI_SEG_CES, UF, UTM, RMI_TRAB_DEPE)';
COMMENT ON COLUMN prevision_limits.valid_from IS 'Fecha de inicio de vigencia';
COMMENT ON COLUMN prevision_limits.valid_to IS 'Fecha de fin de vigencia. NULL = vigente indefinidamente';
COMMENT ON COLUMN prevision_limits.amount IS 'Monto del tope en la unidad indicada';
COMMENT ON COLUMN prevision_limits.unit IS 'Unidad del monto: pesos, uf, utm';
COMMENT ON COLUMN prevision_limits.validation_status IS 'pending: sin validar. validated: validado y listo para usar. rejected: rechazado. expired: reemplazado.';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_prevision_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prevision_limits_updated_at 
  BEFORE UPDATE ON prevision_limits
  FOR EACH ROW EXECUTE FUNCTION update_prevision_limits_updated_at();