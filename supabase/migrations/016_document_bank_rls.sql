-- Habilitar RLS
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA: document_categories
-- ============================================

-- Super admins ven todas las categorías
CREATE POLICY "Super admins see all document_categories"
ON document_categories FOR SELECT
USING (is_super_admin());

-- Usuarios ven categorías de sus empresas
CREATE POLICY "Users see document_categories of their companies"
ON document_categories FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- Super admins gestionan todas las categorías
CREATE POLICY "Super admins manage all document_categories"
ON document_categories FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Usuarios gestionan categorías de sus empresas
CREATE POLICY "Users manage document_categories of their companies"
ON document_categories FOR ALL
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- POLÍTICAS PARA: documents
-- ============================================

-- Super admins ven todos los documentos
CREATE POLICY "Super admins see all documents"
ON documents FOR SELECT
USING (is_super_admin());

-- Usuarios ven documentos de sus empresas
CREATE POLICY "Users see documents of their companies"
ON documents FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

-- Super admins gestionan todos los documentos
CREATE POLICY "Super admins manage all documents"
ON documents FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Usuarios pueden crear documentos en sus empresas
CREATE POLICY "Users create documents in their companies"
ON documents FOR INSERT
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- Usuarios pueden actualizar documentos en sus empresas
CREATE POLICY "Users update documents in their companies"
ON documents FOR UPDATE
USING (user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

-- Usuarios pueden archivar documentos en sus empresas (no eliminar)
CREATE POLICY "Users archive documents in their companies"
ON documents FOR UPDATE
USING (
  user_belongs_to_company(auth.uid(), company_id) AND
  status = 'active'
)
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id) AND
  status IN ('active', 'archived')
);

-- ============================================
-- POLÍTICAS PARA: document_versions
-- ============================================

-- Super admins ven todas las versiones
CREATE POLICY "Super admins see all document_versions"
ON document_versions FOR SELECT
USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_versions.document_id
      AND is_super_admin()
  )
);

-- Usuarios ven versiones de documentos de sus empresas
CREATE POLICY "Users see document_versions of their companies"
ON document_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_versions.document_id
      AND user_belongs_to_company(auth.uid(), documents.company_id)
  )
);

-- Super admins gestionan todas las versiones
CREATE POLICY "Super admins manage all document_versions"
ON document_versions FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Usuarios pueden crear versiones de documentos de sus empresas
CREATE POLICY "Users create document_versions in their companies"
ON document_versions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_versions.document_id
      AND user_belongs_to_company(auth.uid(), documents.company_id)
  )
);

-- Usuarios pueden actualizar versiones de documentos de sus empresas
CREATE POLICY "Users update document_versions in their companies"
ON document_versions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_versions.document_id
      AND user_belongs_to_company(auth.uid(), documents.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_versions.document_id
      AND user_belongs_to_company(auth.uid(), documents.company_id)
  )
);

