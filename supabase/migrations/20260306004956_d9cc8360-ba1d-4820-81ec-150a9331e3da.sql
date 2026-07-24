
-- Tabela esocial_eventos
CREATE TABLE IF NOT EXISTS public.esocial_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  tipo_evento TEXT NOT NULL,
  dados JSONB DEFAULT '{}'::jsonb,
  competencia TEXT,
  status TEXT DEFAULT 'rascunho',
  data_envio TIMESTAMPTZ,
  protocolo TEXT,
  erros JSONB,
  xml TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.esocial_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage esocial_eventos" ON public.esocial_eventos;
CREATE POLICY "Auth users manage esocial_eventos" ON public.esocial_eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tabela esocial_lotes
CREATE TABLE IF NOT EXISTS public.esocial_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  eventos JSONB DEFAULT '[]'::jsonb,
  ambiente TEXT DEFAULT 'producao_restrita',
  status TEXT DEFAULT 'rascunho',
  progresso INTEGER DEFAULT 0,
  protocolo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.esocial_lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage esocial_lotes" ON public.esocial_lotes;
CREATE POLICY "Auth users manage esocial_lotes" ON public.esocial_lotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
