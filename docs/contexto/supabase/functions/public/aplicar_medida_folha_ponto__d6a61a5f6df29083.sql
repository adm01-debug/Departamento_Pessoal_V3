CREATE OR REPLACE FUNCTION public.aplicar_medida_folha_ponto(p_medida_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_medida        RECORD;
  v_colab         RECORD;
  v_data_fim      DATE;
  v_afast_id      UUID;
  v_deslig_id     UUID;
  v_rubrica_id    UUID;
  v_valor_dia     NUMERIC(12,2);
  v_valor_desc    NUMERIC(12,2);
  v_competencia   TEXT;
  v_result        JSONB := '{}'::jsonb;
BEGIN
  SELECT * INTO v_medida FROM public.medidas_disciplinares WHERE id = p_medida_id;
  IF v_medida.id IS NULL THEN
    RAISE EXCEPTION 'medida_nao_encontrada';
  END IF;

  IF v_medida.status_workflow <> 'aplicada' THEN
    RAISE EXCEPTION 'medida_nao_aplicada';
  END IF;

  -- Tenant guard
  IF NOT (v_medida.empresa_id = ANY (SELECT get_user_empresas(auth.uid())))
     AND NOT (auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  SELECT * INTO v_colab FROM public.colaboradores WHERE id = v_medida.colaborador_id;

  -- SUSPENSÃO
  IF v_medida.tipo = 'suspensao' THEN
    IF COALESCE(v_medida.dias_suspensao,0) <= 0 THEN
      RAISE EXCEPTION 'dias_suspensao_invalidos';
    END IF;
    IF COALESCE(v_medida.dias_suspensao,0) > 30 THEN
      RAISE EXCEPTION 'dias_suspensao_excede_clt'; -- Art. 474 CLT
    END IF;

    v_data_fim := COALESCE(v_medida.data_inicio_efeito, v_medida.data_ocorrencia)
                  + (v_medida.dias_suspensao - 1);

    -- Evita duplicidade
    SELECT ref_id INTO v_afast_id
    FROM public.medidas_disciplinares_integracao
    WHERE medida_id = p_medida_id AND tipo_integracao = 'afastamento' AND status = 'aplicado'
    LIMIT 1;

    IF v_afast_id IS NULL THEN
      INSERT INTO public.afastamentos (
        colaborador_id, empresa_id, tipo, data_inicio, data_fim_prevista,
        dias_empresa, status, observacoes, created_by
      ) VALUES (
        v_medida.colaborador_id, v_medida.empresa_id, 'suspensao_disciplinar'::tipo_afastamento,
        COALESCE(v_medida.data_inicio_efeito, v_medida.data_ocorrencia), v_data_fim,
        v_medida.dias_suspensao, 'ativo'::status_afastamento,
        'Gerado automaticamente pela medida disciplinar ' || p_medida_id::text,
        auth.uid()
      )
      RETURNING id INTO v_afast_id;

      INSERT INTO public.medidas_disciplinares_integracao (
        medida_id, empresa_id, colaborador_id, tipo_integracao, ref_id, dias, status, detalhes
      ) VALUES (
        p_medida_id, v_medida.empresa_id, v_medida.colaborador_id,
        'afastamento', v_afast_id, v_medida.dias_suspensao, 'aplicado',
        jsonb_build_object('data_inicio', COALESCE(v_medida.data_inicio_efeito, v_medida.data_ocorrencia),
                           'data_fim', v_data_fim)
      );
    END IF;

    -- Desconto proporcional em folha (fila para próxima competência)
    v_rubrica_id := public.garantir_rubrica_suspensao(v_medida.empresa_id);
    v_valor_dia  := COALESCE(v_colab.salario_base, 0) / 30.0;
    v_valor_desc := ROUND(v_valor_dia * v_medida.dias_suspensao, 2);
    v_competencia := to_char(COALESCE(v_medida.data_inicio_efeito, v_medida.data_ocorrencia), 'YYYY-MM');

    IF NOT EXISTS (
      SELECT 1 FROM public.medidas_disciplinares_integracao
      WHERE medida_id = p_medida_id
        AND tipo_integracao IN ('lancamento_folha_pendente','lancamento_folha_aplicado')
    ) THEN
      INSERT INTO public.medidas_disciplinares_integracao (
        medida_id, empresa_id, colaborador_id, tipo_integracao,
        competencia, valor, dias, status, detalhes
      ) VALUES (
        p_medida_id, v_medida.empresa_id, v_medida.colaborador_id,
        'lancamento_folha_pendente', v_competencia, v_valor_desc, v_medida.dias_suspensao,
        'pendente',
        jsonb_build_object('rubrica_id', v_rubrica_id, 'rubrica_codigo', 'DESC_SUSP',
                           'valor_dia', v_valor_dia, 'salario_base', COALESCE(v_colab.salario_base,0))
      );
    END IF;

    v_result := jsonb_build_object(
      'tipo', 'suspensao',
      'afastamento_id', v_afast_id,
      'competencia', v_competencia,
      'valor_desconto', v_valor_desc,
      'dias', v_medida.dias_suspensao
    );

  -- JUSTA CAUSA
  ELSIF v_medida.tipo IN ('justa_causa','demissao_justa_causa') THEN
    SELECT ref_id INTO v_deslig_id
    FROM public.medidas_disciplinares_integracao
    WHERE medida_id = p_medida_id AND tipo_integracao = 'desligamento' AND status = 'aplicado'
    LIMIT 1;

    IF v_deslig_id IS NULL THEN
      INSERT INTO public.desligamentos (
        colaborador_id, tipo, data_desligamento, motivo, status, salario_base
      ) VALUES (
        v_medida.colaborador_id, 'justa_causa'::tipo_desligamento,
        COALESCE(v_medida.data_inicio_efeito, v_medida.data_ocorrencia),
        'Justa causa aplicada via medida disciplinar ' || p_medida_id::text ||
          coalesce(' — Art. CLT: ' || v_medida.artigo_clt, ''),
        'em_andamento', COALESCE(v_colab.salario_base, 0)
      )
      RETURNING id INTO v_deslig_id;

      INSERT INTO public.medidas_disciplinares_integracao (
        medida_id, empresa_id, colaborador_id, tipo_integracao, ref_id, status, detalhes
      ) VALUES (
        p_medida_id, v_medida.empresa_id, v_medida.colaborador_id,
        'desligamento', v_deslig_id, 'aplicado',
        jsonb_build_object('data', COALESCE(v_medida.data_inicio_efeito, v_medida.data_ocorrencia),
                           'artigo_clt', v_medida.artigo_clt)
      );
    END IF;

    v_result := jsonb_build_object('tipo', 'justa_causa', 'desligamento_id', v_deslig_id);

  ELSE
    -- Advertência ou similar: nada a integrar
    v_result := jsonb_build_object('tipo', v_medida.tipo, 'integracao', 'nao_aplicavel');
  END IF;

  RETURN v_result;
END;
$function$
