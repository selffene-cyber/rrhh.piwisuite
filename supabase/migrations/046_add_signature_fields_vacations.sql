-- ============================================
-- MIGRACIÓN 046: Agregar campos de firma digital a vacations
-- ============================================
-- Agrega campos necesarios para el sistema de firma digital
-- en vacaciones
-- ============================================

-- Agregar campos de aprobación y firma digital
ALTER TABLE vacations
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES digital_signatures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_hash VARCHAR(64), -- SHA-256 hash del PDF firmado
  ADD COLUMN IF NOT EXISTS verification_code VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_data JSONB; -- Datos del QR code (URL, código, etc.)

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_vacations_signature_id ON vacations(signature_id);
CREATE INDEX IF NOT EXISTS idx_vacations_verification_code ON vacations(verification_code);
CREATE INDEX IF NOT EXISTS idx_vacations_approved_by ON vacations(approved_by);

-- Comentarios
COMMENT ON COLUMN vacations.approved_at IS 'Fecha y hora en que las vacaciones fueron aprobadas y firmadas';
COMMENT ON COLUMN vacations.approved_by IS 'Usuario que aprobó y firmó las vacaciones';
COMMENT ON COLUMN vacations.signature_id IS 'ID de la firma digital usada para firmar las vacaciones';
COMMENT ON COLUMN vacations.signed_pdf_url IS 'URL del PDF firmado almacenado en Storage de Supabase';
COMMENT ON COLUMN vacations.pdf_hash IS 'Hash SHA-256 del PDF firmado para verificación de integridad';
COMMENT ON COLUMN vacations.verification_code IS 'Código único para verificación pública del documento';
COMMENT ON COLUMN vacations.verification_url IS 'URL pública para verificar el documento';
COMMENT ON COLUMN vacations.qr_code_data IS 'Datos del QR code (JSON con código, URL, etc.)';







