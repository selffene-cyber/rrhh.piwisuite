-- ============================================
-- DIAGNÓSTICO: Sueldo Mínimo en BD
-- ============================================

-- 1️⃣ Ver qué valor tiene actualmente en la BD
SELECT 
  '1️⃣ VALOR ACTUAL EN BD' as paso,
  year,
  month,
  rmi_trab_depe_ind as sueldo_minimo_bd,
  ROUND((4.75 * rmi_trab_depe_ind) / 12, 0) as tope_gratificacion_calculado,
  source,
  updated_at
FROM previred_indicators
WHERE year = 2026 AND month = 2
ORDER BY updated_at DESC;

-- 2️⃣ Calcular qué sueldo corresponde al tope actual
DO $$
DECLARE
  tope_actual DECIMAL := 209395;
  sueldo_calculado DECIMAL;
BEGIN
  sueldo_calculado := (tope_actual * 12) / 4.75;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔍 DIAGNÓSTICO';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Si el tope es $209,395, entonces:';
  RAISE NOTICE 'Sueldo Mínimo = ($209,395 × 12) / 4.75';
  RAISE NOTICE 'Sueldo Mínimo = $%', ROUND(sueldo_calculado, 0);
  RAISE NOTICE '============================================';
  RAISE NOTICE '❌ Debería ser: $539,000';
  RAISE NOTICE '============================================';
END $$;

-- 3️⃣ Ver TODOS los indicadores de 2026
SELECT 
  '3️⃣ TODOS LOS MESES 2026' as paso,
  month,
  rmi_trab_depe_ind as sueldo_minimo,
  ROUND((4.75 * rmi_trab_depe_ind) / 12, 0) as tope_gratificacion
FROM previred_indicators
WHERE year = 2026
ORDER BY month;
