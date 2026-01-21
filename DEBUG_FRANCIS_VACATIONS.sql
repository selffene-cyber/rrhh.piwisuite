-- 🔍 DEBUG: Investigar períodos de vacaciones de Francis Ebber Bravo Mora
-- Por qué muestra 10 días usados cuando tiene 15 días tomados en el historial

-- ===================================================================
-- PASO 1: Identificar al empleado
-- ===================================================================
SELECT 
    id,
    full_name,
    rut,
    hire_date,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date)) || ' años ' ||
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, hire_date)) || ' meses' AS antiguedad
FROM employees
WHERE full_name ILIKE '%Francis%Bravo%'
   OR full_name ILIKE '%Francis%Ebber%';

-- ===================================================================
-- PASO 2: Ver TODOS los períodos (incluyendo archivados)
-- ===================================================================
SELECT 
    period_year,
    accumulated_days,
    used_days,
    (accumulated_days - used_days) AS disponible,
    status,
    archived_at,
    archived_reason
FROM vacation_periods
WHERE employee_id IN (
    SELECT id FROM employees WHERE full_name ILIKE '%Francis%Bravo%'
)
ORDER BY period_year;

-- ===================================================================
-- PASO 3: Ver todas las solicitudes de vacaciones (tomadas/aprobadas)
-- ===================================================================
SELECT 
    id,
    start_date,
    end_date,
    days_count,
    status,
    period_year,
    created_at
FROM vacations
WHERE employee_id IN (
    SELECT id FROM employees WHERE full_name ILIKE '%Francis%Bravo%'
)
AND status IN ('aprobada', 'tomada')
ORDER BY start_date;

-- ===================================================================
-- PASO 4: Comparar totales
-- ===================================================================
WITH employee_data AS (
    SELECT id FROM employees WHERE full_name ILIKE '%Francis%Bravo%'
),
periods_total AS (
    SELECT 
        SUM(used_days) AS total_usado_periodos
    FROM vacation_periods
    WHERE employee_id IN (SELECT id FROM employee_data)
),
vacations_total AS (
    SELECT 
        SUM(days_count) AS total_dias_solicitudes
    FROM vacations
    WHERE employee_id IN (SELECT id FROM employee_data)
      AND status IN ('aprobada', 'tomada')
)
SELECT 
    p.total_usado_periodos AS "Días Usados (según períodos)",
    v.total_dias_solicitudes AS "Días en Solicitudes (aprobadas/tomadas)",
    (v.total_dias_solicitudes - p.total_usado_periodos) AS "Diferencia (Faltante)"
FROM periods_total p, vacations_total v;

-- ===================================================================
-- PASO 5: Detalle de qué solicitud afectó qué período
-- ===================================================================
SELECT 
    v.id,
    v.start_date,
    v.end_date,
    v.days_count,
    v.status,
    v.period_year AS "periodo_asignado",
    vp.period_year AS "periodo_real",
    vp.used_days AS "dias_usados_periodo",
    v.created_at
FROM vacations v
LEFT JOIN vacation_periods vp ON vp.employee_id = v.employee_id AND vp.period_year = v.period_year
WHERE v.employee_id IN (SELECT id FROM employees WHERE full_name ILIKE '%Francis%Bravo%')
  AND v.status IN ('aprobada', 'tomada')
ORDER BY v.start_date;
