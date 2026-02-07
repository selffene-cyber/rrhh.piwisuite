-- ============================================
-- ACTUALIZAR SUELDO MÍNIMO A $539,000
-- Desde enero 2026 en adelante
-- ============================================

DO $$
DECLARE
  rows_updated INT;
BEGIN
  -- Actualizar todos los meses de 2026 con el nuevo sueldo mínimo
  UPDATE previred_indicators
  SET 
    rmi_trab_depe_ind = 539000,
    updated_at = NOW(),
    source = 'manual_update'
  WHERE year = 2026
    AND rmi_trab_depe_ind != 539000;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Actualización completada';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Filas actualizadas: %', rows_updated;
  RAISE NOTICE 'Nuevo sueldo mínimo: $539,000';
  RAISE NOTICE 'Nuevo tope gratificación: $213,354';
  RAISE NOTICE '============================================';
END $$;

-- Verificar el cambio
SELECT 
  '✅ VERIFICACIÓN' as paso,
  year,
  month,
  rmi_trab_depe_ind as sueldo_minimo,
  ROUND((4.75 * rmi_trab_depe_ind) / 12, 0) as tope_gratificacion,
  updated_at
FROM previred_indicators
WHERE year = 2026
ORDER BY month;
