-- Tabla para reglas del Reglamento Interno de Orden, Higiene y Seguridad (RIOHS)
CREATE TABLE IF NOT EXISTS riohs_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL, -- Código de la regla (ej: "SEC-001")
  title VARCHAR(255) NOT NULL, -- Título de la regla
  description TEXT, -- Descripción detallada
  sanctions_allowed JSONB DEFAULT '["verbal","written"]'::jsonb, -- Tipos de sanciones permitidas
  procedure_steps JSONB, -- Pasos del procedimiento (opcional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- Tabla para acciones disciplinarias (amonestaciones)
CREATE TABLE IF NOT EXISTS disciplinary_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('verbal', 'written')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'issued', 'acknowledged', 'void')),
  
  -- Datos del incidente
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255), -- Lugar del incidente
  site_client VARCHAR(255), -- Faena/cliente (ej: Copiapó)
  
  -- Referencia al RIOHS
  riohs_rule_id UUID REFERENCES riohs_rules(id) ON DELETE SET NULL,
  
  -- Descripción de los hechos
  facts TEXT NOT NULL, -- Descripción objetiva de los hechos
  
  -- Evidencia y testigos
  evidence JSONB, -- Array de URLs/links a evidencia (fotos, reportes, etc.)
  witnesses JSONB, -- Array de testigos (nombre, cargo, contacto)
  
  -- Usuarios involucrados
  issuer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quien emite
  approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quien aprueba
  
  -- Fechas importantes
  issued_at TIMESTAMP WITH TIME ZONE, -- Cuando se emitió
  acknowledged_at TIMESTAMP WITH TIME ZONE, -- Cuando el trabajador acusó recibo
  ack_method VARCHAR(50), -- Método de acuse: 'firma', 'correo', 'carta'
  
  -- Notas y observaciones
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_riohs_rules_company ON riohs_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_company ON disciplinary_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_employee ON disciplinary_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_status ON disciplinary_actions(status);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_incident_date ON disciplinary_actions(incident_date);
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_riohs_rule ON disciplinary_actions(riohs_rule_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_disciplinary_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_disciplinary_actions_updated_at ON disciplinary_actions;
CREATE TRIGGER update_disciplinary_actions_updated_at
BEFORE UPDATE ON disciplinary_actions
FOR EACH ROW
EXECUTE FUNCTION update_disciplinary_actions_updated_at();

CREATE OR REPLACE FUNCTION update_riohs_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_riohs_rules_updated_at ON riohs_rules;
CREATE TRIGGER update_riohs_rules_updated_at
BEFORE UPDATE ON riohs_rules
FOR EACH ROW
EXECUTE FUNCTION update_riohs_rules_updated_at();

-- Comentarios
COMMENT ON TABLE riohs_rules IS 'Reglas del Reglamento Interno de Orden, Higiene y Seguridad';
COMMENT ON TABLE disciplinary_actions IS 'Acciones disciplinarias (amonestaciones verbales y escritas)';
COMMENT ON COLUMN riohs_rules.sanctions_allowed IS 'Array JSON con tipos de sanciones permitidas: ["verbal","written","fine"]';
COMMENT ON COLUMN disciplinary_actions.evidence IS 'Array JSON con links a evidencia: [{"type":"photo","url":"..."}]';
COMMENT ON COLUMN disciplinary_actions.witnesses IS 'Array JSON con testigos: [{"name":"...","position":"...","contact":"..."}]';

