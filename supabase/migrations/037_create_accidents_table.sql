-- ============================================
-- MIGRACIÓN 037: Crear tabla accidents (RAAT)
-- ============================================
-- Registro de Accidentes del Trabajo y Enfermedades Profesionales
-- Conforme a Ley 16.744 - Válido ante fiscalizaciones DT
-- ============================================

-- Tabla principal de accidentes
CREATE TABLE IF NOT EXISTS accidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Numeración correlativa automática
  accident_number INTEGER NOT NULL,
  
  -- Identificación del siniestro
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  event_location TEXT NOT NULL, -- faena, sucursal, trayecto, etc.
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('accidente_trabajo', 'accidente_trayecto', 'enfermedad_profesional')),
  
  -- Datos del trabajador (snapshot histórico al momento del evento)
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  employee_rut VARCHAR(20) NOT NULL, -- Snapshot del RUT al momento del evento
  employee_name VARCHAR(255) NOT NULL, -- Snapshot del nombre
  employee_position VARCHAR(255) NOT NULL, -- Snapshot del cargo
  employee_seniority_days INTEGER, -- Antigüedad en días al momento del evento
  cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL, -- Snapshot del centro de costo
  cost_center_code VARCHAR(100), -- Snapshot del código del centro de costo
  contract_type VARCHAR(50), -- Snapshot del tipo de contrato
  administrator VARCHAR(50), -- Organismo administrador: ACHS, IST, Mutual, ISL
  
  -- Descripción técnica del evento
  work_performed TEXT, -- Labor realizada al momento del accidente
  description TEXT NOT NULL, -- Descripción detallada del hecho
  hazards_identified TEXT, -- Condiciones y actos subestándar
  body_part_affected VARCHAR(255), -- Parte del cuerpo afectada
  injury_type VARCHAR(255), -- Tipo de lesión
  witnesses TEXT, -- Testigos (nombre y cargo)
  possible_sequelae TEXT, -- Posibles secuelas
  
  -- Acciones inmediatas
  immediate_actions TEXT, -- Medidas correctivas inmediatas
  medical_transfer BOOLEAN DEFAULT FALSE, -- Traslado médico (sí/no)
  medical_transfer_location TEXT, -- Lugar de traslado médico
  notification_date TIMESTAMP WITH TIME ZONE, -- Fecha y hora de notificación a mutualidad
  registered_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL, -- Responsable del registro
  
  -- Estado y gestión
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'with_sequelae', 'consolidated')),
  diat_status VARCHAR(50) DEFAULT 'pending' CHECK (diat_status IN ('pending', 'sent', 'overdue')),
  diat_sent_at TIMESTAMP WITH TIME ZONE, -- Fecha de envío de DIAT
  diat_number VARCHAR(100), -- Número de DIAT
  
  -- Relación con licencias médicas (opcional)
  medical_leave_id UUID, -- Referencia a licencia médica relacionada
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE, -- Fecha de cierre del registro
  closed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT accidents_company_number_unique UNIQUE (company_id, accident_number)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_accidents_company_id ON accidents(company_id);
CREATE INDEX IF NOT EXISTS idx_accidents_employee_id ON accidents(employee_id);
CREATE INDEX IF NOT EXISTS idx_accidents_employee_rut ON accidents(employee_rut);
CREATE INDEX IF NOT EXISTS idx_accidents_event_date ON accidents(event_date);
CREATE INDEX IF NOT EXISTS idx_accidents_event_type ON accidents(event_type);
CREATE INDEX IF NOT EXISTS idx_accidents_status ON accidents(status);
CREATE INDEX IF NOT EXISTS idx_accidents_diat_status ON accidents(diat_status);
CREATE INDEX IF NOT EXISTS idx_accidents_cost_center_id ON accidents(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_accidents_company_status ON accidents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_accidents_company_date ON accidents(company_id, event_date DESC);

-- Tabla de anexos/documentos relacionados con accidentes
CREATE TABLE IF NOT EXISTS accident_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_id UUID NOT NULL REFERENCES accidents(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100), -- MIME type
  file_size INTEGER, -- Tamaño en bytes
  description TEXT,
  uploaded_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accident_attachments_accident_id ON accident_attachments(accident_id);

-- Función para generar número correlativo automático
CREATE OR REPLACE FUNCTION generate_accident_number()
RETURNS TRIGGER AS $$
DECLARE
  max_number INTEGER;
BEGIN
  -- Obtener el máximo número de accidente para esta empresa
  SELECT COALESCE(MAX(accident_number), 0) INTO max_number
  FROM accidents
  WHERE company_id = NEW.company_id;
  
  -- Asignar el siguiente número
  NEW.accident_number := max_number + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número correlativo antes de insertar
CREATE TRIGGER trigger_generate_accident_number
  BEFORE INSERT ON accidents
  FOR EACH ROW
  WHEN (NEW.accident_number IS NULL)
  EXECUTE FUNCTION generate_accident_number();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_accidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_accidents_updated_at
  BEFORE UPDATE ON accidents
  FOR EACH ROW
  EXECUTE FUNCTION update_accidents_updated_at();

-- Función para prevenir edición de registros cerrados
CREATE OR REPLACE FUNCTION prevent_edit_closed_accident()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el registro está cerrado o consolidado, solo permitir cambios en anexos
  IF OLD.status IN ('closed', 'consolidated') THEN
    -- Permitir solo actualización de anexos (no cambios en campos principales)
    IF (OLD.event_date IS DISTINCT FROM NEW.event_date) OR
       (OLD.event_time IS DISTINCT FROM NEW.event_time) OR
       (OLD.event_location IS DISTINCT FROM NEW.event_location) OR
       (OLD.event_type IS DISTINCT FROM NEW.event_type) OR
       (OLD.description IS DISTINCT FROM NEW.description) OR
       (OLD.status IS DISTINCT FROM NEW.status) THEN
      RAISE EXCEPTION 'No se puede editar un registro de accidente cerrado o consolidado. Solo se pueden agregar anexos.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para prevenir edición de registros cerrados
CREATE TRIGGER trigger_prevent_edit_closed_accident
  BEFORE UPDATE ON accidents
  FOR EACH ROW
  EXECUTE FUNCTION prevent_edit_closed_accident();

-- Comentarios para documentación
COMMENT ON TABLE accidents IS 'Registro de Accidentes del Trabajo y Enfermedades Profesionales (RAAT). Conforme a Ley 16.744. Válido ante fiscalizaciones DT y organismos administradores.';
COMMENT ON COLUMN accidents.accident_number IS 'Número correlativo automático único por empresa';
COMMENT ON COLUMN accidents.event_type IS 'Tipo de evento: accidente_trabajo, accidente_trayecto, enfermedad_profesional';
COMMENT ON COLUMN accidents.employee_seniority_days IS 'Antigüedad del trabajador en días al momento del evento (snapshot histórico)';
COMMENT ON COLUMN accidents.status IS 'Estado: open (abierto), closed (cerrado), with_sequelae (con secuelas), consolidated (consolidado)';
COMMENT ON COLUMN accidents.diat_status IS 'Estado de DIAT: pending (pendiente), sent (enviada), overdue (fuera de plazo)';
COMMENT ON COLUMN accidents.registered_by IS 'Usuario responsable del registro del accidente';

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE accidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE accident_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas para accidents
-- Los usuarios pueden ver accidentes de su empresa
CREATE POLICY "Users can view accidents from their company"
  ON accidents FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- Los usuarios pueden crear accidentes en su empresa
CREATE POLICY "Users can create accidents in their company"
  ON accidents FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- Los usuarios pueden actualizar accidentes de su empresa (con restricciones de estado)
CREATE POLICY "Users can update accidents from their company"
  ON accidents FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- Políticas para accident_attachments
CREATE POLICY "Users can view attachments from their company accidents"
  ON accident_attachments FOR SELECT
  USING (
    accident_id IN (
      SELECT id FROM accidents WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create attachments for their company accidents"
  ON accident_attachments FOR INSERT
  WITH CHECK (
    accident_id IN (
      SELECT id FROM accidents WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete attachments from their company accidents"
  ON accident_attachments FOR DELETE
  USING (
    accident_id IN (
      SELECT id FROM accidents WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );








