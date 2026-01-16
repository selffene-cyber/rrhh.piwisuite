-- =====================================================
-- Migración 088: Backfill Opcional - Normalizar ubicaciones históricas
-- =====================================================
-- Propósito: Migrar region_name_legacy/city_name_legacy a IDs
-- NOTA: Esta migración es OPCIONAL y puede ejecutarse después de 087
-- =====================================================

-- IMPORTANTE:
-- Esta migración NO se ejecuta automáticamente en el push.
-- Debe ejecutarse manualmente cuando se decida normalizar los datos históricos.

-- =====================================================
-- Función de Backfill
-- =====================================================

CREATE OR REPLACE FUNCTION backfill_employee_locations()
RETURNS TABLE (
  employee_id UUID,
  old_region_name TEXT,
  old_city_name TEXT,
  new_region_id UUID,
  new_commune_id UUID,
  action TEXT
) AS $$
DECLARE
  emp RECORD;
  region_record RECORD;
  commune_record RECORD;
  found_region_id UUID;
  found_commune_id UUID;
BEGIN
  -- Iterar sobre empleados que tienen datos legacy pero no IDs
  FOR emp IN 
    SELECT id, region_name_legacy, city_name_legacy
    FROM employees 
    WHERE (region_id IS NULL OR commune_id IS NULL)
      AND (region_name_legacy IS NOT NULL OR city_name_legacy IS NOT NULL)
      AND (trim(coalesce(region_name_legacy, '')) != '' OR trim(coalesce(city_name_legacy, '')) != '')
  LOOP
    found_region_id := NULL;
    found_commune_id := NULL;
    
    -- 1. Buscar región por nombre (case-insensitive)
    IF emp.region_name_legacy IS NOT NULL AND trim(emp.region_name_legacy) != '' THEN
      SELECT id INTO region_record
      FROM geo_regions
      WHERE lower(name) = lower(trim(emp.region_name_legacy))
        AND active = true
      LIMIT 1;
      
      IF FOUND THEN
        found_region_id := region_record.id;
      END IF;
    END IF;
    
    -- 2. Buscar comuna por nombre (case-insensitive)
    IF emp.city_name_legacy IS NOT NULL AND trim(emp.city_name_legacy) != '' THEN
      -- Si encontramos región, buscar comuna dentro de esa región
      IF found_region_id IS NOT NULL THEN
        SELECT id INTO commune_record
        FROM geo_communes
        WHERE lower(name) = lower(trim(emp.city_name_legacy))
          AND region_id = found_region_id
          AND active = true
        LIMIT 1;
      ELSE
        -- Si no encontramos región, buscar comuna en cualquier región
        SELECT id, region_id INTO commune_record
        FROM geo_communes
        WHERE lower(name) = lower(trim(emp.city_name_legacy))
          AND active = true
        LIMIT 1;
        
        -- Si encontramos comuna, usar su región
        IF FOUND THEN
          found_region_id := commune_record.region_id;
        END IF;
      END IF;
      
      IF FOUND THEN
        found_commune_id := commune_record.id;
      END IF;
    END IF;
    
    -- 3. Actualizar empleado si se encontró al menos uno
    IF found_region_id IS NOT NULL OR found_commune_id IS NOT NULL THEN
      UPDATE employees
      SET 
        region_id = COALESCE(found_region_id, region_id),
        commune_id = COALESCE(found_commune_id, commune_id)
      WHERE id = emp.id;
      
      RETURN QUERY SELECT 
        emp.id, 
        emp.region_name_legacy, 
        emp.city_name_legacy,
        found_region_id, 
        found_commune_id,
        CASE 
          WHEN found_region_id IS NOT NULL AND found_commune_id IS NOT NULL THEN 'BOTH_MATCHED'
          WHEN found_region_id IS NOT NULL THEN 'REGION_MATCHED'
          WHEN found_commune_id IS NOT NULL THEN 'COMMUNE_MATCHED'
          ELSE 'NONE'
        END::TEXT;
    ELSE
      -- No se encontró match, reportar
      RETURN QUERY SELECT 
        emp.id, 
        emp.region_name_legacy, 
        emp.city_name_legacy,
        NULL::UUID, 
        NULL::UUID,
        'NO_MATCH'::TEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comentarios y documentación
-- =====================================================

COMMENT ON FUNCTION backfill_employee_locations() IS 
'Normaliza ubicaciones de empleados: migra region_name_legacy/city_name_legacy a IDs.
NO modifica los campos legacy (se mantienen como fallback).

Uso:
SELECT * FROM backfill_employee_locations();

Retorna:
- employee_id: ID del empleado actualizado
- old_region_name: Nombre original de la región (legacy)
- old_city_name: Nombre original de la ciudad/comuna (legacy)
- new_region_id: UUID de la región asignada
- new_commune_id: UUID de la comuna asignada
- action: "BOTH_MATCHED" | "REGION_MATCHED" | "COMMUNE_MATCHED" | "NO_MATCH"
';

-- =====================================================
-- Función auxiliar: Previsualizar sin ejecutar
-- =====================================================

CREATE OR REPLACE FUNCTION preview_location_backfill()
RETURNS TABLE (
  employee_count BIGINT,
  region_name TEXT,
  city_name TEXT,
  would_match_region BOOLEAN,
  would_match_commune BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as employee_count,
    trim(COALESCE(e.region_name_legacy, '-')) as region_name,
    trim(COALESCE(e.city_name_legacy, '-')) as city_name,
    EXISTS(
      SELECT 1 FROM geo_regions gr 
      WHERE lower(gr.name) = lower(trim(COALESCE(e.region_name_legacy, '')))
        AND gr.active = true
    ) as would_match_region,
    EXISTS(
      SELECT 1 FROM geo_communes gc 
      WHERE lower(gc.name) = lower(trim(COALESCE(e.city_name_legacy, '')))
        AND gc.active = true
    ) as would_match_commune
  FROM employees e
  WHERE (e.region_id IS NULL OR e.commune_id IS NULL)
    AND (e.region_name_legacy IS NOT NULL OR e.city_name_legacy IS NOT NULL)
    AND (trim(COALESCE(e.region_name_legacy, '')) != '' OR trim(COALESCE(e.city_name_legacy, '')) != '')
  GROUP BY trim(COALESCE(e.region_name_legacy, '-')), trim(COALESCE(e.city_name_legacy, '-'))
  ORDER BY employee_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION preview_location_backfill() IS 
'Previsualiza qué ubicaciones se normalizarían al ejecutar el backfill.
Muestra ubicaciones agrupadas con conteo de empleados.
NO modifica datos.

Uso:
SELECT * FROM preview_location_backfill();
';

-- =====================================================
-- Verificación post-migración
-- =====================================================

DO $$
DECLARE
  employees_need_backfill INTEGER;
  unique_regions INTEGER;
  unique_communes INTEGER;
BEGIN
  -- Contar empleados que necesitan normalización
  SELECT COUNT(*) INTO employees_need_backfill
  FROM employees 
  WHERE (region_id IS NULL OR commune_id IS NULL)
    AND (region_name_legacy IS NOT NULL OR city_name_legacy IS NOT NULL)
    AND (trim(COALESCE(region_name_legacy, '')) != '' OR trim(COALESCE(city_name_legacy, '')) != '');
  
  -- Contar regiones únicas que necesitan normalización
  SELECT COUNT(DISTINCT trim(region_name_legacy)) INTO unique_regions
  FROM employees 
  WHERE region_id IS NULL 
    AND region_name_legacy IS NOT NULL 
    AND trim(region_name_legacy) != '';
  
  -- Contar comunas únicas que necesitan normalización
  SELECT COUNT(DISTINCT trim(city_name_legacy)) INTO unique_communes
  FROM employees 
  WHERE commune_id IS NULL 
    AND city_name_legacy IS NOT NULL 
    AND trim(city_name_legacy) != '';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migración 088 completada (solo funciones)';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Empleados que necesitan normalización: %', employees_need_backfill;
  RAISE NOTICE 'Regiones únicas (legacy) sin normalizar: %', unique_regions;
  RAISE NOTICE 'Comunas únicas (legacy) sin normalizar: %', unique_communes;
  RAISE NOTICE '';
  RAISE NOTICE 'Para previsualizar backfill:';
  RAISE NOTICE '  SELECT * FROM preview_location_backfill();';
  RAISE NOTICE '';
  RAISE NOTICE 'Para ejecutar backfill:';
  RAISE NOTICE '  SELECT * FROM backfill_employee_locations();';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTA: El backfill NO se ejecuta automáticamente.';
  RAISE NOTICE '      Ejecuta manualmente cuando estés listo.';
  RAISE NOTICE '==============================================';
END $$;


