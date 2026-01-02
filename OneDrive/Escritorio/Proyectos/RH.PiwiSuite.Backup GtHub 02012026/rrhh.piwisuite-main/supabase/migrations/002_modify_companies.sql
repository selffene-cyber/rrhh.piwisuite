-- ============================================
-- MIGRACIÓN 002: Modificar tabla companies
-- ============================================
-- Agregar campos necesarios para multi-tenancy
-- ============================================

-- Agregar campos nuevos (usando IF NOT EXISTS pattern)
DO $$ 
BEGIN
  -- owner_id: Usuario propietario de la empresa
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'owner_id') THEN
    ALTER TABLE companies ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;

  -- status: Estado de la empresa
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'status') THEN
    ALTER TABLE companies ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
      CHECK (status IN ('active', 'inactive', 'suspended'));
  END IF;

  -- subscription_tier: Nivel de suscripción (para futuras funcionalidades)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'subscription_tier') THEN
    ALTER TABLE companies ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'basic' 
      CHECK (subscription_tier IN ('basic', 'pro', 'enterprise'));
  END IF;

  -- max_users: Límite de usuarios por plan
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'max_users') THEN
    ALTER TABLE companies ADD COLUMN max_users INTEGER DEFAULT 10;
  END IF;

  -- max_employees: Límite de empleados por plan
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'companies' AND column_name = 'max_employees') THEN
    ALTER TABLE companies ADD COLUMN max_employees INTEGER DEFAULT 100;
  END IF;
END $$;

-- Índice para owner_id
CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Comentarios
COMMENT ON COLUMN companies.owner_id IS 'Usuario propietario/creador de la empresa';
COMMENT ON COLUMN companies.status IS 'Estado de la empresa: active, inactive, suspended';
COMMENT ON COLUMN companies.subscription_tier IS 'Nivel de suscripción: basic, pro, enterprise';

