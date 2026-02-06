-- ============================================
-- SCRIPT: Verificar que el trigger existe
-- ============================================
-- Este script verifica que el trigger y la función
-- para generar loan_number se crearon correctamente
-- ============================================

-- Verificar que la función existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc 
      WHERE proname = 'generate_loan_number'
    ) THEN '✅ Función generate_loan_number() existe'
    ELSE '❌ Función generate_loan_number() NO existe'
  END as estado_funcion;

-- Verificar que el trigger existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_trigger 
      WHERE tgname = 'set_loan_number_trigger'
    ) THEN '✅ Trigger set_loan_number_trigger existe'
    ELSE '❌ Trigger set_loan_number_trigger NO existe'
  END as estado_trigger;

-- Mostrar detalles del trigger
SELECT 
  t.tgname as nombre_trigger,
  p.proname as nombre_funcion,
  c.relname as tabla,
  CASE 
    WHEN t.tgenabled = 'O' THEN 'Habilitado'
    WHEN t.tgenabled = 'D' THEN 'Deshabilitado'
    ELSE 'Desconocido'
  END as estado
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE t.tgname = 'set_loan_number_trigger';

-- Verificar que la columna loan_number tiene la restricción UNIQUE
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_constraint 
      WHERE conname = 'loans_loan_number_key'
    ) THEN '✅ Restricción UNIQUE en loan_number existe'
    ELSE '❌ Restricción UNIQUE en loan_number NO existe'
  END as estado_constraint;
