-- Migración 024: Índices para optimización de rendimiento
-- Fecha: 2025-01-XX
-- Descripción: Agrega índices compuestos y específicos para mejorar el rendimiento de consultas frecuentes

-- Índices para payroll_slips (consultas por empleado y estado)
CREATE INDEX IF NOT EXISTS idx_payroll_slips_employee_status 
  ON payroll_slips(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_payroll_slips_period_status 
  ON payroll_slips(period_id, status);

CREATE INDEX IF NOT EXISTS idx_payroll_slips_created_at 
  ON payroll_slips(created_at DESC);

-- Índices para employees (consultas por empresa y estado)
CREATE INDEX IF NOT EXISTS idx_employees_company_status 
  ON employees(company_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_status_company 
  ON employees(status, company_id);

-- Índices para loans (consultas por empleado y estado)
CREATE INDEX IF NOT EXISTS idx_loans_employee_status 
  ON loans(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_loans_company_status 
  ON loans(company_id, status);

-- Índices para advances (consultas por empleado y período)
CREATE INDEX IF NOT EXISTS idx_advances_employee_period 
  ON advances(employee_id, period);

CREATE INDEX IF NOT EXISTS idx_advances_employee_status 
  ON advances(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_advances_payroll_slip 
  ON advances(payroll_slip_id) WHERE payroll_slip_id IS NOT NULL;

-- Índices para vacations (consultas por empleado y fechas)
CREATE INDEX IF NOT EXISTS idx_vacations_employee_dates 
  ON vacations(employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_vacations_employee_status 
  ON vacations(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_vacations_dates_status 
  ON vacations(start_date, end_date, status);

-- Índices para medical_leaves (consultas por empleado y fechas)
CREATE INDEX IF NOT EXISTS idx_medical_leaves_employee_dates 
  ON medical_leaves(employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_medical_leaves_employee_active 
  ON medical_leaves(employee_id, is_active);

CREATE INDEX IF NOT EXISTS idx_medical_leaves_dates_active 
  ON medical_leaves(start_date, end_date, is_active);

-- Índices para payroll_items (consultas por liquidación y tipo)
CREATE INDEX IF NOT EXISTS idx_payroll_items_slip_type 
  ON payroll_items(payroll_slip_id, type);

CREATE INDEX IF NOT EXISTS idx_payroll_items_slip_category 
  ON payroll_items(payroll_slip_id, category);

-- Índices para certificates (consultas por empleado y tipo)
CREATE INDEX IF NOT EXISTS idx_certificates_employee_type 
  ON certificates(employee_id, certificate_type);

CREATE INDEX IF NOT EXISTS idx_certificates_company_date 
  ON certificates(company_id, issue_date DESC);

-- Índices para overtime_pacts (consultas por empleado y estado)
CREATE INDEX IF NOT EXISTS idx_overtime_pacts_employee_status 
  ON overtime_pacts(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_overtime_pacts_company_status 
  ON overtime_pacts(company_id, status);

CREATE INDEX IF NOT EXISTS idx_overtime_pacts_dates 
  ON overtime_pacts(start_date, end_date);

-- Índices para overtime_entries (consultas por pacto y fecha)
CREATE INDEX IF NOT EXISTS idx_overtime_entries_pact_date 
  ON overtime_entries(overtime_pact_id, date);

CREATE INDEX IF NOT EXISTS idx_overtime_entries_employee_date 
  ON overtime_entries(employee_id, date);

-- Índices para loan_installments (consultas por préstamo y estado)
CREATE INDEX IF NOT EXISTS idx_loan_installments_loan_status 
  ON loan_installments(loan_id, status);

CREATE INDEX IF NOT EXISTS idx_loan_installments_due_month 
  ON loan_installments(due_month);

-- Índices para payroll_periods (consultas por empresa y período)
CREATE INDEX IF NOT EXISTS idx_payroll_periods_company_year_month 
  ON payroll_periods(company_id, year, month);

-- Comentarios
COMMENT ON INDEX idx_payroll_slips_employee_status IS 'Optimiza consultas de liquidaciones por empleado y estado';
COMMENT ON INDEX idx_employees_company_status IS 'Optimiza consultas de empleados por empresa y estado';
COMMENT ON INDEX idx_loans_employee_status IS 'Optimiza consultas de préstamos por empleado y estado';
COMMENT ON INDEX idx_advances_employee_period IS 'Optimiza consultas de anticipos por empleado y período';
COMMENT ON INDEX idx_vacations_employee_dates IS 'Optimiza consultas de vacaciones por empleado y rango de fechas';
COMMENT ON INDEX idx_medical_leaves_employee_dates IS 'Optimiza consultas de licencias médicas por empleado y rango de fechas';

