-- Tabla de empresas
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  employer_name VARCHAR(255) NOT NULL,
  rut VARCHAR(20) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de trabajadores
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  rut VARCHAR(20) NOT NULL UNIQUE,
  birth_date DATE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  -- Datos laborales
  hire_date DATE NOT NULL,
  position VARCHAR(255) NOT NULL,
  cost_center VARCHAR(100),
  afp VARCHAR(50) NOT NULL, -- PROVIDA, HABITAT, etc.
  health_system VARCHAR(50) NOT NULL, -- FONASA, ISAPRE
  health_plan VARCHAR(100),
  base_salary DECIMAL(12, 2) NOT NULL,
  -- Estado
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de períodos de liquidación
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, year, month)
);

-- Tabla de liquidaciones
CREATE TABLE IF NOT EXISTS payroll_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  -- Datos base
  days_worked INTEGER NOT NULL DEFAULT 30,
  days_leave INTEGER DEFAULT 0,
  base_salary DECIMAL(12, 2) NOT NULL,
  taxable_base DECIMAL(12, 2) NOT NULL,
  -- Totales
  total_taxable_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_non_taxable_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_legal_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  -- Estado
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'sent')),
  issued_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, period_id)
);

-- Tabla de ítems de liquidación (haberes y descuentos)
CREATE TABLE IF NOT EXISTS payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_slip_id UUID REFERENCES payroll_slips(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('taxable_earning', 'non_taxable_earning', 'legal_deduction', 'other_deduction')),
  category VARCHAR(100) NOT NULL, -- 'sueldo_base', 'gratificacion', 'movilizacion', 'afp', etc.
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_employee ON payroll_slips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_period ON payroll_slips(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_slip ON payroll_items(payroll_slip_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_company ON payroll_periods(company_id);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_slips_updated_at BEFORE UPDATE ON payroll_slips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

