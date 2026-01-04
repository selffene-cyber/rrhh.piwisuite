-- Agregar campos de movilización y colación a la tabla employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS transportation DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS meal_allowance DECIMAL(12, 2) DEFAULT 0;


