-- Habilitar RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver certificados de su empresa
CREATE POLICY "Users can view certificates from their company"
  ON certificates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = certificates.company_id
      AND company_users.user_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden crear certificados en su empresa
CREATE POLICY "Users can create certificates in their company"
  ON certificates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = certificates.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('admin', 'hr', 'owner')
    )
  );

-- Política: Los usuarios pueden actualizar certificados de su empresa
CREATE POLICY "Users can update certificates in their company"
  ON certificates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = certificates.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('admin', 'hr', 'owner')
    )
  );

-- Política: Los usuarios pueden eliminar certificados de su empresa (solo anular, no borrar físico)
CREATE POLICY "Users can void certificates in their company"
  ON certificates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.company_id = certificates.company_id
      AND company_users.user_id = auth.uid()
      AND company_users.role IN ('admin', 'hr', 'owner')
    )
  );

