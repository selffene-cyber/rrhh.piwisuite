-- Tabla de Anticipos/Quincenas
CREATE TABLE IF NOT EXISTS advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- Formato YYYY-MM
  advance_date DATE NOT NULL,
  amount DECIMAL(12, 0) NOT NULL CHECK (amount > 0), -- Sin decimales, redondeado hacia arriba
  reason TEXT, -- Motivo/glosa opcional
  payment_method VARCHAR(20) CHECK (payment_method IN ('transferencia', 'efectivo')),
  status VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'emitido', 'firmado', 'pagado', 'descontado')),
  attachment_url TEXT, -- URL del comprobante de transferencia (opcional)
  payroll_slip_id UUID REFERENCES payroll_slips(id) ON DELETE SET NULL, -- Link a liquidación donde se descontó
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  issued_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  discounted_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_advances_employee ON advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_period ON advances(period);
CREATE INDEX IF NOT EXISTS idx_advances_status ON advances(status);
CREATE INDEX IF NOT EXISTS idx_advances_company ON advances(company_id);
CREATE INDEX IF NOT EXISTS idx_advances_payroll ON advances(payroll_slip_id);
CREATE INDEX IF NOT EXISTS idx_advances_period_status ON advances(period, status);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_advances_updated_at BEFORE UPDATE ON advances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE advances IS 'Anticipos de remuneración o quincenas por trabajador';
COMMENT ON COLUMN advances.period IS 'Período en formato YYYY-MM donde se descontará el anticipo';
COMMENT ON COLUMN advances.amount IS 'Monto del anticipo (sin decimales, redondeado hacia arriba)';
COMMENT ON COLUMN advances.status IS 'Estado: borrador → emitido → firmado → pagado → descontado';
COMMENT ON COLUMN advances.payroll_slip_id IS 'ID de la liquidación donde se descontó este anticipo';

