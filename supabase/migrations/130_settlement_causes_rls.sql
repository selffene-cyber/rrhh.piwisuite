-- ============================================
-- MIGRACION 130: RLS para settlement_causes
-- Permite lectura de causales a todos los usuarios autenticados
-- ============================================

-- Asegurar que RLS esta habilitado
ALTER TABLE settlement_causes ENABLE ROW LEVEL SECURITY;

-- Politica de lectura para usuarios autenticados
-- Las causales son datos maestros que todos necesitan poder leer
DROP POLICY IF EXISTS "Authenticated users can view settlement causes" ON settlement_causes;
CREATE POLICY "Authenticated users can view settlement causes"
  ON settlement_causes FOR SELECT
  TO authenticated
  USING (true);

-- Politica de escritura solo para admins (via service role)
DROP POLICY IF EXISTS "Service role can manage settlement causes" ON settlement_causes;
CREATE POLICY "Service role can manage settlement causes"
  ON settlement_causes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politica de lectura para usuarios anonimos (necesario para el formulario)
DROP POLICY IF EXISTS "Anonymous users can view settlement causes" ON settlement_causes;
CREATE POLICY "Anonymous users can view settlement causes"
  ON settlement_causes FOR SELECT
  TO anon
  USING (true);