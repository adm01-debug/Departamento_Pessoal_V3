-- Drop stub table if empty
DROP TABLE IF EXISTS public.ferias_programacao CASCADE;

DO $$ BEGIN
  CREATE TYPE public.programacao_ferias_status AS ENUM (
    'rascunho','sugerido_gestor','aprovado_gestor','aprovado_rh','convertido','rejeitado','cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.ferias_programacao (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id        UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  periodo_aquisitivo_id UUID REFERENCES public.periodos_aquisitivos(id) ON DELETE SET NULL,
  ano                   INT  NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes_previsto          INT  NOT NULL CHECK (mes_previsto BETWEEN 1 AND 12),
  dias_previstos        INT  NOT NULL DEFAULT 30 CHECK (dias_previstos BETWEEN 5 AND 30),
  data_inicio_prevista  DATE,
  data_fim_prevista     DATE,
  status                public.programacao_ferias_status NOT NULL DEFAULT 'sugerido_gestor',
  observacoes           TEXT,

  aprovado_gestor_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_gestor_em    TIMESTAMPTZ,
  aprovado_rh_por       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_rh_em        TIMESTAMPTZ,
  rejeitado_por         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejeitado_em          TIMESTAMPTZ,
  rejeitado_motivo      TEXT,

  ferias_id             UUID REFERENCES public.ferias(id) ON DELETE SET NULL,
  criado_por            UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_datas_prevista CHECK (
    data_fim_prevista IS NULL OR data_inicio_prevista IS NULL OR data_fim_prevista >= data_inicio_prevista
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ferias_programacao TO authenticated;
GRANT ALL ON public.ferias_programacao TO service_role;

CREATE INDEX idx_fprog_empresa_ano_mes ON public.ferias_programacao(empresa_id, ano, mes_previsto);
CREATE INDEX idx_fprog_colaborador ON public.ferias_programacao(colaborador_id);
CREATE INDEX idx_fprog_ferias ON public.ferias_programacao(ferias_id) WHERE ferias_id IS NOT NULL;
CREATE INDEX idx_fprog_status ON public.ferias_programacao(empresa_id, status);
CREATE UNIQUE INDEX uq_fprog_unico_ativo
  ON public.ferias_programacao(colaborador_id, ano, periodo_aquisitivo_id)
  WHERE status <> 'cancelado';

-- updated_at trigger (reuses standard helper)
CREATE OR REPLACE FUNCTION public.fprog_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_fprog_updated_at
BEFORE UPDATE ON public.ferias_programacao
FOR EACH ROW EXECUTE FUNCTION public.fprog_touch_updated_at();

ALTER TABLE public.ferias_programacao ENABLE ROW LEVEL SECURITY;

-- SELECT: colaborador vê os próprios; membros da empresa veem tudo da empresa
CREATE POLICY fprog_select ON public.ferias_programacao
FOR SELECT TO authenticated
USING (
  public.user_belongs_to_empresa(auth.uid(), empresa_id)
  OR EXISTS (SELECT 1 FROM public.colaboradores c
             WHERE c.id = ferias_programacao.colaborador_id
               AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- INSERT: qualquer membro da empresa (gestor cria sugestão, RH cria direto)
CREATE POLICY fprog_insert ON public.ferias_programacao
FOR INSERT TO authenticated
WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- UPDATE: gestor/rh/admin da empresa
CREATE POLICY fprog_update ON public.ferias_programacao
FOR UPDATE TO authenticated
USING (
  public.user_belongs_to_empresa(auth.uid(), empresa_id)
  AND (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'admin'))
)
WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

-- DELETE: apenas rh/admin
CREATE POLICY fprog_delete ON public.ferias_programacao
FOR DELETE TO authenticated
USING (
  public.user_belongs_to_empresa(auth.uid(), empresa_id)
  AND (public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'admin'))
);

-- ============================================================
-- RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.programacao_ferias_aprovar_gestor(_id UUID)
RETURNS public.ferias_programacao
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.ferias_programacao;
BEGIN
  SELECT * INTO r FROM public.ferias_programacao WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Programação não encontrada' USING ERRCODE='P0002'; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), r.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão de escopo' USING ERRCODE='42501';
  END IF;
  IF NOT (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Apenas gestor/RH pode aprovar' USING ERRCODE='42501';
  END IF;
  IF r.status NOT IN ('sugerido_gestor','rascunho') THEN
    RAISE EXCEPTION 'Status atual não permite aprovação do gestor: %', r.status USING ERRCODE='22023';
  END IF;

  UPDATE public.ferias_programacao
     SET status = 'aprovado_gestor', aprovado_gestor_por = auth.uid(), aprovado_gestor_em = now()
   WHERE id = _id
  RETURNING * INTO r;

  INSERT INTO public.audit_log_unified(entity, entity_id, action, user_id, empresa_id, payload)
  VALUES ('ferias_programacao', _id, 'APROVAR_GESTOR', auth.uid(), r.empresa_id, to_jsonb(r));
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.programacao_ferias_aprovar_rh(_id UUID)
RETURNS public.ferias_programacao
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.ferias_programacao;
BEGIN
  SELECT * INTO r FROM public.ferias_programacao WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Programação não encontrada' USING ERRCODE='P0002'; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), r.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão de escopo' USING ERRCODE='42501';
  END IF;
  IF NOT (public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Apenas RH/Admin pode aprovar' USING ERRCODE='42501';
  END IF;
  IF r.status <> 'aprovado_gestor' THEN
    RAISE EXCEPTION 'Programação precisa estar aprovada pelo gestor. Status atual: %', r.status USING ERRCODE='22023';
  END IF;

  UPDATE public.ferias_programacao
     SET status = 'aprovado_rh', aprovado_rh_por = auth.uid(), aprovado_rh_em = now()
   WHERE id = _id
  RETURNING * INTO r;

  INSERT INTO public.audit_log_unified(entity, entity_id, action, user_id, empresa_id, payload)
  VALUES ('ferias_programacao', _id, 'APROVAR_RH', auth.uid(), r.empresa_id, to_jsonb(r));
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.programacao_ferias_rejeitar(_id UUID, _motivo TEXT)
RETURNS public.ferias_programacao
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.ferias_programacao;
BEGIN
  SELECT * INTO r FROM public.ferias_programacao WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Programação não encontrada' USING ERRCODE='P0002'; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), r.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão de escopo' USING ERRCODE='42501';
  END IF;
  IF NOT (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;
  IF r.status IN ('convertido','cancelado') THEN
    RAISE EXCEPTION 'Programação já finalizada: %', r.status USING ERRCODE='22023';
  END IF;

  UPDATE public.ferias_programacao
     SET status = 'rejeitado', rejeitado_por = auth.uid(), rejeitado_em = now(), rejeitado_motivo = _motivo
   WHERE id = _id
  RETURNING * INTO r;

  INSERT INTO public.audit_log_unified(entity, entity_id, action, user_id, empresa_id, payload)
  VALUES ('ferias_programacao', _id, 'REJEITAR', auth.uid(), r.empresa_id, jsonb_build_object('motivo', _motivo));
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.programacao_ferias_mover(
  _id UUID, _novo_mes INT, _nova_data_inicio DATE DEFAULT NULL
)
RETURNS TABLE(programacao public.ferias_programacao, aviso TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.ferias_programacao;
  v_aviso TEXT := NULL;
  v_limite DATE;
BEGIN
  IF _novo_mes < 1 OR _novo_mes > 12 THEN
    RAISE EXCEPTION 'mês inválido' USING ERRCODE='22023';
  END IF;

  SELECT * INTO r FROM public.ferias_programacao WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Programação não encontrada' USING ERRCODE='P0002'; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), r.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão de escopo' USING ERRCODE='42501';
  END IF;
  IF r.status IN ('convertido','cancelado','rejeitado') THEN
    RAISE EXCEPTION 'Não é possível mover programação no status %', r.status USING ERRCODE='22023';
  END IF;

  -- Aviso: Art. 137 CLT (dobra) — se período aquisitivo tem data_limite_concessao anterior ao fim do novo mês
  IF r.periodo_aquisitivo_id IS NOT NULL THEN
    SELECT data_limite_concessao INTO v_limite
      FROM public.periodos_aquisitivos WHERE id = r.periodo_aquisitivo_id;
    IF v_limite IS NOT NULL AND make_date(r.ano, _novo_mes, 1) > v_limite THEN
      v_aviso := 'Atenção: mês selecionado ultrapassa a data limite de concessão (Art. 137 CLT — férias em dobra).';
    END IF;
  END IF;

  UPDATE public.ferias_programacao
     SET mes_previsto = _novo_mes,
         data_inicio_prevista = COALESCE(_nova_data_inicio, NULL),
         data_fim_prevista = CASE
           WHEN _nova_data_inicio IS NOT NULL THEN (_nova_data_inicio + (r.dias_previstos - 1) * INTERVAL '1 day')::date
           ELSE NULL END
   WHERE id = _id
  RETURNING * INTO r;

  INSERT INTO public.audit_log_unified(entity, entity_id, action, user_id, empresa_id, payload)
  VALUES ('ferias_programacao', _id, 'MOVER', auth.uid(), r.empresa_id,
          jsonb_build_object('novo_mes', _novo_mes, 'nova_data_inicio', _nova_data_inicio, 'aviso', v_aviso));

  programacao := r; aviso := v_aviso; RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION public.programacao_ferias_converter(_id UUID)
RETURNS public.ferias
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.ferias_programacao;
  v_ferias public.ferias;
  v_inicio DATE;
  v_fim DATE;
BEGIN
  SELECT * INTO r FROM public.ferias_programacao WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Programação não encontrada' USING ERRCODE='P0002'; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), r.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão de escopo' USING ERRCODE='42501';
  END IF;
  IF NOT (public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Apenas RH/Admin pode converter' USING ERRCODE='42501';
  END IF;
  IF r.status <> 'aprovado_rh' THEN
    RAISE EXCEPTION 'Só é possível converter após aprovação do RH (status atual: %)', r.status USING ERRCODE='22023';
  END IF;
  IF r.ferias_id IS NOT NULL THEN
    RAISE EXCEPTION 'Programação já convertida' USING ERRCODE='22023';
  END IF;

  v_inicio := COALESCE(r.data_inicio_prevista, make_date(r.ano, r.mes_previsto, 1));
  v_fim    := COALESCE(r.data_fim_prevista, (v_inicio + (r.dias_previstos - 1) * INTERVAL '1 day')::date);

  INSERT INTO public.ferias (empresa_id, colaborador_id, periodo_aquisitivo_id, data_inicio, data_fim, dias_abono, status)
  VALUES (r.empresa_id, r.colaborador_id, r.periodo_aquisitivo_id, v_inicio, v_fim, 0, 'pendente')
  RETURNING * INTO v_ferias;

  UPDATE public.ferias_programacao
     SET status = 'convertido', ferias_id = v_ferias.id
   WHERE id = _id;

  INSERT INTO public.audit_log_unified(entity, entity_id, action, user_id, empresa_id, payload)
  VALUES ('ferias_programacao', _id, 'CONVERTER', auth.uid(), r.empresa_id,
          jsonb_build_object('ferias_id', v_ferias.id));

  RETURN v_ferias;
END $$;

REVOKE ALL ON FUNCTION public.programacao_ferias_aprovar_gestor(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.programacao_ferias_aprovar_rh(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.programacao_ferias_rejeitar(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.programacao_ferias_mover(UUID, INT, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.programacao_ferias_converter(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.programacao_ferias_aprovar_gestor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.programacao_ferias_aprovar_rh(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.programacao_ferias_rejeitar(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.programacao_ferias_mover(UUID, INT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.programacao_ferias_converter(UUID) TO authenticated;