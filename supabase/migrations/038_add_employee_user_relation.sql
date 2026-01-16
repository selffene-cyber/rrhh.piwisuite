-- ============================================
-- MIGRACIÓN 038: Relación Empleado-Usuario y Cambio de Contraseña
-- ============================================
-- Establece la relación entre empleados y usuarios del sistema
-- Permite creación automática de usuarios para trabajadores
-- Controla cambio obligatorio de contraseña inicial
-- ============================================

-- Agregar campos a tabla employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- Agregar campos a user_profiles para control de cambio de contraseña
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

-- Función auxiliar: Verificar si un usuario es trabajador
CREATE OR REPLACE FUNCTION is_employee_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar: Obtener employee_id de un usuario
CREATE OR REPLACE FUNCTION get_employee_id_from_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  SELECT id INTO v_employee_id
  FROM employees
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON COLUMN employees.user_id IS 'ID del usuario de autenticación vinculado al trabajador';
COMMENT ON COLUMN employees.email IS 'Email del trabajador (usado para crear usuario)';
COMMENT ON COLUMN user_profiles.must_change_password IS 'Indica si el usuario debe cambiar su contraseña en el próximo login';
COMMENT ON COLUMN user_profiles.password_changed_at IS 'Fecha en que el usuario cambió su contraseña por primera vez';
COMMENT ON FUNCTION is_employee_user IS 'Verifica si un usuario está vinculado a un empleado';
COMMENT ON FUNCTION get_employee_id_from_user IS 'Obtiene el ID del empleado asociado a un usuario';








