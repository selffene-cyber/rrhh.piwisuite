-- ============================================
-- VERIFICAR: Indicadores de ENERO 2026
-- (Se usan para liquidaciones de FEBRERO 2026)
-- ============================================

SELECT 
  '🔍 INDICADORES ENERO 2026' as paso,
  year,
  month,
  rmi_trab_depe_ind as campo_numerico,
  indicators_json->>'RMITrabDepeInd' as campo_json,
  ROUND((4.75 * (REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.'))::numeric) / 12, 0) as tope_calculado,
  CASE 
    WHEN ROUND((4.75 * (REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.'))::numeric) / 12, 0) = 213354
    THEN '✅ CORRECTO'
    ELSE '❌ INCORRECTO'
  END as estado
FROM previred_indicators
WHERE year = 2026 AND month = 1;
