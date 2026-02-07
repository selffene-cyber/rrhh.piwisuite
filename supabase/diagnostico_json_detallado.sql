-- ============================================
-- DIAGNÓSTICO DETALLADO: Ver valor EXACTO del JSON
-- ============================================

-- 1️⃣ Ver el JSON completo del RMI (valor exacto)
SELECT 
  '1️⃣ VALOR EXACTO EN JSON' as paso,
  year,
  month,
  indicators_json->>'RMITrabDepeInd' as valor_json_exacto,
  LENGTH(indicators_json->>'RMITrabDepeInd') as longitud,
  -- Simular el parseo que hace el código JavaScript
  CASE 
    WHEN indicators_json->>'RMITrabDepeInd' LIKE '%.%' THEN 'Tiene punto (separador miles)'
    WHEN indicators_json->>'RMITrabDepeInd' LIKE '%,%' THEN 'Tiene coma (decimal)'
    ELSE 'Sin separadores'
  END as formato_detectado
FROM previred_indicators
WHERE year = 2026 AND month = 2;

-- 2️⃣ Calcular qué sueldo mínimo está usando (basado en el tope 209,359)
DO $$
DECLARE
  tope_actual DECIMAL := 209359;
  sueldo_calculado DECIMAL;
BEGIN
  sueldo_calculado := (tope_actual * 12) / 4.75;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔍 DIAGNÓSTICO DEL TOPE ACTUAL';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Si el tope es $209,359, entonces:';
  RAISE NOTICE 'Sueldo Mínimo = ($209,359 × 12) / 4.75';
  RAISE NOTICE 'Sueldo Mínimo = $%', ROUND(sueldo_calculado, 0);
  RAISE NOTICE '============================================';
  RAISE NOTICE '❌ El sistema está usando: $529,000 (VIEJO)';
  RAISE NOTICE '✅ Debería usar: $539,000 (NUEVO)';
  RAISE NOTICE '============================================';
END $$;

-- 3️⃣ Ver TODOS los campos del JSON relacionados con RMI
SELECT 
  '3️⃣ TODOS LOS CAMPOS RMI EN JSON' as paso,
  year,
  month,
  indicators_json->>'RMITrabDepeInd' as RMITrabDepeInd,
  indicators_json->>'RMIMen18May65' as RMIMen18May65,
  indicators_json->>'RMITrabCasaPart' as RMITrabCasaPart,
  indicators_json->>'RMINoRemu' as RMINoRemu
FROM previred_indicators
WHERE year = 2026 AND month = 2;

-- 4️⃣ Intentar parsear como lo hace JavaScript
SELECT 
  '4️⃣ SIMULACIÓN DE PARSEO JS' as paso,
  year,
  month,
  indicators_json->>'RMITrabDepeInd' as valor_original,
  -- Simular: str.replace(/\./g, '').replace(',', '.')
  REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.') as valor_parseado,
  -- Convertir a número
  (REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.'))::numeric as valor_numerico,
  -- Calcular tope
  ROUND((4.75 * (REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.'))::numeric) / 12, 0) as tope_calculado
FROM previred_indicators
WHERE year = 2026 AND month = 2;
