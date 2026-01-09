-- ============================================
-- MIGRACIÓN 074: Políticas RLS para audit_events
-- ============================================
-- Permisos de acceso al sistema de auditoría
-- ============================================

-- Habilitar RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE SELECT (Lectura)
-- ============================================

-- Super admin puede ver todos los eventos
CREATE POLICY "Super admins see all audit events"
ON audit_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'super_admin'
  )
);

-- Admins pueden ver todos los eventos de su empresa
CREATE POLICY "Admins see audit events of their company"
ON audit_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_users cu
    JOIN user_profiles up ON up.id = auth.uid()
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = audit_events.company_id
    AND cu.role IN ('owner', 'admin')
    AND cu.status = 'active'
  )
);

-- Trabajadores pueden ver solo sus propios eventos
CREATE POLICY "Employees see their own audit events"
ON audit_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = audit_events.employee_id
    AND e.user_id = auth.uid()
  )
);

-- ============================================
-- POLÍTICAS DE INSERT (Escritura)
-- ============================================

-- Solo usuarios autenticados pueden insertar eventos
-- (El sistema inserta eventos automáticamente)
CREATE POLICY "Authenticated users can insert audit events"
ON audit_events FOR INSERT
TO authenticated
WITH CHECK (
  -- Verificar que el usuario esté asociado a la empresa del evento
  EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = audit_events.company_id
    AND cu.status = 'active'
  )
  OR
  -- O que sea super_admin
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'super_admin'
  )
  OR
  -- O que sea trabajador insertando su propio evento
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = audit_events.employee_id
    AND e.user_id = auth.uid()
  )
);

-- ============================================
-- POLÍTICAS DE UPDATE/DELETE
-- ============================================

-- NINGÚN usuario puede actualizar o eliminar eventos
-- El sistema de auditoría es append-only
-- (No creamos políticas, lo que significa que por defecto están denegadas)

-- Comentario explicativo
COMMENT ON POLICY "Authenticated users can insert audit events" ON audit_events IS 
'Permite a usuarios autenticados insertar eventos. El sistema es append-only (nunca se actualiza ni elimina)';

COMMENT ON POLICY "Employees see their own audit events" ON audit_events IS 
'Permite a trabajadores ver solo los eventos relacionados con su employee_id';





