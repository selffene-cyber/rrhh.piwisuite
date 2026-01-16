-- Agregar campo pdf_url a payroll_slips para guardar el PDF generado
ALTER TABLE payroll_slips 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_payroll_slips_pdf_url ON payroll_slips(pdf_url) WHERE pdf_url IS NOT NULL;






