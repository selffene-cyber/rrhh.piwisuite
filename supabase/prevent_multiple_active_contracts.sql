-- =====================================================
-- RESTRICCIÓN: Un trabajador solo puede tener UN contrato activo
-- =====================================================
-- Este script agrega una restricción a nivel de base de datos
-- para prevenir que un trabajador tenga múltiples contratos activos

-- Función para validar que no exista otro contrato activo
CREATE OR REPLACE FUNCTION check_single_active_contract()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo validar si el nuevo contrato va a estar activo
  -- Permitir múltiples contratos en estado draft, issued, signed
  IF NEW.status = 'active' THEN
    -- Verificar si ya existe otro contrato activo para este empleado
    IF EXISTS (
      SELECT 1 
      FROM contracts 
      WHERE employee_id = NEW.employee_id 
        AND status = 'active' 
        AND id != NEW.id  -- Excluir el contrato actual si es una actualización
    ) THEN
      RAISE EXCEPTION 'El trabajador ya posee un contrato activo. Debe terminar el contrato existente o crear un anexo antes de activar un nuevo contrato.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta antes de INSERT o UPDATE
DROP TRIGGER IF EXISTS prevent_multiple_active_contracts_trigger ON contracts;

CREATE TRIGGER prevent_multiple_active_contracts_trigger
BEFORE INSERT OR UPDATE OF status, employee_id ON contracts
FOR EACH ROW
EXECUTE FUNCTION check_single_active_contract();

-- Comentario explicativo
COMMENT ON FUNCTION check_single_active_contract() IS 
'Valida que un trabajador solo pueda tener un contrato activo a la vez. Permite múltiples contratos en otros estados (draft, issued, signed, terminated, cancelled).';


