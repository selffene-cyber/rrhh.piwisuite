-- ============================================
-- FIX SIMPLE: Actualizar JSON a 539000
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- Actualizar el JSON para ENERO 2026 (usado para liquidaciones de FEBRERO 2026)
UPDATE previred_indicators
SET 
  indicators_json = jsonb_set(
    indicators_json,
    '{RMITrabDepeInd}',
    '"539000"'::jsonb
  ),
  updated_at = NOW()
WHERE year = 2026 AND month = 1;

-- Actualizar el JSON para FEBRERO 2026
UPDATE previred_indicators
SET 
  indicators_json = jsonb_set(
    indicators_json,
    '{RMITrabDepeInd}',
    '"539000"'::jsonb
  ),
  updated_at = NOW()
WHERE year = 2026 AND month = 2;

-- Verificar que se actualizó correctamente
SELECT 
  '✅ VERIFICACIÓN' as paso,
  year,
  month,
  rmi_trab_depe_ind as campo_numerico,
  indicators_json->>'RMITrabDepeInd' as campo_json,
  CASE 
    WHEN indicators_json->>'RMITrabDepeInd' = '539000'
    THEN '✅ CORRECTO'
    ELSE '❌ INCORRECTO'
  END as estado
FROM previred_indicators
WHERE year = 2026 AND month IN (1, 2)
ORDER BY month;
