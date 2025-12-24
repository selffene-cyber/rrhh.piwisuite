-- Agregar columna loan_number para ID correlativo tipo PT-##
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS loan_number VARCHAR(20) UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_loans_loan_number ON loans(loan_number);

-- Comentario
COMMENT ON COLUMN loans.loan_number IS 'ID correlativo único del préstamo (formato: PT-##)';

