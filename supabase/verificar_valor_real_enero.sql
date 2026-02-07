-- ============================================
-- VERIFICAR: Valor REAL del campo numérico
-- ============================================

SELECT 
  '🔍 VALOR REAL EN BD' as paso,
  year,
  month,
  rmi_trab_depe_ind as campo_numerico,
  indicators_json->>'RMITrabDepeInd' as campo_json,
  CASE 
    WHEN rmi_trab_depe_ind = 539000 THEN '✅ CORRECTO (539000)'
    WHEN rmi_trab_depe_ind = 529000 THEN '❌ INCORRECTO (529000 - VIEJO)'
    ELSE '⚠️ VALOR INESPERADO'
  END as estado_numerico,
  CASE 
    WHEN (indicators_json->>'RMITrabDepeInd') = '539000' THEN '✅ CORRECTO (539000)'
    WHEN (indicators_json->>'RMITrabDepeInd') = '529000' THEN '❌ INCORRECTO (529000 - VIEJO)'
    ELSE '⚠️ VALOR INESPERADO'
  END as estado_json
FROM previred_indicators
WHERE year = 2026 AND month = 1;
