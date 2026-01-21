-- ============================================================
-- SCRIPT PARA RESETEAR COMPLETAMENTE LOS PERIODOS DE VACACIONES
-- ============================================================
-- ⚠️ Este script ELIMINA todos los periodos existentes
-- ✅ El servidor con código nuevo los recreará correctamente
-- ============================================================

-- PASO 1: Ver estado actual (para comparar después)
-- ============================================================
SELECT 
  e.full_name,
  e.hire_date,
  vp.period_year,
  vp.accumulated_days,
  vp.used_days,
  vp.status
FROM employees e
INNER JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.full_name ILIKE '%matias%'
ORDER BY vp.period_year;


-- PASO 2: ELIMINAR TODOS LOS PERIODOS
-- ============================================================
-- ⚠️ Esto eliminará TODOS los periodos de TODOS los empleados
-- Solo ejecutar si estás seguro

DELETE FROM vacation_periods;

-- Verificar que se eliminaron
SELECT COUNT(*) as total_periodos_restantes FROM vacation_periods;
-- Debería retornar 0


-- PASO 3: Verificación
-- ============================================================
-- Ahora ve a la aplicación y entra a la ficha de Matías
-- Ve a la pestaña "Vacaciones"
-- El sistema sincronizará automáticamente sus periodos
-- 
-- Resultado esperado para Matías (ingreso: 14/04/2023):
-- ┌──────────┬────────────┬────────┬────────┐
-- │ año_inicio│ acumulados │ usados │ estado │
-- ├──────────┼────────────┼────────┼────────┤
-- │ 2023     │ 15.00      │ 0      │ active │ ← Periodo 1: 14/04/2023 - 13/04/2024
-- │ 2024     │ 15.00      │ 0      │ active │ ← Periodo 2: 14/04/2024 - 13/04/2025
-- │ 2025     │ 11.25      │ 0      │ active │ ← Periodo 3: 14/04/2025 - 13/04/2026 (en curso)
-- └──────────┴────────────┴────────┴────────┘
-- TOTAL: 41.25 días

-- NO debería haber un periodo 2026


-- PASO 4: Consulta para verificar después de sincronizar
-- ============================================================
SELECT 
  e.full_name,
  e.hire_date,
  TO_CHAR(e.hire_date, 'DD/MM/YYYY') as fecha_ingreso,
  vp.period_year as año_inicio,
  vp.accumulated_days as acumulados,
  vp.used_days as usados,
  (vp.accumulated_days - vp.used_days) as disponibles,
  vp.status as estado,
  -- Fechas estimadas del periodo
  DATE(vp.period_year || '-' || LPAD(EXTRACT(MONTH FROM e.hire_date)::TEXT, 2, '0') || '-' || LPAD(EXTRACT(DAY FROM e.hire_date)::TEXT, 2, '0')) as inicio,
  DATE((vp.period_year + 1) || '-' || LPAD(EXTRACT(MONTH FROM e.hire_date)::TEXT, 2, '0') || '-' || LPAD((EXTRACT(DAY FROM e.hire_date) - 1)::TEXT, 2, '0')) as fin
FROM employees e
INNER JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.full_name ILIKE '%matias%'
ORDER BY vp.period_year;


-- PASO 5: Ver todos los empleados
-- ============================================================
SELECT 
  e.full_name,
  e.hire_date,
  COUNT(vp.id) as total_periodos,
  SUM(vp.accumulated_days) as total_dias,
  STRING_AGG(vp.period_year::TEXT || ' (' || vp.accumulated_days::TEXT || 'd)', ', ' ORDER BY vp.period_year) as periodos_detalle
FROM employees e
LEFT JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.status = 'active'
GROUP BY e.id, e.full_name, e.hire_date
ORDER BY e.hire_date;
