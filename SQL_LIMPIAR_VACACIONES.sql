-- ============================================================
-- SCRIPT DE LIMPIEZA COMPLETA DE DATOS DE VACACIONES
-- ============================================================
-- Propósito: Resetear completamente los períodos de vacaciones
-- para que reflejen EXACTAMENTE las vacaciones registradas
-- ============================================================

-- PASO 1: Ver el estado ACTUAL del trabajador
SELECT 
  'ANTES DE LIMPIEZA' as momento,
  vp.period_year,
  vp.accumulated_days,
  vp.used_days,
  vp.available_days,
  vp.status,
  COUNT(v.id) as vacaciones_count,
  COALESCE(SUM(CASE WHEN v.status IN ('aprobada', 'tomada') THEN v.days_count ELSE 0 END), 0) as dias_reales_tomados
FROM vacation_periods vp
LEFT JOIN vacations v ON v.employee_id = vp.employee_id 
  AND v.period_year = vp.period_year 
  AND v.status IN ('aprobada', 'tomada')
WHERE vp.employee_id = 'df013bed-9d6e-47f8-bd03-d456ad3737d9'
GROUP BY vp.id, vp.period_year, vp.accumulated_days, vp.used_days, vp.available_days, vp.status
ORDER BY vp.period_year ASC;

-- PASO 2: RESETEAR todos los períodos a 0 días usados
UPDATE vacation_periods
SET 
  used_days = 0,
  status = 'active',
  updated_at = NOW()
WHERE employee_id = 'df013bed-9d6e-47f8-bd03-d456ad3737d9';

-- PASO 3: Ver todas las vacaciones APROBADAS/TOMADAS del trabajador
SELECT 
  v.id,
  v.start_date,
  v.end_date,
  v.days_count,
  v.status,
  v.period_year,
  v.created_at
FROM vacations v
WHERE v.employee_id = 'df013bed-9d6e-47f8-bd03-d456ad3737d9'
AND v.status IN ('aprobada', 'tomada')
ORDER BY v.start_date ASC;

-- PASO 4: Recalcular días usados basándose SOLO en vacaciones reales
-- IMPORTANTE: Ahora usa period_year de la tabla vacations, no EXTRACT de start_date
WITH vacation_summary AS (
  SELECT 
    v.employee_id,
    v.period_year,
    SUM(v.days_count) as total_used
  FROM vacations v
  WHERE v.employee_id = 'df013bed-9d6e-47f8-bd03-d456ad3737d9'
  AND v.status IN ('aprobada', 'tomada')
  AND v.period_year IS NOT NULL
  GROUP BY v.employee_id, v.period_year
)
UPDATE vacation_periods vp
SET 
  used_days = COALESCE(vs.total_used, 0),
  status = CASE 
    WHEN COALESCE(vs.total_used, 0) >= vp.accumulated_days THEN 'completed'
    WHEN vp.status = 'archived' THEN 'archived'
    ELSE 'active'
  END,
  updated_at = NOW()
FROM vacation_summary vs
WHERE vp.employee_id = 'df013bed-9d6e-47f8-bd03-d456ad3737d9'
AND vp.period_year = vs.period_year;

-- PASO 5: Actualizar period_year en las vacaciones si no lo tienen
UPDATE vacations
SET 
  period_year = EXTRACT(YEAR FROM start_date::date),
  request_date = COALESCE(request_date, created_at::date, CURRENT_DATE)
WHERE employee_id = 'df013bed-9d6e-47f8-bd03-d456ad3737d9'
AND (period_year IS NULL OR request_date IS NULL);

-- PASO 6: Ver el resultado FINAL
SELECT 
  'DESPUÉS DE LIMPIEZA' as momento,
  vp.period_year,
  vp.accumulated_days,
  vp.used_days,
  (vp.accumulated_days - vp.used_days) as available_days,
  vp.status,
  COUNT(v.id) as vacaciones_count,
  COALESCE(SUM(CASE WHEN v.status IN ('aprobada', 'tomada') THEN v.days_count ELSE 0 END), 0) as dias_reales_tomados
FROM vacation_periods vp
LEFT JOIN vacations v ON v.employee_id = vp.employee_id 
  AND v.period_year = vp.period_year 
  AND v.status IN ('aprobada', 'tomada')
WHERE vp.employee_id = 'df013bed-9d6e-47f8-bd03-d456ad3737d9'
GROUP BY vp.id, vp.period_year, vp.accumulated_days, vp.used_days, vp.status
ORDER BY vp.period_year ASC;

-- PASO 7: Ver vacaciones con su período asignado
SELECT 
  v.start_date,
  v.end_date,
  v.days_count,
  v.status,
  v.period_year,
  v.request_date
FROM vacations v
WHERE v.employee_id = 'df013bed-9d6e-47f8-bd03-d456ad3737d9'
ORDER BY v.start_date ASC;

-- ============================================================
-- RESULTADO ESPERADO:
-- ============================================================
-- Si NO hay vacaciones aprobadas/tomadas:
--   - TODOS los períodos deben tener used_days = 0
--   - TODOS deben tener available_days = accumulated_days
--
-- Si HAY vacaciones:
--   - Los días deben estar en el período correcto (por fecha)
--   - La suma de used_days debe coincidir con los días de vacaciones
-- ============================================================
