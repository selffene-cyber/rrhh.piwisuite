-- ============================================
-- MIGRACIÓN 065: Módulo de Cumplimientos y Vencimientos
-- ============================================
-- Crea las tablas necesarias para gestionar certificados, licencias,
-- cursos obligatorios y otros ítems de cumplimiento con alertas de vencimiento
-- ============================================

-- Tabla de catálogo de ítems de cumplimiento
CREATE TABLE IF NOT EXISTS compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('CERTIFICADO', 'LICENCIA', 'CURSO', 'EXAMEN', 'OTRO')),
  vigencia_dias INTEGER NOT NULL DEFAULT 365,
  requiere_evidencia BOOLEAN NOT NULL DEFAULT true,
  criticidad VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (criticidad IN ('ALTA', 'MEDIA', 'BAJA')),
  aplica_a_cargo BOOLEAN DEFAULT false,
  aplica_a_cc BOOLEAN DEFAULT false,
  aplica_a_condicion TEXT, -- Condición especial (ej: "todos los conductores")
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (nombre IS NOT NULL AND length(trim(nombre)) > 0),
  CHECK (vigencia_dias > 0)
);

-- Tabla de cumplimientos por trabajador
CREATE TABLE IF NOT EXISTS worker_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  compliance_item_id UUID NOT NULL REFERENCES compliance_items(id) ON DELETE RESTRICT,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'VIGENTE' 
    CHECK (status IN ('VIGENTE', 'POR_VENCER', 'VENCIDO', 'EN_RENOVACION', 'EXENTO')),
  evidencia_url TEXT, -- URL del documento en Supabase Storage
  evidencia_nombre VARCHAR(255),
  verificado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_verificacion TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'manual' 
    CHECK (source IN ('manual', 'onboarding', 'perfil_cargo', 'import')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (fecha_vencimiento >= fecha_emision)
);

-- Tabla de notificaciones de cumplimiento
CREATE TABLE IF NOT EXISTS compliance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  worker_compliance_id UUID NOT NULL REFERENCES worker_compliance(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'COMPLIANCE',
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  prioridad VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN ('ALTA', 'MEDIA', 'BAJA')),
  leida BOOLEAN NOT NULL DEFAULT false,
  action_type VARCHAR(50) CHECK (action_type IN ('SUBIR_EVIDENCIA', 'SOLICITAR_RENOVACION', 'VER_DETALLE')),
  action_link TEXT,
  hito_dias INTEGER, -- Días antes/después del vencimiento (30, 15, 7, 0, -7, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  
  CHECK (titulo IS NOT NULL AND length(trim(titulo)) > 0),
  CHECK (mensaje IS NOT NULL AND length(trim(mensaje)) > 0)
);

-- Tabla de asignaciones masivas (para aplicar ítems a múltiples trabajadores)
CREATE TABLE IF NOT EXISTS compliance_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  compliance_item_id UUID NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
  assignment_type VARCHAR(50) NOT NULL CHECK (assignment_type IN ('cargo', 'cost_center', 'employee_list', 'all')),
  target_value TEXT, -- ID de cargo, CC, o lista de employee_ids (JSON)
  fecha_emision DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para compliance_items
CREATE INDEX IF NOT EXISTS idx_compliance_items_company ON compliance_items(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_tipo ON compliance_items(tipo);
CREATE INDEX IF NOT EXISTS idx_compliance_items_activo ON compliance_items(activo);
CREATE INDEX IF NOT EXISTS idx_compliance_items_criticidad ON compliance_items(criticidad);

-- Índices para worker_compliance
CREATE INDEX IF NOT EXISTS idx_worker_compliance_company ON worker_compliance(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_employee ON worker_compliance(employee_id);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_item ON worker_compliance(compliance_item_id);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_status ON worker_compliance(status);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_vencimiento ON worker_compliance(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_company_employee ON worker_compliance(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_company_status ON worker_compliance(company_id, status);

-- Índices para compliance_notifications
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_company ON compliance_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_employee ON compliance_notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_worker_compliance ON compliance_notifications(worker_compliance_id);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_leida ON compliance_notifications(leida);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_prioridad ON compliance_notifications(prioridad);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_created ON compliance_notifications(created_at DESC);

-- Índices para compliance_assignments
CREATE INDEX IF NOT EXISTS idx_compliance_assignments_company ON compliance_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assignments_item ON compliance_assignments(compliance_item_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assignments_processed ON compliance_assignments(processed);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_compliance_items_updated_at
  BEFORE UPDATE ON compliance_items
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER update_worker_compliance_updated_at
  BEFORE UPDATE ON worker_compliance
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();

-- Función para recalcular el status de worker_compliance basado en fecha_vencimiento
CREATE OR REPLACE FUNCTION recalculate_compliance_status()
RETURNS void AS $$
BEGIN
  UPDATE worker_compliance
  SET 
    status = CASE
      WHEN fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
      WHEN fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'POR_VENCER'
      WHEN status = 'EN_RENOVACION' THEN 'EN_RENOVACION'
      WHEN status = 'EXENTO' THEN 'EXENTO'
      ELSE 'VIGENTE'
    END,
    updated_at = NOW()
  WHERE status IN ('VIGENTE', 'POR_VENCER', 'VENCIDO')
    AND (status != CASE
      WHEN fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
      WHEN fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'POR_VENCER'
      WHEN status = 'EN_RENOVACION' THEN 'EN_RENOVACION'
      WHEN status = 'EXENTO' THEN 'EXENTO'
      ELSE 'VIGENTE'
    END);
END;
$$ LANGUAGE plpgsql;

-- Función para generar notificaciones automáticas
CREATE OR REPLACE FUNCTION generate_compliance_notifications()
RETURNS void AS $$
DECLARE
  v_compliance RECORD;
  v_dias_restantes INTEGER;
  v_hitos INTEGER[] := ARRAY[30, 15, 7, 0, -7, -15, -30]; -- Días antes/después
  v_hito INTEGER;
  v_notification_exists BOOLEAN;
BEGIN
  -- Iterar sobre cumplimientos que requieren notificación
  FOR v_compliance IN 
    SELECT wc.*, ci.nombre, ci.criticidad
    FROM worker_compliance wc
    INNER JOIN compliance_items ci ON wc.compliance_item_id = ci.id
    WHERE wc.status IN ('VIGENTE', 'POR_VENCER', 'VENCIDO')
      AND ci.activo = true
  LOOP
    v_dias_restantes := v_compliance.fecha_vencimiento - CURRENT_DATE;
    
    -- Verificar cada hito
    FOREACH v_hito IN ARRAY v_hitos
    LOOP
      -- Solo generar notificación si estamos en el hito exacto (o dentro de 1 día)
      IF ABS(v_dias_restantes - v_hito) <= 1 THEN
        -- Verificar si ya existe una notificación para este hito
        SELECT EXISTS(
          SELECT 1 
          FROM compliance_notifications 
          WHERE worker_compliance_id = v_compliance.id 
            AND hito_dias = v_hito
            AND created_at::date = CURRENT_DATE
        ) INTO v_notification_exists;
        
        -- Si no existe, crear la notificación
        IF NOT v_notification_exists THEN
          INSERT INTO compliance_notifications (
            company_id,
            employee_id,
            worker_compliance_id,
            tipo,
            titulo,
            mensaje,
            prioridad,
            action_type,
            action_link,
            hito_dias
          ) VALUES (
            v_compliance.company_id,
            v_compliance.employee_id,
            v_compliance.id,
            'COMPLIANCE',
            CASE 
              WHEN v_hito > 0 THEN 'Tu ' || v_compliance.nombre || ' vence en ' || v_hito || ' días'
              WHEN v_hito = 0 THEN 'Tu ' || v_compliance.nombre || ' vence hoy'
              ELSE 'Tu ' || v_compliance.nombre || ' está vencido hace ' || ABS(v_hito) || ' días'
            END,
            CASE 
              WHEN v_hito > 0 THEN 'Tu ' || v_compliance.nombre || ' vence el ' || 
                TO_CHAR(v_compliance.fecha_vencimiento, 'DD/MM/YYYY') || '. Por favor, renueva a tiempo.'
              WHEN v_hito = 0 THEN 'Tu ' || v_compliance.nombre || ' vence hoy. Es urgente que renueves inmediatamente.'
              ELSE 'Tu ' || v_compliance.nombre || ' está vencido desde el ' || 
                TO_CHAR(v_compliance.fecha_vencimiento, 'DD/MM/YYYY') || '. Debes regularizar esta situación.'
            END,
            CASE 
              WHEN v_compliance.criticidad = 'ALTA' OR v_hito <= 0 THEN 'ALTA'
              WHEN v_hito <= 7 THEN 'MEDIA'
              ELSE 'BAJA'
            END,
            CASE 
              WHEN v_hito <= 0 THEN 'SUBIR_EVIDENCIA'
              ELSE 'SOLICITAR_RENOVACION'
            END,
            '/employee/compliance/' || v_compliance.id,
            v_hito
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE compliance_items IS 'Catálogo de ítems de cumplimiento (certificados, licencias, cursos, etc.)';
COMMENT ON TABLE worker_compliance IS 'Instancias de cumplimiento por trabajador con fechas y estado';
COMMENT ON TABLE compliance_notifications IS 'Notificaciones automáticas de vencimientos de cumplimiento';
COMMENT ON TABLE compliance_assignments IS 'Asignaciones masivas de ítems de cumplimiento a trabajadores';
COMMENT ON FUNCTION recalculate_compliance_status() IS 'Recalcula el estado de cumplimientos basado en fecha de vencimiento';
COMMENT ON FUNCTION generate_compliance_notifications() IS 'Genera notificaciones automáticas según hitos de vencimiento';






