CREATE OR REPLACE FUNCTION public.consumir_pendencias_medida_no_holerite(p_holerite_id uuid, p_colaborador_id uuid, p_competencia text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pend RECORD;
  v_count INTEGER := 0;
  v_empresa_id uuid;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_empresa_id IS NULL OR NOT public.pode_gerir_rh(v_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  FOR v_pend IN
    SELECT * FROM public.medidas_disciplinares_integracao
    WHERE colaborador_id = p_colaborador_id
      AND tipo_integracao = 'lancamento_folha_pendente'
      AND status = 'pendente'
      AND (competencia IS NULL OR competencia <= p_competencia)
    FOR UPDATE
  LOOP
    INSERT INTO public.lancamentos_folha (
      holerite_id, rubrica_id, rubrica_codigo, rubrica_descricao,
      tipo, referencia, valor, automatico
    ) VALUES (
      p_holerite_id,
      (v_pend.detalhes->>'rubrica_id')::uuid,
      COALESCE(v_pend.detalhes->>'rubrica_codigo','DESC_SUSP'),
      'Desconto por Suspensão Disciplinar',
      'desconto'::tipo_evento_folha,
      v_pend.dias,
      v_pend.valor,
      true
    );

    UPDATE public.medidas_disciplinares_integracao
    SET status = 'aplicado',
        tipo_integracao = 'lancamento_folha_aplicado',
        detalhes = detalhes || jsonb_build_object('holerite_id', p_holerite_id, 'aplicado_em', now())
    WHERE id = v_pend.id;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$
