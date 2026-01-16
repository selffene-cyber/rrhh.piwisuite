-- ============================================
-- SCRIPT COMPLETO PARA CONFIGURAR PERÍODOS DE VACACIONES
-- Copia y pega TODO este script en Supabase SQL Editor
-- ============================================

-- 1. Crear función para updated_at (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear tabla vacation_periods
CREATE TABLE IF NOT EXISTS vacation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  accumulated_days DECIMAL(5, 2) NOT NULL DEFAULT 0,
  used_days INTEGER NOT NULL DEFAULT 0,
  available_days DECIMAL(5, 2) GENERATED ALWAYS AS (accumulated_days - used_days) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, period_year)
);

-- 3. Crear índices para vacation_periods
CREATE INDEX IF NOT EXISTS idx_vacation_periods_employee ON vacation_periods(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_periods_year ON vacation_periods(period_year);
CREATE INDEX IF NOT EXISTS idx_vacation_periods_employee_year ON vacation_periods(employee_id, period_year);

-- 4. Crear trigger para updated_at en vacation_periods
CREATE TRIGGER update_vacation_periods_updated_at
  BEFORE UPDATE ON vacation_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Agregar campo period_year a la tabla vacations
ALTER TABLE vacations 
ADD COLUMN IF NOT EXISTS period_year INTEGER;

-- 6. Crear índice para period_year en vacations
CREATE INDEX IF NOT EXISTS idx_vacations_period_year ON vacations(period_year);

-- 7. Agregar comentarios
COMMENT ON TABLE vacation_periods IS 'Almacena los períodos anuales de vacaciones por trabajador. Máximo 2 períodos (60 días) según ley chilena.';
COMMENT ON COLUMN vacation_periods.period_year IS 'Año del período de vacaciones (ej: 2024, 2025)';
COMMENT ON COLUMN vacation_periods.accumulated_days IS 'Días acumulados en este período (1.25 días por mes trabajado)';
COMMENT ON COLUMN vacation_periods.used_days IS 'Días usados de este período';
COMMENT ON COLUMN vacation_periods.available_days IS 'Días disponibles (puede ser negativo si se dieron días de períodos futuros)';
COMMENT ON COLUMN vacations.period_year IS 'Año del período de vacaciones al que pertenece esta solicitud. Se asigna automáticamente al crear/aprobar la solicitud.';

