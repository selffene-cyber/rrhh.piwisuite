-- ============================================
-- DIAGNÓSTICO: Ver qué está leyendo el sistema
-- ============================================

-- 1️⃣ Ver campo numérico vs JSON
SELECT 
  '1️⃣ COMPARACIÓN' as paso,
  year,
  month,
  rmi_trab_depe_ind as campo_numerico,
  indicators_json->>'RMITrabDepeInd' as campo_json,
  CASE 
    WHEN rmi_trab_depe_ind::text = (indicators_json->>'RMITrabDepeInd')
    THEN '✅ COINCIDEN'
    ELSE '❌ DIFERENTES - AQUÍ ESTÁ EL PROBLEMA'
  END as estado
FROM previred_indicators
WHERE year = 2026 AND month = 2
ORDER BY month;

-- 2️⃣ Calcular topes con cada valor
SELECT 
  '2️⃣ CÁLCULO DE TOPES' as paso,
  year,
  month,
  rmi_trab_depe_ind as sueldo_numerico,
  ROUND((4.75 * rmi_trab_depe_ind) / 12, 0) as tope_con_numerico,
  (indicators_json->>'RMITrabDepeInd')::numeric as sueldo_json,
  ROUND((4.75 * (indicators_json->>'RMITrabDepeInd')::numeric) / 12, 0) as tope_con_json,
  CASE 
    WHEN ROUND((4.75 * (indicators_json->>'RMITrabDepeInd')::numeric) / 12, 0) = 209359
    THEN '❌ JSON tiene 529.000 (viejo)'
    WHEN ROUND((4.75 * (indicators_json->>'RMITrabDepeInd')::numeric) / 12, 0) = 213354
    THEN '✅ JSON tiene 539.000 (correcto)'
    ELSE '⚠️ Valor inesperado'
  END as diagnostico
FROM previred_indicators
WHERE year = 2026 AND month = 2;

-- 3️⃣ Ver el JSON completo del RMI
SELECT 
  '3️⃣ CONTENIDO JSON COMPLETO' as paso,
  year,
  month,
  jsonb_pretty(to_jsonb(indicators_json) #> '{RMITrabDepeInd}') as rmi_en_json
FROM previred_indicators
WHERE year = 2026 AND month = 2;
