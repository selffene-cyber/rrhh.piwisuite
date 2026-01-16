-- Script para agregar campos de anticipo a la tabla employees
-- Ejecutar este script en Supabase SQL Editor

-- Verificar y agregar columna requests_advance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'requests_advance'
  ) THEN
    ALTER TABLE employees 
    ADD COLUMN requests_advance BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Verificar y agregar columna advance_amount
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'advance_amount'
  ) THEN
    ALTER TABLE employees 
    ADD COLUMN advance_amount DECIMAL(12, 2) DEFAULT 0;
  END IF;
END $$;

