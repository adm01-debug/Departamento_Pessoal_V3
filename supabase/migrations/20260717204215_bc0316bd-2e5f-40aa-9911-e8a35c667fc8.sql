
-- Enrich sst_cat with S-2210 required fields
ALTER TABLE public.sst_cat
  ADD COLUMN IF NOT EXISTS numero_cat TEXT,
  ADD COLUMN IF NOT EXISTS tipo_cat TEXT NOT NULL DEFAULT 'inicial' CHECK (tipo_cat IN ('inicial','reabertura','comunicacao_obito')),
  ADD COLUMN IF NOT EXISTS cid_principal TEXT,
  ADD COLUMN IF NOT EXISTS cid_secundarios TEXT[],
  ADD COLUMN IF NOT EXISTS parte_corpo_codigo TEXT,
  ADD COLUMN IF NOT EXISTS agente_causador_codigo TEXT,
  ADD COLUMN IF NOT EXISTS situacao_geradora TEXT,
  ADD COLUMN IF NOT EXISTS hora_acidente TIME,
  ADD COLUMN IF NOT EXISTS minutos_trabalhados_antes INT,
  ADD COLUMN IF NOT EXISTS tipo_local TEXT CHECK (tipo_local IN ('estabelecimento_empregador','via_publica','area_rural','outros')),
  ADD COLUMN IF NOT EXISTS especificacao_local TEXT,
  ADD COLUMN IF NOT EXISTS ultimo_dia_trabalhado DATE,
  ADD COLUMN IF NOT EXISTS houve_internacao BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS iniciativa_cat TEXT DEFAULT 'empregador' CHECK (iniciativa_cat IN ('empregador','ordem_judicial','determinacao_orgao_fiscalizador')),
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS cat_origem_id UUID REFERENCES public.sst_cat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retifica_cat_id UUID REFERENCES public.sst_cat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS atestado_medico_url TEXT,
  ADD COLUMN IF NOT EXISTS boletim_ocorrencia_url TEXT,
  ADD COLUMN IF NOT EXISTS prazo_limite_envio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_envio_esocial TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evento_esocial_id UUID,
  ADD COLUMN IF NOT EXISTS dias_afastamento_estimado INT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_sst_cat_prazo ON public.sst_cat(prazo_limite_envio) WHERE data_envio_esocial IS NULL;
CREATE INDEX IF NOT EXISTS idx_sst_cat_status ON public.sst_cat(status_esocial);
CREATE INDEX IF NOT EXISTS idx_sst_cat_data ON public.sst_cat(data_acidente DESC);

-- Testemunhas
CREATE TABLE IF NOT EXISTS public.sst_cat_testemunhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID NOT NULL REFERENCES public.sst_cat(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  endereco TEXT,
  depoimento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_cat_testemunhas TO authenticated;
GRANT ALL ON public.sst_cat_testemunhas TO service_role;
ALTER TABLE public.sst_cat_testemunhas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cat_testemunhas_por_empresa" ON public.sst_cat_testemunhas;
CREATE POLICY "cat_testemunhas_por_empresa" ON public.sst_cat_testemunhas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sst_cat c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = cat_id AND ue.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sst_cat c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = cat_id AND ue.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_sst_cat_testemunhas_cat ON public.sst_cat_testemunhas(cat_id);

-- Anexos
CREATE TABLE IF NOT EXISTS public.sst_cat_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID NOT NULL REFERENCES public.sst_cat(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('atestado','bo','laudo','foto','outros')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_cat_anexos TO authenticated;
GRANT ALL ON public.sst_cat_anexos TO service_role;
ALTER TABLE public.sst_cat_anexos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cat_anexos_por_empresa" ON public.sst_cat_anexos;
CREATE POLICY "cat_anexos_por_empresa" ON public.sst_cat_anexos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sst_cat c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = cat_id AND ue.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sst_cat c JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id WHERE c.id = cat_id AND ue.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_sst_cat_anexos_cat ON public.sst_cat_anexos(cat_id);

-- Trigger para calcular prazo legal e gerar número da CAT
CREATE OR REPLACE FUNCTION public.calcular_prazo_cat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Numero sequencial por empresa
  IF NEW.numero_cat IS NULL THEN
    NEW.numero_cat := 'CAT-' || TO_CHAR(now(), 'YYYY') || '-' ||
      LPAD((COALESCE((SELECT COUNT(*) FROM public.sst_cat WHERE empresa_id = NEW.empresa_id AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())), 0) + 1)::TEXT, 6, '0');
  END IF;

  -- Prazo legal: 24h se óbito, 1 dia útil caso contrário
  IF NEW.prazo_limite_envio IS NULL THEN
    IF NEW.houve_obito THEN
      NEW.prazo_limite_envio := NEW.data_acidente + INTERVAL '24 hours';
    ELSE
      NEW.prazo_limite_envio := NEW.data_acidente + INTERVAL '1 day';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_calcular_prazo_cat ON public.sst_cat;
CREATE TRIGGER tr_calcular_prazo_cat
  BEFORE INSERT ON public.sst_cat
  FOR EACH ROW EXECUTE FUNCTION public.calcular_prazo_cat();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_sst_cat()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS tr_updated_at_sst_cat ON public.sst_cat;
CREATE TRIGGER tr_updated_at_sst_cat BEFORE UPDATE ON public.sst_cat FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_sst_cat();

-- Recriar política mais estrita (multi-tenant)
DROP POLICY IF EXISTS "Gestores de RH podem ver CATs" ON public.sst_cat;
DROP POLICY IF EXISTS "cat_select_por_empresa" ON public.sst_cat;
CREATE POLICY "cat_select_por_empresa" ON public.sst_cat FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.empresa_id = sst_cat.empresa_id AND ue.user_id = auth.uid()));
DROP POLICY IF EXISTS "cat_insert_por_empresa" ON public.sst_cat;
CREATE POLICY "cat_insert_por_empresa" ON public.sst_cat FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.empresa_id = sst_cat.empresa_id AND ue.user_id = auth.uid()));
DROP POLICY IF EXISTS "cat_update_por_empresa" ON public.sst_cat;
CREATE POLICY "cat_update_por_empresa" ON public.sst_cat FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.empresa_id = sst_cat.empresa_id AND ue.user_id = auth.uid()));

-- RPC: dashboard CAT
CREATE OR REPLACE FUNCTION public.sst_cat_dashboard(p_empresa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = p_empresa_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'total_cats', COUNT(*),
    'pendentes_envio', COUNT(*) FILTER (WHERE data_envio_esocial IS NULL),
    'transmitidas', COUNT(*) FILTER (WHERE data_envio_esocial IS NOT NULL),
    'em_atraso', COUNT(*) FILTER (WHERE data_envio_esocial IS NULL AND prazo_limite_envio < now()),
    'obitos_ano', COUNT(*) FILTER (WHERE houve_obito AND EXTRACT(YEAR FROM data_acidente) = EXTRACT(YEAR FROM now())),
    'com_afastamento', COUNT(*) FILTER (WHERE houve_afastamento),
    'por_tipo', (
      SELECT jsonb_object_agg(tipo_acidente, cnt) FROM (
        SELECT tipo_acidente, COUNT(*) cnt FROM public.sst_cat WHERE empresa_id = p_empresa_id GROUP BY tipo_acidente
      ) t
    )
  ) INTO v_result
  FROM public.sst_cat
  WHERE empresa_id = p_empresa_id;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sst_cat_dashboard(UUID) TO authenticated;
