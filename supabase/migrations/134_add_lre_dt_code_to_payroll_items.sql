-- =====================================================
-- MIGRACION 134: Agregar campo lre_dt_code a payroll_items
-- Permite mapeo granular de cada ítem a su código DT
-- =====================================================

ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS lre_dt_code INTEGER;

COMMENT ON COLUMN payroll_items.lre_dt_code IS 'Código DT del Libro de Remuneraciones Electrónico. Mapea este ítem a su concepto en el Anexo N°1 de la DT. Si es NULL, se usa el mapeo automático por categoría.';

-- Índice para búsquedas por código DT
CREATE INDEX IF NOT EXISTS payroll_items_lre_dt_code_idx ON payroll_items(lre_dt_code) WHERE lre_dt_code IS NOT NULL;

-- Mapeo retroactivo de ítems existentes según su categoría
UPDATE payroll_items SET lre_dt_code = 2101 WHERE category = 'sueldo_base' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2106 WHERE category = 'gratificacion' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2106 WHERE category = 'monthly_gratification' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2111 WHERE category = 'bonos' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2111 WHERE category = 'bono' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2111 WHERE category = 'bonos_fijos' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2113 WHERE category = 'bonos_variables' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2102 WHERE category = 'horas_extras' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2102 WHERE category = 'sobresueldo' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2104 WHERE category = 'semana_corrida' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2108 WHERE category = 'vacaciones' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2108 WHERE category = 'vacation_paid' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2123 WHERE category = 'otros_imponibles' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2123 WHERE category = 'other_taxable_earnings' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2110 WHERE category = 'aguinaldo' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2302 WHERE category = 'movilizacion' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2302 WHERE category = 'transportation' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2301 WHERE category = 'colacion' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2301 WHERE category = 'meal_allowance' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3141 WHERE category = 'afp' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3143 WHERE category = 'salud' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3143 WHERE category = 'health' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3151 WHERE category = 'cesantia' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3161 WHERE category = 'impuesto_unico' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3188 WHERE category = 'prestamos' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3188 WHERE category = 'anticipos' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3188 WHERE category = 'anticipo' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3188 WHERE category = 'prestamo' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3185 WHERE category = 'permission_discount' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 3183 WHERE category = 'otros_descuentos' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2204 WHERE category = 'otros_no_imponibles' AND lre_dt_code IS NULL;
UPDATE payroll_items SET lre_dt_code = 2204 WHERE category = 'other_non_taxable_earnings' AND lre_dt_code IS NULL;

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migración 134 completada exitosamente';
  RAISE NOTICE 'Campo lre_dt_code agregado a payroll_items';
  RAISE NOTICE 'Ítems existentes mapeados retroactivamente a códigos DT';
  RAISE NOTICE '==============================================';
END $$;