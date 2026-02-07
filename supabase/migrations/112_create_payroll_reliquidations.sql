-- Migración 112: Crear tablas para Reliquidaciones de Remuneraciones
-- Fecha: 2025-01-04
-- Descripción: Sistema completo de reliquidaciones conforme a normativa chilena

-- Tabla principal de reliquidaciones
CREATE TABLE IF NOT EXISTS payroll_reliquidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  reference_payroll_slip_id UUID REFERENCES payroll_slips(id) ON DELETE RESTRICT,
  
  -- Tipo de reliquidación
  type VARCHAR(20) NOT NULL CHECK (type IN ('rectificatoria', 'complementaria')),
  
  -- Motivo (catálogo + texto libre)
  reason_category VARCHAR(100) NOT NULL, -- 'horas_extra', 'retroactivo', 'licencia', 'tope_imponible', 'descuento', 'gratificacion', 'otro'
  reason_text TEXT, -- Texto libre para explicar el motivo
  
  -- Totales de diferencias
  diff_taxable_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  diff_non_taxable_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  diff_total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
  diff_legal_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  diff_other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  diff_total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  diff_net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- Estado
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'issued', 'paid')),
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  issued_by UUID REFERENCES auth.users(id),
  
  -- Fechas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  issued_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb, -- Para adjuntos, referencias, etc.
  
  -- PDF
  pdf_url TEXT,
  
  CONSTRAINT unique_reliquidation_per_employee_period UNIQUE (employee_id, period_id, reference_payroll_slip_id, type)
);

-- Tabla de ítems de reliquidación (deltas por concepto)
CREATE TABLE IF NOT EXISTS payroll_reliquidation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reliquidation_id UUID REFERENCES payroll_reliquidations(id) ON DELETE CASCADE,
  
  -- Concepto original
  original_item_id UUID REFERENCES payroll_items(id) ON DELETE SET NULL, -- Referencia al ítem original (opcional)
  
  -- Tipo y categoría
  type VARCHAR(20) NOT NULL CHECK (type IN ('taxable_earning', 'non_taxable_earning', 'legal_deduction', 'other_deduction')),
  category VARCHAR(100) NOT NULL, -- 'sueldo_base', 'gratificacion', 'horas_extras', 'afp', etc.
  description VARCHAR(255) NOT NULL,
  
  -- Valores originales y corregidos
  original_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  corrected_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  difference DECIMAL(12, 2) NOT NULL DEFAULT 0, -- corrected - original
  
  -- Flags para cálculo
  is_taxable BOOLEAN DEFAULT false,
  is_tributable BOOLEAN DEFAULT false,
  affects_deductions BOOLEAN DEFAULT false,
  affects_gratification BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de deltas calculados (snapshot de diferencias)
CREATE TABLE IF NOT EXISTS payroll_reliquidation_deltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reliquidation_id UUID REFERENCES payroll_reliquidations(id) ON DELETE CASCADE,
  
  -- Snapshot de valores originales
  original_days_worked INTEGER,
  original_days_leave INTEGER,
  original_base_salary DECIMAL(12, 2),
  original_taxable_base DECIMAL(12, 2),
  original_total_taxable_earnings DECIMAL(12, 2),
  original_total_non_taxable_earnings DECIMAL(12, 2),
  original_total_earnings DECIMAL(12, 2),
  original_total_legal_deductions DECIMAL(12, 2),
  original_total_other_deductions DECIMAL(12, 2),
  original_total_deductions DECIMAL(12, 2),
  original_net_pay DECIMAL(12, 2),
  
  -- Snapshot de valores corregidos
  corrected_days_worked INTEGER,
  corrected_days_leave INTEGER,
  corrected_base_salary DECIMAL(12, 2),
  corrected_taxable_base DECIMAL(12, 2),
  corrected_total_taxable_earnings DECIMAL(12, 2),
  corrected_total_non_taxable_earnings DECIMAL(12, 2),
  corrected_total_earnings DECIMAL(12, 2),
  corrected_total_legal_deductions DECIMAL(12, 2),
  corrected_total_other_deductions DECIMAL(12, 2),
  corrected_total_deductions DECIMAL(12, 2),
  corrected_net_pay DECIMAL(12, 2),
  
  -- Diferencias calculadas
  diff_days_worked INTEGER DEFAULT 0,
  diff_days_leave INTEGER DEFAULT 0,
  diff_base_salary DECIMAL(12, 2) DEFAULT 0,
  diff_taxable_base DECIMAL(12, 2) DEFAULT 0,
  diff_total_taxable_earnings DECIMAL(12, 2) DEFAULT 0,
  diff_total_non_taxable_earnings DECIMAL(12, 2) DEFAULT 0,
  diff_total_earnings DECIMAL(12, 2) DEFAULT 0,
  diff_total_legal_deductions DECIMAL(12, 2) DEFAULT 0,
  diff_total_other_deductions DECIMAL(12, 2) DEFAULT 0,
  diff_total_deductions DECIMAL(12, 2) DEFAULT 0,
  diff_net_pay DECIMAL(12, 2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_reliquidations_company ON payroll_reliquidations(company_id);
CREATE INDEX IF NOT EXISTS idx_reliquidations_employee ON payroll_reliquidations(employee_id);
CREATE INDEX IF NOT EXISTS idx_reliquidations_period ON payroll_reliquidations(period_id);
CREATE INDEX IF NOT EXISTS idx_reliquidations_reference ON payroll_reliquidations(reference_payroll_slip_id);
CREATE INDEX IF NOT EXISTS idx_reliquidations_status ON payroll_reliquidations(status);
CREATE INDEX IF NOT EXISTS idx_reliquidation_items_reliquidation ON payroll_reliquidation_items(reliquidation_id);
CREATE INDEX IF NOT EXISTS idx_reliquidation_items_original ON payroll_reliquidation_items(original_item_id);
CREATE INDEX IF NOT EXISTS idx_reliquidation_deltas_reliquidation ON payroll_reliquidation_deltas(reliquidation_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_reliquidations_updated_at BEFORE UPDATE ON payroll_reliquidations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE payroll_reliquidations IS 'Reliquidaciones de remuneraciones conforme a normativa chilena';
COMMENT ON COLUMN payroll_reliquidations.type IS 'rectificatoria: corrige montos del mismo periodo | complementaria: agrega diferencias que se pagan después';
COMMENT ON COLUMN payroll_reliquidations.reason_category IS 'Catálogo de motivos: horas_extra, retroactivo, licencia, tope_imponible, descuento, gratificacion, otro';
COMMENT ON TABLE payroll_reliquidation_items IS 'Deltas por concepto de la reliquidación';
COMMENT ON TABLE payroll_reliquidation_deltas IS 'Snapshot completo de diferencias calculadas';
