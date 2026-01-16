-- Agregar campo period_year a la tabla vacations para rastrear a qué período pertenece cada solicitud
ALTER TABLE vacations 
ADD COLUMN IF NOT EXISTS period_year INTEGER;

-- Crear índice para búsquedas por período
CREATE INDEX IF NOT EXISTS idx_vacations_period_year ON vacations(period_year);

-- Comentario
COMMENT ON COLUMN vacations.period_year IS 'Año del período de vacaciones al que pertenece esta solicitud. Se asigna automáticamente al crear/aprobar la solicitud.';

