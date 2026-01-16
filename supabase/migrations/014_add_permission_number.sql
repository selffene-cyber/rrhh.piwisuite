-- Agregar columna permission_number a la tabla permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_number VARCHAR(50);

-- Crear índice único para permission_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_number ON permissions(permission_number);

-- Función para generar número de permiso correlativo por empresa
CREATE OR REPLACE FUNCTION generate_permission_number()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
BEGIN
  -- Obtener company_id del permiso
  v_company_id := NEW.company_id;
  
  -- Obtener el siguiente número correlativo para esta empresa
  SELECT COALESCE(MAX(CAST(SUBSTRING(permission_number FROM 'PERM-(\d+)') AS INTEGER)), 0) + 1
  INTO v_next_number
  FROM permissions
  WHERE company_id = v_company_id
    AND permission_number IS NOT NULL
    AND permission_number ~ '^PERM-\d+$';
  
  -- Generar número de permiso
  v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
  
  -- Asignar número solo si no existe
  IF NEW.permission_number IS NULL OR NEW.permission_number = '' THEN
    NEW.permission_number := v_permission_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para asignar número automáticamente
DROP TRIGGER IF EXISTS set_permission_number_trigger ON permissions;
CREATE TRIGGER set_permission_number_trigger
BEFORE INSERT ON permissions
FOR EACH ROW
EXECUTE FUNCTION generate_permission_number();

-- Comentario
COMMENT ON COLUMN permissions.permission_number IS 'Número correlativo del permiso (ej: PERM-0001)';

