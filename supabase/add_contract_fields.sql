-- Agregar campos de contrato a la tabla employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'indefinido' CHECK (contract_type IN ('plazo_fijo', 'indefinido', 'otro')),
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS contract_other VARCHAR(255);

-- Índice para búsquedas de contratos próximos a vencer
CREATE INDEX IF NOT EXISTS idx_employees_contract_end_date ON employees(contract_end_date) WHERE contract_type = 'plazo_fijo';


