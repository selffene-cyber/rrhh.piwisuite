-- Habilitar RLS en la tabla ai_queries
ALTER TABLE public.ai_queries ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propias consultas
CREATE POLICY "Users can view their own AI queries"
ON public.ai_queries
FOR SELECT
USING (auth.uid() = user_id);

-- Política: Los usuarios pueden insertar sus propias consultas
CREATE POLICY "Users can insert their own AI queries"
ON public.ai_queries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política: Los super admins pueden ver todas las consultas
CREATE POLICY "Super admins can view all AI queries"
ON public.ai_queries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Política: Los admins de empresa pueden ver consultas de su empresa
CREATE POLICY "Company admins can view company AI queries"
ON public.ai_queries
FOR SELECT
USING (
  company_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = ai_queries.company_id
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

