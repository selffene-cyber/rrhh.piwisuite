-- ============================================
-- MIGRACIÓN 073: Sistema de Auditoría - Tabla audit_events
-- ============================================
-- Tabla centralizada para registrar todos los eventos/acciones del sistema
-- Diseño basado en Prompt 3: Event Log único con metadata JSONB
-- ============================================

-- Crear tabla audit_events
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contexto de la empresa y trabajador
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE, -- Nullable si el evento no es por trabajador
  
  -- Actor (usuario que ejecutó la acción)
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  actor_name TEXT, -- Snapshot desde user_profiles
  actor_email TEXT, -- Snapshot desde user_profiles
  actor_role TEXT, -- admin/user/super_admin (snapshot)
  
  -- Origen de la acción
  source TEXT NOT NULL CHECK (source IN ('admin_dashboard', 'employee_portal', 'api', 'cron')),
  
  -- Tipo de acción y módulo
  action_type TEXT NOT NULL, -- Ej: "contract.created", "annex.issued", "employee.updated"
  module TEXT NOT NULL, -- Ej: "contracts", "annexes", "employees", "payroll"
  entity_type TEXT NOT NULL, -- Ej: "contracts", "contract_annexes", "payroll_slips"
  entity_id UUID, -- ID de la entidad afectada (puede ser null si es error antes de crear)
  
  -- Estado del evento
  status TEXT NOT NULL CHECK (status IN ('success', 'error')) DEFAULT 'success',
  
  -- Timestamp
  happened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Información de red (opcional)
  ip_address INET,
  user_agent TEXT,
  
  -- Huella digital / firma de auditoría
  fingerprint TEXT NOT NULL, -- SHA-256 hash para integridad
  
  -- Datos antes/después (snapshots)
  before_data JSONB, -- Estado anterior (si aplica)
  after_data JSONB, -- Estado nuevo (si aplica)
  diff_data JSONB, -- Diff entre antes y después (opcional, puede calcularse después)
  
  -- Metadata adicional (flexible para escalar sin romper esquema)
  metadata JSONB DEFAULT '{}'::jsonb -- Contiene: motivo, fechas, montos, vigencia, batch_id, etc.
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_events_company_id ON audit_events(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_employee_id ON audit_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_user_id ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action_type ON audit_events(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_module ON audit_events(module);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_type ON audit_events(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_id ON audit_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_happened_at ON audit_events(happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_status ON audit_events(status);
CREATE INDEX IF NOT EXISTS idx_audit_events_source ON audit_events(source);

-- Índice compuesto para consultas comunes (trabajador + fecha)
CREATE INDEX IF NOT EXISTS idx_audit_events_employee_date ON audit_events(employee_id, happened_at DESC) WHERE employee_id IS NOT NULL;

-- Índice compuesto para consultas por módulo y tipo
CREATE INDEX IF NOT EXISTS idx_audit_events_module_action ON audit_events(module, action_type, happened_at DESC);

-- Comentarios
COMMENT ON TABLE audit_events IS 'Registro centralizado de todos los eventos/acciones del sistema para auditoría y trazabilidad';
COMMENT ON COLUMN audit_events.fingerprint IS 'SHA-256 hash para verificar integridad del registro: sha256(company_id + employee_id + action_type + entity_id + happened_at + JSON.stringify(after_data|metadata))';
COMMENT ON COLUMN audit_events.before_data IS 'Snapshot del estado anterior de la entidad (si aplica)';
COMMENT ON COLUMN audit_events.after_data IS 'Snapshot del estado nuevo de la entidad (si aplica)';
COMMENT ON COLUMN audit_events.diff_data IS 'Diff entre before_data y after_data (opcional, puede calcularse después)';
COMMENT ON COLUMN audit_events.metadata IS 'Datos adicionales flexibles: motivo, fechas, montos, vigencia, batch_id, error messages, etc.';





