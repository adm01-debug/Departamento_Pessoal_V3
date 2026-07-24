
-- integracoes table (integracoesService.ts, useIntegracoes.ts)
CREATE TABLE IF NOT EXISTS public.integracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  ativa BOOLEAN DEFAULT false,
  configuracao JSONB DEFAULT '{}',
  ultima_sincronizacao TIMESTAMPTZ,
  status TEXT DEFAULT 'desconectada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage integracoes" ON public.integracoes;
CREATE POLICY "Auth users manage integracoes" ON public.integracoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- logs_integracoes table (integracoesService.ts)
CREATE TABLE IF NOT EXISTS public.logs_integracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_id UUID REFERENCES public.integracoes(id) ON DELETE CASCADE,
  tipo TEXT,
  mensagem TEXT,
  detalhes JSONB,
  status TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.logs_integracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users read logs_integracoes" ON public.logs_integracoes;
CREATE POLICY "Auth users read logs_integracoes" ON public.logs_integracoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- contratacao storage bucket (contratacaoService.ts)
INSERT INTO storage.buckets (id, name, public) VALUES ('contratacao', 'contratacao', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Auth users upload contratacao" ON storage.objects;
CREATE POLICY "Auth users upload contratacao" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'contratacao') WITH CHECK (bucket_id = 'contratacao');
