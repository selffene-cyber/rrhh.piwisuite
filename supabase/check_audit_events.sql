-- Script para verificar eventos de auditoría de un trabajador
-- Reemplaza '93c5d679-7bd4-4670-88e1-05de3d29b349' con el ID del trabajador que quieres verificar

-- Ver todos los eventos de un trabajador específico
SELECT 
  id,
  employee_id,
  action_type,
  module,
  entity_type,
  status,
  happened_at,
  actor_name,
  source
FROM audit_events 
WHERE employee_id = '93c5d679-7bd4-4670-88e1-05de3d29b349'
ORDER BY happened_at DESC
LIMIT 20;

-- Ver cuántos eventos hay en total para ese trabajador
SELECT COUNT(*) as total_eventos
FROM audit_events 
WHERE employee_id = '93c5d679-7bd4-4670-88e1-05de3d29b349';

-- Ver todos los eventos recientes (últimos 50) para ver si hay alguno sin employee_id
SELECT 
  id,
  employee_id,
  action_type,
  module,
  entity_type,
  status,
  happened_at,
  actor_name,
  source,
  company_id
FROM audit_events 
ORDER BY happened_at DESC
LIMIT 50;

-- Verificar si hay eventos sin employee_id que deberían tenerlo
SELECT 
  id,
  employee_id,
  action_type,
  module,
  entity_type,
  entity_id,
  happened_at,
  actor_name,
  source
FROM audit_events 
WHERE employee_id IS NULL
  AND module IN ('contracts', 'annexes', 'payroll', 'vacations', 'permissions', 'certificates')
ORDER BY happened_at DESC
LIMIT 20;





