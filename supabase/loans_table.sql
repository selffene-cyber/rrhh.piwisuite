-- Tabla de préstamos internos
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  -- Datos del préstamo
  amount DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) DEFAULT 0, -- Tasa de interés (puede ser 0%)
  total_amount DECIMAL(12, 2) NOT NULL, -- Monto total con interés
  installments INTEGER NOT NULL, -- Número de cuotas
  installment_amount DECIMAL(12, 2) NOT NULL, -- Monto por cuota
  -- Estado y seguimiento
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
  paid_installments INTEGER DEFAULT 0, -- Cuotas pagadas
  remaining_amount DECIMAL(12, 2) NOT NULL, -- Monto pendiente
  -- Fechas
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  -- Descripción
  description TEXT,
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_loans_employee_id ON loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

-- Tabla para rastrear cuotas pagadas por liquidación
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  payroll_slip_id UUID REFERENCES payroll_slips(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL, -- Número de cuota (1, 2, 3, ...)
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(loan_id, payroll_slip_id) -- Una cuota por préstamo por liquidación
);

-- Agregar columna loan_id a payroll_items si no existe
ALTER TABLE payroll_items 
ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES loans(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payroll_slip_id ON loan_payments(payroll_slip_id);

