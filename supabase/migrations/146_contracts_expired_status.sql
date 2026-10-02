-- =====================================================
-- MIGRACIÓN 146: Estado 'expired' para contratos
-- =====================================================
-- 1. Agregar 'expired' al CHECK de status en contracts
-- 2. Backfill: marcar contratos activos vencidos (end_date < hoy, no indefinidos)
-- 3. Recrear trigger: auto-expirar contrato vencido antes de activar uno nuevo
-- 4. Índice para consultas de expiración

-- 1. Agregar 'expired' al CHECK de status
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check 
  CHECK (status IN ('draft', 'issued', 'signed', 'active', 'expired', 'terminated', 'cancelled'));

-- 2. Backfill: contratos activos con fecha de término vencida pasan a 'expired'
-- (no aplica a indefinidos: end_date NULL)
UPDATE contracts 
SET status = 'expired', 
    updated_at = NOW()
WHERE status = 'active' 
  AND end_date IS NOT NULL 
  AND contract_type != 'indefinido'
  AND end_date < CURRENT_DATE;

-- 3. Recrear trigger: en vez de bloquear la activación de un nuevo contrato,
--    auto-expira el contrato vigente vencido (end_date < hoy)
CREATE OR REPLACE FUNCTION check_single_active_contract()
RETURNS TRIGGER AS $$
DECLARE
  existing_contract RECORD;
BEGIN
  -- Solo validar si el nuevo contrato va a estar activo
  IF NEW.status = 'active' THEN
    -- Buscar otro contrato activo para este empleado
    FOR existing_contract IN 
      SELECT id, end_date, contract_type
      FROM contracts 
      WHERE employee_id = NEW.employee_id 
        AND status = 'active' 
        AND id != NEW.id
    LOOP
      -- Si el contrato existente está vencido por fecha (y no es indefinido),
      -- auto-expirarlo en lugar de bloquear
      IF existing_contract.end_date IS NOT NULL 
         AND existing_contract.contract_type != 'indefinido'
         AND existing_contract.end_date < CURRENT_DATE THEN
        UPDATE contracts 
        SET status = 'expired', updated_at = NOW()
        WHERE id = existing_contract.id;
      ELSE
        RAISE EXCEPTION 'El trabajador ya posee un contrato activo vigente. Debe terminar el contrato existente o crear un anexo antes de activar un nuevo contrato.';
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_multiple_active_contracts_trigger ON contracts;

CREATE TRIGGER prevent_multiple_active_contracts_trigger
BEFORE INSERT OR UPDATE OF status, employee_id ON contracts
FOR EACH ROW
EXECUTE FUNCTION check_single_active_contract();

-- 4. Índice para consultas de expiración
CREATE INDEX IF NOT EXISTS idx_contracts_expiration 
  ON contracts(status, end_date) WHERE end_date IS NOT NULL;

COMMENT ON FUNCTION check_single_active_contract() IS 
'Valida que un trabajador solo pueda tener un contrato activo vigente. Si el contrato activo existente está vencido por fecha, lo auto-expira en lugar de bloquear la activación del nuevo contrato.';