-- Tabla de pactos de horas extra
CREATE TABLE IF NOT EXISTS overtime_pacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_daily_hours INTEGER NOT NULL DEFAULT 2 CHECK (max_daily_hours <= 2),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'renewed', 'void')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Validación: duración máxima 90 días (3 meses)
  CONSTRAINT check_max_duration CHECK (end_date - start_date <= 90),
  -- Validación: fecha término debe ser mayor a fecha inicio
  CONSTRAINT check_dates CHECK (end_date >= start_date)
);

-- Tabla de registros de horas extra trabajadas
CREATE TABLE IF NOT EXISTS overtime_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  overtime_pact_id UUID REFERENCES overtime_pacts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  hours DECIMAL(4, 2) NOT NULL CHECK (hours > 0 AND hours <= 2),
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  linked_payroll_id UUID REFERENCES payroll_slips(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_overtime_pacts_company ON overtime_pacts(company_id);
CREATE INDEX IF NOT EXISTS idx_overtime_pacts_employee ON overtime_pacts(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_pacts_status ON overtime_pacts(status);
CREATE INDEX IF NOT EXISTS idx_overtime_pacts_dates ON overtime_pacts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_company ON overtime_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_employee ON overtime_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_date ON overtime_entries(date);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_pact ON overtime_entries(overtime_pact_id);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_payroll ON overtime_entries(linked_payroll_id);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_overtime_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_overtime_pacts_updated_at
  BEFORE UPDATE ON overtime_pacts
  FOR EACH ROW
  EXECUTE FUNCTION update_overtime_updated_at();

CREATE TRIGGER update_overtime_entries_updated_at
  BEFORE UPDATE ON overtime_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_overtime_updated_at();

-- Función para actualizar automáticamente el estado de los pactos a 'expired' cuando pasan la fecha de término
CREATE OR REPLACE FUNCTION update_overtime_pact_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la fecha actual es mayor a end_date y el estado es 'active', cambiar a 'expired'
  IF NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estado automáticamente
CREATE TRIGGER check_overtime_pact_expiration
  BEFORE INSERT OR UPDATE ON overtime_pacts
  FOR EACH ROW
  EXECUTE FUNCTION update_overtime_pact_status();

