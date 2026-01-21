-- 🔧 CORRECCIÓN: Actualizar días usados del período 2022 de Francis Ebber Bravo Mora
-- El período muestra 10 días usados cuando deberían ser 15 (10 + 5)

-- ===================================================================
-- PASO 1: Verificar estado actual
-- ===================================================================
SELECT 
    e.full_name,
    vp.period_year,
    vp.accumulated_days,
    vp.used_days AS dias_usados_actual,
    15 AS dias_usados_correcto,
    (vp.accumulated_days - 15) AS disponible_correcto
FROM vacation_periods vp
JOIN employees e ON e.id = vp.employee_id
WHERE e.full_name ILIKE '%Francis%Bravo%'
  AND vp.period_year = 2022;

-- ===================================================================
-- PASO 2: Corregir el período 2022
-- ===================================================================
UPDATE vacation_periods
SET 
    used_days = 15,  -- Total correcto: 10 días + 5 días
    status = 'active'  -- Cambiar de archivado a activo si tiene días disponibles
WHERE employee_id IN (SELECT id FROM employees WHERE full_name ILIKE '%Francis%Bravo%')
  AND period_year = 2022;

-- ===================================================================
-- PASO 3: Verificar corrección
-- ===================================================================
SELECT 
    e.full_name,
    vp.period_year,
    vp.accumulated_days,
    vp.used_days AS dias_usados_corregido,
    (vp.accumulated_days - vp.used_days) AS disponible,
    vp.status
FROM vacation_periods vp
JOIN employees e ON e.id = vp.employee_id
WHERE e.full_name ILIKE '%Francis%Bravo%'
  AND vp.period_year = 2022;

-- ===================================================================
-- PASO 4: Ver resumen completo actualizado
-- ===================================================================
SELECT 
    e.full_name,
    vp.period_year,
    vp.accumulated_days,
    vp.used_days,
    (vp.accumulated_days - vp.used_days) AS disponible,
    vp.status
FROM vacation_periods vp
JOIN employees e ON e.id = vp.employee_id
WHERE e.full_name ILIKE '%Francis%Bravo%'
ORDER BY vp.period_year;

-- ===================================================================
-- PASO 5: Verificar totales finales
-- ===================================================================
WITH employee_data AS (
    SELECT id FROM employees WHERE full_name ILIKE '%Francis%Bravo%'
)
SELECT 
    SUM(vp.accumulated_days) AS total_acumulado,
    SUM(vp.used_days) AS total_usado,
    SUM(vp.accumulated_days - vp.used_days) AS total_disponible
FROM vacation_periods vp
WHERE vp.employee_id IN (SELECT id FROM employee_data);
