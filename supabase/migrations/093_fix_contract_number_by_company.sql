-- =====================================================
-- Migración 093: Correlativo de contratos por empresa
-- =====================================================
-- Propósito: Que cada empresa tenga su propio contador
--           CT-01, CT-02, CT-03... por company_id
-- =====================================================

-- Paso 1: Eliminar secuencias globales (ya no las necesitamos)
DROP SEQUENCE IF EXISTS contracts_number_seq CASCADE;
DROP SEQUENCE IF EXISTS contract_annexes_number_seq CASCADE;

-- Paso 2: Eliminar triggers antiguos
DROP TRIGGER IF EXISTS set_contract_number_trigger ON contracts;
DROP TRIGGER IF EXISTS set_annex_number_trigger ON contract_annexes;

-- Paso 3: Crear nueva función para contratos (por empresa)
CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  IF NEW.contract_number IS NULL THEN
    -- Obtener el siguiente número para esta empresa
    SELECT COALESCE(MAX(
      CASE 
        WHEN contract_number ~ '^CT-[0-9]+$' 
        THEN CAST(SUBSTRING(contract_number FROM 4) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO next_number
    FROM contracts
    WHERE company_id = NEW.company_id;
    
    -- Asignar el nuevo número
    NEW.contract_number := 'CT-' || LPAD(next_number::TEXT, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 4: Crear nueva función para anexos (por empresa)
CREATE OR REPLACE FUNCTION set_annex_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  IF NEW.annex_number IS NULL THEN
    -- Obtener el siguiente número para esta empresa
    SELECT COALESCE(MAX(
      CASE 
        WHEN annex_number ~ '^ANX-[0-9]+$' 
        THEN CAST(SUBSTRING(annex_number FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO next_number
    FROM contract_annexes
    WHERE company_id = NEW.company_id;
    
    -- Asignar el nuevo número
    NEW.annex_number := 'ANX-' || LPAD(next_number::TEXT, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 5: Recrear triggers
CREATE TRIGGER set_contract_number_trigger
BEFORE INSERT ON contracts
FOR EACH ROW
EXECUTE FUNCTION set_contract_number();

CREATE TRIGGER set_annex_number_trigger
BEFORE INSERT ON contract_annexes
FOR EACH ROW
EXECUTE FUNCTION set_annex_number();

-- Paso 6: Eliminar constraint UNIQUE de contract_number y annex_number
-- Ya que ahora pueden repetirse entre empresas
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_contract_number_key;
ALTER TABLE contract_annexes DROP CONSTRAINT IF EXISTS contract_annexes_annex_number_key;

-- Paso 7: Crear constraint UNIQUE compuesto (company_id + number)
-- Para que sea único por empresa
ALTER TABLE contracts 
ADD CONSTRAINT contracts_company_number_unique 
UNIQUE (company_id, contract_number);

ALTER TABLE contract_annexes 
ADD CONSTRAINT annexes_company_number_unique 
UNIQUE (company_id, annex_number);

-- Verificación
DO $$
DECLARE
  total_contracts INTEGER;
  total_companies INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_contracts FROM contracts;
  SELECT COUNT(DISTINCT company_id) INTO total_companies FROM contracts;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migración 093 completada';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total contratos: %', total_contracts;
  RAISE NOTICE 'Total empresas: %', total_companies;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Secuencias globales eliminadas';
  RAISE NOTICE '✅ Función set_contract_number() actualizada (por empresa)';
  RAISE NOTICE '✅ Función set_annex_number() actualizada (por empresa)';
  RAISE NOTICE '✅ Constraint UNIQUE compuesto creado';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE:';
  RAISE NOTICE '- Los contratos existentes mantienen sus números';
  RAISE NOTICE '- Los nuevos contratos empiezan desde 01 por empresa';
  RAISE NOTICE '- Cada empresa tiene su propio contador';
  RAISE NOTICE '========================================';
END $$;


