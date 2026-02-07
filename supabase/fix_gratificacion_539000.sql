-- ============================================
-- FIX: Actualizar sueldo mínimo a $539,000
-- Actualiza TANTO el campo numérico COMO el JSON
-- ============================================

DO $$
DECLARE
  rec RECORD;
  updated_json JSONB;
  rows_updated INT := 0;
BEGIN
  -- Recorrer todos los meses de 2026
  FOR rec IN 
    SELECT * FROM previred_indicators
    WHERE year = 2026
  LOOP
    -- Actualizar el JSON para cambiar RMITrabDepeInd
    -- IMPORTANTE: Guardar como string "539000" (sin formato, sin puntos ni comas)
    -- para que el parseo JavaScript funcione correctamente
    updated_json := rec.indicators_json;
    updated_json := jsonb_set(updated_json, '{RMITrabDepeInd}', '"539000"'::jsonb);
    
    -- Asegurarse de que no haya otros campos RMI con formato incorrecto
    -- (aunque no se usan para gratificación, es buena práctica normalizarlos)
    
    -- Actualizar el registro
    UPDATE previred_indicators
    SET 
      rmi_trab_depe_ind = 539000,
      indicators_json = updated_json,
      updated_at = NOW(),
      source = CASE 
        WHEN source = 'gael_cloud' THEN 'gael_cloud_updated'
        ELSE 'manual_update'
      END
    WHERE year = rec.year AND month = rec.month;
    
    rows_updated := rows_updated + 1;
  END LOOP;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Actualización completada';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Registros actualizados: %', rows_updated;
  RAISE NOTICE 'Nuevo sueldo mínimo: $539,000';
  RAISE NOTICE 'Nuevo tope gratificación: $213,354';
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- 1️⃣ Verificar campo numérico
SELECT 
  '1️⃣ CAMPO NUMÉRICO' as paso,
  year,
  month,
  rmi_trab_depe_ind as sueldo_minimo,
  ROUND((4.75 * rmi_trab_depe_ind) / 12, 0) as tope_gratificacion
FROM previred_indicators
WHERE year = 2026
ORDER BY month;

-- 2️⃣ Verificar campo JSON
SELECT 
  '2️⃣ CAMPO JSON' as paso,
  year,
  month,
  indicators_json->>'RMITrabDepeInd' as sueldo_minimo_json,
  ROUND((4.75 * (indicators_json->>'RMITrabDepeInd')::numeric) / 12, 0) as tope_gratificacion_json
FROM previred_indicators
WHERE year = 2026
ORDER BY month;

-- 3️⃣ Verificar que ambos coincidan
SELECT 
  '3️⃣ VERIFICACIÓN FINAL' as paso,
  year,
  month,
  CASE 
    WHEN rmi_trab_depe_ind::text = (indicators_json->>'RMITrabDepeInd')
    THEN '✅ COINCIDEN'
    ELSE '❌ NO COINCIDEN'
  END as validacion,
  rmi_trab_depe_ind as campo_numerico,
  indicators_json->>'RMITrabDepeInd' as campo_json
FROM previred_indicators
WHERE year = 2026
ORDER BY month;

-- 4️⃣ SIMULAR PARSEO JAVASCRIPT (como lo hace el código)
SELECT 
  '4️⃣ SIMULACIÓN PARSEO JS' as paso,
  year,
  month,
  indicators_json->>'RMITrabDepeInd' as valor_json_original,
  -- Simular: str.replace(/\./g, '').replace(',', '.')
  REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.') as valor_parseado,
  -- Convertir a número
  (REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.'))::numeric as valor_numerico_parseado,
  -- Calcular tope (como lo hace el código)
  ROUND((4.75 * (REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.'))::numeric) / 12, 0) as tope_calculado,
  CASE 
    WHEN ROUND((4.75 * (REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.'))::numeric) / 12, 0) = 213354
    THEN '✅ CORRECTO ($213,354)'
    WHEN ROUND((4.75 * (REPLACE(REPLACE(indicators_json->>'RMITrabDepeInd', '.', ''), ',', '.'))::numeric) / 12, 0) = 209359
    THEN '❌ INCORRECTO ($209,359 - usa $529,000)'
    ELSE '⚠️ VALOR INESPERADO'
  END as diagnostico
FROM previred_indicators
WHERE year = 2026
ORDER BY month;
