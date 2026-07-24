
-- 1) Colunas de prazo e resposta
ALTER TABLE public.medidas_disciplinares
  ADD COLUMN IF NOT EXISTS contestacao_prazo_ate timestamptz,
  ADD COLUMN IF NOT EXISTS contestacao_prazo_horas integer NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS contestacao_respondida_em timestamptz,
  ADD COLUMN IF NOT EXISTS contestacao_respondida_por uuid,
  ADD COLUMN IF NOT EXISTS contestacao_aceita boolean;

-- 2) Anexos da contestação
CREATE TABLE IF NOT EXISTS public.medidas_disciplinares_contestacao_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medida_id uuid NOT NULL REFERENCES public.medidas_disciplinares(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL,
  storage_path text NOT NULL,
  nome_arquivo text NOT NULL,
  mime_type text,
  tamanho_bytes bigint,
  hash_sha256 text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medidas_disciplinares_contestacao_anexos TO authenticated;
GRANT ALL ON public.medidas_disciplinares_contestacao_anexos TO service_role;
ALTER TABLE public.medidas_disciplinares_contestacao_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contest_anexos_select_empresa" ON public.medidas_disciplinares_contestacao_anexos;
CREATE POLICY "contest_anexos_select_empresa"
  ON public.medidas_disciplinares_contestacao_anexos FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "contest_anexos_insert_empresa" ON public.medidas_disciplinares_contestacao_anexos;
CREATE POLICY "contest_anexos_insert_empresa"
  ON public.medidas_disciplinares_contestacao_anexos FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "contest_anexos_delete_empresa" ON public.medidas_disciplinares_contestacao_anexos;
CREATE POLICY "contest_anexos_delete_empresa"
  ON public.medidas_disciplinares_contestacao_anexos FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_medida_contest_anexos_medida ON public.medidas_disciplinares_contestacao_anexos(medida_id);
CREATE INDEX IF NOT EXISTS idx_medida_contest_anexos_empresa ON public.medidas_disciplinares_contestacao_anexos(empresa_id);

-- 3) Políticas de Storage no bucket medidas-contestacoes (path: {empresa_id}/{medida_id}/{filename})
DROP POLICY IF EXISTS "medidas_contest_read_empresa" ON storage.objects;
CREATE POLICY "medidas_contest_read_empresa"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medidas-contestacoes'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "medidas_contest_write_empresa" ON storage.objects;
CREATE POLICY "medidas_contest_write_empresa"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'medidas-contestacoes'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "medidas_contest_delete_empresa" ON storage.objects;
CREATE POLICY "medidas_contest_delete_empresa"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'medidas-contestacoes'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid()
    )
  );

-- 4) Trigger: ao virar 'aplicada' seta prazo e notifica; ao contestar/responder notifica.
CREATE OR REPLACE FUNCTION public.trg_medida_contestacao_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colab_user uuid;
  v_colab_nome text;
BEGIN
  -- Set prazo quando vira aplicada
  IF NEW.status_workflow = 'aplicada' AND (OLD.status_workflow IS DISTINCT FROM 'aplicada') THEN
    IF NEW.contestacao_prazo_ate IS NULL THEN
      NEW.contestacao_prazo_ate := now() + make_interval(hours => COALESCE(NEW.contestacao_prazo_horas, 48));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medida_contest_set_prazo ON public.medidas_disciplinares;
CREATE TRIGGER trg_medida_contest_set_prazo
  BEFORE UPDATE ON public.medidas_disciplinares
  FOR EACH ROW EXECUTE FUNCTION public.trg_medida_contestacao_notify();

-- Após update: notificações (AFTER para ver estado consolidado)
CREATE OR REPLACE FUNCTION public.trg_medida_contestacao_notify_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_colab_user uuid;
  v_colab_nome text;
  v_admin_ids uuid[];
BEGIN
  SELECT c.user_id, c.nome_completo INTO v_colab_user, v_colab_nome
  FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;

  -- Aplicada -> notificar colaborador com prazo
  IF NEW.status_workflow = 'aplicada' AND OLD.status_workflow IS DISTINCT FROM 'aplicada' AND v_colab_user IS NOT NULL THEN
    INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id)
    VALUES (v_colab_user, NEW.empresa_id, 'medida_aplicada',
      'Medida disciplinar registrada',
      'Você tem até ' || to_char(NEW.contestacao_prazo_ate AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ' para contestar.',
      'medida_disciplinar', NEW.id);
  END IF;

  -- Contestada -> notificar admins/rh da empresa
  IF NEW.status_workflow = 'contestada' AND OLD.status_workflow IS DISTINCT FROM 'contestada' THEN
    SELECT COALESCE(array_agg(DISTINCT ur.user_id), '{}') INTO v_admin_ids
    FROM public.user_roles ur
    JOIN public.user_empresas ue ON ue.user_id = ur.user_id AND ue.empresa_id = NEW.empresa_id
    WHERE ur.role IN ('admin','rh');

    INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id)
    SELECT uid, NEW.empresa_id, 'medida_contestada',
      'Nova contestação de medida disciplinar',
      COALESCE(v_colab_nome,'Colaborador') || ' contestou a medida. Prazo de resposta em análise.',
      'medida_disciplinar', NEW.id
    FROM unnest(v_admin_ids) uid;
  END IF;

  -- Resposta -> notificar colaborador
  IF NEW.contestacao_respondida_em IS NOT NULL AND OLD.contestacao_respondida_em IS NULL AND v_colab_user IS NOT NULL THEN
    INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id)
    VALUES (v_colab_user, NEW.empresa_id, 'medida_contestacao_resposta',
      CASE WHEN NEW.contestacao_aceita THEN 'Contestação aceita' ELSE 'Contestação analisada' END,
      COALESCE(NEW.contestacao_resposta, 'Sua contestação foi analisada pelo RH.'),
      'medida_disciplinar', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medida_contest_notify_after ON public.medidas_disciplinares;
CREATE TRIGGER trg_medida_contest_notify_after
  AFTER UPDATE ON public.medidas_disciplinares
  FOR EACH ROW EXECUTE FUNCTION public.trg_medida_contestacao_notify_after();

-- 5) RPC medida_contestar (colaborador)
CREATE OR REPLACE FUNCTION public.medida_contestar(
  _medida_id uuid,
  _texto text
) RETURNS public.medidas_disciplinares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.medidas_disciplinares;
  v_user uuid := auth.uid();
  v_colab_user uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _texto IS NULL OR length(btrim(_texto)) < 10 THEN
    RAISE EXCEPTION 'contestacao_texto_minimo_10_chars';
  END IF;

  SELECT * INTO v_row FROM public.medidas_disciplinares WHERE id = _medida_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida_nao_encontrada'; END IF;

  SELECT c.user_id INTO v_colab_user FROM public.colaboradores c WHERE c.id = v_row.colaborador_id;
  IF v_colab_user IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'apenas_o_colaborador_pode_contestar';
  END IF;

  IF v_row.status_workflow <> 'aplicada' THEN
    RAISE EXCEPTION 'medida_nao_esta_aplicada';
  END IF;

  IF v_row.contestacao_prazo_ate IS NOT NULL AND now() > v_row.contestacao_prazo_ate THEN
    RAISE EXCEPTION 'prazo_contestacao_expirado';
  END IF;

  UPDATE public.medidas_disciplinares SET
    status_workflow = 'contestada',
    contestacao_texto = _texto,
    contestacao_data = now()
  WHERE id = _medida_id
  RETURNING * INTO v_row;

  INSERT INTO public.medidas_disciplinares_workflow_log(medida_id, empresa_id, ator_id, de_status, para_status, acao, observacao)
  VALUES (_medida_id, v_row.empresa_id, v_user, 'aplicada', 'contestada', 'contestar', left(_texto, 500));

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.medida_contestar(uuid, text) TO authenticated;

-- 6) RPC medida_responder_contestacao (RH/admin)
CREATE OR REPLACE FUNCTION public.medida_responder_contestacao(
  _medida_id uuid,
  _resposta text,
  _aceita boolean
) RETURNS public.medidas_disciplinares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.medidas_disciplinares;
  v_user uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _resposta IS NULL OR length(btrim(_resposta)) < 10 THEN
    RAISE EXCEPTION 'resposta_minimo_10_chars';
  END IF;

  SELECT * INTO v_row FROM public.medidas_disciplinares WHERE id = _medida_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'medida_nao_encontrada'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles ur
    JOIN public.user_empresas ue ON ue.user_id = ur.user_id AND ue.empresa_id = v_row.empresa_id
    WHERE ur.user_id = v_user AND ur.role IN ('admin','rh')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'apenas_rh_ou_admin_pode_responder';
  END IF;

  IF v_row.status_workflow <> 'contestada' THEN
    RAISE EXCEPTION 'medida_nao_esta_contestada';
  END IF;

  UPDATE public.medidas_disciplinares SET
    contestacao_resposta = _resposta,
    contestacao_respondida_em = now(),
    contestacao_respondida_por = v_user,
    contestacao_aceita = _aceita,
    status_workflow = CASE WHEN _aceita THEN 'arquivada' ELSE 'aplicada' END
  WHERE id = _medida_id
  RETURNING * INTO v_row;

  INSERT INTO public.medidas_disciplinares_workflow_log(medida_id, empresa_id, ator_id, de_status, para_status, acao, observacao)
  VALUES (_medida_id, v_row.empresa_id, v_user, 'contestada', v_row.status_workflow,
    CASE WHEN _aceita THEN 'contestacao_aceita' ELSE 'contestacao_rejeitada' END,
    left(_resposta, 500));

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.medida_responder_contestacao(uuid, text, boolean) TO authenticated;
