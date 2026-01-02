-- ============================================
-- MIGRACIÓN 027: Actualizar campos de estado de empleados
-- ============================================
-- Agrega nuevos estados y campos relacionados para gestión de finiquitos
-- ============================================

-- 1. Actualizar constraint de status para incluir nuevos estados
ALTER TABLE employees 
DROP CONSTRAINT IF EXISTS employees_status_check;

ALTER TABLE employees 
ADD CONSTRAINT employees_status_check 
CHECK (status IN ('active', 'inactive', 'licencia_medica', 'renuncia', 'despido'));

-- 2. Agregar campos para gestión de término de contrato
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS termination_date DATE,
ADD COLUMN IF NOT EXISTS inactive_note TEXT;

-- 3. Comentarios para documentación
COMMENT ON COLUMN employees.status IS 'Estado del trabajador: active, inactive, licencia_medica, renuncia, despido';
COMMENT ON COLUMN employees.termination_date IS 'Fecha de término de contrato (renuncia o despido). Se usa para crear pre-finiquito';
COMMENT ON COLUMN employees.inactive_note IS 'Nota explicativa cuando el trabajador está inactivo';

