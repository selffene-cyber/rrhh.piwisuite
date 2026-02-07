-- ============================================
-- FORZAR ACTUALIZACIÓN: Sincronizar JSON desde campo numérico
-- Esto asegura que el JSON tenga el mismo valor que el campo numérico
-- ============================================

DO $$
DECLARE
  rec RECORD;
  updated_json JSONB;
  rows_updated INT := 0;
BEGIN
  FOR rec IN 
    SELECT * FROM previred_indicators
    WHERE year = 2026
  LOOP
    -- Actualizar el JSON usando el valor del campo numérico
    -- IMPORTANTE: Convertir a string SIN decimales (ej: "539000" no "539000.00")
    -- porque el parseo JavaScript elimina TODOS los puntos, incluyendo decimales
    updated_json := rec.indicators_json;
    updated_json := jsonb_set(
      updated_json, 
      '{RMITrabDepeInd}', 
      to_jsonb(TRUNC(rec.rmi_trab_depe_ind)::text)  -- TRUNC elimina decimales
    );
    
    UPDATE previred_indicators
    SET 
      indicators_json = updated_json,
      updated_at = NOW()
    WHERE year = rec.year AND month = rec.month;
    
    rows_updated := rows_updated + 1;
  END LOOP;
  
  RAISE NOTICE '✅ JSON actualizado desde campo numérico: % registros', rows_updated;
END $$;

-- Verificación final
SELECT 
  '✅ VERIFICACIÓN FINAL' as paso,
  year,
  month,
  rmi_trab_depe_ind as campo_numerico,
  indicators_json->>'RMITrabDepeInd' as campo_json,
  CASE 
    WHEN rmi_trab_depe_ind::text = (indicators_json->>'RMITrabDepeInd')
    THEN '✅ COINCIDEN'
    ELSE '❌ NO COINCIDEN'
  END as validacion,
  ROUND((4.75 * (REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.'))::numeric) / 12, 0) as tope_calculado
FROM previred_indicators
WHERE year = 2026
ORDER BY month;
