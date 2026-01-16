-- ============================================
-- MIGRACIÓN 044: Crear tabla de firmas digitales
-- ============================================
-- Tabla para almacenar firmas digitales de usuarios (admin/owner)
-- que se usarán para firmar certificados, vacaciones y permisos
-- ============================================

-- Tabla de firmas digitales
CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_image_url TEXT NOT NULL, -- URL en Storage de Supabase
  signer_name VARCHAR(255) NOT NULL,
  signer_position VARCHAR(255) NOT NULL,
  signer_rut VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Una firma activa por usuario por empresa
  UNIQUE(company_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_digital_signatures_company ON digital_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_user ON digital_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_active ON digital_signatures(is_active) WHERE is_active = true;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_digital_signatures_updated_at
  BEFORE UPDATE ON digital_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE digital_signatures IS 'Firmas digitales de usuarios autorizados para firmar documentos (certificados, vacaciones, permisos)';
COMMENT ON COLUMN digital_signatures.signature_image_url IS 'URL de la imagen de la firma almacenada en Storage de Supabase';
COMMENT ON COLUMN digital_signatures.is_active IS 'Indica si la firma está activa y puede ser usada para firmar documentos';

-- ============================================
-- Habilitar RLS
-- ============================================
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Políticas RLS
-- ============================================

-- SELECT: Super admin ve todas, usuarios ven solo firmas de su empresa
DROP POLICY IF EXISTS "Super admins see all digital signatures" ON digital_signatures;
CREATE POLICY "Super admins see all digital signatures"
  ON digital_signatures FOR SELECT
  USING (is_super_admin());

DROP POLICY IF EXISTS "Users see digital signatures of their company" ON digital_signatures;
CREATE POLICY "Users see digital signatures of their company"
  ON digital_signatures FOR SELECT
  USING (user_belongs_to_company(auth.uid(), company_id));

-- INSERT: Solo admin/owner pueden crear firmas en su empresa
DROP POLICY IF EXISTS "Super admins insert all digital signatures" ON digital_signatures;
CREATE POLICY "Super admins insert all digital signatures"
  ON digital_signatures FOR INSERT
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Admins insert digital signatures in their company" ON digital_signatures;
CREATE POLICY "Admins insert digital signatures in their company"
  ON digital_signatures FOR INSERT
  WITH CHECK (
    user_belongs_to_company(auth.uid(), company_id)
    AND (
      EXISTS (
        SELECT 1 FROM company_users
        WHERE company_users.user_id = auth.uid()
          AND company_users.company_id = company_id
          AND company_users.role IN ('owner', 'admin')
      )
    )
  );

-- UPDATE: Solo admin/owner pueden actualizar firmas de su empresa
DROP POLICY IF EXISTS "Super admins update all digital signatures" ON digital_signatures;
CREATE POLICY "Super admins update all digital signatures"
  ON digital_signatures FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Admins update digital signatures in their company" ON digital_signatures;
CREATE POLICY "Admins update digital signatures in their company"
  ON digital_signatures FOR UPDATE
  USING (
    user_belongs_to_company(auth.uid(), company_id)
    AND (
      EXISTS (
        SELECT 1 FROM company_users
        WHERE company_users.user_id = auth.uid()
          AND company_users.company_id = company_id
          AND company_users.role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    user_belongs_to_company(auth.uid(), company_id)
    AND (
      EXISTS (
        SELECT 1 FROM company_users
        WHERE company_users.user_id = auth.uid()
          AND company_users.company_id = company_id
          AND company_users.role IN ('owner', 'admin')
      )
    )
  );

-- DELETE: Solo admin/owner pueden eliminar firmas de su empresa
DROP POLICY IF EXISTS "Super admins delete all digital signatures" ON digital_signatures;
CREATE POLICY "Super admins delete all digital signatures"
  ON digital_signatures FOR DELETE
  USING (is_super_admin());

DROP POLICY IF EXISTS "Admins delete digital signatures in their company" ON digital_signatures;
CREATE POLICY "Admins delete digital signatures in their company"
  ON digital_signatures FOR DELETE
  USING (
    user_belongs_to_company(auth.uid(), company_id)
    AND (
      EXISTS (
        SELECT 1 FROM company_users
        WHERE company_users.user_id = auth.uid()
          AND company_users.company_id = company_id
          AND company_users.role IN ('owner', 'admin')
      )
    )
  );







