-- Migración: Agregar campo superior_id a la tabla employees
-- Permite establecer relaciones jerárquicas entre trabajadores

-- Agregar columna superior_id
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS superior_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Crear índice para mejorar performance en consultas jerárquicas
CREATE INDEX IF NOT EXISTS idx_employees_superior_id ON employees(superior_id);

-- Comentario en la columna
COMMENT ON COLUMN employees.superior_id IS 'ID del trabajador superior/jefe en la jerarquía organizacional';

-- Función para prevenir ciclos en la jerarquía (validación a nivel de aplicación)
-- Esta validación se hará en el código de la aplicación

