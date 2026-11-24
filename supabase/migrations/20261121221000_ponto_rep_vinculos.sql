-- Vínculo funcionário do relógio -> colaborador do DP e de-para das justificativas.
-- Plano: docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md, etapa 76 (e telas das 13/23).
--
-- As tabelas ponto_rep_* não dão escrita ao navegador. Estas três RPCs são a única
-- porta de escrita do RH: SECURITY DEFINER, checam admin/RH da empresa do registro
-- (mesmo predicado da policy de leitura) e mexem só nas colunas do vínculo/de-para.
-- Aditiva e idempotente (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.vincular_funcionario_relogio(_funcionario_id uuid, _colaborador_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_func public.ponto_rep_funcionarios%ROWTYPE;
  v_colab_empresa uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessao obrigatoria' USING ERRCODE = '42501';
  END IF;
  IF _funcionario_id IS NULL OR _colaborador_id IS NULL THEN
    RAISE EXCEPTION 'Funcionario e colaborador sao obrigatorios' USING ERRCODE = '22004';
  END IF;

  SELECT * INTO v_func FROM public.ponto_rep_funcionarios WHERE id = _funcionario_id FOR UPDATE;
  IF NOT FOUND
     OR NOT public.pertence_a_empresa(v_func.empresa_id)
     OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')) THEN
    RAISE EXCEPTION 'Sem permissao para vincular este funcionario do relogio' USING ERRCODE = '42501';
  END IF;

  SELECT c.empresa_id INTO v_colab_empresa FROM public.colaboradores c WHERE c.id = _colaborador_id;
  IF v_colab_empresa IS NULL OR v_colab_empresa <> v_func.empresa_id THEN
    RAISE EXCEPTION 'Colaborador nao pertence a empresa deste relogio' USING ERRCODE = '22023';
  END IF;

  -- Serializa vínculos do mesmo dispositivo para a checagem de duplicidade valer.
  PERFORM pg_advisory_xact_lock(hashtextextended('ponto_rep_vinculo:' || v_func.dispositivo_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.ponto_rep_funcionarios f
    WHERE f.dispositivo_id = v_func.dispositivo_id
      AND f.colaborador_id = _colaborador_id
      AND f.id <> v_func.id
  ) THEN
    RAISE EXCEPTION 'Colaborador ja vinculado a outro funcionario deste relogio' USING ERRCODE = '23505';
  END IF;

  UPDATE public.ponto_rep_funcionarios
     SET colaborador_id = _colaborador_id,
         vinculo_metodo = 'manual',
         vinculado_em = now(),
         updated_at = now()
   WHERE id = v_func.id;

  -- Os dias desse funcionário voltam para a fila do processador.
  UPDATE public.ponto_rep_dias
     SET processado_em = NULL,
         updated_at = now()
   WHERE dispositivo_id = v_func.dispositivo_id
     AND funcionario_codigo = v_func.codigo;
END
$function$;

CREATE OR REPLACE FUNCTION public.desvincular_funcionario_relogio(_funcionario_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_func public.ponto_rep_funcionarios%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessao obrigatoria' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_func FROM public.ponto_rep_funcionarios WHERE id = _funcionario_id FOR UPDATE;
  IF NOT FOUND
     OR NOT public.pertence_a_empresa(v_func.empresa_id)
     OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')) THEN
    RAISE EXCEPTION 'Sem permissao para desvincular este funcionario do relogio' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ponto_rep_funcionarios
     SET colaborador_id = NULL,
         vinculo_metodo = NULL,
         vinculado_em = NULL,
         updated_at = now()
   WHERE id = v_func.id;

  UPDATE public.ponto_rep_dias
     SET processado_em = NULL,
         updated_at = now()
   WHERE dispositivo_id = v_func.dispositivo_id
     AND funcionario_codigo = v_func.codigo;
END
$function$;

CREATE OR REPLACE FUNCTION public.definir_tipo_dia_justificativa_relogio(_justificativa_id uuid, _tipo_dia text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_empresa uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessao obrigatoria' USING ERRCODE = '42501';
  END IF;

  SELECT j.empresa_id INTO v_empresa FROM public.ponto_rep_justificativas j WHERE j.id = _justificativa_id FOR UPDATE;
  IF NOT FOUND
     OR NOT public.pertence_a_empresa(v_empresa)
     OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')) THEN
    RAISE EXCEPTION 'Sem permissao para alterar esta justificativa do relogio' USING ERRCODE = '42501';
  END IF;

  -- Valor inválido cai no CHECK ponto_rep_justificativas_tipo_dia_check (23514).
  UPDATE public.ponto_rep_justificativas
     SET tipo_dia = _tipo_dia,
         updated_at = now()
   WHERE id = _justificativa_id;
END
$function$;

COMMENT ON FUNCTION public.vincular_funcionario_relogio(uuid, uuid) IS
  'RH/admin da empresa vincula manualmente um funcionario do relogio a um colaborador da mesma empresa; reprocessa os dias.';
COMMENT ON FUNCTION public.desvincular_funcionario_relogio(uuid) IS
  'RH/admin da empresa desfaz o vinculo de um funcionario do relogio; reprocessa os dias.';
COMMENT ON FUNCTION public.definir_tipo_dia_justificativa_relogio(uuid, text) IS
  'RH/admin da empresa define o tipo de dia do DP para uma justificativa do relogio (NULL = sem efeito).';

REVOKE ALL ON FUNCTION public.vincular_funcionario_relogio(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.desvincular_funcionario_relogio(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_tipo_dia_justificativa_relogio(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vincular_funcionario_relogio(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desvincular_funcionario_relogio(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_tipo_dia_justificativa_relogio(uuid, text) TO authenticated;
