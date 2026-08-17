-- =====================================================
-- MIGRACION 131: Catálogos de validación LRE-DT
-- Crea las 15 tablas del Anexo N°2 del manual DT
-- para validación del Libro de Remuneraciones Electrónico
-- =====================================================

-- 1. Tabla N°1: Causales de término de contrato
CREATE TABLE IF NOT EXISTS lre_causales_termino (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  article TEXT NOT NULL,
  description TEXT,
  requires_end_date BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Agregar columna dt_code a geo_regions (Tabla N°2)
ALTER TABLE geo_regions ADD COLUMN IF NOT EXISTS dt_code SMALLINT;
COMMENT ON COLUMN geo_regions.dt_code IS 'Código DT de región (1-16) para LRE';

-- 3. Agregar columna dt_code a geo_communes (Tabla N°3)
ALTER TABLE geo_communes ADD COLUMN IF NOT EXISTS dt_code INTEGER;
COMMENT ON COLUMN geo_communes.dt_code IS 'Código DT de comuna (5 dígitos) para LRE';

-- 4. Tabla N°4: Tipo de impuesto a la renta
CREATE TABLE IF NOT EXISTS lre_tipo_impuesto_renta (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla N°5: Técnico extranjero exención cotizaciones (Ley 18.156)
CREATE TABLE IF NOT EXISTS lre_tecnico_extranjero (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla N°6: Código tipo de jornada
CREATE TABLE IF NOT EXISTS lre_tipo_jornada (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabla N°7: Discapacidad / pensionado invalidez
CREATE TABLE IF NOT EXISTS lre_discapacidad (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Tabla N°8: Pensionado por vejez
CREATE TABLE IF NOT EXISTS lre_pensionado_vejez (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Tabla N°9: AFP
CREATE TABLE IF NOT EXISTS lre_afp (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Tabla N°10: IPS Ex-INP (regímenes previsionales)
CREATE TABLE IF NOT EXISTS lre_ips_exinp (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Tabla N°11: Fonasa / Isapre
CREATE TABLE IF NOT EXISTS lre_isapre_fonasa (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('FONASA', 'ISAPRE')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Tabla N°12: AFC (Seguro de Cesantía)
CREATE TABLE IF NOT EXISTS lre_afc (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Tabla N°13: CCAF (Cajas de Compensación)
CREATE TABLE IF NOT EXISTS lre_ccaf (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Tabla N°14: Organismo administrador Ley 16.744
CREATE TABLE IF NOT EXISTS lre_mutual_ley16744 (
  id SMALLINT PRIMARY KEY,
  code SMALLINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Tabla N°15: Tramos de asignación familiar
CREATE TABLE IF NOT EXISTS lre_tramo_asignacion_familiar (
  id SMALLINT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('A', 'B', 'C', 'D', 'S')),
  label TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Tabla de mapeo de campos LRE (campo interno -> código DT)
CREATE TABLE IF NOT EXISTS lre_field_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_category TEXT NOT NULL,
  dt_code INTEGER NOT NULL,
  dt_concept TEXT NOT NULL,
  lre_category TEXT NOT NULL CHECK (lre_category IN (
    'identificacion',
    'haber_imp_trib',
    'haber_imp_no_trib',
    'haber_no_imp_no_trib',
    'haber_no_imp_trib',
    'descuento',
    'aporte_empleador',
    'total'
  )),
  dt_type TEXT NOT NULL CHECK (dt_type IN ('Int', 'Date', 'Tinyint', 'Float')),
  dt_max_size INTEGER NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(internal_category, dt_code)
);

CREATE INDEX IF NOT EXISTS lre_field_mapping_category_idx ON lre_field_mapping(internal_category);
CREATE INDEX IF NOT EXISTS lre_field_mapping_dt_code_idx ON lre_field_mapping(dt_code);
CREATE INDEX IF NOT EXISTS lre_field_mapping_lre_category_idx ON lre_field_mapping(lre_category);

-- 17. Tabla de log de exportaciones LRE
CREATE TABLE IF NOT EXISTS lre_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  payroll_book_id UUID NOT NULL REFERENCES payroll_books(id),
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT,
  file_size INTEGER,
  total_employees INTEGER NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'warnings', 'errors')),
  blocking_errors INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  validation_log JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lre_export_logs_company_idx ON lre_export_logs(company_id);
CREATE INDEX IF NOT EXISTS lre_export_logs_book_idx ON lre_export_logs(payroll_book_id);
CREATE INDEX IF NOT EXISTS lre_export_logs_period_idx ON lre_export_logs(period_year, period_month);
CREATE INDEX IF NOT EXISTS lre_export_logs_created_at_idx ON lre_export_logs(created_at DESC);

-- 18. RLS para tablas LRE
ALTER TABLE lre_causales_termino ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_tipo_impuesto_renta ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_tecnico_extranjero ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_tipo_jornada ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_discapacidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_pensionado_vejez ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_afp ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_ips_exinp ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_isapre_fonasa ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_afc ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_ccaf ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_mutual_ley16744 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_tramo_asignacion_familiar ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_field_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE lre_export_logs ENABLE ROW LEVEL SECURITY;

-- Policies: lectura pública para catálogos (todos los usuarios autenticados)
CREATE POLICY "lre_catalogs_select_all" ON lre_causales_termino FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_tipo_impuesto_renta FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_tecnico_extranjero FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_tipo_jornada FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_discapacidad FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_pensionado_vejez FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_afp FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_ips_exinp FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_isapre_fonasa FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_afc FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_ccaf FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_mutual_ley16744 FOR SELECT USING (true);
CREATE POLICY "lre_catalogs_select_all" ON lre_tramo_asignacion_familiar FOR SELECT USING (true);
CREATE POLICY "lre_field_mapping_select_all" ON lre_field_mapping FOR SELECT USING (true);

-- Policy: solo admins pueden modificar catálogos
CREATE POLICY "lre_catalogs_admin_all" ON lre_causales_termino FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_tipo_impuesto_renta FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_tipo_jornada FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_discapacidad FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_pensionado_vejez FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_afp FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_ips_exinp FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_isapre_fonasa FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_afc FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_ccaf FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_mutual_ley16744 FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_catalogs_admin_all" ON lre_tramo_asignacion_familiar FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "lre_field_mapping_admin_all" ON lre_field_mapping FOR ALL USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Export logs: admins de la empresa pueden leer/insertar
CREATE POLICY "lre_export_logs_select" ON lre_export_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND company_id = lre_export_logs.company_id)
);
CREATE POLICY "lre_export_logs_insert" ON lre_export_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migración 131 completada exitosamente';
  RAISE NOTICE 'Tablas LRE creadas:';
  RAISE NOTICE '  - lre_causales_termino (Tabla N°1)';
  RAISE NOTICE '  - geo_regions.dt_code (Tabla N°2)';
  RAISE NOTICE '  - geo_communes.dt_code (Tabla N°3)';
  RAISE NOTICE '  - lre_tipo_impuesto_renta (Tabla N°4)';
  RAISE NOTICE '  - lre_tecnico_extranjero (Tabla N°5)';
  RAISE NOTICE '  - lre_tipo_jornada (Tabla N°6)';
  RAISE NOTICE '  - lre_discapacidad (Tabla N°7)';
  RAISE NOTICE '  - lre_pensionado_vejez (Tabla N°8)';
  RAISE NOTICE '  - lre_afp (Tabla N°9)';
  RAISE NOTICE '  - lre_ips_exinp (Tabla N°10)';
  RAISE NOTICE '  - lre_isapre_fonasa (Tabla N°11)';
  RAISE NOTICE '  - lre_afc (Tabla N°12)';
  RAISE NOTICE '  - lre_ccaf (Tabla N°13)';
  RAISE NOTICE '  - lre_mutual_ley16744 (Tabla N°14)';
  RAISE NOTICE '  - lre_tramo_asignacion_familiar (Tabla N°15)';
  RAISE NOTICE '  - lre_field_mapping (mapeo conceptos)';
  RAISE NOTICE '  - lre_export_logs (log exportaciones)';
  RAISE NOTICE '==============================================';
END $$;