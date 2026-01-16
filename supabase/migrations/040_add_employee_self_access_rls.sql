-- ============================================
-- MIGRACIÓN 040: Permitir que trabajadores vean su propio registro
-- ============================================
-- Agrega políticas RLS para que los trabajadores puedan acceder a su propio registro
-- Esto es necesario para el portal del trabajador y autenticación
-- ============================================

-- SELECT: Los trabajadores pueden ver su propio registro
CREATE POLICY "Employees can see their own record"
ON employees FOR SELECT
USING (
  user_id = auth.uid()
);

-- UPDATE: Los trabajadores pueden actualizar algunos campos de su propio registro
-- (Nota: Esto puede ser restrictivo dependiendo de qué campos queramos que actualicen)
-- Por ahora, permitimos que vean, pero las actualizaciones las harán los admins
-- Si en el futuro necesitamos que actualicen ciertos campos, podemos crear una política más específica

-- Comentario
COMMENT ON POLICY "Employees can see their own record" ON employees IS 
'Permite que los trabajadores vinculados vean su propio registro en la tabla employees, necesario para el portal del trabajador';








