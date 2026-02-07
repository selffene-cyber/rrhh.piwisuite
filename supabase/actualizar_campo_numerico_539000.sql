-- ============================================
-- ACTUALIZAR: Campo numérico a 539000
-- Si el campo numérico tiene 529000, actualizarlo a 539000
-- ============================================

-- Actualizar ENERO 2026
UPDATE previred_indicators
SET 
  rmi_trab_depe_ind = 539000,
  indicators_json = jsonb_set(
    indicators_json,
    '{RMITrabDepeInd}',
    '"539000"'::jsonb
  ),
  updated_at = NOW()
WHERE year = 2026 
  AND month = 1
  AND rmi_trab_depe_ind != 539000;

-- Actualizar FEBRERO 2026
UPDATE previred_indicators
SET 
  rmi_trab_depe_ind = 539000,
  indicators_json = jsonb_set(
    indicators_json,
    '{RMITrabDepeInd}',
    '"539000"'::jsonb
  ),
  updated_at = NOW()
WHERE year = 2026 
  AND month = 2
  AND rmi_trab_depe_ind != 539000;

-- Verificar
SELECT 
  '✅ VERIFICACIÓN FINAL' as paso,
  year,
  month,
  rmi_trab_depe_ind as campo_numerico,
  indicators_json->>'RMITrabDepeInd' as campo_json,
  CASE 
    WHEN rmi_trab_depe_ind = 539000 AND (indicators_json->>'RMITrabDepeInd') = '539000'
    THEN '✅ AMBOS CORRECTOS'
    ELSE '❌ HAY PROBLEMA'
  END as estado
FROM previred_indicators
WHERE year = 2026 AND month IN (1, 2)
ORDER BY month;
