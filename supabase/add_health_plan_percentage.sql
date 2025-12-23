-- Agregar columna para porcentaje del plan ISAPRE
-- Este campo almacena el porcentaje adicional del plan ISAPRE del trabajador
-- Ejemplo: Si el plan es 2.5%, este campo tendrá 2.5
-- Para FONASA, este campo será NULL o 0

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS health_plan_percentage DECIMAL(5, 2) DEFAULT 0;

COMMENT ON COLUMN employees.health_plan_percentage IS 'Porcentaje adicional del plan ISAPRE (solo para ISAPRE). Para FONASA debe ser 0 o NULL.';


