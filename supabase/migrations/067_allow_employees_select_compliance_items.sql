-- ============================================
-- MIGRACIÓN 067: Permitir que trabajadores vean compliance_items de su empresa
-- ============================================
-- Problema: en el portal trabajador, el endpoint /api/compliance/worker devuelve worker_compliance,
-- pero el join compliance_items puede venir NULL por RLS si el usuario no "pertenece" a la empresa
-- vía company_users. Los trabajadores normalmente están asociados vía employees.user_id.
--
-- Solución: agregar policy SELECT adicional para compliance_items basada en employees.

DO $$
BEGIN
  -- Crear policy solo si no existe
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compliance_items'
      AND policyname = 'Employees see compliance_items of their company'
  ) THEN
    CREATE POLICY "Employees see compliance_items of their company"
    ON public.compliance_items
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.user_id = auth.uid()
          AND e.company_id = compliance_items.company_id
      )
    );
  END IF;
END $$;







