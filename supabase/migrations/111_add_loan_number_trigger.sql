-- Función para generar número de préstamo correlativo por empresa
CREATE OR REPLACE FUNCTION generate_loan_number()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_next_number INTEGER;
  v_loan_number VARCHAR(20);
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 10;
BEGIN
  -- Obtener company_id del préstamo
  v_company_id := NEW.company_id;
  
  -- Solo generar si no se proporcionó un número
  IF NEW.loan_number IS NULL OR NEW.loan_number = '' THEN
    -- Intentar generar un número único
    LOOP
      -- Obtener el siguiente número correlativo para esta empresa
      SELECT COALESCE(MAX(CAST(SUBSTRING(loan_number FROM 'PT-(\d+)') AS INTEGER)), 0) + 1
      INTO v_next_number
      FROM loans
      WHERE company_id = v_company_id
        AND loan_number IS NOT NULL
        AND loan_number ~ '^PT-\d+$';
      
      -- Generar número de préstamo
      v_loan_number := 'PT-' || LPAD(v_next_number::TEXT, 2, '0');
      
      -- Verificar si el número ya existe (por si acaso hay duplicados)
      IF NOT EXISTS (SELECT 1 FROM loans WHERE loan_number = v_loan_number) THEN
        NEW.loan_number := v_loan_number;
        EXIT; -- Salir del loop si encontramos un número único
      END IF;
      
      -- Incrementar contador de intentos
      v_attempts := v_attempts + 1;
      v_next_number := v_next_number + 1;
      
      -- Si excedemos los intentos máximos, lanzar error
      IF v_attempts >= v_max_attempts THEN
        RAISE EXCEPTION 'No se pudo generar un número de préstamo único después de % intentos', v_max_attempts;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para asignar número automáticamente
DROP TRIGGER IF EXISTS set_loan_number_trigger ON loans;
CREATE TRIGGER set_loan_number_trigger
BEFORE INSERT ON loans
FOR EACH ROW
EXECUTE FUNCTION generate_loan_number();

-- Comentario
COMMENT ON FUNCTION generate_loan_number() IS 'Genera automáticamente un número correlativo único de préstamo por empresa (formato: PT-##)';
COMMENT ON COLUMN loans.loan_number IS 'Número correlativo único del préstamo (formato: PT-##), generado automáticamente por trigger';
