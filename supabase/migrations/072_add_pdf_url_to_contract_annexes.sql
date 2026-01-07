-- Agregar columna pdf_url a contract_annexes para almacenar URL del PDF generado
ALTER TABLE contract_annexes
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Comentario explicativo
COMMENT ON COLUMN contract_annexes.pdf_url IS 'URL del PDF del anexo guardado en Storage (generado automáticamente al emitir)';

