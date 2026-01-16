-- Tabla para almacenar períodos anuales de vacaciones por trabajador
-- Según ley chilena: máximo 2 períodos (60 días) pueden guardarse
-- Los períodos más antiguos se pierden automáticamente

CREATE TABLE IF NOT EXISTS vacation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL, -- Año del período (ej: 2024, 2025)
  -- Días acumulados en este período (1.25 días por mes trabajado en ese año)
  accumulated_days DECIMAL(5, 2) NOT NULL DEFAULT 0,
  -- Días usados de este período
  used_days INTEGER NOT NULL DEFAULT 0,
  -- Días disponibles (puede ser negativo si se dieron días de períodos futuros)
  available_days DECIMAL(5, 2) GENERATED ALWAYS AS (accumulated_days - used_days) STORED,
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Un trabajador solo puede tener un registro por año
  UNIQUE(employee_id, period_year)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vacation_periods_employee ON vacation_periods(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_periods_year ON vacation_periods(period_year);
CREATE INDEX IF NOT EXISTS idx_vacation_periods_employee_year ON vacation_periods(employee_id, period_year);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_vacation_periods_updated_at
  BEFORE UPDATE ON vacation_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE vacation_periods IS 'Almacena los períodos anuales de vacaciones por trabajador. Máximo 2 períodos (60 días) según ley chilena.';
COMMENT ON COLUMN vacation_periods.period_year IS 'Año del período de vacaciones (ej: 2024, 2025)';
COMMENT ON COLUMN vacation_periods.accumulated_days IS 'Días acumulados en este período (1.25 días por mes trabajado)';
COMMENT ON COLUMN vacation_periods.used_days IS 'Días usados de este período';
COMMENT ON COLUMN vacation_periods.available_days IS 'Días disponibles (puede ser negativo si se dieron días de períodos futuros)';

