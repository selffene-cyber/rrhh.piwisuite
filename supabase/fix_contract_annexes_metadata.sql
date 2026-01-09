-- Script para agregar columna metadata a contract_annexes si no existe
-- Ejecutar este script en Supabase SQL Editor si aparece el error de columna no encontrada

-- Verificar y agregar columna metadata
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contract_annexes' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE contract_annexes 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    -- Índice GIN para búsquedas eficientes en metadata
    CREATE INDEX IF NOT EXISTS idx_contract_annexes_metadata 
    ON contract_annexes USING GIN(metadata);
    
    -- Comentario
    COMMENT ON COLUMN contract_annexes.metadata IS 
    'Metadatos del anexo: conceptValues, selected_concepts, etc. para actualización automática de contratos y empleados';
    
    RAISE NOTICE 'Columna metadata agregada exitosamente a contract_annexes';
  ELSE
    RAISE NOTICE 'La columna metadata ya existe en contract_annexes';
  END IF;
END $$;





