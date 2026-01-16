-- ============================================
-- MIGRACIÓN 007: Módulo de Finiquitos
-- ============================================

-- Tabla maestra de causales de término
CREATE TABLE IF NOT EXISTS settlement_causes (
  code VARCHAR(20) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  article VARCHAR(50), -- "art.159", "art.161", etc.
  has_ias BOOLEAN DEFAULT false, -- Indemnización años de servicio
  has_iap BOOLEAN DEFAULT false, -- Indemnización aviso previo
  is_termination BOOLEAN DEFAULT true, -- Si es causal de término
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar causales según Código del Trabajo
INSERT INTO settlement_causes (code, label, article, has_ias, has_iap, description) VALUES
  ('159_1', 'Mutuo acuerdo', 'art.159 N°1', false, false, 'Las partes acuerdan poner término al contrato'),
  ('159_2', 'Renuncia voluntaria', 'art.159 N°2', false, false, 'El trabajador renuncia voluntariamente'),
  ('159_3', 'Muerte del trabajador', 'art.159 N°3', false, false, 'Fallecimiento del trabajador'),
  ('159_4', 'Vencimiento plazo fijo', 'art.159 N°4', false, false, 'Vencimiento del plazo convenido en contrato plazo fijo'),
  ('159_5', 'Conclusión obra o faena', 'art.159 N°5', false, false, 'Conclusión de la obra o faena determinada'),
  ('159_6', 'Caso fortuito o fuerza mayor', 'art.159 N°6', false, false, 'Casos fortuitos o de fuerza mayor'),
  ('160', 'Despido disciplinario', 'art.160', false, false, 'Despido por causales disciplinarias'),
  ('161_1', 'Necesidades de la empresa', 'art.161 N°1', true, true, 'Necesidades de la empresa, establecimiento o servicio'),
  ('161_2', 'Desahucio del empleador', 'art.161 N°2', true, true, 'Desahucio dado por el empleador'),
  ('163bis', 'Liquidación concursal', 'art.163 bis', true, false, 'Liquidación o quiebra de la empresa')
ON CONFLICT (code) DO NOTHING;

-- Tabla principal de finiquitos
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_number VARCHAR(20) UNIQUE, -- FIN-001, FIN-002
  
  -- Relaciones
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL, -- Contrato activo al momento del término (puede ser NULL si se elimina el contrato, el finiquito tiene snapshot)
  
  -- Datos del finiquito
  termination_date DATE NOT NULL,
  cause_code VARCHAR(20) NOT NULL REFERENCES settlement_causes(code),
  
  -- Cálculos base (snapshot al momento de crear el finiquito)
  contract_start_date DATE NOT NULL, -- Fecha inicio contrato
  last_salary_monthly DECIMAL(12, 2) NOT NULL, -- Último sueldo mensual
  worked_days_last_month INTEGER NOT NULL, -- Días trabajados último mes
  service_days INTEGER NOT NULL, -- Días totales de servicio
  service_years_raw NUMERIC(10, 4) NOT NULL, -- Años de servicio (con decimales)
  service_years_effective INTEGER NOT NULL, -- Años efectivos (redondeo especial)
  service_years_capped INTEGER NOT NULL, -- Máximo 11 años
  
  -- Vacaciones
  vacation_days_pending NUMERIC(10, 2) NOT NULL DEFAULT 0,
  
  -- Aviso previo
  notice_given BOOLEAN DEFAULT false,
  notice_days INTEGER DEFAULT 0,
  
  -- Totales calculados
  salary_balance DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Sueldo proporcional último mes
  vacation_payout DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Pago vacaciones
  ias_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Indemnización años servicio
  iap_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Indemnización aviso previo
  total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Total haberes
  loan_balance DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Saldo préstamos
  advance_balance DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Saldo anticipos
  total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Total descuentos
  net_to_pay DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Líquido a pagar
  
  -- Estado y workflow
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'signed', 'paid', 'void')),
  
  -- Auditoría y versionamiento
  calculation_version INTEGER DEFAULT 1, -- Versión del cálculo (incrementa en recálculos)
  calculation_snapshot JSONB, -- Snapshot completo de variables y resultados
  calculation_log JSONB, -- Log de cambios y recálculos [{user, date, reason, changes}]
  
  -- Fechas de workflow
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  voided_at TIMESTAMP WITH TIME ZONE,
  
  -- Usuarios (referencias a auth.users)
  created_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  
  -- Notas
  notes TEXT,
  void_reason TEXT,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validaciones
  CONSTRAINT check_termination_date CHECK (termination_date >= contract_start_date),
  CONSTRAINT check_salary_positive CHECK (last_salary_monthly > 0),
  CONSTRAINT check_days_positive CHECK (worked_days_last_month >= 0 AND worked_days_last_month <= 31),
  CONSTRAINT check_service_years CHECK (service_years_capped >= 0 AND service_years_capped <= 11)
);

-- Tabla de ítems detallados del finiquito
CREATE TABLE IF NOT EXISTS settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL CHECK (type IN ('earning', 'deduction')),
  category VARCHAR(100) NOT NULL, -- 'salary_balance', 'vacation', 'ias', 'iap', 'loan', 'advance', 'other'
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  
  -- Metadata adicional (JSON para flexibilidad)
  metadata JSONB, -- Datos adicionales según categoría (ej: {loan_id: 'xxx', installment_number: 5})
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secuencia para números correlativos
CREATE SEQUENCE IF NOT EXISTS settlements_number_seq START 1;

-- Función para asignar número correlativo
CREATE OR REPLACE FUNCTION set_settlement_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.settlement_number IS NULL THEN
    NEW.settlement_number := 'FIN-' || LPAD(NEXTVAL('settlements_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_settlement_number_trigger ON settlements;
CREATE TRIGGER set_settlement_number_trigger
BEFORE INSERT ON settlements
FOR EACH ROW
EXECUTE FUNCTION set_settlement_number();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_settlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_settlements_updated_at ON settlements;
CREATE TRIGGER update_settlements_updated_at
BEFORE UPDATE ON settlements
FOR EACH ROW
EXECUTE FUNCTION update_settlements_updated_at();

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_settlements_employee ON settlements(employee_id);
CREATE INDEX IF NOT EXISTS idx_settlements_company ON settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_termination_date ON settlements(termination_date);
CREATE INDEX IF NOT EXISTS idx_settlements_cause_code ON settlements(cause_code);
CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement ON settlement_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_type ON settlement_items(type);

-- Comentarios para documentación
COMMENT ON TABLE settlements IS 'Finiquitos de trabajadores conforme a Código del Trabajo chileno';
COMMENT ON TABLE settlement_items IS 'Detalle de pagos y descuentos de cada finiquito';
COMMENT ON TABLE settlement_causes IS 'Maestro de causales de término según Código del Trabajo';
COMMENT ON COLUMN settlements.calculation_snapshot IS 'Snapshot completo de variables y resultados al momento del cálculo';
COMMENT ON COLUMN settlements.calculation_log IS 'Log de recálculos y cambios: [{user_id, date, reason, changes}]';
COMMENT ON COLUMN settlements.service_years_capped IS 'Años de servicio con tope máximo de 11 años para cálculo de IAS';

