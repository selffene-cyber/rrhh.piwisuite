-- ============================================
-- MIGRACIÓN 041: Permitir que usuarios actualicen su propio perfil
-- ============================================
-- Agrega política RLS para que los usuarios puedan actualizar su propio perfil
-- Específicamente para cambiar must_change_password y password_changed_at
-- ============================================

-- Política: Los usuarios pueden actualizar su propio perfil
-- Esto permite que los trabajadores actualicen must_change_password y password_changed_at
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Comentario
COMMENT ON POLICY "Users can update own profile" ON user_profiles IS 
'Permite que los usuarios actualicen su propio perfil, necesario para cambiar must_change_password después de cambiar la contraseña';

