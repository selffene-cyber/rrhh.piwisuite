-- Script para verificar y limpiar liquidaciones con employee_id incorrecto
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar todas las liquidaciones y sus employee_id
SELECT 
  ps.id,
  ps.employee_id,
  e.full_name as employee_name,
  e.rut as employee_rut,
  pp.month,
  pp.year,
  ps.status,
  ps.created_at
FROM payroll_slips ps
LEFT JOIN employees e ON ps.employee_id = e.id
LEFT JOIN payroll_periods pp ON ps.period_id = pp.id
ORDER BY ps.created_at DESC;

-- 2. Verificar si hay liquidaciones con employee_id que no existe en employees
SELECT 
  ps.id,
  ps.employee_id,
  pp.month,
  pp.year,
  ps.status,
  ps.created_at
FROM payroll_slips ps
LEFT JOIN employees e ON ps.employee_id = e.id
LEFT JOIN payroll_periods pp ON ps.period_id = pp.id
WHERE e.id IS NULL;

-- 3. Verificar liquidaciones duplicadas o con datos inconsistentes
SELECT 
  employee_id,
  period_id,
  COUNT(*) as count
FROM payroll_slips
GROUP BY employee_id, period_id
HAVING COUNT(*) > 1;

-- 4. Si encuentras liquidaciones incorrectas, puedes eliminarlas con:
-- DELETE FROM payroll_slips WHERE id = 'ID_DE_LA_LIQUIDACION_INCORRECTA';

-- 5. Para ver todas las liquidaciones de un trabajador específico:
-- SELECT * FROM payroll_slips WHERE employee_id = 'ID_DEL_TRABAJADOR';

