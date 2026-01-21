-- ============================================================
-- SCRIPT DE REGULARIZACIÓN DE PERIODOS DE VACACIONES
-- ============================================================
-- Propósito: Resetear periodos de vacaciones para todos los empleados
--            usando el nuevo cálculo por año de servicio (aniversarios)
-- 
-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los periodos existentes
--    y los volverá a crear usando el cálculo correcto.
-- 
-- ⚠️ NO elimina las solicitudes de vacaciones existentes, pero el
--    period_year de esas solicitudes puede quedar desactualizado.
-- 
-- Fecha: 20/01/2026
-- ============================================================

-- PASO 1: Ver estado actual (EJECUTAR PRIMERO PARA BACKUP)
-- ============================================================

-- Backup de periodos actuales
CREATE TEMP TABLE backup_vacation_periods AS
SELECT * FROM vacation_periods;

-- Ver total de periodos por empleado
SELECT 
  e.full_name,
  e.hire_date,
  COUNT(vp.id) as total_periodos,
  SUM(vp.accumulated_days) as total_dias,
  SUM(vp.used_days) as total_usados
FROM employees e
LEFT JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.status = 'active'
GROUP BY e.id, e.full_name, e.hire_date
ORDER BY e.full_name;


-- PASO 2: ELIMINAR periodos existentes
-- ============================================================
-- ⚠️ CUIDADO: Esto eliminará TODOS los periodos
-- Solo ejecutar si estás seguro

-- Comentario: Descomenta la siguiente línea para ejecutar
-- DELETE FROM vacation_periods;

SELECT 'Periodos eliminados. Ahora ejecuta la aplicación para que sincronice automáticamente.' as status;


-- PASO 3: Verificación post-sincronización
-- ============================================================
-- Ejecutar DESPUÉS de que la aplicación sincronice los periodos

-- Ver nuevos periodos creados (por año de servicio)
SELECT 
  e.full_name,
  e.hire_date,
  TO_CHAR(e.hire_date, 'DD/MM/YYYY') as fecha_ingreso,
  vp.period_year as año_inicio_periodo,
  vp.accumulated_days as dias_acumulados,
  vp.used_days as dias_usados,
  (vp.accumulated_days - vp.used_days) as dias_disponibles,
  vp.status as estado,
  -- Calcular aniversario
  DATE(vp.period_year || '-' || EXTRACT(MONTH FROM e.hire_date) || '-' || EXTRACT(DAY FROM e.hire_date)) as inicio_periodo,
  DATE((vp.period_year + 1) || '-' || EXTRACT(MONTH FROM e.hire_date) || '-' || EXTRACT(DAY FROM e.hire_date)) - INTERVAL '1 day' as fin_periodo
FROM employees e
INNER JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.status = 'active'
ORDER BY e.full_name, vp.period_year;


-- PASO 4: Ejemplo específico para Matías
-- ============================================================

SELECT 
  'Periodos de Matías' as titulo,
  vp.period_year as año,
  vp.accumulated_days as acumulados,
  vp.used_days as usados,
  (vp.accumulated_days - vp.used_days) as disponibles,
  vp.status,
  -- Fechas del periodo
  DATE(vp.period_year || '-04-14') as inicio,
  DATE((vp.period_year + 1) || '-04-13') as fin
FROM employees e
INNER JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.full_name ILIKE '%matias%'
ORDER BY vp.period_year;

-- Resultado esperado para Matías (ingreso 14/04/2023):
-- ┌──────┬────────────┬────────┬─────────────┬────────┬────────────┬────────────┐
-- │ año  │ acumulados │ usados │ disponibles │ status │   inicio   │    fin     │
-- ├──────┼────────────┼────────┼─────────────┼────────┼────────────┼────────────┤
-- │ 2023 │ 15.00      │ 0      │ 15.00       │ active │ 2023-04-14 │ 2024-04-13 │
-- │ 2024 │ 15.00      │ 0      │ 15.00       │ active │ 2024-04-14 │ 2025-04-13 │
-- │ 2025 │ ~9.00      │ 0      │ ~9.00       │ active │ 2025-04-14 │ 2026-04-13 │
-- └──────┴────────────┴────────┴─────────────┴────────┴────────────┴────────────┘


-- PASO 5: Actualizar solicitudes de vacaciones existentes (OPCIONAL)
-- ============================================================
-- Si tienes solicitudes con period_year incorrecto, este script las actualiza

-- Ver solicitudes con period_year potencialmente incorrecto
SELECT 
  e.full_name,
  v.start_date,
  v.end_date,
  v.days_count,
  v.status,
  v.period_year as periodo_actual,
  -- Calcular periodo correcto (año de inicio del periodo que contiene start_date)
  CASE 
    WHEN EXTRACT(MONTH FROM v.start_date) >= EXTRACT(MONTH FROM e.hire_date) 
     AND EXTRACT(DAY FROM v.start_date) >= EXTRACT(DAY FROM e.hire_date)
    THEN EXTRACT(YEAR FROM v.start_date)::INTEGER
    ELSE EXTRACT(YEAR FROM v.start_date)::INTEGER - 1
  END as periodo_correcto_estimado
FROM vacations v
INNER JOIN employees e ON e.id = v.employee_id
WHERE v.status IN ('solicitada', 'aprobada')
ORDER BY e.full_name, v.start_date;

-- Actualizar period_year de solicitudes (ejecutar si hay desajustes)
-- ⚠️ Este es un cálculo aproximado, revisa manualmente si es correcto

-- Comentario: Descomenta para ejecutar
/*
UPDATE vacations v
SET period_year = (
  SELECT 
    CASE 
      WHEN EXTRACT(MONTH FROM v.start_date) >= EXTRACT(MONTH FROM e.hire_date) 
       AND EXTRACT(DAY FROM v.start_date) >= EXTRACT(DAY FROM e.hire_date)
      THEN EXTRACT(YEAR FROM v.start_date)::INTEGER
      ELSE EXTRACT(YEAR FROM v.start_date)::INTEGER - 1
    END
  FROM employees e
  WHERE e.id = v.employee_id
)
WHERE v.status IN ('solicitada', 'aprobada');
*/


-- PASO 6: Validación final
-- ============================================================

-- Verificar que todos los empleados activos tienen periodos
SELECT 
  e.full_name,
  e.hire_date,
  COUNT(vp.id) as total_periodos,
  SUM(vp.accumulated_days) as total_acumulado,
  CASE 
    WHEN COUNT(vp.id) = 0 THEN '❌ SIN PERIODOS'
    WHEN COUNT(vp.id) > 0 THEN '✅ OK'
  END as estado
FROM employees e
LEFT JOIN vacation_periods vp ON vp.employee_id = e.id
WHERE e.status = 'active'
GROUP BY e.id, e.full_name, e.hire_date
ORDER BY COUNT(vp.id), e.full_name;


-- ============================================================
-- INSTRUCCIONES DE USO
-- ============================================================

/*

1. BACKUP (IMPORTANTE):
   - Ejecuta el PASO 1 para crear un backup temporal
   - Guarda los resultados en un archivo externo

2. ELIMINAR PERIODOS:
   - Descomenta la línea "DELETE FROM vacation_periods;"
   - Ejecuta el PASO 2
   - Esto eliminará todos los periodos existentes

3. RESINCRONIZAR:
   - Ve a la aplicación web
   - Entra a la ficha de UN empleado (cualquiera)
   - Ve a la pestaña "Vacaciones"
   - El sistema automáticamente sincronizará sus periodos usando el nuevo cálculo
   - Repite para todos los empleados O espera a que el sistema lo haga automáticamente

4. VERIFICAR:
   - Ejecuta el PASO 3 para ver los nuevos periodos
   - Ejecuta el PASO 4 para ver el ejemplo de Matías
   - Verifica que los días sean correctos (15 por año de servicio completo)

5. REGULARIZAR SOLICITUDES:
   - Si tienes solicitudes existentes, ejecuta el PASO 5
   - Esto actualizará el period_year de las solicitudes

6. VALIDACIÓN FINAL:
   - Ejecuta el PASO 6 para verificar que todos tengan periodos

*/


-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================

/*

❗ ANTES vs DESPUÉS:

ANTES (Año calendario - INCORRECTO):
  Matías (ingreso 14/04/2023):
    - Periodo 2023: 10 días (abril-diciembre) ❌
    - Periodo 2024: 15 días (enero-diciembre) ❌
    - Periodo 2025: 15 días (enero-diciembre) ❌

DESPUÉS (Año de servicio - CORRECTO):
  Matías (ingreso 14/04/2023):
    - Periodo 2023: 15 días (14/04/2023 - 13/04/2024) ✅
    - Periodo 2024: 15 días (14/04/2024 - 13/04/2025) ✅
    - Periodo 2025: ~9 días (14/04/2025 - hoy, en curso) ✅


❗ PERIOD_YEAR ahora representa:
  - El AÑO DE INICIO del periodo de servicio
  - NO el año calendario
  - Para Matías:
    - period_year = 2023 → Periodo 14/04/2023 - 13/04/2024
    - period_year = 2024 → Periodo 14/04/2024 - 13/04/2025
    - period_year = 2025 → Periodo 14/04/2025 - 13/04/2026


❗ VACACIONES EXISTENTES:
  - Las solicitudes de vacaciones existentes NO se eliminan
  - Pero su period_year puede estar incorrecto
  - Usa el PASO 5 para actualizarlas
  - O hazlo manualmente para mayor control


❗ REGLA DE 2 PERIODOS:
  - El sistema sigue aplicando la regla de máximo 2 periodos activos
  - Los periodos más antiguos se archivan automáticamente
  - Esto NO impide usar días de periodos archivados (legal en Chile)


❗ FIFO:
  - El sistema ahora usa FIFO correctamente
  - Siempre descuenta del periodo más antiguo primero
  - Incluye periodos archivados si tienen días disponibles

*/

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
