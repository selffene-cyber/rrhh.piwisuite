-- Tabla de categorías de documentos (configurables por empresa)
CREATE TABLE IF NOT EXISTS document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Insertar categorías por defecto para cada empresa existente
DO $$
DECLARE
  v_company_id UUID;
  default_categories TEXT[] := ARRAY[
    'RRHH',
    'Legal',
    'Seguridad y Salud',
    'Operaciones',
    'Administración',
    'Contratos y Anexos',
    'Formularios',
    'Otros'
  ];
  cat_name TEXT;
BEGIN
  FOR v_company_id IN SELECT id FROM companies
  LOOP
    FOREACH cat_name IN ARRAY default_categories
    LOOP
      INSERT INTO document_categories (company_id, name, description, active)
      VALUES (
        v_company_id,
        cat_name,
        CASE cat_name
          WHEN 'RRHH' THEN 'Documentos relacionados con recursos humanos'
          WHEN 'Legal' THEN 'Documentos legales y normativos'
          WHEN 'Seguridad y Salud' THEN 'Protocolos de seguridad y salud ocupacional'
          WHEN 'Operaciones' THEN 'Documentos operacionales'
          WHEN 'Administración' THEN 'Documentos administrativos'
          WHEN 'Contratos y Anexos' THEN 'Contratos tipo y anexos modelo'
          WHEN 'Formularios' THEN 'Formularios y plantillas'
          WHEN 'Otros' THEN 'Otros documentos corporativos'
        END,
        true
      )
      ON CONFLICT (company_id, name) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Tabla principal de documentos
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES document_categories(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb, -- Array de tags: ["contrato", "rrhh", "seguridad"]
  current_version_id UUID, -- Referencia a la versión vigente
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (name IS NOT NULL AND length(trim(name)) > 0)
);

-- Tabla de versiones de documentos
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL, -- URL en Supabase Storage
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50), -- pdf, docx, xlsx, jpg, etc.
  file_size BIGINT, -- Tamaño en bytes
  version_number INTEGER NOT NULL DEFAULT 1,
  valid_from DATE,
  valid_to DATE,
  is_current BOOLEAN DEFAULT false, -- Versión vigente
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (version_number > 0),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_current ON document_versions(document_id, is_current);
CREATE INDEX IF NOT EXISTS idx_document_categories_company ON document_categories(company_id);

-- Foreign key para current_version_id
ALTER TABLE documents ADD CONSTRAINT fk_documents_current_version 
  FOREIGN KEY (current_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_documents_updated_at();

CREATE TRIGGER update_document_categories_updated_at
BEFORE UPDATE ON document_categories
FOR EACH ROW
EXECUTE FUNCTION update_documents_updated_at();

-- Función para actualizar current_version_id cuando se marca una versión como vigente
CREATE OR REPLACE FUNCTION update_current_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se marca una versión como vigente, desmarcar las demás del mismo documento
  IF NEW.is_current = true THEN
    UPDATE document_versions
    SET is_current = false
    WHERE document_id = NEW.document_id
      AND id != NEW.id
      AND is_current = true;
    
    -- Actualizar current_version_id en documents
    UPDATE documents
    SET current_version_id = NEW.id
    WHERE id = NEW.document_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_current_version_trigger
AFTER INSERT OR UPDATE ON document_versions
FOR EACH ROW
WHEN (NEW.is_current = true)
EXECUTE FUNCTION update_current_version();

-- Función para calcular el siguiente número de versión
CREATE OR REPLACE FUNCTION get_next_version_number(p_document_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_max_version
  FROM document_versions
  WHERE document_id = p_document_id;
  
  RETURN v_max_version;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE document_categories IS 'Categorías de documentos configurables por empresa';
COMMENT ON TABLE documents IS 'Documentos corporativos y de RRHH por empresa';
COMMENT ON TABLE document_versions IS 'Versiones de documentos con control de vigencia';
COMMENT ON COLUMN documents.tags IS 'Array de tags para búsqueda y clasificación';
COMMENT ON COLUMN documents.current_version_id IS 'Referencia a la versión vigente del documento';
COMMENT ON COLUMN document_versions.is_current IS 'Indica si esta es la versión vigente del documento';

