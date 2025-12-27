-- Agregar campos de cuenta bancaria a la tabla employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_type VARCHAR(50), -- 'corriente', 'ahorro', 'vista'
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);

-- Comentarios para documentación
COMMENT ON COLUMN employees.bank_name IS 'Nombre del banco donde el trabajador tiene su cuenta';
COMMENT ON COLUMN employees.account_type IS 'Tipo de cuenta: corriente, ahorro, vista';
COMMENT ON COLUMN employees.account_number IS 'Número de cuenta bancaria';



