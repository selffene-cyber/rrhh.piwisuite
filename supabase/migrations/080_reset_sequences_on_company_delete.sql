-- ============================================
-- MIGRACIÓN 080: Reiniciar secuencias al eliminar empresa
-- ============================================
-- Cuando se elimina una empresa, reiniciar las secuencias de contratos y anexos
-- para que la próxima empresa empiece desde CT-01 y ANX-01
-- ============================================

-- Función para reiniciar secuencias cuando se elimina una empresa
-- Esta función se ejecutará DESPUÉS de eliminar la empresa y todos sus registros en cascada
CREATE OR REPLACE FUNCTION reset_sequences_on_company_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_companies INTEGER;
  v_remaining_contracts INTEGER;
  v_remaining_annexes INTEGER;
BEGIN
  -- Verificar si quedan otras empresas en la tabla companies
  SELECT COUNT(*)
  INTO v_remaining_companies
  FROM companies;
  
  -- Verificar si quedan contratos o anexos de otras empresas
  SELECT COUNT(*)
  INTO v_remaining_contracts
  FROM contracts;
  
  SELECT COUNT(*)
  INTO v_remaining_annexes
  FROM contract_annexes;
  
  -- Si no quedan otras empresas O no quedan contratos/anexos, reiniciar las secuencias
  IF v_remaining_companies = 0 OR (v_remaining_contracts = 0 AND v_remaining_annexes = 0) THEN
    -- Reiniciar secuencia de contratos
    ALTER SEQUENCE contracts_number_seq RESTART WITH 1;
    
    -- Reiniciar secuencia de anexos
    ALTER SEQUENCE contract_annexes_number_seq RESTART WITH 1;
    
    RAISE NOTICE 'Secuencias reiniciadas: contracts_number_seq y contract_annexes_number_seq';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecute DESPUÉS de eliminar una empresa
-- (después de que se ejecuten las eliminaciones en cascada)
-- Primero eliminar cualquier trigger existente con nombres antiguos
DROP TRIGGER IF EXISTS reset_sequences_before_company_delete ON companies;
DROP TRIGGER IF EXISTS reset_sequences_after_company_delete ON companies;
CREATE TRIGGER reset_sequences_after_company_delete
AFTER DELETE ON companies
FOR EACH ROW
EXECUTE FUNCTION reset_sequences_on_company_delete();

-- Comentarios
COMMENT ON FUNCTION reset_sequences_on_company_delete() IS 'Reinicia las secuencias de contratos y anexos cuando se elimina la última empresa que los tenía';
COMMENT ON TRIGGER reset_sequences_after_company_delete ON companies IS 'Trigger que reinicia secuencias después de eliminar una empresa';

