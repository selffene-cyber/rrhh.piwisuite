-- =====================================================
-- MIGRACION 133: Campos LRE en employees + tabla employee_sindicatos
-- Agrega los campos de identificación del trabajador
-- requeridos por el Libro de Remuneraciones Electrónico (DT)
-- =====================================================

DO $$
BEGIN
  -- Causal de término de contrato (Tabla N°1)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'termination_cause_code') THEN
    ALTER TABLE employees ADD COLUMN termination_cause_code SMALLINT;
    COMMENT ON COLUMN employees.termination_cause_code IS 'Código DT de causal de término (Tabla N°1 LRE)';
  END IF;

  -- Tipo de impuesto a la renta (Tabla N°4)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_tipo_impuesto_renta') THEN
    ALTER TABLE employees ADD COLUMN dt_tipo_impuesto_renta SMALLINT NOT NULL DEFAULT 1;
    COMMENT ON COLUMN employees.dt_tipo_impuesto_renta IS 'Tipo impuesto renta DT (1=2ª Cat, 2=Único Obrero Agrícola, 3=Adicional)';
  END IF;

  -- Técnico extranjero exención cotizaciones (Tabla N°5)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_tecnico_extranjero') THEN
    ALTER TABLE employees ADD COLUMN dt_tecnico_extranjero SMALLINT NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employees.dt_tecnico_extranjero IS 'Técnico extranjero exención Ley 18.156 (0=No, 1=Sí)';
  END IF;

  -- Código tipo de jornada (Tabla N°6)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_tipo_jornada_code') THEN
    ALTER TABLE employees ADD COLUMN dt_tipo_jornada_code SMALLINT;
    COMMENT ON COLUMN employees.dt_tipo_jornada_code IS 'Código DT tipo de jornada (Tabla N°6 LRE)';
  END IF;

  -- Persona con discapacidad / pensionado invalidez (Tabla N°7)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_discapacidad') THEN
    ALTER TABLE employees ADD COLUMN dt_discapacidad SMALLINT NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employees.dt_discapacidad IS 'Discapacidad/pensionado invalidez DT (0=Sin, 1=Discapacidad, 2=Pensionado invalidez, 3=Ambos)';
  END IF;

  -- Pensionado por vejez (Tabla N°8)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_pensionado_vejez') THEN
    ALTER TABLE employees ADD COLUMN dt_pensionado_vejez SMALLINT NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employees.dt_pensionado_vejez IS 'Pensionado por vejez DT (0=No, 1=Sí)';
  END IF;

  -- AFP código DT (Tabla N°9)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_afp_code') THEN
    ALTER TABLE employees ADD COLUMN dt_afp_code SMALLINT;
    COMMENT ON COLUMN employees.dt_afp_code IS 'Código DT de AFP (Tabla N°9 LRE). Mapeado desde campo afp';
  END IF;

  -- IPS Ex-INP código DT (Tabla N°10)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_ips_code') THEN
    ALTER TABLE employees ADD COLUMN dt_ips_code SMALLINT;
    COMMENT ON COLUMN employees.dt_ips_code IS 'Código DT de IPS Ex-INP (Tabla N°10 LRE). Para regímenes especiales';
  END IF;

  -- Fonasa/Isapre código DT (Tabla N°11)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_isapre_fonasa_code') THEN
    ALTER TABLE employees ADD COLUMN dt_isapre_fonasa_code SMALLINT;
    COMMENT ON COLUMN employees.dt_isapre_fonasa_code IS 'Código DT de Fonasa/Isapre (Tabla N°11 LRE)';
  END IF;

  -- AFC (Tabla N°12) - ya existe afc_applicable como boolean, pero LRE usa 0/1
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_afc_code') THEN
    ALTER TABLE employees ADD COLUMN dt_afc_code SMALLINT;
    COMMENT ON COLUMN employees.dt_afc_code IS 'Código DT AFC (0=No afiliado, 1=Afiliado). Derivado de afc_applicable';
  END IF;

  -- CCAF código DT (Tabla N°13)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_ccaf_code') THEN
    ALTER TABLE employees ADD COLUMN dt_ccaf_code SMALLINT NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employees.dt_ccaf_code IS 'Código DT de CCAF (0=Sin CCAF, 1=Los Andes, 2=La Araucana, 3=Los Héroes, 4=18 de Septiembre)';
  END IF;

  -- Organismo administrador Ley 16.744 (Tabla N°14)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dt_mutual_code') THEN
    ALTER TABLE employees ADD COLUMN dt_mutual_code SMALLINT NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employees.dt_mutual_code IS 'Código DT org. administrador Ley 16.744 (0=Sin mutual, 1=ACHS, 2=Mutual CCHC, 3=IST)';
  END IF;

  -- Cargas familiares legales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cargas_familiares_legales') THEN
    ALTER TABLE employees ADD COLUMN cargas_familiares_legales SMALLINT DEFAULT 0;
    COMMENT ON COLUMN employees.cargas_familiares_legales IS 'N° de cargas familiares legales autorizadas';
  END IF;

  -- Cargas familiares maternales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cargas_familiares_maternales') THEN
    ALTER TABLE employees ADD COLUMN cargas_familiares_maternales SMALLINT DEFAULT 0;
    COMMENT ON COLUMN employees.cargas_familiares_maternales IS 'N° de cargas familiares maternales';
  END IF;

  -- Cargas familiares invalidez
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cargas_familiares_invalidez') THEN
    ALTER TABLE employees ADD COLUMN cargas_familiares_invalidez SMALLINT DEFAULT 0;
    COMMENT ON COLUMN employees.cargas_familiares_invalidez IS 'N° de cargas familiares por invalidez';
  END IF;

  -- Tramo asignación familiar
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tramo_asignacion_familiar') THEN
    ALTER TABLE employees ADD COLUMN tramo_asignacion_familiar CHAR(1) DEFAULT 'D';
    COMMENT ON COLUMN employees.tramo_asignacion_familiar IS 'Tramo de asignación familiar (A, B, C, D, S)';
  END IF;

  -- Subsidio trabajador joven
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'subsidio_trabajador_joven') THEN
    ALTER TABLE employees ADD COLUMN subsidio_trabajador_joven SMALLINT NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employees.subsidio_trabajador_joven IS 'Subsidio trabajador joven (0=No, 1=Sí)';
  END IF;

  -- Puesto trabajo pesado
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'puesto_trabajo_pesado') THEN
    ALTER TABLE employees ADD COLUMN puesto_trabajo_pesado TEXT;
    COMMENT ON COLUMN employees.puesto_trabajo_pesado IS 'Nombre del puesto de trabajo pesado (vacío si no aplica)';
  END IF;

  -- Ahorro previsional voluntario individual
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'ahorro_previsional_voluntario') THEN
    ALTER TABLE employees ADD COLUMN ahorro_previsional_voluntario SMALLINT NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employees.ahorro_previsional_voluntario IS 'APV individual (0=No, 1=Sí)';
  END IF;

  -- Ahorro previsional voluntario colectivo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'ahorro_previsional_colectivo') THEN
    ALTER TABLE employees ADD COLUMN ahorro_previsional_colectivo SMALLINT NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employees.ahorro_previsional_colectivo IS 'APV colectivo (0=No, 1=Sí)';
  END IF;

  -- Indemnización a todo evento (Art. 164)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'indemnizacion_a_todo_evento') THEN
    ALTER TABLE employees ADD COLUMN indemnizacion_a_todo_evento SMALLINT NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employees.indemnizacion_a_todo_evento IS 'Indemnización a todo evento Art.164 (0=No, 1=Sí)';
  END IF;

  -- Tasa indemnización a todo evento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'tasa_indemnizacion') THEN
    ALTER TABLE employees ADD COLUMN tasa_indemnizacion DECIMAL(5,2);
    COMMENT ON COLUMN employees.tasa_indemnizacion IS 'Tasa indemnización a todo evento (mínimo 4.11%)';
  END IF;

  -- Días vacaciones en el mes (para LRE)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dias_vacaciones_mes') THEN
    ALTER TABLE employees ADD COLUMN dias_vacaciones_mes SMALLINT DEFAULT 0;
    COMMENT ON COLUMN employees.dias_vacaciones_mes IS 'N° días de vacaciones en el mes (campo LRE 1117)';
  END IF;

  -- Días licencia médica en el mes (para LRE)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dias_licencia_medica_mes') THEN
    ALTER TABLE employees ADD COLUMN dias_licencia_medica_mes SMALLINT DEFAULT 0;
    COMMENT ON COLUMN employees.dias_licencia_medica_mes IS 'N° días licencia médica en el mes (campo LRE 1116)';
  END IF;

END $$;

-- =====================================================
-- Tabla de RUTs de organizaciones sindicales por trabajador
-- (campos 1171-1180 del LRE)
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_sindicatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  sindicato_order SMALLINT NOT NULL CHECK (sindicato_order BETWEEN 1 AND 10),
  rut_sindicato TEXT NOT NULL,
  nombre_sindicato TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, sindicato_order)
);

CREATE INDEX IF NOT EXISTS employee_sindicatos_employee_idx ON employee_sindicatos(employee_id);

COMMENT ON TABLE employee_sindicatos IS 'Organizaciones sindicales del trabajador para LRE (campos 1171-1180)';
COMMENT ON COLUMN employee_sindicatos.sindicato_order IS 'Orden del sindicato (1-10, correspondiente a códigos LRE 1171-1180)';
COMMENT ON COLUMN employee_sindicatos.rut_sindicato IS 'RUT de la organización sindical (sin puntos, con guion)';

-- RLS para employee_sindicatos
ALTER TABLE employee_sindicatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_sindicatos_select" ON employee_sindicatos FOR SELECT USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND company_id = (SELECT company_id FROM employees WHERE id = employee_sindicatos.employee_id))
  OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'super_admin')
);

CREATE POLICY "employee_sindicatos_insert" ON employee_sindicatos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND company_id = (SELECT company_id FROM employees WHERE id = employee_sindicatos.employee_id))
  OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'super_admin')
);

CREATE POLICY "employee_sindicatos_update" ON employee_sindicatos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND company_id = (SELECT company_id FROM employees WHERE id = employee_sindicatos.employee_id))
  OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'super_admin')
);

CREATE POLICY "employee_sindicatos_delete" ON employee_sindicatos FOR DELETE USING (
  EXISTS (SELECT 1 FROM company_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND company_id = (SELECT company_id FROM employees WHERE id = employee_sindicatos.employee_id))
  OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'super_admin')
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_employee_sindicatos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employee_sindicatos_updated_at_trigger ON employee_sindicatos;
CREATE TRIGGER employee_sindicatos_updated_at_trigger
  BEFORE UPDATE ON employee_sindicatos
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_sindicatos_updated_at();

-- Migración de datos existentes: autopoblar dt_afc_code desde afc_applicable
UPDATE employees SET dt_afc_code = CASE WHEN afc_applicable = true THEN 1 ELSE 0 END
WHERE dt_afc_code IS NULL;

-- Migración de datos existentes: autopoblar dt_tipo_jornada_code desde contract_type
-- Nota: esto es un default, el usuario debería confirmarlo
UPDATE employees SET dt_tipo_jornada_code = 101
WHERE dt_tipo_jornada_code IS NULL;

-- Migración: intentar mapear dt_afp_code desde el campo afp existente
UPDATE employees SET dt_afp_code = 6 WHERE LOWER(afp) = 'provida' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 11 WHERE LOWER(afp) = 'planvital' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 13 WHERE LOWER(afp) = 'cuprum' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 14 WHERE LOWER(afp) = 'habitat' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 19 WHERE LOWER(afp) = 'uno' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 31 WHERE LOWER(afp) = 'capital' AND dt_afp_code IS NULL;
UPDATE employees SET dt_afp_code = 103 WHERE LOWER(afp) = 'modelo' AND dt_afp_code IS NULL;

-- Migración: intentar mapear dt_isapre_fonasa_code desde health_system
UPDATE employees SET dt_isapre_fonasa_code = 102 WHERE UPPER(health_system) = 'FONASA' AND dt_isapre_fonasa_code IS NULL;

-- Migración: mapear dt_ips_code desde previsional_regime
UPDATE employees SET dt_ips_code = 1 WHERE previsional_regime = 'AFP' AND dt_ips_code IS NULL;
UPDATE employees SET dt_ips_code = 111 WHERE other_regime_type = 'DIPRECA' AND dt_ips_code IS NULL;
UPDATE employees SET dt_ips_code = 112 WHERE other_regime_type = 'CAPREDENA' AND dt_ips_code IS NULL;

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migración 133 completada exitosamente';
  RAISE NOTICE 'Campos LRE agregados a employees:';
  RAISE NOTICE '  - termination_cause_code (1104)';
  RAISE NOTICE '  - dt_tipo_impuesto_renta (1170)';
  RAISE NOTICE '  - dt_tecnico_extranjero (1146)';
  RAISE NOTICE '  - dt_tipo_jornada_code (1107)';
  RAISE NOTICE '  - dt_discapacidad (1108)';
  RAISE NOTICE '  - dt_pensionado_vejez (1109)';
  RAISE NOTICE '  - dt_afp_code (1141)';
  RAISE NOTICE '  - dt_ips_code (1142)';
  RAISE NOTICE '  - dt_isapre_fonasa_code (1143)';
  RAISE NOTICE '  - dt_afc_code (1151)';
  RAISE NOTICE '  - dt_ccaf_code (1110)';
  RAISE NOTICE '  - dt_mutual_code (1152)';
  RAISE NOTICE '  - cargas_familiares_legales (1111)';
  RAISE NOTICE '  - cargas_familiares_maternales (1112)';
  RAISE NOTICE '  - cargas_familiares_invalidez (1113)';
  RAISE NOTICE '  - tramo_asignacion_familiar (1114)';
  RAISE NOTICE '  - subsidio_trabajador_joven (1118)';
  RAISE NOTICE '  - puesto_trabajo_pesado (1154)';
  RAISE NOTICE '  - ahorro_previsional_voluntario (1155)';
  RAISE NOTICE '  - ahorro_previsional_colectivo (1157)';
  RAISE NOTICE '  - indemnizacion_a_todo_evento (1131)';
  RAISE NOTICE '  - tasa_indemnizacion (1132)';
  RAISE NOTICE '  - dias_vacaciones_mes (1117)';
  RAISE NOTICE '  - dias_licencia_medica_mes (1116)';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabla creada:';
  RAISE NOTICE '  - employee_sindicatos (RUTs sindicales 1171-1180)';
  RAISE NOTICE '';
  RAISE NOTICE 'Migración de datos existentes:';
  RAISE NOTICE '  - dt_afc_code poblado desde afc_applicable';
  RAISE NOTICE '  - dt_tipo_jornada_code default=101';
  RAISE NOTICE '  - dt_afp_code mapeado desde campo afp';
  RAISE NOTICE '  - dt_isapre_fonasa_code mapeado desde health_system';
  RAISE NOTICE '  - dt_ips_code mapeado desde previsional_regime';
  RAISE NOTICE '==============================================';
END $$;