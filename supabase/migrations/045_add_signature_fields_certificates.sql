-- ============================================
-- MIGRACIÓN 045: Agregar campos de firma digital a certificates
-- ============================================
-- Agrega campos necesarios para el sistema de firma digital
-- en certificados (solo para certificados, NO para contratos ni finiquitos)
-- ============================================

-- Agregar campos de aprobación y firma digital
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES digital_signatures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_hash VARCHAR(64), -- SHA-256 hash del PDF firmado
  ADD COLUMN IF NOT EXISTS verification_code VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_data JSONB; -- Datos del QR code (URL, código, etc.)

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_certificates_signature_id ON certificates(signature_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_approved_by ON certificates(approved_by);

-- Comentarios
COMMENT ON COLUMN certificates.approved_at IS 'Fecha y hora en que el certificado fue aprobado y firmado';
COMMENT ON COLUMN certificates.approved_by IS 'Usuario que aprobó y firmó el certificado';
COMMENT ON COLUMN certificates.signature_id IS 'ID de la firma digital usada para firmar el certificado';
COMMENT ON COLUMN certificates.signed_pdf_url IS 'URL del PDF firmado almacenado en Storage de Supabase';
COMMENT ON COLUMN certificates.pdf_hash IS 'Hash SHA-256 del PDF firmado para verificación de integridad';
COMMENT ON COLUMN certificates.verification_code IS 'Código único para verificación pública del documento';
COMMENT ON COLUMN certificates.verification_url IS 'URL pública para verificar el documento';
COMMENT ON COLUMN certificates.qr_code_data IS 'Datos del QR code (JSON con código, URL, etc.)';







