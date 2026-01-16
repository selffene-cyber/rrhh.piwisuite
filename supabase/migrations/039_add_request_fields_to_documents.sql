-- ============================================
-- MIGRACIÓN 039: Campos de Solicitud y Aprobación para Documentos
-- ============================================
-- Agrega campos para rastrear solicitudes de trabajadores
-- y estados de aprobación/rechazo para certificados, vacaciones y permisos
-- ============================================

-- Actualizar tabla certificates
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Modificar status de certificates para incluir 'requested' y 'rejected'
-- Primero, eliminar el constraint existente
ALTER TABLE certificates
DROP CONSTRAINT IF EXISTS certificates_status_check;

-- Agregar nuevo constraint con los estados actualizados
ALTER TABLE certificates
ADD CONSTRAINT certificates_status_check 
CHECK (status IN ('draft', 'requested', 'approved', 'rejected', 'issued', 'void'));

-- Actualizar tabla vacations
ALTER TABLE vacations
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Modificar status de vacations para incluir 'rejected' explícitamente
-- El constraint ya incluye 'rechazada', pero agregamos 'rejected' para consistencia
ALTER TABLE vacations
DROP CONSTRAINT IF EXISTS vacations_status_check;

ALTER TABLE vacations
ADD CONSTRAINT vacations_status_check 
CHECK (status IN ('solicitada', 'aprobada', 'rechazada', 'rejected', 'tomada', 'cancelada'));

-- Actualizar tabla permissions
ALTER TABLE permissions
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Modificar status de permissions para incluir 'requested' y 'rejected'
ALTER TABLE permissions
DROP CONSTRAINT IF EXISTS permissions_status_check;

ALTER TABLE permissions
ADD CONSTRAINT permissions_status_check 
CHECK (status IN ('draft', 'requested', 'approved', 'rejected', 'applied', 'void'));

-- Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_certificates_requested_by ON certificates(requested_by);
CREATE INDEX IF NOT EXISTS idx_certificates_requested_at ON certificates(requested_at);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);

CREATE INDEX IF NOT EXISTS idx_vacations_requested_by ON vacations(requested_by);
CREATE INDEX IF NOT EXISTS idx_vacations_requested_at ON vacations(requested_at);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON vacations(status);

CREATE INDEX IF NOT EXISTS idx_permissions_requested_by ON permissions(requested_by);
CREATE INDEX IF NOT EXISTS idx_permissions_requested_at ON permissions(requested_at);
CREATE INDEX IF NOT EXISTS idx_permissions_status ON permissions(status);

-- Comentarios
COMMENT ON COLUMN certificates.requested_by IS 'Usuario trabajador que solicitó el certificado';
COMMENT ON COLUMN certificates.requested_at IS 'Fecha y hora en que se solicitó el certificado';
COMMENT ON COLUMN certificates.rejection_reason IS 'Motivo del rechazo si fue rechazado';

COMMENT ON COLUMN vacations.requested_by IS 'Usuario trabajador que solicitó las vacaciones';
COMMENT ON COLUMN vacations.requested_at IS 'Fecha y hora en que se solicitó las vacaciones';
COMMENT ON COLUMN vacations.rejection_reason IS 'Motivo del rechazo si fue rechazada';

COMMENT ON COLUMN permissions.requested_by IS 'Usuario trabajador que solicitó el permiso';
COMMENT ON COLUMN permissions.requested_at IS 'Fecha y hora en que se solicitó el permiso';
COMMENT ON COLUMN permissions.rejection_reason IS 'Motivo del rechazo si fue rechazado';








