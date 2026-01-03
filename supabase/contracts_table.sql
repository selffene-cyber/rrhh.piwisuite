-- Tabla de contratos laborales
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number VARCHAR(20) UNIQUE, -- CT-01, CT-02, etc.
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de contrato
  contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('indefinido', 'plazo_fijo', 'obra_faena', 'part_time')),
  
  -- Fechas
  start_date DATE NOT NULL,
  end_date DATE, -- NULL para indefinidos
  
  -- Datos del contrato (editables)
  position TEXT NOT NULL,
  position_description TEXT,
  work_schedule TEXT, -- Ej: "Lunes a Viernes, 09:00 a 18:00"
  work_location TEXT NOT NULL,
  
  -- Remuneraciones
  base_salary DECIMAL(12, 2) NOT NULL,
  gratuity BOOLEAN DEFAULT true,
  gratuity_amount DECIMAL(12, 2), -- Si es fijo
  other_allowances TEXT, -- JSON o texto descriptivo
  payment_method VARCHAR(100) DEFAULT 'transferencia', -- transferencia, efectivo, cheque
  payment_periodicity VARCHAR(50) DEFAULT 'mensual', -- mensual, quincenal, semanal
  -- Datos bancarios
  bank_name VARCHAR(100),
  account_type VARCHAR(50), -- corriente, ahorro, vista
  account_number VARCHAR(50),
  
  -- Cláusulas configurables (texto editable)
  confidentiality_clause TEXT,
  authorized_deductions TEXT,
  advances_clause TEXT,
  internal_regulations TEXT,
  additional_clauses TEXT,
  
  -- Estado
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'signed', 'active', 'terminated', 'cancelled')),
  
  -- Auditoría
  created_by UUID, -- user_id si hay tabla de usuarios
  issued_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de anexos a contratos
CREATE TABLE IF NOT EXISTS contract_annexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annex_number VARCHAR(20) UNIQUE, -- ANX-01, ANX-02, etc.
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de anexo
  annex_type VARCHAR(50) NOT NULL, -- modificacion_sueldo, cambio_cargo, cambio_jornada, prorroga, otro
  
  -- Fechas
  start_date DATE NOT NULL,
  end_date DATE, -- Si aplica
  
  -- Contenido del anexo (texto editable)
  content TEXT NOT NULL,
  modifications_summary TEXT, -- Resumen de modificaciones
  
  -- Estado
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'signed', 'active', 'cancelled')),
  
  -- Auditoría
  created_by UUID,
  issued_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contract_annexes_contract ON contract_annexes(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_annexes_employee ON contract_annexes(employee_id);

-- Secuencias para números correlativos
CREATE SEQUENCE IF NOT EXISTS contracts_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS contract_annexes_number_seq START 1;

-- Función para asignar número correlativo a contratos
CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := 'CT-' || LPAD(NEXTVAL('contracts_number_seq')::TEXT, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para asignar número correlativo a anexos
CREATE OR REPLACE FUNCTION set_annex_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.annex_number IS NULL THEN
    NEW.annex_number := 'ANX-' || LPAD(NEXTVAL('contract_annexes_number_seq')::TEXT, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER set_contract_number_trigger
BEFORE INSERT ON contracts
FOR EACH ROW
EXECUTE FUNCTION set_contract_number();

CREATE TRIGGER set_annex_number_trigger
BEFORE INSERT ON contract_annexes
FOR EACH ROW
EXECUTE FUNCTION set_annex_number();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_annexes_updated_at
BEFORE UPDATE ON contract_annexes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

