-- Agregar campos legales a la tabla loans
ALTER TABLE loans ADD COLUMN IF NOT EXISTS authorization_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS authorization_date DATE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS exceeds_legal_limit BOOLEAN DEFAULT FALSE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Crear índice para company_id si no existe
CREATE INDEX IF NOT EXISTS idx_loans_company_id ON loans(company_id);

-- Tabla para rastrear cuotas individuales con montos aplicados y diferidos
CREATE TABLE IF NOT EXISTS loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  due_month INTEGER NOT NULL CHECK (due_month >= 1 AND due_month <= 12),
  due_year INTEGER NOT NULL,
  amount_expected DECIMAL(12, 2) NOT NULL, -- Monto original de la cuota
  amount_applied DECIMAL(12, 2) DEFAULT 0, -- Monto realmente descontado
  amount_deferred DECIMAL(12, 2) DEFAULT 0, -- Monto diferido a cuotas siguientes
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'deferred')),
  payroll_slip_id UUID REFERENCES payroll_slips(id) ON DELETE SET NULL,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(loan_id, installment_number)
);

-- Índices para loan_installments
CREATE INDEX IF NOT EXISTS idx_loan_installments_loan_id ON loan_installments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_installments_status ON loan_installments(status);
CREATE INDEX IF NOT EXISTS idx_loan_installments_due_date ON loan_installments(due_year, due_month);
CREATE INDEX IF NOT EXISTS idx_loan_installments_payroll ON loan_installments(payroll_slip_id);

-- Trigger para actualizar updated_at en loan_installments
CREATE TRIGGER update_loan_installments_updated_at
  BEFORE UPDATE ON loan_installments
  FOR EACH ROW
  EXECUTE FUNCTION update_loans_updated_at();

-- Comentarios
COMMENT ON COLUMN loans.authorization_signed IS 'Indica si el trabajador autorizó el préstamo que excede el límite legal del 15%';
COMMENT ON COLUMN loans.exceeds_legal_limit IS 'Indica si la cuota del préstamo excede el 15% de la remuneración mensual';
COMMENT ON COLUMN loan_installments.amount_applied IS 'Monto realmente descontado en la liquidación (puede ser menor al esperado por límite legal)';
COMMENT ON COLUMN loan_installments.amount_deferred IS 'Monto diferido a cuotas siguientes cuando se excede el límite legal del 15%';

