-- ============================================
-- MIGRACIÓN 036: Agregar department_id a employees
-- ============================================
-- Agregar relación entre trabajadores y departamentos
-- ============================================

-- Agregar columna department_id a employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Crear índice para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_department ON employees(company_id, department_id);

-- Comentario en la columna
COMMENT ON COLUMN employees.department_id IS 'Departamento organizacional del trabajador. No define jerarquía laboral. La jerarquía laboral se define mediante superior_id.';

-- ============================================
-- Función para validar que el departamento pertenece a la misma empresa
-- ============================================
CREATE OR REPLACE FUNCTION validate_employee_department()
RETURNS TRIGGER AS $$
BEGIN
  -- Si no tiene departamento asignado, está bien
  IF NEW.department_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verificar que el departamento pertenezca a la misma empresa del trabajador
  IF NOT EXISTS (
    SELECT 1 FROM departments d
    WHERE d.id = NEW.department_id
      AND d.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'El departamento asignado debe pertenecer a la misma empresa del trabajador';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar departamento
CREATE TRIGGER validate_employee_department_trigger
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  WHEN (NEW.department_id IS NOT NULL)
  EXECUTE FUNCTION validate_employee_department();

