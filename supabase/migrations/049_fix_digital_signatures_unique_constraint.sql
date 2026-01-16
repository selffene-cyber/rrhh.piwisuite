-- ============================================
-- MIGRACIÓN 049: Corregir restricción única de firmas digitales
-- ============================================
-- Eliminar la restricción única problemática unique_active_signature
-- y crear una restricción parcial única que solo se aplique cuando is_active = true
-- Esto permite múltiples firmas inactivas pero solo una firma activa por usuario por empresa
-- ============================================

-- Eliminar la restricción única problemática si existe
DO $$ 
BEGIN
  -- Intentar eliminar la restricción única si existe
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'unique_active_signature'
  ) THEN
    ALTER TABLE digital_signatures 
    DROP CONSTRAINT IF EXISTS unique_active_signature;
  END IF;
END $$;

-- Crear un índice único parcial que solo se aplique cuando is_active = true
-- Esto asegura que solo haya una firma activa por usuario por empresa
-- pero permite múltiples firmas inactivas
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_signature_partial
ON digital_signatures (company_id, user_id)
WHERE is_active = true;

-- Comentario explicativo
COMMENT ON INDEX unique_active_signature_partial IS 
'Restricción parcial única que asegura que solo haya una firma activa por usuario por empresa. Permite múltiples firmas inactivas.';







