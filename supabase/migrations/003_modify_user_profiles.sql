-- ============================================
-- MIGRACIÓN 003: Modificar tabla user_profiles
-- ============================================
-- Agregar campos opcionales para mejor UX
-- ============================================

DO $$ 
BEGIN
  -- default_company_id: Empresa por defecto del usuario
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'default_company_id') THEN
    ALTER TABLE user_profiles ADD COLUMN default_company_id UUID REFERENCES companies(id);
  END IF;

  -- preferred_language: Idioma preferido (para futuras funcionalidades i18n)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'preferred_language') THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'es';
  END IF;
END $$;

-- Índice para default_company_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_default_company ON user_profiles(default_company_id);

-- Comentarios
COMMENT ON COLUMN user_profiles.default_company_id IS 'Empresa por defecto que se selecciona al iniciar sesión';
COMMENT ON COLUMN user_profiles.preferred_language IS 'Idioma preferido del usuario';

