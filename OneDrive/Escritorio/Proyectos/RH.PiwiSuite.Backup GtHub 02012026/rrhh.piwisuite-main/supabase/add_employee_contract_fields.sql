-- Agregar campos necesarios para contratos legales chilenos
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'Chilena',
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50); -- 'soltero', 'casado', 'divorciado', 'viudo', 'union_civil'

-- Comentarios
COMMENT ON COLUMN employees.nationality IS 'Nacionalidad del trabajador';
COMMENT ON COLUMN employees.marital_status IS 'Estado civil: soltero, casado, divorciado, viudo, union_civil';



