
-- =====================================================
-- FASE 1: Fundamentos CLT — Medidas Disciplinares
-- =====================================================

-- 1. Extensão da tabela medidas_disciplinares
ALTER TABLE public.medidas_disciplinares
  ADD COLUMN IF NOT EXISTS data_conhecimento_fato date,
  ADD COLUMN IF NOT EXISTS prazo_ciencia_dias integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS status_workflow text DEFAULT 'aplicada'
    CHECK (status_workflow IN ('rascunho','aguardando_aprovacao','aplicada','contestada','arquivada','rejeitada')),
  ADD COLUMN IF NOT EXISTS gravidade text
    CHECK (gravidade IS NULL OR gravidade IN ('leve','media','grave','gravissima')),
  ADD COLUMN IF NOT EXISTS aprovador_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao timestamptz,
  ADD COLUMN IF NOT EXISTS contestacao_texto text,
  ADD COLUMN IF NOT EXISTS contestacao_data timestamptz,
  ADD COLUMN IF NOT EXISTS contestacao_resposta text,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS pdf_hash_sha256 text,
  ADD COLUMN IF NOT EXISTS pdf_gerado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_medidas_status_workflow
  ON public.medidas_disciplinares(empresa_id, status_workflow);
CREATE INDEX IF NOT EXISTS idx_medidas_aprovador
  ON public.medidas_disciplinares(aprovador_id)
  WHERE aprovador_id IS NOT NULL;

-- 2. Catálogo de infrações parametrizável por empresa
CREATE TABLE IF NOT EXISTS public.catalogo_infracoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  descricao text NOT NULL,
  gravidade text NOT NULL CHECK (gravidade IN ('leve','media','grave','gravissima')),
  artigo_clt_sugerido text,
  tipo_sugerido text NOT NULL CHECK (tipo_sugerido IN ('advertencia_verbal','advertencia_escrita','suspensao','justa_causa')),
  dias_suspensao_sugerido integer,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogo_infracoes TO authenticated;
GRANT ALL ON public.catalogo_infracoes TO service_role;

ALTER TABLE public.catalogo_infracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogo_infracoes_select" ON public.catalogo_infracoes
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

CREATE POLICY "catalogo_infracoes_insert" ON public.catalogo_infracoes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT get_user_empresas(auth.uid())));

CREATE POLICY "catalogo_infracoes_update" ON public.catalogo_infracoes
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

CREATE POLICY "catalogo_infracoes_delete" ON public.catalogo_infracoes
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_catalogo_infracoes_empresa
  ON public.catalogo_infracoes(empresa_id, ativo);

CREATE OR REPLACE FUNCTION public.tg_catalogo_infracoes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_catalogo_infracoes_updated_at ON public.catalogo_infracoes;
CREATE TRIGGER trg_catalogo_infracoes_updated_at
  BEFORE UPDATE ON public.catalogo_infracoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_catalogo_infracoes_updated_at();

-- 3. Trigger: validação CLT (prescrição + non bis in idem + imediatidade)
CREATE OR REPLACE FUNCTION public.fn_validar_medida_disciplinar_clt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias_desde_ocorrencia integer;
  v_dias_desde_conhecimento integer;
  v_ja_existe boolean;
BEGIN
  -- Só validar em INSERT ou quando status_workflow entra em 'aplicada' vindo de outro estado
  IF (TG_OP = 'UPDATE' AND NEW.status_workflow = OLD.status_workflow) THEN
    RETURN NEW;
  END IF;

  -- Só bloqueia em rascunho quando o registro está sendo aplicado
  IF NEW.status_workflow IN ('rascunho','aguardando_aprovacao') THEN
    RETURN NEW;
  END IF;

  -- Prescrição: fato ocorrido há mais de 60 dias
  v_dias_desde_ocorrencia := (CURRENT_DATE - NEW.data_ocorrencia);
  IF v_dias_desde_ocorrencia > 60 THEN
    RAISE EXCEPTION 'Medida disciplinar prescrita: fato ocorrido há % dias (limite CLT: 60 dias sem punição = perdão tácito)', v_dias_desde_ocorrencia
      USING ERRCODE = 'check_violation';
  END IF;

  -- Imediatidade: se informou data_conhecimento_fato, não pode ter mais de 30 dias entre conhecimento e aplicação
  IF NEW.data_conhecimento_fato IS NOT NULL THEN
    v_dias_desde_conhecimento := (CURRENT_DATE - NEW.data_conhecimento_fato);
    IF v_dias_desde_conhecimento > 30 THEN
      RAISE EXCEPTION 'Princípio da imediatidade violado: empresa teve ciência há % dias (limite recomendado: 30 dias)', v_dias_desde_conhecimento
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Non bis in idem: não pode existir outra medida aplicada para o MESMO colaborador na MESMA data
  SELECT EXISTS (
    SELECT 1 FROM public.medidas_disciplinares
    WHERE colaborador_id = NEW.colaborador_id
      AND data_ocorrencia = NEW.data_ocorrencia
      AND status_workflow = 'aplicada'
      AND id <> COALESCE(NEW.id, gen_random_uuid())
  ) INTO v_ja_existe;

  IF v_ja_existe THEN
    RAISE EXCEPTION 'Dupla punição (non bis in idem): já existe medida disciplinar aplicada para este colaborador na data %', NEW.data_ocorrencia
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_medida_clt ON public.medidas_disciplinares;
CREATE TRIGGER trg_validar_medida_clt
  BEFORE INSERT OR UPDATE ON public.medidas_disciplinares
  FOR EACH ROW EXECUTE FUNCTION public.fn_validar_medida_disciplinar_clt();

-- 4. RPC: sugerir próxima medida baseada em histórico
CREATE OR REPLACE FUNCTION public.sugerir_proxima_medida(
  p_colaborador_id uuid,
  p_empresa_id uuid
)
RETURNS TABLE (
  tipo_sugerido text,
  justificativa text,
  historico_12m jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verbal int;
  v_escrita int;
  v_suspensao int;
  v_tipo text;
  v_just text;
BEGIN
  -- Segurança: valida que o usuário pertence à empresa
  IF NOT (p_empresa_id = ANY (SELECT get_user_empresas(auth.uid()))) THEN
    RAISE EXCEPTION 'Acesso negado: empresa % fora do escopo do usuário', p_empresa_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE tipo = 'advertencia_verbal'),
    COUNT(*) FILTER (WHERE tipo = 'advertencia_escrita'),
    COUNT(*) FILTER (WHERE tipo = 'suspensao')
  INTO v_verbal, v_escrita, v_suspensao
  FROM public.medidas_disciplinares
  WHERE colaborador_id = p_colaborador_id
    AND empresa_id = p_empresa_id
    AND status_workflow = 'aplicada'
    AND data_ocorrencia >= (CURRENT_DATE - INTERVAL '12 months');

  -- Gradação CLT
  IF v_suspensao >= 2 THEN
    v_tipo := 'justa_causa';
    v_just := format('Colaborador com %s suspensão(ões) em 12 meses. Padrão de reincidência sustenta justa causa (Art. 482 CLT).', v_suspensao);
  ELSIF v_escrita >= 2 OR v_suspensao >= 1 THEN
    v_tipo := 'suspensao';
    v_just := format('Colaborador com %s advertência(s) escrita(s) e %s suspensão(ões). Gradação: aplicar suspensão.', v_escrita, v_suspensao);
  ELSIF v_verbal >= 2 OR v_escrita >= 1 THEN
    v_tipo := 'advertencia_escrita';
    v_just := format('Colaborador com %s advertência(s) verbal(is). Gradação: advertência escrita.', v_verbal);
  ELSE
    v_tipo := 'advertencia_verbal';
    v_just := 'Colaborador sem histórico relevante. Iniciar por advertência verbal.';
  END IF;

  RETURN QUERY SELECT
    v_tipo,
    v_just,
    jsonb_build_object(
      'advertencia_verbal', v_verbal,
      'advertencia_escrita', v_escrita,
      'suspensao', v_suspensao
    );
END;
$$;

REVOKE ALL ON FUNCTION public.sugerir_proxima_medida(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sugerir_proxima_medida(uuid, uuid) TO authenticated;

-- 5. Estender tabela de anexos: adicionar tipo e tamanho
ALTER TABLE public.medidas_disciplinares_anexos
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'evidencia',
  ADD COLUMN IF NOT EXISTS tamanho_bytes bigint,
  ADD COLUMN IF NOT EXISTS mime_type text;
