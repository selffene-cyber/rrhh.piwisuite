-- ==============================================================================
-- MIGRACION 139: Sistema de Registro de Asistencia
-- ==============================================================================
-- Crea las tablas necesarias para el control de asistencia de trabajadores:
-- - attendance_records: registros diarios de ingreso/salida
-- - work_schedules: horarios de trabajo por empleado
-- - attendance_corrections: solicitudes de corrección de marcación
-- - attendance_monthly_summary: resumen mensual pre-calculado
-- ==============================================================================

-- ============================================
-- PASO 1: Tabla de horarios de trabajo
-- ==============================================================================

CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Jornada Ordinaria',
  schedule_type TEXT NOT NULL DEFAULT 'ordinary'
    CHECK (schedule_type IN ('ordinary', 'partial', 'excluded_art22', 'shift')),
  monday_start TIME,
  monday_end TIME,
  tuesday_start TIME,
  tuesday_end TIME,
  wednesday_start TIME,
  wednesday_end TIME,
  thursday_start TIME,
  thursday_end TIME,
  friday_start TIME,
  friday_end TIME,
  saturday_start TIME,
  saturday_end TIME,
  sunday_start TIME,
  sunday_end TIME,
  lunch_break_minutes INTEGER DEFAULT 60,
  tolerance_minutes INTEGER DEFAULT 10,
  weekly_hours DECIMAL(5,2) NOT NULL DEFAULT 45,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, effective_from)
);

COMMENT ON TABLE work_schedules IS 'Horarios de trabajo por empleado. Permite definir jornadas ordinarias, parciales, exentas (Art. 22) y turnos';

COMMENT ON COLUMN work_schedules.schedule_type IS 'ordinary: jornada ordinaria con limite, partial: jornada parcial, excluded_art22: exento de limite de jornada (Art. 22 inc. 2), shift: sistema de turnos';
COMMENT ON COLUMN work_schedules.tolerance_minutes IS 'Minutos de tolerancia para considerar atraso';
COMMENT ON COLUMN work_schedules.is_default IS 'Si es el horario por defecto del empleado';

-- ============================================
-- PASO 2: Tabla de registros de asistencia
-- ==============================================================================

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  clock_in_source TEXT DEFAULT 'app'
    CHECK (clock_in_source IN ('app', 'web', 'manual', 'import', 'offline')),
  clock_out_source TEXT
    CHECK (clock_out_source IN ('app', 'web', 'manual', 'import', 'offline')),
  clock_in_latitude DECIMAL(10,7),
  clock_in_longitude DECIMAL(10,7),
  clock_out_latitude DECIMAL(10,7),
  clock_out_longitude DECIMAL(10,7),
  hours_worked DECIMAL(5,2),
  overtime_minutes INTEGER DEFAULT 0,
  late_minutes INTEGER DEFAULT 0,
  early_departure_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN (
      'present',
      'absent',
      'late',
      'early_departure',
      'permission_with_pay',
      'permission_without_pay',
      'medical_leave',
      'vacation',
      'holiday',
      'rest_day',
      'absent_justified'
    )),
  absence_type TEXT
    CHECK (absence_type IS NULL OR absence_type IN (
      'medical_leave',
      'permission_with_pay',
      'permission_without_pay',
      'vacation',
      'maternal_leave',
      'accident_leave',
      'other'
    )),
  absence_reason TEXT,
  notes TEXT,
  correction_requested BOOLEAN DEFAULT FALSE,
  correction_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

COMMENT ON TABLE attendance_records IS 'Registros diarios de asistencia. Cada fila representa un dia por empleado';
COMMENT ON COLUMN attendance_records.clock_in_source IS 'Fuente del registro de ingreso: app (movil), web, manual (admin), import (carga masiva), offline (sin conexion)';
COMMENT ON COLUMN attendance_records.late_minutes IS 'Minutos de atraso respecto al horario programado';
COMMENT ON COLUMN attendance_records.early_departure_minutes IS 'Minutos de salida anticipada respecto al horario programado';
COMMENT ON COLUMN attendance_records.status IS 'Estado del dia: present, absent, late, etc.';

-- ============================================
-- PASO 3: Tabla de correcciones de marcación
-- ==============================================================================

CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  current_clock_in TIME,
  current_clock_out TIME,
  requested_clock_in TIME,
  requested_clock_out TIME,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE attendance_corrections IS 'Solicitudes de correccion de marcacion hechas por trabajadores cuando olvidan marcar ingreso/salida';

-- ============================================
-- PASO 4: Tabla de resumen mensual
-- ==============================================================================

CREATE TABLE IF NOT EXISTS attendance_monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  days_in_period INTEGER NOT NULL,
  days_worked INTEGER NOT NULL DEFAULT 0,
  days_absent INTEGER NOT NULL DEFAULT 0,
  days_medical_leave INTEGER NOT NULL DEFAULT 0,
  days_vacation INTEGER NOT NULL DEFAULT 0,
  days_permission_with_pay INTEGER NOT NULL DEFAULT 0,
  days_permission_without_pay INTEGER NOT NULL DEFAULT 0,
  days_holiday INTEGER NOT NULL DEFAULT 0,
  days_rest INTEGER NOT NULL DEFAULT 0,
  total_late_minutes INTEGER NOT NULL DEFAULT 0,
  total_overtime_minutes INTEGER NOT NULL DEFAULT 0,
  total_hours_worked DECIMAL(7,2),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'verified', 'locked')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  payroll_slip_id UUID REFERENCES payroll_slips(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, year, month)
);

COMMENT ON TABLE attendance_monthly_summary IS 'Resumen mensual de asistencia por empleado. Se vincula con payroll_slips al crear la liquidacion';
COMMENT ON COLUMN attendance_monthly_summary.status IS 'draft: calculado automaticamente, verified: verificado por admin, locked: bloqueado (vinculado a liquidacion)';

-- ============================================
-- PASO 5: Indices
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_company_date ON attendance_records(company_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_work_schedules_employee ON work_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_company ON work_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_employee ON attendance_corrections(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON attendance_corrections(status);
CREATE INDEX IF NOT EXISTS idx_attendance_monthly_summary_employee ON attendance_monthly_summary(employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_attendance_monthly_summary_company ON attendance_monthly_summary(company_id, year, month);

-- ============================================
-- PASO 6: RLS (Row Level Security)
-- ==============================================================================

ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_monthly_summary ENABLE ROW LEVEL SECURITY;

-- Politicas para work_schedules
CREATE POLICY "Users can view work schedules in their company" ON work_schedules
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage work schedules in their company" ON work_schedules
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Politicas para attendance_records
CREATE POLICY "Users can view attendance in their company" ON attendance_records
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "Workers can view their own attendance" ON attendance_records
  FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Workers can insert their own attendance" ON attendance_records
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Workers can update their own attendance for today" ON attendance_records
  FOR UPDATE USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND date = CURRENT_DATE
  );

CREATE POLICY "Admins can manage attendance in their company" ON attendance_records
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Politicas para attendance_corrections
CREATE POLICY "Users can view corrections in their company" ON attendance_corrections
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "Workers can create their own corrections" ON attendance_corrections
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage corrections in their company" ON attendance_corrections
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Politicas para attendance_monthly_summary
CREATE POLICY "Users can view summaries in their company" ON attendance_monthly_summary
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage summaries in their company" ON attendance_monthly_summary
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- PASO 7: Horario por defecto para trabajadores existentes
-- ==============================================================================
-- Horario estandar chileno: Lunes a Viernes 09:00-18:00 con 1 hora de colacion
-- Solo se aplica si el trabajador no tiene un horario asignado

INSERT INTO work_schedules (employee_id, company_id, name, schedule_type, weekly_hours, is_default,
  monday_start, monday_end,
  tuesday_start, tuesday_end,
  wednesday_start, wednesday_end,
  thursday_start, thursday_end,
  friday_start, friday_end,
  lunch_break_minutes, tolerance_minutes)
SELECT
  e.id,
  e.company_id,
  'Jornada Ordinaria',
  'ordinary',
  45,
  TRUE,
  '09:00', '18:00',
  '09:00', '18:00',
  '09:00', '18:00',
  '09:00', '18:00',
  '09:00', '18:00',
  60,
  10
FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM work_schedules ws WHERE ws.employee_id = e.id
)
AND e.status = 'active';

-- ============================================
-- PASO 8: Trigger para updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_work_schedules_updated_at') THEN
    CREATE TRIGGER update_work_schedules_updated_at
      BEFORE UPDATE ON work_schedules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_attendance_records_updated_at') THEN
    CREATE TRIGGER update_attendance_records_updated_at
      BEFORE UPDATE ON attendance_records
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_attendance_corrections_updated_at') THEN
    CREATE TRIGGER update_attendance_corrections_updated_at
      BEFORE UPDATE ON attendance_corrections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_attendance_monthly_summary_updated_at') THEN
    CREATE TRIGGER update_attendance_monthly_summary_updated_at
      BEFORE UPDATE ON attendance_monthly_summary
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END; $$;

-- ============================================
-- NOTAS IMPORTANTES
-- ==============================================================================
-- 1. attendance_records tiene UNIQUE(employee_id, date) para evitar duplicados
-- 2. Los trabajadores pueden marcar ingreso/salida desde la app movil o web
-- 3. Los administradores pueden crear registros manuales (source = 'manual')
-- 4. El resumen mensual se calcula y se vincula con payroll_slips al crear liquidacion
-- 5. Las correcciones son solicitadas por trabajadores y aprobadas/rechazadas por admins
-- 6. RLS permite que trabajadores vean/editen solo sus propios registros
-- 7. schedule_type = 'excluded_art22' para trabajadores exentos de control horario (Art. 22)
-- ==============================================================================