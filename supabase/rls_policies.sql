-- Deshabilitar RLS (Row Level Security) para desarrollo
-- O crear políticas permisivas si prefieres mantener RLS habilitado

-- Opción 1: Deshabilitar RLS (más simple para desarrollo)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_slips DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE previred_indicators DISABLE ROW LEVEL SECURITY;

-- Opción 2: Mantener RLS pero con políticas permisivas (comentar la opción 1 y descomentar esta)
/*
-- Habilitar RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE previred_indicators ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para companies
CREATE POLICY "Allow all operations on companies" ON companies
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas permisivas para employees
CREATE POLICY "Allow all operations on employees" ON employees
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas permisivas para payroll_periods
CREATE POLICY "Allow all operations on payroll_periods" ON payroll_periods
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas permisivas para payroll_slips
CREATE POLICY "Allow all operations on payroll_slips" ON payroll_slips
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas permisivas para payroll_items
CREATE POLICY "Allow all operations on payroll_items" ON payroll_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas permisivas para previred_indicators
CREATE POLICY "Allow all operations on previred_indicators" ON previred_indicators
  FOR ALL
  USING (true)
  WITH CHECK (true);
*/

