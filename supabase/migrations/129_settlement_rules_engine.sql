-- ============================================
-- MIGRACION 129: Motor de Reglas de Finiquitos
-- Agrega causales detalladas (art.160 N°1-7),
-- campos de vacaciones proporcionales, indemnizacion voluntaria,
-- clausulas legales, y auditoria del motor de reglas
-- ============================================

-- 1. Actualizar settlement_causes: agregar campos para el motor de reglas
ALTER TABLE settlement_causes ADD COLUMN IF NOT EXISTS rule_config JSONB;
COMMENT ON COLUMN settlement_causes.rule_config IS 'Configuracion del motor de reglas para esta causal ( SettlementtlementRuleConfig serializada)';

-- 2. Agregar nuevas causales detalladas (art.160 N°1 al N°7)
-- Primero eliminamos la entrada generica art.160 y la reemplazamos por las especificas

-- Insertar causales detalladas del art.160
INSERT INTO settlement_causes (code, label, article, has_ias, has_iap, description, rule_config) VALUES
  ('160_1', 'Falta de probidad, conductas indebidas o acoso', 'art.160 N°1', false, false,
   'Alguna de las faltas de probidad, vias de hecho, injurias o conductas indebidas senaladas en el art.160 N°1',
   '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'),
  ('160_2', 'Negociaciones prohibidas', 'art.160 N°2', false, false,
   'Negociaciones que ejecute el trabajador dentro del giro del negocio y que esten prohibidas por el contrato',
   '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'),
  ('160_3', 'No concurrencia a trabajar (ausentismo)', 'art.160 N°3', false, false,
   'No concurrencia del trabajador a sus labores sin causa justificada durante 2 dias lunes y jueves o 3 dias en periodo mensual',
   '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'),
  ('160_4', 'Vicio del trabajo o embriaguez', 'art.160 N°4', false, false,
   'Vicio del trabajo, ebriedad habitual o consumo de drogas en el lugar de trabajo',
   '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'),
  ('160_5', 'Dano patrimonial al empleador', 'art.160 N°5', false, false,
   'Dano, perjuicio o deterioro de bienes del empleador por negligencia dolo o culpa del trabajador',
   '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'),
  ('160_6', 'Abandono del trabajo', 'art.160 N°6', false, false,
   'Abandono del trabajo por parte del trabajador (salida intempestiva, negativa a trabajar sin causa justificada)',
   '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'),
  ('160_7', 'Incumplimiento grave de obligaciones contractuales', 'art.160 N°7', false, false,
   'Incumplimiento grave de las obligaciones que impone el contrato de trabajo',
   '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  article = EXCLUDED.article,
  has_ias = EXCLUDED.has_ias,
  has_iap = EXCLUDED.has_iap,
  description = EXCLUDED.description,
  rule_config = EXCLUDED.rule_config;

-- Actualizar causales existentes con rule_config
UPDATE settlement_causes SET rule_config = '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'::jsonb
WHERE code IN ('159_1', '159_2', '159_3', '159_4', '159_5', '159_6');

UPDATE settlement_causes SET rule_config = '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'::jsonb
WHERE code = '160';

UPDATE settlement_causes SET rule_config = '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":true,"pagaIAP":true,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":true,"avisoPrevioDiasMinimos":30,"iasTopeAnios":11}'::jsonb
WHERE code = '161_1';

UPDATE settlement_causes SET rule_config = '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":true,"pagaIAP":true,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":false,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":true,"avisoPrevioDiasMinimos":30,"iasTopeAnios":11}'::jsonb
WHERE code = '161_2';

UPDATE settlement_causes SET rule_config = '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":true,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":true,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":11}'::jsonb
WHERE code = '163bis';

-- Causales especiales para art.159 N°3 (muerte) y N°4/N°5 (plazo fijo/obra) con descuentos diferentes
UPDATE settlement_causes SET rule_config = '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":false,"descuentaPrevision":false,"descuentaSalud":false,"descuentaAFC":false,"descuentaImpuestoUnico":false,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'::jsonb
WHERE code = '159_3';

UPDATE settlement_causes SET rule_config = '{"pagaDiasTrabajados":true,"pagaSaldoSueldo":true,"pagaGratificacionProporcional":true,"pagaBonosProporcionales":true,"pagaMovilizacion":true,"pagaColacion":true,"pagaSemanaCorrida":true,"pagaVacacionesPendientes":true,"pagaVacacionesProporcionales":true,"pagaFeriadoProgresivo":true,"pagaIAS":false,"pagaIAP":false,"permiteIndemnizacionVoluntaria":true,"descuentaPrevision":true,"descuentaSalud":true,"descuentaAFC":false,"descuentaImpuestoUnico":true,"descuentaPrestamos":true,"descuentaAnticipos":true,"descuentaHaberesPendientes":true,"requiereAvisoPrevio":false,"avisoPrevioDiasMinimos":0,"iasTopeAnios":0}'::jsonb
WHERE code IN ('159_4', '159_5');

-- 3. Agregar nuevos campos a la tabla settlements

-- Vacaciones proporcionales
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS vacation_days_proportional NUMERIC(10, 2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN settlements.vacation_days_proportional IS 'Dias de vacaciones proporcionales devengados (art.68 CT)';

ALTER TABLE settlements ADD COLUMN IF NOT EXISTS vacation_proportional_payout DECIMAL(12, 2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN settlements.vacation_proportional_payout IS 'Monto de pago de vacaciones proporcionales (art.68 CT)';

-- Feriado progresivo
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS feriado_progresivo_days NUMERIC(10, 2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN settlements.feriado_progresivo_days IS 'Dias de feriado progresivo (art.68 CT, trabajador con mas de 10 anos)';

ALTER TABLE settlements ADD COLUMN IF NOT EXISTS feriado_progresivo_payout DECIMAL(12, 2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN settlements.feriado_progresivo_payout IS 'Monto de pago de feriado progresivo';

-- Semana corrida proporcional
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS semana_corrida_payout DECIMAL(12, 2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN settlements.semana_corrida_payout IS 'Pago proporcional de semana corrida para trabajadores con remuneracion variable (art.45 CT)';

-- Indemnizacion voluntaria (ex gratia)
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS voluntary_indemnity DECIMAL(12, 2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN settlements.voluntary_indemnity IS 'Indemnizacion voluntaria (ex gratia) acordada por la empresa';

-- Clausulas legales del finiquito (generadas automaticamente por el motor de reglas)
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS legal_clauses JSONB;
COMMENT ON COLUMN settlements.legal_clauses IS 'Clausulas legales del finiquito generadas automaticamente por el motor de reglas';

-- Regla de causal usada en el calculo (snapshot del motor de reglas)
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS rule_evaluation JSONB;
COMMENT ON COLUMN settlements.rule_evaluation IS 'Resultado de la evaluacion del motor de reglas al calcular el finiquito (audit trail)';

-- Evaluacion del motor de reglas (que conceptos aplican y cuales no)
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS rule_config_snapshot JSONB;
COMMENT ON COLUMN settlements.rule_config_snapshot IS 'Snapshot de la configuracion de la causal usada al calcular el finiquito';

-- 4. Actualizar settlement_items para incluir nuevos tipos
ALTER TABLE settlement_items DROP CONSTRAINT IF EXISTS settlement_items_type_check;
ALTER TABLE settlement_items ADD CONSTRAINT settlement_items_type_check
  CHECK (type IN ('earning', 'deduction', 'employer_contribution'));

ALTER TABLE settlement_items DROP CONSTRAINT IF EXISTS settlement_items_category_check;

-- 5. Crear tabla de auditoria del motor de reglas
CREATE TABLE IF NOT EXISTS settlement_rule_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE,
  cause_code VARCHAR(20) NOT NULL,
  rule_config_snapshot JSONB NOT NULL,
  evaluation_result JSONB NOT NULL,
  warnings JSONB DEFAULT '[]'::jsonb,
  blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  evaluated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_rule_audit_settlement ON settlement_rule_audit(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_rule_audit_cause ON settlement_rule_audit(cause_code);

COMMENT ON TABLE settlement_rule_audit IS 'Auditoria del motor de reglas de finiquitos: registra cada decision tomada por causal';

-- 6. RLS para settlement_rule_audit
ALTER TABLE settlement_rule_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settlement rule audit for their company"
  ON settlement_rule_audit FOR SELECT
  USING (
    settlement_id IN (
      SELECT s.id FROM settlements s
      INNER JOIN employees e ON s.employee_id = e.id
      WHERE e.company_id IN (
        SELECT cu.company_id FROM company_users cu WHERE cu.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can insert settlement rule audit"
  ON settlement_rule_audit FOR INSERT
  WITH CHECK (
    settlement_id IN (
      SELECT s.id FROM settlements s
      INNER JOIN employees e ON s.employee_id = e.id
      WHERE e.company_id IN (
        SELECT cu.company_id FROM company_users cu WHERE cu.user_id = auth.uid()
      )
    )
  );