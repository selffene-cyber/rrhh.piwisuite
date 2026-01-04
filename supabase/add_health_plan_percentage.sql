-- Agregar columna para monto del plan ISAPRE en UF (Unidades de Fomento)
-- Este campo almacena el monto del plan ISAPRE en UF del trabajador
-- Ejemplo: Si el plan es 2.4 UF, este campo tendrá 2.4
-- Para FONASA, este campo será NULL o 0
-- Al momento de la liquidación, este valor se multiplica por el valor de UF del día

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS health_plan_percentage DECIMAL(5, 2) DEFAULT 0;

COMMENT ON COLUMN employees.health_plan_percentage IS 'Monto del plan ISAPRE en UF (Unidades de Fomento). Se multiplica por el valor de UF del día al calcular la liquidación. Para FONASA debe ser 0 o NULL.';


