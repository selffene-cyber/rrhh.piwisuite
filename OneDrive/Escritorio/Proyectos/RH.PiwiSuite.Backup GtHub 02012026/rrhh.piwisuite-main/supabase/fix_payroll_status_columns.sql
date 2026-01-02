-- Script para agregar columnas issued_at y sent_at si no existen
-- Ejecutar este script en Supabase SQL Editor si aparece el error de columna no encontrada

-- Verificar y agregar columna issued_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payroll_slips' AND column_name = 'issued_at'
  ) THEN
    ALTER TABLE payroll_slips 
    ADD COLUMN issued_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Verificar y agregar columna sent_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payroll_slips' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE payroll_slips 
    ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Actualizar constraint de status si no existe
DO $$
BEGIN
  -- Eliminar constraint antiguo si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payroll_slips_status_check'
  ) THEN
    ALTER TABLE payroll_slips DROP CONSTRAINT payroll_slips_status_check;
  END IF;
  
  -- Agregar nuevo constraint
  ALTER TABLE payroll_slips 
  ADD CONSTRAINT payroll_slips_status_check 
  CHECK (status IN ('draft', 'issued', 'sent'));
END $$;

-- Migrar datos existentes: cambiar 'confirmed' a 'issued' si existe
UPDATE payroll_slips 
SET status = 'issued', 
    issued_at = COALESCE(
      (SELECT issued_at FROM payroll_slips WHERE id = payroll_slips.id),
      created_at
    )
WHERE status = 'confirmed';


