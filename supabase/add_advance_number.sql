-- Agregar columna advance_number a la tabla advances
ALTER TABLE advances ADD COLUMN IF NOT EXISTS advance_number VARCHAR(20) UNIQUE;

-- Comentario
COMMENT ON COLUMN advances.advance_number IS 'ID correlativo del anticipo (ej: ANT-01, ANT-02)';

