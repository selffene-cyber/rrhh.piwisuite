-- ============================================
-- MIGRACIÓN 001: Crear tabla company_users
-- ============================================
-- Esta tabla establece la relación muchos-a-muchos entre usuarios y empresas
-- ============================================

-- Tabla de relación usuario-empresa
CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_status ON company_users(status);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_company_users_updated_at
  BEFORE UPDATE ON company_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE company_users IS 'Relación muchos-a-muchos entre usuarios y empresas con roles específicos';
COMMENT ON COLUMN company_users.role IS 'Rol del usuario en la empresa: owner, admin, user';
COMMENT ON COLUMN company_users.status IS 'Estado de la relación: active, inactive, pending';

