
ALTER TABLE public.medidas_disciplinares
  DROP CONSTRAINT IF EXISTS medidas_disciplinares_status_workflow_check;

ALTER TABLE public.medidas_disciplinares
  ADD CONSTRAINT medidas_disciplinares_status_workflow_check
  CHECK (status_workflow = ANY (ARRAY[
    'rascunho','aguardando_gestor','aguardando_rh','aguardando_juridico',
    'aplicada','rejeitada','arquivada','contestada'
  ]));

ALTER TABLE public.medidas_disciplinares
  ADD COLUMN IF NOT EXISTS aprovado_gestor_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS aprovado_gestor_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovado_rh_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS aprovado_rh_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovado_juridico_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS aprovado_juridico_em timestamptz,
  ADD COLUMN IF NOT EXISTS rejeitado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejeitado_em timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text,
  ADD COLUMN IF NOT EXISTS arquivado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

CREATE TABLE IF NOT EXISTS public.medidas_disciplinares_workflow_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medida_id uuid NOT NULL REFERENCES public.medidas_disciplinares(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL,
  de_status text,
  para_status text NOT NULL,
  acao text NOT NULL,
  ator_id uuid REFERENCES auth.users(id),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.medidas_disciplinares_workflow_log TO authenticated;
GRANT ALL ON public.medidas_disciplinares_workflow_log TO service_role;

ALTER TABLE public.medidas_disciplinares_workflow_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medidas_wf_log_select" ON public.medidas_disciplinares_workflow_log;
CREATE POLICY "medidas_wf_log_select" ON public.medidas_disciplinares_workflow_log
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE INDEX IF NOT EXISTS idx_medidas_wf_log_medida
  ON public.medidas_disciplinares_workflow_log(medida_id, created_at DESC);

-- RPCs
CREATE OR REPLACE FUNCTION public.medida_enviar_aprovacao(_medida_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_medida record; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  SELECT * INTO v_medida FROM public.medidas_disciplinares WHERE id = _medida_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida não encontrada'; END IF;
  IF NOT public.user_belongs_to_empresa(v_uid, v_medida.empresa_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF v_medida.status_workflow <> 'rascunho' THEN
    RAISE EXCEPTION 'só é possível enviar medidas em rascunho (atual: %)', v_medida.status_workflow;
  END IF;
  UPDATE public.medidas_disciplinares
     SET status_workflow = 'aguardando_gestor', updated_at = now()
   WHERE id = _medida_id;
  INSERT INTO public.medidas_disciplinares_workflow_log
    (medida_id, empresa_id, de_status, para_status, acao, ator_id)
    VALUES (_medida_id, v_medida.empresa_id, 'rascunho', 'aguardando_gestor', 'enviar', v_uid);
  RETURN jsonb_build_object('ok', true, 'status', 'aguardando_gestor');
END; $$;

CREATE OR REPLACE FUNCTION public.medida_aprovar(_medida_id uuid, _observacao text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_medida record; v_uid uuid := auth.uid(); v_prox text; v_requer_juridico boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  SELECT * INTO v_medida FROM public.medidas_disciplinares WHERE id = _medida_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida não encontrada'; END IF;
  IF NOT public.user_belongs_to_empresa(v_uid, v_medida.empresa_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  v_requer_juridico := v_medida.tipo IN ('suspensao','justa_causa')
                    OR v_medida.gravidade IN ('grave','gravissima');
  IF v_medida.status_workflow = 'aguardando_gestor' THEN
    v_prox := 'aguardando_rh';
    UPDATE public.medidas_disciplinares
       SET status_workflow = v_prox, aprovado_gestor_por = v_uid,
           aprovado_gestor_em = now(), updated_at = now()
     WHERE id = _medida_id;
  ELSIF v_medida.status_workflow = 'aguardando_rh' THEN
    v_prox := CASE WHEN v_requer_juridico THEN 'aguardando_juridico' ELSE 'aplicada' END;
    UPDATE public.medidas_disciplinares
       SET status_workflow = v_prox, aprovado_rh_por = v_uid, aprovado_rh_em = now(),
           data_aprovacao = COALESCE(data_aprovacao, now()),
           aprovador_id = COALESCE(aprovador_id, v_uid), updated_at = now()
     WHERE id = _medida_id;
  ELSIF v_medida.status_workflow = 'aguardando_juridico' THEN
    v_prox := 'aplicada';
    UPDATE public.medidas_disciplinares
       SET status_workflow = v_prox, aprovado_juridico_por = v_uid,
           aprovado_juridico_em = now(), updated_at = now()
     WHERE id = _medida_id;
  ELSE
    RAISE EXCEPTION 'status atual não permite aprovação (%)', v_medida.status_workflow;
  END IF;
  INSERT INTO public.medidas_disciplinares_workflow_log
    (medida_id, empresa_id, de_status, para_status, acao, ator_id, observacao)
    VALUES (_medida_id, v_medida.empresa_id, v_medida.status_workflow, v_prox, 'aprovar', v_uid, _observacao);
  RETURN jsonb_build_object('ok', true, 'status', v_prox);
END; $$;

CREATE OR REPLACE FUNCTION public.medida_rejeitar(_medida_id uuid, _motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_medida record; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'motivo da rejeição obrigatório (mín. 5 caracteres)';
  END IF;
  SELECT * INTO v_medida FROM public.medidas_disciplinares WHERE id = _medida_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida não encontrada'; END IF;
  IF NOT public.user_belongs_to_empresa(v_uid, v_medida.empresa_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF v_medida.status_workflow NOT IN ('aguardando_gestor','aguardando_rh','aguardando_juridico') THEN
    RAISE EXCEPTION 'só é possível rejeitar medidas em fluxo de aprovação';
  END IF;
  UPDATE public.medidas_disciplinares
     SET status_workflow = 'rejeitada', rejeitado_por = v_uid,
         rejeitado_em = now(), motivo_rejeicao = _motivo, updated_at = now()
   WHERE id = _medida_id;
  INSERT INTO public.medidas_disciplinares_workflow_log
    (medida_id, empresa_id, de_status, para_status, acao, ator_id, observacao)
    VALUES (_medida_id, v_medida.empresa_id, v_medida.status_workflow, 'rejeitada', 'rejeitar', v_uid, _motivo);
  RETURN jsonb_build_object('ok', true, 'status', 'rejeitada');
END; $$;

CREATE OR REPLACE FUNCTION public.medida_arquivar(_medida_id uuid, _observacao text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_medida record; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  SELECT * INTO v_medida FROM public.medidas_disciplinares WHERE id = _medida_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida não encontrada'; END IF;
  IF NOT public.user_belongs_to_empresa(v_uid, v_medida.empresa_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  IF v_medida.status_workflow NOT IN ('aplicada','rejeitada') THEN
    RAISE EXCEPTION 'só é possível arquivar medidas aplicadas ou rejeitadas';
  END IF;
  UPDATE public.medidas_disciplinares
     SET status_workflow = 'arquivada', arquivado_por = v_uid,
         arquivado_em = now(), updated_at = now()
   WHERE id = _medida_id;
  INSERT INTO public.medidas_disciplinares_workflow_log
    (medida_id, empresa_id, de_status, para_status, acao, ator_id, observacao)
    VALUES (_medida_id, v_medida.empresa_id, v_medida.status_workflow, 'arquivada', 'arquivar', v_uid, _observacao);
  RETURN jsonb_build_object('ok', true, 'status', 'arquivada');
END; $$;

REVOKE ALL ON FUNCTION public.medida_enviar_aprovacao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.medida_aprovar(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.medida_rejeitar(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.medida_arquivar(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.medida_enviar_aprovacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.medida_aprovar(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.medida_rejeitar(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.medida_arquivar(uuid, text) TO authenticated;
