-- Tabla de licencias médicas
CREATE TABLE IF NOT EXISTS medical_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  -- Datos de la licencia
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type VARCHAR(50) NOT NULL, -- 'enfermedad_comun', 'accidente_trabajo', 'enfermedad_profesional', 'maternidad', 'otro'
  days_count INTEGER NOT NULL, -- Número de días de licencia
  folio_number VARCHAR(100), -- Número de folio de la licencia
  -- Estado
  is_active BOOLEAN DEFAULT true, -- Si la licencia está activa
  -- Descripción
  description TEXT,
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Validación: fecha término debe ser mayor o igual a fecha inicio
  CONSTRAINT check_dates CHECK (end_date >= start_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_medical_leaves_employee_id ON medical_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_medical_leaves_dates ON medical_leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_medical_leaves_active ON medical_leaves(is_active) WHERE is_active = true;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_medical_leaves_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_medical_leaves_updated_at
  BEFORE UPDATE ON medical_leaves
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_leaves_updated_at();

-- Actualizar constraint de status en employees para incluir nuevos estados
ALTER TABLE employees 
DROP CONSTRAINT IF EXISTS employees_status_check;

ALTER TABLE employees 
ADD CONSTRAINT employees_status_check 
CHECK (status IN ('active', 'inactive', 'licencia_medica', 'renuncia', 'despido'));


