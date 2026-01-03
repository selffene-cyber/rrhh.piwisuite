-- Agregar campos de cuenta bancaria a la tabla contracts (si ya existe)
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_type VARCHAR(50), -- 'corriente', 'ahorro', 'vista'
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);

-- Comentarios para documentación
COMMENT ON COLUMN contracts.bank_name IS 'Nombre del banco para transferencia de sueldo';
COMMENT ON COLUMN contracts.account_type IS 'Tipo de cuenta: corriente, ahorro, vista';
COMMENT ON COLUMN contracts.account_number IS 'Número de cuenta bancaria';



