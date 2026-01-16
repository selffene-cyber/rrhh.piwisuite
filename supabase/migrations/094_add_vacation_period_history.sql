-- ============================================================================
-- MIGRACIÓN: Historial de Períodos de Vacaciones
-- Fecha: 2025-01-08
-- Descripción: Agregar status y notas a vacation_periods para mantener historial
--              completo de períodos, incluso los eliminados por regla de máximo 2.
-- ============================================================================

-- 1. Agregar columna 'status' a vacation_periods
ALTER TABLE vacation_periods
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
CHECK (status IN ('active', 'archived', 'completed'));

-- 2. Agregar columna 'archived_reason' para documentar por qué se archivó
ALTER TABLE vacation_periods
ADD COLUMN IF NOT EXISTS archived_reason TEXT NULL;

-- 3. Agregar columna 'archived_at' para saber cuándo se archivó
ALTER TABLE vacation_periods
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP NULL;

-- 4. Actualizar períodos existentes a 'active'
UPDATE vacation_periods
SET status = 'active'
WHERE status IS NULL OR status = 'active';

-- 5. Marcar como 'completed' los períodos donde used_days >= accumulated_days
UPDATE vacation_periods
SET status = 'completed'
WHERE used_days >= accumulated_days
AND status = 'active';

-- 6. Crear índice para búsquedas por status
CREATE INDEX IF NOT EXISTS idx_vacation_periods_status ON vacation_periods(employee_id, status);

-- 7. Crear función para archivar períodos antiguos (en lugar de eliminarlos)
CREATE OR REPLACE FUNCTION archive_old_vacation_periods(
  p_employee_id UUID
) RETURNS void AS $$
DECLARE
  v_active_periods INT;
BEGIN
  -- Contar períodos activos y completados (no archivados)
  SELECT COUNT(*)
  INTO v_active_periods
  FROM vacation_periods
  WHERE employee_id = p_employee_id
  AND status IN ('active', 'completed')
  ORDER BY period_year DESC;

  -- Si hay más de 2 períodos activos, archivar los más antiguos
  IF v_active_periods > 2 THEN
    UPDATE vacation_periods
    SET 
      status = 'archived',
      archived_reason = 'Límite máximo de 2 períodos según Art. 70 Código del Trabajo',
      archived_at = NOW()
    WHERE id IN (
      SELECT id
      FROM vacation_periods
      WHERE employee_id = p_employee_id
      AND status IN ('active', 'completed')
      ORDER BY period_year ASC
      LIMIT (v_active_periods - 2)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Comentarios para documentación
COMMENT ON COLUMN vacation_periods.status IS 'Estado del período: active (disponible), completed (agotado), archived (eliminado por regla de máximo 2 períodos)';
COMMENT ON COLUMN vacation_periods.archived_reason IS 'Motivo por el que se archivó el período';
COMMENT ON COLUMN vacation_periods.archived_at IS 'Fecha y hora en que se archivó el período';
COMMENT ON FUNCTION archive_old_vacation_periods IS 'Archiva períodos antiguos cuando hay más de 2 activos, según Art. 70 del Código del Trabajo';

-- ============================================================================
-- VERIFICACIÓN (ejecutar después de la migración)
-- ============================================================================

-- Ver resumen de períodos por estado:
-- SELECT 
--   e.full_name,
--   vp.period_year,
--   vp.accumulated_days,
--   vp.used_days,
--   vp.status,
--   vp.archived_reason
-- FROM vacation_periods vp
-- JOIN employees e ON e.id = vp.employee_id
-- ORDER BY e.full_name, vp.period_year DESC;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================


