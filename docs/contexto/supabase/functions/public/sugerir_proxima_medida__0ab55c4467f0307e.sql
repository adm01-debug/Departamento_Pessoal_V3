CREATE OR REPLACE FUNCTION public.sugerir_proxima_medida(p_colaborador_id uuid, p_empresa_id uuid)
 RETURNS TABLE(tipo_sugerido text, justificativa text, historico_12m jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
