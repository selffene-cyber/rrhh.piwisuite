-- Consulta para entender el caso de Matías

-- 1. Datos del empleado (fecha de ingreso)
SELECT 
  id,
  full_name,
  rut,
  hire_date,
  TO_CHAR(hire_date, 'DD/MM/YYYY') as fecha_ingreso_legible,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date)) as años_servicio,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, hire_date)) as meses_adicionales
FROM employees
WHERE full_name ILIKE '%matias%'
ORDER BY hire_date;

-- 2. Periodos de vacaciones de Matías
SELECT 
  employee_id,
  period_year,
  accumulated_days,
  used_days,
  (accumulated_days - used_days) as available_days,
  status,
  archived_at,
  archived_reason
FROM vacation_periods
WHERE employee_id IN (
  SELECT id FROM employees WHERE full_name ILIKE '%matias%'
)
ORDER BY period_year;

-- 3. Vacaciones de Matías
SELECT 
  v.id,
  v.start_date,
  v.end_date,
  v.days_count,
  v.status,
  v.period_year,
  v.request_date,
  v.approved_at
FROM vacations v
WHERE v.employee_id IN (
  SELECT id FROM employees WHERE full_name ILIKE '%matias%'
)
ORDER BY v.start_date DESC;

-- 4. Cálculo teórico de días acumulados
-- (Este query es para entender qué debería tener según su fecha de ingreso)
WITH empleado AS (
  SELECT 
    id,
    full_name,
    hire_date
  FROM employees
  WHERE full_name ILIKE '%matias%'
  LIMIT 1
)
SELECT 
  e.full_name,
  e.hire_date,
  -- Meses completos desde ingreso hasta hoy
  (EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) * 12 + 
   EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.hire_date))) as meses_completos_total,
  -- Días acumulados teóricos (1.25 por mes)
  ROUND((EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) * 12 + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.hire_date))) * 1.25, 2) as dias_teoricos_totales,
  -- Suma real de días en periodos
  (SELECT SUM(accumulated_days) FROM vacation_periods WHERE employee_id = e.id) as dias_en_periodos,
  -- Diferencia
  ROUND((EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) * 12 + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.hire_date))) * 1.25, 2) - 
  (SELECT COALESCE(SUM(accumulated_days), 0) FROM vacation_periods WHERE employee_id = e.id) as diferencia
FROM empleado e;
