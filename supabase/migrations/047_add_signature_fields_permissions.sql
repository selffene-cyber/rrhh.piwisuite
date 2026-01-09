-- ============================================
-- MIGRACIÓN 047: Agregar campos de firma digital a permissions
-- ============================================
-- Agrega campos necesarios para el sistema de firma digital
-- en permisos
-- ============================================

-- Agregar campos de aprobación y firma digital
ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES digital_signatures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_hash VARCHAR(64), -- SHA-256 hash del PDF firmado
  ADD COLUMN IF NOT EXISTS verification_code VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_data JSONB; -- Datos del QR code (URL, código, etc.)

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_permissions_signature_id ON permissions(signature_id);
CREATE INDEX IF NOT EXISTS idx_permissions_verification_code ON permissions(verification_code);
CREATE INDEX IF NOT EXISTS idx_permissions_approved_by ON permissions(approved_by);

-- Comentarios
COMMENT ON COLUMN permissions.approved_at IS 'Fecha y hora en que el permiso fue aprobado y firmado';
COMMENT ON COLUMN permissions.approved_by IS 'Usuario que aprobó y firmó el permiso';
COMMENT ON COLUMN permissions.signature_id IS 'ID de la firma digital usada para firmar el permiso';
COMMENT ON COLUMN permissions.signed_pdf_url IS 'URL del PDF firmado almacenado en Storage de Supabase';
COMMENT ON COLUMN permissions.pdf_hash IS 'Hash SHA-256 del PDF firmado para verificación de integridad';
COMMENT ON COLUMN permissions.verification_code IS 'Código único para verificación pública del documento';
COMMENT ON COLUMN permissions.verification_url IS 'URL pública para verificar el documento';
COMMENT ON COLUMN permissions.qr_code_data IS 'Datos del QR code (JSON con código, URL, etc.)';







