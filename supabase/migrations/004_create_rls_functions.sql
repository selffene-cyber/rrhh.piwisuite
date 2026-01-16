-- ============================================
-- MIGRACIÓN 004: Funciones auxiliares para RLS
-- ============================================
-- Funciones necesarias para las políticas de seguridad a nivel de fila
-- ============================================

-- Función: Verificar si un usuario pertenece a una empresa
CREATE OR REPLACE FUNCTION user_belongs_to_company(
  p_user_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM company_users
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener IDs de empresas del usuario actual
CREATE OR REPLACE FUNCTION user_company_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT company_id
  FROM company_users
  WHERE user_id = auth.uid()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Verificar si el usuario actual es super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles
    WHERE id = auth.uid() 
      AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener el rol del usuario en una empresa específica
CREATE OR REPLACE FUNCTION user_company_role(p_company_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_role VARCHAR(20);
BEGIN
  SELECT role INTO v_role
  FROM company_users
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND status = 'active'
  LIMIT 1;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION user_belongs_to_company IS 'Verifica si un usuario pertenece a una empresa específica';
COMMENT ON FUNCTION user_company_ids IS 'Obtiene las IDs de todas las empresas del usuario actual';
COMMENT ON FUNCTION is_super_admin IS 'Verifica si el usuario actual es super administrador';
COMMENT ON FUNCTION user_company_role IS 'Obtiene el rol del usuario actual en una empresa específica';

