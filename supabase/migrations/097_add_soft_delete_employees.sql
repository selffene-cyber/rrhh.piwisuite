-- ============================================
-- SOFT DELETE: Eliminación suave de empleados
-- ============================================
-- En lugar de eliminar físicamente empleados con historial,
-- los marcamos como inactivos/eliminados para preservar
-- registros legales (accidentes, finiquitos, etc.)

-- 1. Agregar columnas para soft delete
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Crear índice para consultas de empleados activos
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_active_company ON employees(company_id, is_active);

-- 3. Comentarios de documentación
COMMENT ON COLUMN employees.is_active IS 'Indica si el empleado está activo. FALSE = eliminado lógicamente (soft delete)';
COMMENT ON COLUMN employees.deleted_at IS 'Fecha y hora cuando se marcó como eliminado';
COMMENT ON COLUMN employees.deleted_by IS 'Usuario que realizó la eliminación lógica';

-- ============================================
-- VISTA: Empleados activos (solo los no eliminados)
-- ============================================
CREATE OR REPLACE VIEW active_employees AS
SELECT * FROM employees
WHERE is_active = TRUE;

-- ============================================
-- FUNCIÓN: Marcar empleado como eliminado (soft delete)
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_employee(employee_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Marcar como inactivo en lugar de eliminar
  UPDATE employees
  SET 
    is_active = FALSE,
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = employee_uuid;
  
  -- También marcar su usuario relacionado como inactivo (si existe)
  UPDATE user_profiles
  SET is_active = FALSE
  WHERE employee_id = employee_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN: Restaurar empleado eliminado
-- ============================================
CREATE OR REPLACE FUNCTION restore_employee(employee_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Restaurar el empleado
  UPDATE employees
  SET 
    is_active = TRUE,
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = employee_uuid;
  
  -- También restaurar su usuario relacionado (si existe)
  UPDATE user_profiles
  SET is_active = TRUE
  WHERE employee_id = employee_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS FINALES
-- ============================================
COMMENT ON FUNCTION soft_delete_employee IS 'Marca un empleado como eliminado (soft delete) en lugar de eliminarlo físicamente. Preserva historial legal.';
COMMENT ON FUNCTION restore_employee IS 'Restaura un empleado previamente eliminado (soft delete).';
