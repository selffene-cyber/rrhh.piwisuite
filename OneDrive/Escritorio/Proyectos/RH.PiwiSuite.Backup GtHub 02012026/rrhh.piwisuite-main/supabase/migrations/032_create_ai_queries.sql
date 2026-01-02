-- Tabla para registrar las consultas al Asistente IA
CREATE TABLE IF NOT EXISTS public.ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer_preview TEXT, -- Preview de la respuesta (primeros 200 caracteres)
  context_type VARCHAR(20) CHECK (context_type IN ('general', 'employee', 'period')),
  context_id UUID, -- Puede ser employee_id o period_id según context_type
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_ai_queries_user_id ON public.ai_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_queries_company_id ON public.ai_queries(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_queries_created_at ON public.ai_queries(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.ai_queries IS 'Registro de consultas realizadas al Asistente IA';
COMMENT ON COLUMN public.ai_queries.context_type IS 'Tipo de contexto: general, employee, period';
COMMENT ON COLUMN public.ai_queries.context_id IS 'ID del contexto (employee_id o period_id según context_type)';
COMMENT ON COLUMN public.ai_queries.tokens_used IS 'Número de tokens utilizados en la consulta (si está disponible)';

