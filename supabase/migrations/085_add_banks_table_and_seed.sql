-- =====================================================
-- Migración 085: Sistema de Gestión de Bancos
-- =====================================================
-- Propósito: Crear tabla maestra de instituciones financieras
-- con seed completo de bancos, cooperativas y prepago.
-- Mantiene retrocompatibilidad con bank_name existente.
-- =====================================================

-- 0. Habilitar extensión pg_trgm para búsquedas
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Crear tabla banks
-- =====================================================
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('banco', 'cooperativa', 'prepago', 'otro')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para unicidad case-insensitive del nombre
CREATE UNIQUE INDEX IF NOT EXISTS banks_name_lower_unique 
  ON banks (lower(name));

-- Índice para búsquedas rápidas por tipo y estado
CREATE INDEX IF NOT EXISTS banks_type_active_idx 
  ON banks (type, active);

-- Índice para búsquedas por nombre (usando trigram para búsqueda fuzzy)
-- Si falla, no es crítico ya que tenemos el índice único en lower(name)
DO $$ 
BEGIN
  CREATE INDEX IF NOT EXISTS banks_name_idx 
    ON banks USING gin(lower(name) gin_trgm_ops);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Índice GIN trigram no creado (extensión pg_trgm no disponible). Búsquedas funcionarán con índice único.';
END $$;

-- Comentarios para documentación
COMMENT ON TABLE banks IS 'Catálogo maestro de instituciones financieras (bancos, cooperativas, prepago)';
COMMENT ON COLUMN banks.name IS 'Nombre de la institución';
COMMENT ON COLUMN banks.type IS 'Tipo: banco, cooperativa, prepago, otro';
COMMENT ON COLUMN banks.active IS 'Si false, no aparece en dropdown (soft delete)';

-- =====================================================
-- 2. Modificar tabla employees
-- =====================================================
-- Agregar bank_id como FK nullable (retrocompatibilidad)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'bank_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN bank_id UUID REFERENCES banks(id) ON DELETE SET NULL;
    COMMENT ON COLUMN employees.bank_id IS 'FK a tabla banks (nuevos trabajadores). Si null, usar bank_name (legacy)';
  END IF;
END $$;

-- Índice para FK
CREATE INDEX IF NOT EXISTS employees_bank_id_idx ON employees(bank_id);

-- IMPORTANTE: NO eliminar bank_name, se mantiene para retrocompatibilidad
-- Trabajadores antiguos seguirán usando bank_name como fallback

-- =====================================================
-- 3. SEED: Insertar instituciones financieras
-- =====================================================
-- Usando ON CONFLICT para idempotencia y evitar duplicados

-- 3.1 BANCOS
-- =====================================================
INSERT INTO banks (name, type, active) VALUES
  ('Banco de Chile', 'banco', true),
  ('Banco Internacional', 'banco', true),
  ('BancoEstado', 'banco', true),
  ('Scotiabank Chile', 'banco', true),
  ('Banco de Crédito e Inversiones (BCI)', 'banco', true),
  ('Banco Falabella', 'banco', true),
  ('Banco Ripley', 'banco', true),
  ('Banco Consorcio', 'banco', true),
  ('Banco Itaú Chile', 'banco', true),
  ('Banco Security', 'banco', true),
  ('Banco Santander Chile', 'banco', true),
  ('Banco BICE', 'banco', true),
  ('Banco BTG Pactual Chile', 'banco', true),
  ('Banco Edwards', 'banco', true),
  ('Banco do Brasil S.A.', 'banco', true),
  ('JPMorgan Chase Bank N.A.', 'banco', true),
  ('HSBC Bank Chile', 'banco', true)
ON CONFLICT (lower(name)) DO UPDATE SET
  type = EXCLUDED.type,
  active = EXCLUDED.active,
  updated_at = now();

-- 3.2 COOPERATIVAS
-- =====================================================
INSERT INTO banks (name, type, active) VALUES
  ('Coopeuch', 'cooperativa', true),
  ('Detacoop', 'cooperativa', true),
  ('Oriencoop', 'cooperativa', true),
  ('Capual', 'cooperativa', true)
ON CONFLICT (lower(name)) DO UPDATE SET
  type = EXCLUDED.type,
  active = EXCLUDED.active,
  updated_at = now();

-- 3.3 PREPAGO / FINTECH
-- =====================================================
INSERT INTO banks (name, type, active) VALUES
  ('Tenpo', 'prepago', true),
  ('MACH', 'prepago', true),
  ('Mercado Pago', 'prepago', true),
  ('Dale', 'prepago', true),
  ('Global66', 'prepago', true),
  ('Prex', 'prepago', true),
  ('CuentaRUT Prepago (BancoEstado)', 'prepago', true)
ON CONFLICT (lower(name)) DO UPDATE SET
  type = EXCLUDED.type,
  active = EXCLUDED.active,
  updated_at = now();

-- =====================================================
-- 4. Función para actualizar updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_banks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS banks_updated_at_trigger ON banks;
CREATE TRIGGER banks_updated_at_trigger
  BEFORE UPDATE ON banks
  FOR EACH ROW
  EXECUTE FUNCTION update_banks_updated_at();

-- =====================================================
-- 5. RLS (Row Level Security) para banks
-- =====================================================
-- La tabla banks es pública (todos pueden leer)
-- Solo admins pueden escribir

ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden leer bancos activos
DROP POLICY IF EXISTS "banks_select_all" ON banks;
CREATE POLICY "banks_select_all" ON banks
  FOR SELECT
  USING (true); -- Cualquier usuario autenticado puede leer

-- Policy: Solo super_admins pueden insertar/actualizar/eliminar
DROP POLICY IF EXISTS "banks_super_admin_all" ON banks;
CREATE POLICY "banks_super_admin_all" ON banks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Policy: Owners y admins pueden insertar bancos para su uso
DROP POLICY IF EXISTS "banks_admin_insert" ON banks;
CREATE POLICY "banks_admin_insert" ON banks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_users
      WHERE company_users.user_id = auth.uid()
      AND company_users.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 6. Verificación del seed
-- =====================================================
DO $$
DECLARE
  total_banks INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_banks FROM banks WHERE active = true;
  RAISE NOTICE 'Total de instituciones financieras activas: %', total_banks;
  RAISE NOTICE 'Migración 085 completada exitosamente';
END $$;


