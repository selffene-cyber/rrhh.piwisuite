-- ============================================
-- MIGRACIÓN 075: Agregar campo metadata a contract_annexes
-- ============================================
-- Campo JSONB para almacenar conceptValues y otros metadatos
-- necesarios para la actualización automática de contratos y empleados
-- ============================================

ALTER TABLE contract_annexes
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Índice GIN para búsquedas eficientes en metadata
CREATE INDEX IF NOT EXISTS idx_contract_annexes_metadata ON contract_annexes USING GIN(metadata);

-- Comentario
COMMENT ON COLUMN contract_annexes.metadata IS 'Metadatos del anexo: conceptValues, selected_concepts, etc. para actualización automática de contratos y empleados';

