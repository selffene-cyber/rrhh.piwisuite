-- =====================================================
-- Migración 086: Backfill Opcional - Normalizar bancos históricos
-- =====================================================
-- Propósito: Migrar bank_name (texto) a bank_id (FK) para empleados antiguos
-- NOTA: Esta migración es OPCIONAL y puede ejecutarse después de 085
-- =====================================================

-- IMPORTANTE:
-- Esta migración NO se ejecuta automáticamente en el push.
-- Debe ejecutarse manualmente cuando se decida normalizar los datos históricos.
-- 
-- Para ejecutar: 
-- 1. Conectarse a la BD
-- 2. Ejecutar este script manualmente
-- 3. Verificar resultados

-- =====================================================
-- Función de Backfill
-- =====================================================

CREATE OR REPLACE FUNCTION backfill_employee_banks()
RETURNS TABLE (
  employee_id UUID,
  old_bank_name TEXT,
  new_bank_id UUID,
  action TEXT
) AS $$
DECLARE
  emp RECORD;
  bank_record RECORD;
  new_bank_id UUID;
BEGIN
  -- Iterar sobre empleados que tienen bank_name pero no bank_id
  FOR emp IN 
    SELECT id, bank_name 
    FROM employees 
    WHERE bank_id IS NULL 
      AND bank_name IS NOT NULL 
      AND bank_name != ''
      AND trim(bank_name) != ''
  LOOP
    -- Buscar banco existente por nombre (case-insensitive)
    SELECT id INTO bank_record
    FROM banks
    WHERE lower(name) = lower(trim(emp.bank_name))
    LIMIT 1;
    
    IF FOUND THEN
      -- Banco encontrado: asignar bank_id
      UPDATE employees
      SET bank_id = bank_record.id
      WHERE id = emp.id;
      
      RETURN QUERY SELECT 
        emp.id, 
        emp.bank_name, 
        bank_record.id, 
        'MATCHED'::TEXT;
    ELSE
      -- Banco NO encontrado: crear nuevo banco como 'otro'
      INSERT INTO banks (name, type, active)
      VALUES (trim(emp.bank_name), 'otro', true)
      RETURNING id INTO new_bank_id;
      
      -- Asignar bank_id al empleado
      UPDATE employees
      SET bank_id = new_bank_id
      WHERE id = emp.id;
      
      RETURN QUERY SELECT 
        emp.id, 
        emp.bank_name, 
        new_bank_id, 
        'CREATED'::TEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comentarios y documentación
-- =====================================================

COMMENT ON FUNCTION backfill_employee_banks() IS 
'Normaliza bancos de empleados: migra bank_name a bank_id. 
Crea bancos nuevos tipo "otro" si no existen.
NO modifica bank_name (se mantiene como fallback).

Uso:
SELECT * FROM backfill_employee_banks();

Retorna:
- employee_id: ID del empleado actualizado
- old_bank_name: Nombre original del banco
- new_bank_id: UUID del banco asignado
- action: "MATCHED" (existente) o "CREATED" (nuevo)
';

-- =====================================================
-- EJEMPLO DE USO (comentado por seguridad)
-- =====================================================

-- Para ejecutar el backfill:
-- SELECT * FROM backfill_employee_banks();

-- Para ver cuántos empleados necesitan normalización:
-- SELECT COUNT(*) 
-- FROM employees 
-- WHERE bank_id IS NULL 
--   AND bank_name IS NOT NULL 
--   AND trim(bank_name) != '';

-- Para ver estadísticas:
-- SELECT 
--   COUNT(*) FILTER (WHERE bank_id IS NOT NULL) as with_bank_id,
--   COUNT(*) FILTER (WHERE bank_id IS NULL AND bank_name IS NOT NULL) as legacy_only,
--   COUNT(*) FILTER (WHERE bank_id IS NULL AND bank_name IS NULL) as no_bank,
--   COUNT(*) as total
-- FROM employees;

-- =====================================================
-- Función auxiliar: Previsualizar sin ejecutar
-- =====================================================

CREATE OR REPLACE FUNCTION preview_bank_backfill()
RETURNS TABLE (
  employee_count BIGINT,
  bank_name TEXT,
  exists_in_banks BOOLEAN,
  would_create BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as employee_count,
    trim(e.bank_name) as bank_name,
    EXISTS(SELECT 1 FROM banks b WHERE lower(b.name) = lower(trim(e.bank_name))) as exists_in_banks,
    NOT EXISTS(SELECT 1 FROM banks b WHERE lower(b.name) = lower(trim(e.bank_name))) as would_create
  FROM employees e
  WHERE e.bank_id IS NULL 
    AND e.bank_name IS NOT NULL 
    AND trim(e.bank_name) != ''
  GROUP BY trim(e.bank_name)
  ORDER BY employee_count DESC, trim(e.bank_name);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION preview_bank_backfill() IS 
'Previsualiza qué bancos se crearían al ejecutar el backfill.
Muestra bancos agrupados con conteo de empleados.
NO modifica datos.

Uso:
SELECT * FROM preview_bank_backfill();
';

-- =====================================================
-- Verificación post-migración
-- =====================================================

DO $$
DECLARE
  employees_need_backfill INTEGER;
  unique_bank_names INTEGER;
BEGIN
  -- Contar empleados que necesitan normalización
  SELECT COUNT(*) INTO employees_need_backfill
  FROM employees 
  WHERE bank_id IS NULL 
    AND bank_name IS NOT NULL 
    AND trim(bank_name) != '';
  
  -- Contar bancos únicos que necesitan normalización
  SELECT COUNT(DISTINCT trim(bank_name)) INTO unique_bank_names
  FROM employees 
  WHERE bank_id IS NULL 
    AND bank_name IS NOT NULL 
    AND trim(bank_name) != '';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migración 086 completada (solo funciones)';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Empleados que necesitan normalización: %', employees_need_backfill;
  RAISE NOTICE 'Bancos únicos (legacy) sin normalizar: %', unique_bank_names;
  RAISE NOTICE '';
  RAISE NOTICE 'Para previsualizar backfill:';
  RAISE NOTICE '  SELECT * FROM preview_bank_backfill();';
  RAISE NOTICE '';
  RAISE NOTICE 'Para ejecutar backfill:';
  RAISE NOTICE '  SELECT * FROM backfill_employee_banks();';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTA: El backfill NO se ejecuta automáticamente.';
  RAISE NOTICE '      Ejecuta manualmente cuando estés listo.';
  RAISE NOTICE '==============================================';
END $$;

