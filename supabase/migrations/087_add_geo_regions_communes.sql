-- =====================================================
-- Migración 087: Sistema de Regiones y Comunas de Chile
-- =====================================================
-- Propósito: Crear tablas maestras de división política-administrativa (DPA)
-- Fuente: API DPA Gobierno Digital de Chile
-- Mantiene retrocompatibilidad con datos legacy
-- =====================================================

-- 1. Crear tabla geo_regions (Regiones de Chile)
-- =====================================================
CREATE TABLE IF NOT EXISTS geo_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,  -- Código DPA oficial
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para geo_regions
CREATE INDEX IF NOT EXISTS geo_regions_code_idx ON geo_regions(code);
CREATE INDEX IF NOT EXISTS geo_regions_active_idx ON geo_regions(active);
CREATE INDEX IF NOT EXISTS geo_regions_name_idx ON geo_regions(lower(name));

COMMENT ON TABLE geo_regions IS 'Regiones de Chile según división político-administrativa (DPA)';
COMMENT ON COLUMN geo_regions.code IS 'Código DPA oficial de la región';
COMMENT ON COLUMN geo_regions.active IS 'Si false, no aparece en selector (soft delete)';

-- =====================================================
-- 2. Crear tabla geo_provinces (Provincias de Chile)
-- =====================================================
CREATE TABLE IF NOT EXISTS geo_provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,  -- Código DPA oficial
  name TEXT NOT NULL,
  region_id UUID NOT NULL REFERENCES geo_regions(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para geo_provinces
CREATE INDEX IF NOT EXISTS geo_provinces_code_idx ON geo_provinces(code);
CREATE INDEX IF NOT EXISTS geo_provinces_region_id_idx ON geo_provinces(region_id);
CREATE INDEX IF NOT EXISTS geo_provinces_active_idx ON geo_provinces(active);
CREATE INDEX IF NOT EXISTS geo_provinces_region_name_idx ON geo_provinces(region_id, lower(name));

COMMENT ON TABLE geo_provinces IS 'Provincias de Chile según DPA';
COMMENT ON COLUMN geo_provinces.region_id IS 'Región a la que pertenece esta provincia';

-- =====================================================
-- 3. Crear tabla geo_communes (Comunas de Chile)
-- =====================================================
CREATE TABLE IF NOT EXISTS geo_communes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,  -- Código DPA oficial
  name TEXT NOT NULL,
  region_id UUID NOT NULL REFERENCES geo_regions(id) ON DELETE CASCADE,
  province_id UUID NULL REFERENCES geo_provinces(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para geo_communes
CREATE INDEX IF NOT EXISTS geo_communes_code_idx ON geo_communes(code);
CREATE INDEX IF NOT EXISTS geo_communes_region_id_idx ON geo_communes(region_id);
CREATE INDEX IF NOT EXISTS geo_communes_province_id_idx ON geo_communes(province_id);
CREATE INDEX IF NOT EXISTS geo_communes_active_idx ON geo_communes(active);
CREATE INDEX IF NOT EXISTS geo_communes_region_name_idx ON geo_communes(region_id, lower(name));

COMMENT ON TABLE geo_communes IS 'Comunas de Chile según DPA';
COMMENT ON COLUMN geo_communes.region_id IS 'Región a la que pertenece esta comuna';
COMMENT ON COLUMN geo_communes.province_id IS 'Provincia (opcional) a la que pertenece';

-- =====================================================
-- 4. Modificar tabla employees (retrocompatibilidad)
-- =====================================================

-- Agregar columnas nuevas (nullable para retrocompatibilidad)
DO $$ 
BEGIN
  -- region_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN region_id UUID REFERENCES geo_regions(id) ON DELETE SET NULL;
    COMMENT ON COLUMN employees.region_id IS 'FK a geo_regions (nuevo sistema). Si null, usar region_name_legacy';
  END IF;

  -- commune_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'commune_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN commune_id UUID REFERENCES geo_communes(id) ON DELETE SET NULL;
    COMMENT ON COLUMN employees.commune_id IS 'FK a geo_communes (nuevo sistema). Si null, usar city_name_legacy';
  END IF;

  -- province_id (opcional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'province_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN province_id UUID REFERENCES geo_provinces(id) ON DELETE SET NULL;
    COMMENT ON COLUMN employees.province_id IS 'FK a geo_provinces (opcional)';
  END IF;

  -- Campos legacy para retrocompatibilidad
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'region_name_legacy'
  ) THEN
    ALTER TABLE employees ADD COLUMN region_name_legacy TEXT NULL;
    COMMENT ON COLUMN employees.region_name_legacy IS 'Región en texto (legacy). Fallback si no hay region_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'city_name_legacy'
  ) THEN
    ALTER TABLE employees ADD COLUMN city_name_legacy TEXT NULL;
    COMMENT ON COLUMN employees.city_name_legacy IS 'Ciudad/Comuna en texto (legacy). Fallback si no hay commune_id';
  END IF;
END $$;

-- Índices para FKs en employees
CREATE INDEX IF NOT EXISTS employees_region_id_idx ON employees(region_id);
CREATE INDEX IF NOT EXISTS employees_commune_id_idx ON employees(commune_id);
CREATE INDEX IF NOT EXISTS employees_province_id_idx ON employees(province_id);

-- =====================================================
-- 5. Tabla de logs de sincronización DPA
-- =====================================================
CREATE TABLE IF NOT EXISTS geo_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'regions', 'provinces', 'communes')),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  regions_count INTEGER DEFAULT 0,
  provinces_count INTEGER DEFAULT 0,
  communes_count INTEGER DEFAULT 0,
  error_message TEXT NULL,
  duration_ms INTEGER NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geo_sync_logs_user_id_idx ON geo_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS geo_sync_logs_created_at_idx ON geo_sync_logs(created_at DESC);

COMMENT ON TABLE geo_sync_logs IS 'Registro de sincronizaciones con API DPA';

-- =====================================================
-- 6. Funciones para actualizar updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_geo_regions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_geo_provinces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_geo_communes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS geo_regions_updated_at_trigger ON geo_regions;
CREATE TRIGGER geo_regions_updated_at_trigger
  BEFORE UPDATE ON geo_regions
  FOR EACH ROW
  EXECUTE FUNCTION update_geo_regions_updated_at();

DROP TRIGGER IF EXISTS geo_provinces_updated_at_trigger ON geo_provinces;
CREATE TRIGGER geo_provinces_updated_at_trigger
  BEFORE UPDATE ON geo_provinces
  FOR EACH ROW
  EXECUTE FUNCTION update_geo_provinces_updated_at();

DROP TRIGGER IF EXISTS geo_communes_updated_at_trigger ON geo_communes;
CREATE TRIGGER geo_communes_updated_at_trigger
  BEFORE UPDATE ON geo_communes
  FOR EACH ROW
  EXECUTE FUNCTION update_geo_communes_updated_at();

-- =====================================================
-- 7. RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en todas las tablas geo
ALTER TABLE geo_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden leer regiones/provincias/comunas activas
DROP POLICY IF EXISTS "geo_regions_select_all" ON geo_regions;
CREATE POLICY "geo_regions_select_all" ON geo_regions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "geo_provinces_select_all" ON geo_provinces;
CREATE POLICY "geo_provinces_select_all" ON geo_provinces
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "geo_communes_select_all" ON geo_communes;
CREATE POLICY "geo_communes_select_all" ON geo_communes
  FOR SELECT
  USING (true);

-- Policy: Solo super_admins pueden modificar datos geo
DROP POLICY IF EXISTS "geo_regions_admin_all" ON geo_regions;
CREATE POLICY "geo_regions_admin_all" ON geo_regions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "geo_provinces_admin_all" ON geo_provinces;
CREATE POLICY "geo_provinces_admin_all" ON geo_provinces
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "geo_communes_admin_all" ON geo_communes;
CREATE POLICY "geo_communes_admin_all" ON geo_communes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Policy: Logs pueden ser leídos por admins
DROP POLICY IF EXISTS "geo_sync_logs_select_admin" ON geo_sync_logs;
CREATE POLICY "geo_sync_logs_select_admin" ON geo_sync_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'super_admin'
        OR EXISTS (
          SELECT 1 FROM company_users
          WHERE company_users.user_id = auth.uid()
          AND company_users.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Policy: Solo super_admins pueden insertar logs
DROP POLICY IF EXISTS "geo_sync_logs_insert_admin" ON geo_sync_logs;
CREATE POLICY "geo_sync_logs_insert_admin" ON geo_sync_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- =====================================================
-- 8. Verificación
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migración 087 completada exitosamente';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Tablas creadas:';
  RAISE NOTICE '  - geo_regions';
  RAISE NOTICE '  - geo_provinces';
  RAISE NOTICE '  - geo_communes';
  RAISE NOTICE '  - geo_sync_logs';
  RAISE NOTICE '';
  RAISE NOTICE 'Columnas agregadas a employees:';
  RAISE NOTICE '  - region_id (FK)';
  RAISE NOTICE '  - commune_id (FK)';
  RAISE NOTICE '  - province_id (FK, opcional)';
  RAISE NOTICE '  - region_name_legacy (fallback)';
  RAISE NOTICE '  - city_name_legacy (fallback)';
  RAISE NOTICE '';
  RAISE NOTICE 'SIGUIENTE PASO:';
  RAISE NOTICE '  Ejecutar sincronización inicial con API DPA:';
  RAISE NOTICE '  POST /api/admin/geo/sync-dpa';
  RAISE NOTICE '==============================================';
END $$;


