-- ============================================
-- MIGRACIÓN 025: Crear tablas de Libro de Remuneraciones / LRE
-- ============================================
-- Implementa el Libro de Remuneraciones Electrónico según:
-- - Art. 62 del Código del Trabajo
-- - Ley N.º 21.327 y art. 515 del Código del Trabajo
-- - Dictamen DT N.º 887/006 de 10.03.2021
-- ============================================

-- Tabla principal: Libro de Remuneraciones por empresa y período
CREATE TABLE IF NOT EXISTS payroll_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- Estado del libro: borrador, cerrado, enviado_dt
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'closed', 'sent_dt')),
  
  -- Trazabilidad
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  sent_to_dt_at TIMESTAMP WITH TIME ZONE,
  
  -- Totales consolidados del libro (para validación rápida)
  total_employees INTEGER DEFAULT 0,
  total_taxable_earnings DECIMAL(15, 2) DEFAULT 0,
  total_non_taxable_earnings DECIMAL(15, 2) DEFAULT 0,
  total_legal_deductions DECIMAL(15, 2) DEFAULT 0,
  total_other_deductions DECIMAL(15, 2) DEFAULT 0,
  total_employer_contributions DECIMAL(15, 2) DEFAULT 0,
  total_net_pay DECIMAL(15, 2) DEFAULT 0,
  
  -- Metadatos adicionales (versión de indicadores usados, observaciones, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un libro único por empresa, año y mes
  UNIQUE(company_id, year, month)
);

-- Tabla de detalle: Entradas del libro (una por trabajador)
-- Almacena snapshot de datos al momento de generar el libro para trazabilidad
CREATE TABLE IF NOT EXISTS payroll_book_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_book_id UUID NOT NULL REFERENCES payroll_books(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  payroll_slip_id UUID REFERENCES payroll_slips(id) ON DELETE SET NULL,
  
  -- Snapshot de datos del trabajador al momento de generar el libro
  employee_rut VARCHAR(20) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  employee_hire_date DATE,
  employee_contract_end_date DATE,
  employee_contract_type VARCHAR(50),
  employee_afp VARCHAR(50),
  employee_health_system VARCHAR(50),
  employee_health_plan VARCHAR(100),
  employee_position VARCHAR(255),
  employee_cost_center VARCHAR(100),
  
  -- Totales de haberes imponibles (según art. 41 Código del Trabajo)
  base_salary DECIMAL(12, 2) DEFAULT 0,
  monthly_gratification DECIMAL(12, 2) DEFAULT 0,
  bonuses DECIMAL(12, 2) DEFAULT 0,
  overtime DECIMAL(12, 2) DEFAULT 0,
  vacation_paid DECIMAL(12, 2) DEFAULT 0,
  other_taxable_earnings DECIMAL(12, 2) DEFAULT 0,
  total_taxable_earnings DECIMAL(12, 2) DEFAULT 0,
  
  -- Totales de haberes no imponibles
  transportation DECIMAL(12, 2) DEFAULT 0,
  meal_allowance DECIMAL(12, 2) DEFAULT 0,
  aguinaldo DECIMAL(12, 2) DEFAULT 0,
  other_non_taxable_earnings DECIMAL(12, 2) DEFAULT 0,
  total_non_taxable_earnings DECIMAL(12, 2) DEFAULT 0,
  
  -- Descuentos legales
  afp_deduction DECIMAL(12, 2) DEFAULT 0,
  health_deduction DECIMAL(12, 2) DEFAULT 0,
  unemployment_insurance_deduction DECIMAL(12, 2) DEFAULT 0,
  unique_tax_deduction DECIMAL(12, 2) DEFAULT 0,
  total_legal_deductions DECIMAL(12, 2) DEFAULT 0,
  
  -- Otros descuentos
  loans_deduction DECIMAL(12, 2) DEFAULT 0,
  advances_deduction DECIMAL(12, 2) DEFAULT 0,
  other_deductions DECIMAL(12, 2) DEFAULT 0,
  total_other_deductions DECIMAL(12, 2) DEFAULT 0,
  
  -- Aportes del empleador (si se registran)
  employer_afp_contribution DECIMAL(12, 2) DEFAULT 0,
  employer_sis_contribution DECIMAL(12, 2) DEFAULT 0,
  employer_afc_contribution DECIMAL(12, 2) DEFAULT 0,
  total_employer_contributions DECIMAL(12, 2) DEFAULT 0,
  
  -- Resultado final
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  net_pay DECIMAL(12, 2) DEFAULT 0,
  
  -- Días trabajados en el período
  days_worked INTEGER DEFAULT 30,
  days_leave INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Una entrada única por libro y trabajador
  UNIQUE(payroll_book_id, employee_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_payroll_books_company ON payroll_books(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_books_period ON payroll_books(company_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_books_status ON payroll_books(status);
CREATE INDEX IF NOT EXISTS idx_payroll_book_entries_book ON payroll_book_entries(payroll_book_id);
CREATE INDEX IF NOT EXISTS idx_payroll_book_entries_employee ON payroll_book_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_book_entries_slip ON payroll_book_entries(payroll_slip_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_payroll_books_updated_at
  BEFORE UPDATE ON payroll_books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE payroll_books IS 'Libro de Remuneraciones Electrónico (LRE) según art. 62 Código del Trabajo y Dictamen DT 887/006/2021';
COMMENT ON TABLE payroll_book_entries IS 'Detalle del Libro de Remuneraciones: snapshot por trabajador con todos los haberes, descuentos y aportes del período';
COMMENT ON COLUMN payroll_books.status IS 'Estado del libro: draft (borrador), closed (cerrado), sent_dt (enviado a Dirección del Trabajo)';
COMMENT ON COLUMN payroll_book_entries.total_taxable_earnings IS 'Total haberes imponibles según art. 41 Código del Trabajo (contraprestación en dinero evaluable en dinero)';

