-- Agregar columna pact_number a la tabla overtime_pacts
ALTER TABLE overtime_pacts ADD COLUMN IF NOT EXISTS pact_number VARCHAR(50);

-- Crear índice único para pact_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_overtime_pacts_number ON overtime_pacts(pact_number);

-- Función para generar número de pacto correlativo por empresa
CREATE OR REPLACE FUNCTION generate_overtime_pact_number()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_next_number INTEGER;
  v_pact_number VARCHAR(50);
BEGIN
  -- Obtener company_id del pacto
  v_company_id := NEW.company_id;
  
  -- Obtener el siguiente número correlativo para esta empresa
  SELECT COALESCE(MAX(CAST(SUBSTRING(pact_number FROM 'PTO-(\d+)') AS INTEGER)), 0) + 1
  INTO v_next_number
  FROM overtime_pacts
  WHERE company_id = v_company_id
    AND pact_number IS NOT NULL
    AND pact_number ~ '^PTO-\d+$';
  
  -- Generar número de pacto
  v_pact_number := 'PTO-' || LPAD(v_next_number::TEXT, 2, '0');
  
  -- Asignar número solo si no existe
  IF NEW.pact_number IS NULL OR NEW.pact_number = '' THEN
    NEW.pact_number := v_pact_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para asignar número automáticamente
DROP TRIGGER IF EXISTS set_overtime_pact_number_trigger ON overtime_pacts;
CREATE TRIGGER set_overtime_pact_number_trigger
BEFORE INSERT ON overtime_pacts
FOR EACH ROW
EXECUTE FUNCTION generate_overtime_pact_number();

-- Comentario
COMMENT ON COLUMN overtime_pacts.pact_number IS 'Número correlativo del pacto de horas extra (ej: PTO-01)';

