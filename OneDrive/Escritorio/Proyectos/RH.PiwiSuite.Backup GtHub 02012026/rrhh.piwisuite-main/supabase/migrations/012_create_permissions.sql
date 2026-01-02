-- Tabla para tipos de permisos (catálogo)
CREATE TABLE IF NOT EXISTS permission_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE, -- 'LEGAL_GOCE', 'VOLUNTARY_GOCE', 'VOLUNTARY_NO_GOCE'
  label VARCHAR(255) NOT NULL,
  description TEXT,
  affects_payroll BOOLEAN NOT NULL DEFAULT false, -- Si afecta la liquidación
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar tipos de permisos por defecto
INSERT INTO permission_types (code, label, description, affects_payroll, requires_approval) VALUES
  ('LEGAL_GOCE', 'Permiso Legal con Goce de Sueldo', 'Permisos legales obligatorios (matrimonio, fallecimiento familiar, nacimiento hijo, exámenes médicos obligatorios)', false, false),
  ('VOLUNTARY_GOCE', 'Permiso Voluntario con Goce de Sueldo', 'Permisos acordados con goce de sueldo', false, true),
  ('VOLUNTARY_NO_GOCE', 'Permiso sin Goce de Sueldo', 'Permisos sin goce de sueldo que descuentan remuneración proporcional', true, true)
ON CONFLICT (code) DO NOTHING;

-- Tabla para permisos
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  permission_type_code VARCHAR(50) NOT NULL REFERENCES permission_types(code) ON DELETE RESTRICT,
  
  -- Datos del permiso
  reason VARCHAR(255) NOT NULL, -- Motivo del permiso
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(5, 2) NOT NULL, -- Puede ser fracción (ej: 0.5 días)
  hours INTEGER DEFAULT 0, -- Horas si aplica
  
  -- Estado y aprobación
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'applied', 'void')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Integración con liquidaciones
  applied_to_payroll BOOLEAN DEFAULT false,
  payroll_slip_id UUID REFERENCES payroll_slips(id) ON DELETE SET NULL, -- Liquidación donde se aplicó
  
  -- Descuento calculado (para auditoría)
  discount_amount DECIMAL(12, 2) DEFAULT 0, -- Monto descontado (si aplica)
  
  -- Adjuntos y notas
  attachment_url TEXT, -- URL del comprobante/respaldo
  notes TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (end_date >= start_date),
  CHECK (days >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_permissions_company ON permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_permissions_employee ON permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_permissions_status ON permissions(status);
CREATE INDEX IF NOT EXISTS idx_permissions_dates ON permissions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_permissions_type ON permissions(permission_type_code);
CREATE INDEX IF NOT EXISTS idx_permissions_payroll ON permissions(payroll_slip_id);
CREATE INDEX IF NOT EXISTS idx_permissions_applied ON permissions(applied_to_payroll);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at
BEFORE UPDATE ON permissions
FOR EACH ROW
EXECUTE FUNCTION update_permissions_updated_at();

-- Función para calcular días entre fechas (considerando días hábiles si es necesario)
CREATE OR REPLACE FUNCTION calculate_permission_days(start_date DATE, end_date DATE)
RETURNS DECIMAL(5, 2) AS $$
BEGIN
  RETURN GREATEST(0, (end_date - start_date + 1)::DECIMAL);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comentarios
COMMENT ON TABLE permission_types IS 'Catálogo de tipos de permisos';
COMMENT ON COLUMN permission_types.affects_payroll IS 'Indica si el tipo de permiso afecta la liquidación (sin goce de sueldo)';
COMMENT ON TABLE permissions IS 'Registro de permisos de trabajadores';
COMMENT ON COLUMN permissions.discount_amount IS 'Monto descontado calculado: (sueldo_base / 30) * días';
COMMENT ON COLUMN permissions.applied_to_payroll IS 'Indica si el permiso ya fue aplicado a una liquidación';

