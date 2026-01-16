-- Tabla de alertas y sugerencias
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'info')),
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'contract_expiry',
    'vacation_balance',
    'legal_params_missing',
    'min_wage_risk',
    'ot_pending_approval',
    'sick_leave_active',
    'scheduled_raise'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(20) CHECK (entity_type IN ('employee', 'payroll_period', 'company')),
  entity_id UUID,
  due_date DATE,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_alerts_company ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_due_date ON alerts(due_date) WHERE due_date IS NOT NULL;

-- Índice único para evitar duplicados (mismo tipo + entidad + fecha de vencimiento)
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique ON alerts(company_id, type, entity_type, entity_id, due_date) 
WHERE status = 'open';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
