-- ==============================================================================
-- MIGRACION 125: Tabla payroll_employer_contributions y columnas en payroll_book_entries
-- Reforma Previsional 2026 - Fase 2
--
-- Tabla para almacenar cada aporte del empleador como fila separada.
-- Permite agregar nuevos conceptos (CRP, etc.) sin modificar la tabla.
--
-- Tambien agrega columnas en payroll_book_entries para CRP y AFP cuenta individual.
-- ==============================================================================

-- Tabla de aportes del empleador por liquidacion
CREATE TABLE IF NOT EXISTS payroll_employer_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_slip_id UUID REFERENCES payroll_slips(id) ON DELETE CASCADE,
  concept_code VARCHAR(50) NOT NULL,
  base_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  rate DECIMAL(8,6) NOT NULL DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  taxable_base_type VARCHAR(50) NOT NULL DEFAULT 'imponible_afp'
    CHECK (taxable_base_type IN (
      'imponible_afp', 'imponible_ips', 'imponible_seg_ces',
      'imponible_salud', 'imponible_general', 'sueldo_base'
    )),
  source VARCHAR(20) NOT NULL DEFAULT 'calculation'
    CHECK (source IN ('calculation', 'reliquidation', 'settlement', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employer_contrib_slip ON payroll_employer_contributions(payroll_slip_id);
CREATE INDEX IF NOT EXISTS idx_employer_contrib_concept ON payroll_employer_contributions(concept_code);

COMMENT ON TABLE payroll_employer_contributions IS 'Aportes del empleador por liquidacion. Conceptos: AFP_CUENTA_INDIVIDUAL, SIS, CRP, AFC, etc.';
COMMENT ON COLUMN payroll_employer_contributions.concept_code IS 'Codigo del concepto previsional (AFP_CUENTA_INDIVIDUAL, SIS, CRP, AFC_EMPLEADOR_INDEFINIDO, etc.)';
COMMENT ON COLUMN payroll_employer_contributions.base_amount IS 'Base imponible utilizada para el calculo';
COMMENT ON COLUMN payroll_employer_contributions.rate IS 'Tasa aplicada (porcentaje)';
COMMENT ON COLUMN payroll_employer_contributions.amount IS 'Monto resultante del calculo';
COMMENT ON COLUMN payroll_employer_contributions.taxable_base_type IS 'Tipo de base imponible utilizada';
COMMENT ON COLUMN payroll_employer_contributions.source IS 'Origen del calculo: calculation, reliquidation, settlement, manual';

-- Agregar columnas nuevas en payroll_book_entries
ALTER TABLE payroll_book_entries
  ADD COLUMN IF NOT EXISTS employer_rentabilidad_protegida DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_afp_account DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN payroll_book_entries.employer_rentabilidad_protegida IS 'Aporte empleador CRP (Cotizacion de Rentabilidad Protegida 0,90%). Vigente desde agosto 2026.';
COMMENT ON COLUMN payroll_book_entries.employer_afp_account IS 'Aporte empleador AFP cuenta individual (0,10%). Vigente desde agosto 2025.';

-- ==============================================================================
-- MIGRACION 125b: Tabla prevision_audit
-- Registro de auditoria: cada tasa utilizada se registra con fuente, vigencia, valor API, hash.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS prevision_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_code VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  rate_used DECIMAL(8,6) NOT NULL,
  rate_from_table DECIMAL(8,6),
  api_value DECIMAL(8,6),
  is_consistent BOOLEAN,
  source VARCHAR(50) NOT NULL DEFAULT 'internal_validated'
    CHECK (source IN ('previred_api', 'internal_validated', 'manual_entry', 'sii_scraper')),
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  indicators_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prevision_audit_concept ON prevision_audit(concept_code, year, month);
CREATE INDEX IF NOT EXISTS idx_prevision_audit_date ON prevision_audit(year, month);

COMMENT ON TABLE prevision_audit IS 'Registro de auditoria de tasas previsionales utilizadas en cada calculo.';
COMMENT ON COLUMN prevision_audit.rate_used IS 'Tasa utilizada en el calculo (de prevision_rates)';
COMMENT ON COLUMN prevision_audit.rate_from_table IS 'Tasa de la tabla prevision_rates';
COMMENT ON COLUMN prevision_audit.api_value IS 'Valor obtenido de la API de Previred (si disponible)';
COMMENT ON COLUMN prevision_audit.is_consistent IS 'true si API y tabla coinciden, false si difieren, null si no hay dato API';
COMMENT ON COLUMN prevision_audit.indicators_hash IS 'Hash SHA-256 del JSON de indicadores recibido de la API';