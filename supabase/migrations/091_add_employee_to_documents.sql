-- =====================================================
-- Migración 091: Agregar employee_id a documents
-- =====================================================
-- Propósito: Permitir asociar documentos a empleados específicos
-- =====================================================

-- Agregar columna employee_id a la tabla documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NULL;

-- Comentar la columna
COMMENT ON COLUMN documents.employee_id IS 
'Empleado asociado al documento. NULL = documento general de la empresa';

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);

-- Crear índice compuesto para búsquedas por empresa y empleado
CREATE INDEX IF NOT EXISTS idx_documents_company_employee 
ON documents(company_id, employee_id) 
WHERE employee_id IS NOT NULL;

-- Verificación
DO $$
DECLARE
  total_documents INTEGER;
  employee_documents INTEGER;
  general_documents INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_documents FROM documents;
  
  SELECT COUNT(*) INTO employee_documents 
  FROM documents 
  WHERE employee_id IS NOT NULL;
  
  SELECT COUNT(*) INTO general_documents 
  FROM documents 
  WHERE employee_id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migración 091 completada';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total documentos: %', total_documents;
  RAISE NOTICE 'Documentos de empleados: %', employee_documents;
  RAISE NOTICE 'Documentos generales: %', general_documents;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Campo employee_id agregado a documents';
  RAISE NOTICE '✅ Índices creados';
  RAISE NOTICE '========================================';
END $$;


