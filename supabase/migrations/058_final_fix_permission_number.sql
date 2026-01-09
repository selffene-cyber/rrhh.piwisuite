-- ============================================
-- MIGRACIÓN 058: Solución final y directa para permission_number
-- ============================================
-- Esta migración hace una corrección directa sin diagnósticos
-- ============================================

-- Eliminar el índice único actual (si existe)
DROP INDEX IF EXISTS idx_permissions_number CASCADE;

-- Limpiar duplicados: poner NULL a todos los permisos duplicados excepto el más antiguo
UPDATE permissions p1
SET permission_number = NULL
WHERE EXISTS (
  SELECT 1 
  FROM permissions p2
  WHERE p2.permission_number = p1.permission_number
    AND p2.id != p1.id
    AND p2.created_at < p1.created_at
);

-- Reasignar números a permisos con NULL, agrupados por empresa
DO $$
DECLARE
  v_perm RECORD;
  v_next_number INTEGER;
  v_permission_number VARCHAR(50);
BEGIN
  FOR v_perm IN 
    SELECT id, company_id 
    FROM permissions 
    WHERE permission_number IS NULL OR permission_number = ''
    ORDER BY company_id, created_at
  LOOP
    -- Obtener el siguiente número para esta empresa
    SELECT COALESCE(MAX(CAST(SUBSTRING(permission_number FROM 'PERM-(\d+)') AS INTEGER)), 0) + 1
    INTO v_next_number
    FROM permissions
    WHERE company_id = v_perm.company_id
      AND permission_number IS NOT NULL
      AND permission_number ~ '^PERM-\d+$';
    
    -- Generar número único
    LOOP
      v_permission_number := 'PERM-' || LPAD(v_next_number::TEXT, 4, '0');
      
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM permissions 
        WHERE company_id = v_perm.company_id 
          AND permission_number = v_permission_number
      );
      
      v_next_number := v_next_number + 1;
    END LOOP;
    
    -- Actualizar
    UPDATE permissions
    SET permission_number = v_permission_number
    WHERE id = v_perm.id;
  END LOOP;
END $$;

-- Crear el índice único CORRECTO: (company_id, permission_number)
CREATE UNIQUE INDEX idx_permissions_number 
ON permissions(company_id, permission_number) 
WHERE permission_number IS NOT NULL;

-- Verificar que se creó correctamente
SELECT 
  'Índice creado: ' || indexdef as resultado
FROM pg_indexes
WHERE indexname = 'idx_permissions_number';






