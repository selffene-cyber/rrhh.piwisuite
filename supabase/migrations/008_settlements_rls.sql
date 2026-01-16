-- ============================================
-- MIGRACIÓN 008: Políticas RLS para Finiquitos
-- ============================================

-- Habilitar RLS en las tablas
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_causes ENABLE ROW LEVEL SECURITY; -- Tabla maestra, todos pueden leer

-- ============================================
-- SETTLEMENT_CAUSES (Maestro - Solo lectura)
-- ============================================

-- Todos los usuarios autenticados pueden leer las causales
CREATE POLICY "Anyone can read settlement causes"
ON settlement_causes FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================
-- SETTLEMENTS
-- ============================================

-- Super admins ven todos los finiquitos
CREATE POLICY "Super admins see all settlements"
ON settlements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Usuarios ven finiquitos de su(s) empresa(s)
CREATE POLICY "Users see settlements of their companies"
ON settlements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = settlements.company_id
      AND status = 'active'
  )
);

-- Super admins pueden crear finiquitos en cualquier empresa
CREATE POLICY "Super admins can create settlements"
ON settlements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Usuarios pueden crear finiquitos en su(s) empresa(s)
CREATE POLICY "Users can create settlements in their companies"
ON settlements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = settlements.company_id
      AND status = 'active'
  )
);

-- Super admins pueden actualizar cualquier finiquito
CREATE POLICY "Super admins can update settlements"
ON settlements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Usuarios pueden actualizar finiquitos de su(s) empresa(s)
-- Nota: Las restricciones de cambio de estado se validan a nivel de aplicación (API)
CREATE POLICY "Users can update settlements in their companies"
ON settlements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = settlements.company_id
      AND status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = settlements.company_id
      AND status = 'active'
  )
);

-- Super admins pueden eliminar finiquitos (solo drafts o void)
CREATE POLICY "Super admins can delete settlements"
ON settlements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
  AND status IN ('draft', 'void') -- Solo se pueden eliminar borradores o anulados
);

-- Usuarios pueden eliminar finiquitos de su empresa (solo drafts o void)
CREATE POLICY "Users can delete settlements in their companies"
ON settlements FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = settlements.company_id
      AND status = 'active'
  )
  AND settlements.status IN ('draft', 'void') -- Solo se pueden eliminar borradores o anulados
);

-- ============================================
-- SETTLEMENT_ITEMS
-- ============================================

-- Los items se pueden leer si se puede leer el settlement padre
CREATE POLICY "Users can read settlement items"
ON settlement_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM settlements
    WHERE settlements.id = settlement_items.settlement_id
    AND (
      -- Super admin
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      -- Usuario de la empresa
      EXISTS (
        SELECT 1 FROM public.company_users
        WHERE user_id = auth.uid()
          AND company_id = settlements.company_id
          AND status = 'active'
      )
    )
  )
);

-- Los items se pueden crear si se puede crear/actualizar el settlement padre
CREATE POLICY "Users can create settlement items"
ON settlement_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM settlements
    WHERE settlements.id = settlement_items.settlement_id
    AND (
      -- Super admin
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      -- Usuario de la empresa
      EXISTS (
        SELECT 1 FROM public.company_users
        WHERE user_id = auth.uid()
          AND company_id = settlements.company_id
          AND status = 'active'
      )
    )
  )
);

-- Los items se pueden actualizar si se puede actualizar el settlement padre
CREATE POLICY "Users can update settlement items"
ON settlement_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM settlements
    WHERE settlements.id = settlement_items.settlement_id
    AND (
      -- Super admin
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      -- Usuario de la empresa (solo si settlement no está en estado final)
      EXISTS (
        SELECT 1 FROM public.company_users
        WHERE user_id = auth.uid()
          AND company_id = settlements.company_id
          AND status = 'active'
      )
      AND settlements.status NOT IN ('signed', 'paid') -- No se pueden modificar items si ya está firmado o pagado
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM settlements
    WHERE settlements.id = settlement_items.settlement_id
    AND (
      -- Super admin
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      -- Usuario de la empresa (solo si settlement no está en estado final)
      EXISTS (
        SELECT 1 FROM public.company_users
        WHERE user_id = auth.uid()
          AND company_id = settlements.company_id
          AND status = 'active'
      )
      AND settlements.status NOT IN ('signed', 'paid') -- No se pueden modificar items si ya está firmado o pagado
    )
  )
);

-- Los items se pueden eliminar si se puede eliminar el settlement padre
CREATE POLICY "Users can delete settlement items"
ON settlement_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM settlements
    WHERE settlements.id = settlement_items.settlement_id
    AND (
      -- Super admin
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
      OR
      -- Usuario de la empresa (solo drafts o void)
      EXISTS (
        SELECT 1 FROM public.company_users
        WHERE user_id = auth.uid()
          AND company_id = settlements.company_id
          AND status = 'active'
      )
      AND settlements.status IN ('draft', 'void')
    )
  )
);

