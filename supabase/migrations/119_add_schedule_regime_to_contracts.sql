-- Agregar columna schedule_regime a la tabla contracts
-- Regimen de jornada del trabajador
-- Valores: 'ordinary' (jornada ordinaria), 'partial' (jornada parcial), 'excluded_art22' (Art. 22 inciso 2)

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS schedule_regime VARCHAR(20) DEFAULT 'ordinary';

COMMENT ON COLUMN contracts.schedule_regime IS 'Regimen de jornada: ordinary (jornada ordinaria con limite de horas), partial (jornada parcial), excluded_art22 (excluido de limitacion de jornada Art. 22 inc. 2 del Codigo del Trabajo)';