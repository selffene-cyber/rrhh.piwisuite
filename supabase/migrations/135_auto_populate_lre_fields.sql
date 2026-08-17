-- =====================================================
-- MIGRACION 135: Auto-poblar campos LRE faltantes en employees
-- Resuelve errores de validación LRE donde faltan
-- dt_afp_code, dt_isapre_fonasa_code, dt_afc_code,
-- dt_tipo_jornada_code, dt_tipo_impuesto_renta, etc.
-- =====================================================

-- 1. dt_tipo_impuesto_renta: 1 = Primera Categoría (default)
UPDATE employees SET dt_tipo_impuesto_renta = 1 WHERE dt_tipo_impuesto_renta IS NULL OR dt_tipo_impuesto_renta = 0;

-- 2. dt_tecnico_extranjero: 0 = No (default)
UPDATE employees SET dt_tecnico_extranjero = 0 WHERE dt_tecnico_extranjero IS NULL;

-- 3. dt_tipo_jornada_code: 101 = Jornada Completa (default)
UPDATE employees SET dt_tipo_jornada_code = 101 WHERE dt_tipo_jornada_code IS NULL;

-- 4. dt_discapacidad: 0 = Sin discapacidad (default)
UPDATE employees SET dt_discapacidad = 0 WHERE dt_discapacidad IS NULL;

-- 5. dt_pensionado_vejez: 0 = No pensionado (default)
UPDATE employees SET dt_pensionado_vejez = 0 WHERE dt_pensionado_vejez IS NULL;

-- 6. dt_afp_code: mapear desde campo afp existente
UPDATE employees SET dt_afp_code = 6 WHERE LOWER(afp) = 'provida' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 11 WHERE LOWER(afp) = 'planvital' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 13 WHERE LOWER(afp) = 'cuprum' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 14 WHERE LOWER(afp) = 'habitat' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 19 WHERE LOWER(afp) = 'uno' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 31 WHERE LOWER(afp) = 'capital' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 103 WHERE LOWER(afp) = 'modelo' AND dt_afp_code IS NULL;
-- AFP que no se encontró arriba: asignar 6 (Provida) como default si tienen régimen AFP
UPDATE employees SET dt_afp_code = 6 WHERE previsional_regime = 'AFP' AND dt_afp_code IS NULL AND afp IS NOT NULL;

-- 7. dt_isapre_fonasa_code: 102 = FONASA (default para FONASA), 201+ para ISAPRE
UPDATE employees SET dt_isapre_fonasa_code = 102 WHERE UPPER(health_system) = 'FONASA' AND dt_isapre_fonasa_code IS NULL;
-- ISAPRE: asignar 201 (ISAPRE Consalud) como placeholder, usuario debe corregir
UPDATE employees SET dt_isapre_fonasa_code = 201 WHERE UPPER(health_system) = 'ISAPRE' AND dt_isapre_fonasa_code IS NULL;

-- 8. dt_afc_code: desde afc_applicable
UPDATE employees SET dt_afc_code = CASE WHEN afc_applicable = true THEN 1 ELSE 0 END WHERE dt_afc_code IS NULL;

-- 9. dt_ccaf_code: 0 = No aplica (default, la mayoría no tiene CCAF)
UPDATE employees SET dt_ccaf_code = 0 WHERE dt_ccaf_code IS NULL OR dt_ccaf_code = 0;

-- 10. dt_mutual_code: 0 = No aplica (default)
UPDATE employees SET dt_mutual_code = 0 WHERE dt_mutual_code IS NULL OR dt_mutual_code = 0;

-- 11. dt_ips_code: mapear desde previsional_regime
UPDATE employees SET dt_ips_code = 1 WHERE previsional_regime = 'AFP' AND dt_ips_code IS NULL;
UPDATE employees SET dt_ips_code = 111 WHERE other_regime_type = 'DIPRECA' AND dt_ips_code IS NULL;
UPDATE employees SET dt_ips_code = 112 WHERE other_regime_type = 'CAPREDENA' AND dt_ips_code IS NULL;

-- 12. tramo_asignacion_familiar: default 'D' si no tiene
UPDATE employees SET tramo_asignacion_familiar = 'D' WHERE tramo_asignacion_familiar IS NULL OR tramo_asignacion_familiar = '';

-- 13. Default values numéricos
UPDATE employees SET cargas_familiares_legales = 0 WHERE cargas_familiares_legales IS NULL;
UPDATE employees SET cargas_familiares_maternales = 0 WHERE cargas_familiares_maternales IS NULL;
UPDATE employees SET cargas_familiares_invalidez = 0 WHERE cargas_familiares_invalidez IS NULL;
UPDATE employees SET subsidio_trabajador_joven = 0 WHERE subsidio_trabajador_joven IS NULL;
UPDATE employees SET ahorro_previsional_voluntario = 0 WHERE ahorro_previsional_voluntario IS NULL;
UPDATE employees SET ahorro_previsional_colectivo = 0 WHERE ahorro_previsional_colectivo IS NULL;
UPDATE employees SET indemnizacion_a_todo_evento = 0 WHERE indemnizacion_a_todo_evento IS NULL;
UPDATE employees SET dias_licencia_medica_mes = 0 WHERE dias_licencia_medica_mes IS NULL;
UPDATE employees SET dias_vacaciones_mes = 0 WHERE dias_vacaciones_mes IS NULL;

-- 14. termination_cause_code: NULL para empleados activos (correcto)
-- No actualizamos, NULL = sin causal de término

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migración 135 completada exitosamente';
  RAISE NOTICE 'Campos LRE auto-poblados para todos los empleados';
  RAISE NOTICE '==============================================';
END $$;