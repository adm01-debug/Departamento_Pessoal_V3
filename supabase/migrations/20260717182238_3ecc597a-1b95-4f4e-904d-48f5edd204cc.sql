-- ============================================================
-- Melhoria #10: Assinatura digital de espelho de ponto
-- ============================================================

-- 1) Enriquecer tabela existente
ALTER TABLE public.ponto_espelhos_assinados
  ADD COLUMN IF NOT EXISTS empresa_id uuid,
  ADD COLUMN IF NOT EXISTS competencia text,
  ADD COLUMN IF NOT EXISTS canonical_json jsonb,
  ADD COLUMN IF NOT EXISTS hash_sha256 text,
  ADD COLUMN IF NOT EXISTS total_batidas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assinado_por_user_id uuid,
  ADD COLUMN IF NOT EXISTS assinado_ip inet,
  ADD COLUMN IF NOT EXISTS assinado_user_agent text,
  ADD COLUMN IF NOT EXISTS assinado_em timestamptz;

-- 2) Índice único para impedir dupla assinatura
CREATE UNIQUE INDEX IF NOT EXISTS uq_espelho_colab_competencia
  ON public.ponto_espelhos_assinados (colaborador_id, competencia)
  WHERE competencia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_espelho_empresa_comp
  ON public.ponto_espelhos_assinados (empresa_id, competencia);

-- 3) Tabela de revogações (append-only, mantém histórico)
CREATE TABLE IF NOT EXISTS public.ponto_espelhos_revogacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  espelho_id uuid NOT NULL REFERENCES public.ponto_espelhos_assinados(id),
  revogado_por_user_id uuid NOT NULL,
  motivo text NOT NULL,
  revogado_em timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text
);

GRANT SELECT, INSERT ON public.ponto_espelhos_revogacoes TO authenticated;
GRANT ALL ON public.ponto_espelhos_revogacoes TO service_role;

ALTER TABLE public.ponto_espelhos_revogacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/RH visualizam revogações da sua empresa" ON public.ponto_espelhos_revogacoes;
CREATE POLICY "Admins/RH visualizam revogações da sua empresa"
  ON public.ponto_espelhos_revogacoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ponto_espelhos_assinados e
      JOIN public.user_empresas ue ON ue.empresa_id = e.empresa_id
      WHERE e.id = ponto_espelhos_revogacoes.espelho_id
        AND ue.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins inserem revogações" ON public.ponto_espelhos_revogacoes;
CREATE POLICY "Admins inserem revogações"
  ON public.ponto_espelhos_revogacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    revogado_por_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_revogacoes_espelho ON public.ponto_espelhos_revogacoes(espelho_id);

-- 4) RPC: gerar JSON canônico determinístico do espelho
CREATE OR REPLACE FUNCTION public.gerar_canonical_espelho_ponto(
  _colaborador_id uuid,
  _competencia text  -- formato YYYY-MM
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio date;
  v_fim date;
  v_colab record;
  v_batidas jsonb;
BEGIN
  v_inicio := to_date(_competencia || '-01', 'YYYY-MM-DD');
  v_fim := (v_inicio + interval '1 month' - interval '1 day')::date;

  SELECT c.id, c.nome_completo, c.cpf, c.pis_pasep, c.empresa_id, c.matricula
    INTO v_colab
    FROM public.colaboradores c
   WHERE c.id = _colaborador_id;

  IF v_colab.id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  -- Ordenação determinística: por timestamp ASC, depois id ASC
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'data_hora', to_char(b.data_hora AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI:SS'),
      'tipo', b.tipo,
      'origem', b.origem,
      'nsr', b.nsr
    ) ORDER BY b.data_hora ASC, b.id ASC
  ), '[]'::jsonb)
  INTO v_batidas
  FROM public.batidas_ponto b
  WHERE b.colaborador_id = _colaborador_id
    AND (b.data_hora AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN v_inicio AND v_fim;

  RETURN jsonb_build_object(
    'versao', '1.0',
    'colaborador', jsonb_build_object(
      'id', v_colab.id,
      'nome', v_colab.nome_completo,
      'cpf', v_colab.cpf,
      'pis', v_colab.pis_pasep,
      'matricula', v_colab.matricula
    ),
    'empresa_id', v_colab.empresa_id,
    'competencia', _competencia,
    'periodo', jsonb_build_object('inicio', v_inicio, 'fim', v_fim),
    'batidas', v_batidas,
    'total_batidas', jsonb_array_length(v_batidas)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gerar_canonical_espelho_ponto(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_canonical_espelho_ponto(uuid, text) TO authenticated;

-- 5) RPC: assinar espelho de ponto
CREATE OR REPLACE FUNCTION public.assinar_espelho_ponto(
  _colaborador_id uuid,
  _competencia text,
  _ip inet DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canonical jsonb;
  v_hash text;
  v_empresa_id uuid;
  v_periodo_inicio date;
  v_periodo_fim date;
  v_espelho_id uuid;
  v_total int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação requerida';
  END IF;

  -- Validar acesso: colaborador assinando o próprio OU admin/RH da empresa
  SELECT c.empresa_id INTO v_empresa_id
    FROM public.colaboradores c
   WHERE c.id = _colaborador_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE user_id = auth.uid() AND empresa_id = v_empresa_id
  ) AND auth.uid() <> _colaborador_id THEN
    RAISE EXCEPTION 'Sem permissão para assinar este espelho';
  END IF;

  v_periodo_inicio := to_date(_competencia || '-01', 'YYYY-MM-DD');
  v_periodo_fim := (v_periodo_inicio + interval '1 month' - interval '1 day')::date;

  v_canonical := public.gerar_canonical_espelho_ponto(_colaborador_id, _competencia);
  v_hash := encode(digest(v_canonical::text, 'sha256'), 'hex');
  v_total := (v_canonical->>'total_batidas')::int;

  -- Impedir reassinatura salvo se revogado
  IF EXISTS (
    SELECT 1 FROM public.ponto_espelhos_assinados
    WHERE colaborador_id = _colaborador_id AND competencia = _competencia
      AND NOT EXISTS (
        SELECT 1 FROM public.ponto_espelhos_revogacoes r
        WHERE r.espelho_id = ponto_espelhos_assinados.id
      )
  ) THEN
    RAISE EXCEPTION 'Espelho já assinado para esta competência (revogue antes de reassinar)';
  END IF;

  INSERT INTO public.ponto_espelhos_assinados (
    colaborador_id, empresa_id, competencia,
    periodo_inicio, periodo_fim,
    canonical_json, hash_sha256, total_batidas,
    assinado_por_user_id, assinado_ip, assinado_user_agent,
    assinado_em, data_assinatura_colaborador, status_assinatura
  ) VALUES (
    _colaborador_id, v_empresa_id, _competencia,
    v_periodo_inicio, v_periodo_fim,
    v_canonical, v_hash, v_total,
    auth.uid(), _ip, _user_agent,
    now(), now(), 'assinado'
  )
  RETURNING id INTO v_espelho_id;

  RETURN jsonb_build_object(
    'success', true,
    'espelho_id', v_espelho_id,
    'hash_sha256', v_hash,
    'total_batidas', v_total,
    'competencia', _competencia,
    'assinado_em', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assinar_espelho_ponto(uuid, text, inet, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assinar_espelho_ponto(uuid, text, inet, text) TO authenticated;

-- 6) RPC: verificar integridade do espelho (recalcula hash e compara)
CREATE OR REPLACE FUNCTION public.verificar_espelho_ponto(_espelho_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  v_canonical_atual jsonb;
  v_hash_atual text;
BEGIN
  SELECT * INTO v FROM public.ponto_espelhos_assinados WHERE id = _espelho_id;
  IF v IS NULL THEN
    RAISE EXCEPTION 'Espelho não encontrado';
  END IF;

  -- Verificar permissão
  IF NOT EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE user_id = auth.uid() AND empresa_id = v.empresa_id
  ) AND auth.uid() <> v.colaborador_id THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_canonical_atual := public.gerar_canonical_espelho_ponto(v.colaborador_id, v.competencia);
  v_hash_atual := encode(digest(v_canonical_atual::text, 'sha256'), 'hex');

  RETURN jsonb_build_object(
    'espelho_id', v.id,
    'hash_original', v.hash_sha256,
    'hash_atual', v_hash_atual,
    'integro', v.hash_sha256 = v_hash_atual,
    'assinado_em', v.assinado_em,
    'total_batidas_original', v.total_batidas,
    'total_batidas_atual', (v_canonical_atual->>'total_batidas')::int,
    'revogado', EXISTS(SELECT 1 FROM public.ponto_espelhos_revogacoes WHERE espelho_id = v.id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_espelho_ponto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verificar_espelho_ponto(uuid) TO authenticated;

-- 7) RPC: revogar assinatura (apenas admin)
CREATE OR REPLACE FUNCTION public.revogar_espelho_ponto(
  _espelho_id uuid,
  _motivo text,
  _ip inet DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem revogar assinaturas';
  END IF;

  IF _motivo IS NULL OR length(trim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mín. 5 caracteres)';
  END IF;

  INSERT INTO public.ponto_espelhos_revogacoes (
    espelho_id, revogado_por_user_id, motivo, ip, user_agent
  ) VALUES (_espelho_id, auth.uid(), _motivo, _ip, _user_agent);

  RETURN jsonb_build_object('success', true, 'espelho_id', _espelho_id);
END;
$$;

REVOKE ALL ON FUNCTION public.revogar_espelho_ponto(uuid, text, inet, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revogar_espelho_ponto(uuid, text, inet, text) TO authenticated;