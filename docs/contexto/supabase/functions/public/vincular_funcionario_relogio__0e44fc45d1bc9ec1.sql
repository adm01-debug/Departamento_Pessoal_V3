CREATE OR REPLACE FUNCTION public.vincular_funcionario_relogio(_funcionario_id uuid, _colaborador_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
