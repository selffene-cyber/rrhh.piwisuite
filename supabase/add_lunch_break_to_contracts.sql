-- Agregar campo de duración de colación a la tabla contracts
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS lunch_break_duration INTEGER DEFAULT 60;

COMMENT ON COLUMN contracts.lunch_break_duration IS 'Duración del descanso de colación en minutos (no imputable a la jornada laboral)';


