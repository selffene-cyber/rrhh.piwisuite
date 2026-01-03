-- Tabla de vacaciones (Feriado Legal)
CREATE TABLE IF NOT EXISTS vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  -- Período de vacaciones
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  -- Días de vacaciones (hábiles)
  days_count INTEGER NOT NULL,
  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'solicitada' CHECK (status IN ('solicitada', 'aprobada', 'rechazada', 'tomada', 'cancelada')),
  -- Información adicional
  request_date DATE DEFAULT CURRENT_DATE,
  approval_date DATE,
  notes TEXT,
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Validación: fecha término debe ser mayor o igual a fecha inicio
  CONSTRAINT check_vacation_dates CHECK (end_date >= start_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vacations_employee_id ON vacations(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacations_dates ON vacations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON vacations(status);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_vacations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vacations_updated_at
  BEFORE UPDATE ON vacations
  FOR EACH ROW
  EXECUTE FUNCTION update_vacations_updated_at();

-- Función para calcular vacaciones acumuladas
-- Según Código del Trabajo: 1.25 días hábiles por mes trabajado
CREATE OR REPLACE FUNCTION calculate_accumulated_vacations(
  p_employee_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  accumulated_days NUMERIC,
  used_days INTEGER,
  available_days NUMERIC
) AS $$
DECLARE
  v_hire_date DATE;
  v_months_worked NUMERIC;
  v_accumulated NUMERIC;
  v_used INTEGER;
BEGIN
  -- Obtener fecha de ingreso
  SELECT hire_date INTO v_hire_date
  FROM employees
  WHERE id = p_employee_id;

  IF v_hire_date IS NULL THEN
    RETURN QUERY SELECT 0::NUMERIC, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Calcular meses trabajados (diferencia en meses)
  v_months_worked := EXTRACT(YEAR FROM AGE(p_reference_date, v_hire_date)) * 12 
                     + EXTRACT(MONTH FROM AGE(p_reference_date, v_hire_date));

  -- Calcular días acumulados: meses × 1.25
  v_accumulated := v_months_worked * 1.25;

  -- Calcular días usados (solo vacaciones aprobadas o tomadas)
  SELECT COALESCE(SUM(days_count), 0) INTO v_used
  FROM vacations
  WHERE employee_id = p_employee_id
    AND status IN ('aprobada', 'tomada');

  -- Retornar resultados
  RETURN QUERY SELECT 
    ROUND(v_accumulated, 2) as accumulated_days,
    v_used as used_days,
    ROUND(GREATEST(0, v_accumulated - v_used), 2) as available_days;
END;
$$ LANGUAGE plpgsql;

