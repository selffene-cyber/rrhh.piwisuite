-- Actualizar estados de liquidaciones
-- Cambiar 'confirmed' a 'issued' y agregar nuevos campos

-- Agregar nuevas columnas si no existen
ALTER TABLE payroll_slips 
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Actualizar constraint de status
ALTER TABLE payroll_slips 
DROP CONSTRAINT IF EXISTS payroll_slips_status_check;

ALTER TABLE payroll_slips 
ADD CONSTRAINT payroll_slips_status_check 
CHECK (status IN ('draft', 'issued', 'sent'));

-- Migrar datos existentes: cambiar 'confirmed' a 'issued'
UPDATE payroll_slips 
SET status = 'issued', 
    issued_at = COALESCE(confirmed_at, created_at)
WHERE status = 'confirmed';

-- Eliminar columna confirmed_at si existe (opcional, comentado por si acaso)
-- ALTER TABLE payroll_slips DROP COLUMN IF EXISTS confirmed_at;


