-- ============================================
-- MIGRACIÓN 028: Catálogo de Centros de Costos
-- ============================================
-- Crear tabla de catálogo de centros de costos
-- ============================================

-- Tabla de catálogo de centros de costos
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,           -- p.ej. "CC-001"
  name TEXT NOT NULL,           -- p.ej. "Planta Coquimbo"
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para código por empresa
CREATE UNIQUE INDEX IF NOT EXISTS cost_centers_company_code_idx
  ON cost_centers (company_id, code);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_status ON cost_centers(status);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabla de asignación de centros de costos a usuarios
CREATE TABLE IF NOT EXISTS user_cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS user_cost_centers_user_cc_idx
  ON user_cost_centers (user_id, company_id, cost_center_id);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_cost_centers_user ON user_cost_centers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cost_centers_company ON user_cost_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_user_cost_centers_cc ON user_cost_centers(cost_center_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_user_cost_centers_updated_at
  BEFORE UPDATE ON user_cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Agregar columna cost_center_id a employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

-- Índice para búsquedas por centro de costo
CREATE INDEX IF NOT EXISTS idx_employees_cost_center ON employees(cost_center_id);

-- Migración opcional: Si hay datos en cost_center (texto), intentar migrarlos
-- Esto se puede ejecutar manualmente después de crear los CC en el catálogo
-- UPDATE employees e
-- SET cost_center_id = cc.id
-- FROM cost_centers cc
-- WHERE e.company_id = cc.company_id
--   AND e.cost_center = cc.code
--   AND e.cost_center_id IS NULL;

