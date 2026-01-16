-- Tabla para almacenar indicadores previsionales de Previred
-- Permite cachear los valores obtenidos de la API para evitar consultas repetidas

CREATE TABLE IF NOT EXISTS previred_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  -- Datos principales
  uf_value DECIMAL(12, 2),
  utm_value DECIMAL(12, 2),
  uta_value DECIMAL(12, 2),
  -- Topes imponibles
  rti_afp_pesos DECIMAL(12, 2),
  rti_ips_pesos DECIMAL(12, 2),
  rti_seg_ces_pesos DECIMAL(12, 2),
  -- Rentas mínimas
  rmi_trab_depe_ind DECIMAL(12, 2),
  rmi_men18_may65 DECIMAL(12, 2),
  rmi_trab_casa_part DECIMAL(12, 2),
  rmi_no_remu DECIMAL(12, 2),
  -- Datos completos en JSON (para flexibilidad)
  indicators_json JSONB,
  -- Metadata
  source VARCHAR(50) DEFAULT 'gael_cloud', -- 'gael_cloud', 'manual', 'previred'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month)
);

-- Índice para búsquedas rápidas por año/mes
CREATE INDEX IF NOT EXISTS idx_previred_indicators_period ON previred_indicators(year, month);

-- Trigger para updated_at
CREATE TRIGGER update_previred_indicators_updated_at BEFORE UPDATE ON previred_indicators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


