-- ============================================
-- ACTUALIZAR SUELDO MÍNIMO 2026: $539,000
-- ============================================
-- Desde el 01 de enero 2026 el sueldo mínimo es $539,000
-- Esto afecta el tope de gratificación legal

-- 1️⃣ Ver indicadores actuales de 2026
SELECT 
  '1️⃣ INDICADORES ACTUALES 2026' as paso,
  year,
  month,
  rmi_trab_depe_ind as sueldo_minimo,
  ROUND((4.75 * rmi_trab_depe_ind) / 12) as tope_gratificacion_calculado
FROM previred_indicators
WHERE year = 2026
ORDER BY year, month;

-- 2️⃣ Actualizar sueldo mínimo a $539,000 para todo 2026
UPDATE previred_indicators
SET 
  rmi_trab_depe_ind = 539000,
  updated_at = NOW()
WHERE year = 2026;

-- 3️⃣ Si no existen registros para 2026, crearlos
INSERT INTO previred_indicators (
  year, 
  month, 
  rmi_trab_depe_ind,
  source,
  created_at,
  updated_at
)
SELECT 
  2026 as year,
  generate_series(1, 12) as month,
  539000 as rmi_trab_depe_ind,
  'manual' as source,
  NOW() as created_at,
  NOW() as updated_at
ON CONFLICT (year, month) 
DO UPDATE SET
  rmi_trab_depe_ind = 539000,
  updated_at = NOW();

-- 4️⃣ Verificación final
SELECT 
  '4️⃣ VERIFICACIÓN 2026' as paso,
  year,
  month,
  rmi_trab_depe_ind as sueldo_minimo,
  ROUND((4.75 * rmi_trab_depe_ind) / 12, 0) as tope_gratificacion
FROM previred_indicators
WHERE year = 2026
ORDER BY year, month;

-- 5️⃣ Cálculo del tope de gratificación
DO $$
DECLARE
  tope_gratificacion DECIMAL;
BEGIN
  tope_gratificacion := ROUND((4.75 * 539000) / 12, 0);
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Sueldo Mínimo 2026 actualizado: $539,000';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tope Gratificación Legal 2026:';
  RAISE NOTICE '  Fórmula: (4.75 × $539,000) / 12';
  RAISE NOTICE '  Resultado: $%', tope_gratificacion;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Para trabajador con $950,000 imponible:';
  RAISE NOTICE '  Opción A (25%%): $237,500';
  RAISE NOTICE '  Opción B (Tope): $%', tope_gratificacion;
  RAISE NOTICE '  Gratificación: $% (el menor)', tope_gratificacion;
  RAISE NOTICE '============================================';
END $$;
