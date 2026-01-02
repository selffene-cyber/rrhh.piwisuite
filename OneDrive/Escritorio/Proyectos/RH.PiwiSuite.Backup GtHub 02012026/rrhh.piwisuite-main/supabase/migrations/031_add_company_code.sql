-- ============================================
-- MIGRACIÓN 031: Agregar código de empresa
-- ============================================
-- Agrega un campo 'code' a la tabla companies con formato EMP-{correlativo}-{ddmmaaaa}
-- ============================================

-- Agregar columna code si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'code') THEN
    ALTER TABLE companies ADD COLUMN code VARCHAR(20) UNIQUE;
  END IF;
END $$;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);

-- Función para generar el código de empresa
CREATE OR REPLACE FUNCTION generate_company_code()
RETURNS TRIGGER AS $$
DECLARE
  date_str VARCHAR(8);
  correlative INTEGER;
  new_code VARCHAR(20);
BEGIN
  -- Formatear fecha como ddmmaaaa
  date_str := TO_CHAR(NEW.created_at, 'DDMMYYYY');
  
  -- Obtener el siguiente correlativo para esta fecha
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM 5 FOR 2) AS INTEGER)
  ), 0) + 1
  INTO correlative
  FROM companies
  WHERE code LIKE 'EMP-%-' || date_str;
  
  -- Generar código con formato EMP-{correlativo}-{ddmmaaaa}
  new_code := 'EMP-' || LPAD(correlative::TEXT, 2, '0') || '-' || date_str;
  
  -- Asignar el código
  NEW.code := new_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar código automáticamente al insertar
DROP TRIGGER IF EXISTS trigger_generate_company_code ON companies;
CREATE TRIGGER trigger_generate_company_code
  BEFORE INSERT ON companies
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION generate_company_code();

-- Generar códigos para empresas existentes que no tienen código
DO $$
DECLARE
  company_record RECORD;
  date_str VARCHAR(8);
  correlative INTEGER;
  new_code VARCHAR(20);
BEGIN
  FOR company_record IN 
    SELECT id, created_at 
    FROM companies 
    WHERE code IS NULL 
    ORDER BY created_at
  LOOP
    -- Formatear fecha como ddmmaaaa
    date_str := TO_CHAR(company_record.created_at, 'DDMMYYYY');
    
    -- Obtener el siguiente correlativo para esta fecha
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(code FROM 5 FOR 2) AS INTEGER)
    ), 0) + 1
    INTO correlative
    FROM companies
    WHERE code LIKE 'EMP-%-' || date_str;
    
    -- Generar código con formato EMP-{correlativo}-{ddmmaaaa}
    new_code := 'EMP-' || LPAD(correlative::TEXT, 2, '0') || '-' || date_str;
    
    -- Actualizar la empresa con el código generado
    UPDATE companies
    SET code = new_code
    WHERE id = company_record.id;
  END LOOP;
END $$;

-- Comentarios
COMMENT ON COLUMN companies.code IS 'Código único de empresa con formato EMP-{correlativo}-{ddmmaaaa}';

