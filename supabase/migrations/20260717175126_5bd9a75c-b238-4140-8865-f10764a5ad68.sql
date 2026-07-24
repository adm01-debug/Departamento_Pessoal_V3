-- AFDT/ACJEF Importações (Portaria MTP 671/2021)
CREATE TABLE IF NOT EXISTS public.afdt_importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('AFDT','ACJEF','AEJ')),
  nome_arquivo TEXT NOT NULL,
  tamanho_bytes INTEGER,
  hash_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando','concluido','erro','parcial')),
  total_linhas INTEGER DEFAULT 0,
  total_registros INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,
  cnpj_empregador TEXT,
  data_inicial DATE,
  data_final DATE,
  mensagem_erro TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  importado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.afdt_registros_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID NOT NULL REFERENCES public.afdt_importacoes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  nsr BIGINT,
  tipo_registro TEXT,
  linha_numero INTEGER,
  data_hora_marcacao TIMESTAMPTZ,
  cpf TEXT,
  pis TEXT,
  colaborador_id UUID,
  conteudo_original TEXT,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afdt_imp_empresa ON public.afdt_importacoes(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_afdt_raw_imp ON public.afdt_registros_raw(importacao_id);
CREATE INDEX IF NOT EXISTS idx_afdt_raw_cpf ON public.afdt_registros_raw(empresa_id, cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_afdt_raw_data ON public.afdt_registros_raw(empresa_id, data_hora_marcacao) WHERE data_hora_marcacao IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.afdt_importacoes TO authenticated;
GRANT ALL ON public.afdt_importacoes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.afdt_registros_raw TO authenticated;
GRANT ALL ON public.afdt_registros_raw TO service_role;

ALTER TABLE public.afdt_importacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afdt_registros_raw ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "afdt_imp_tenant_all" ON public.afdt_importacoes;
CREATE POLICY "afdt_imp_tenant_all" ON public.afdt_importacoes
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()));

DROP POLICY IF EXISTS "afdt_raw_tenant_all" ON public.afdt_registros_raw;
CREATE POLICY "afdt_raw_tenant_all" ON public.afdt_registros_raw
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_afdt_imp_updated ON public.afdt_importacoes;
CREATE TRIGGER trg_afdt_imp_updated
  BEFORE UPDATE ON public.afdt_importacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();