CREATE OR REPLACE FUNCTION public.enfileirar_esocial_medida_disciplinar(p_medida_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_medida record;
  v_colab record;
  v_evento_id uuid;
  v_tipo_evento text;
  v_dados jsonb;
  v_competencia text;
BEGIN
  SELECT * INTO v_medida FROM medidas_disciplinares WHERE id = p_medida_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'medida_nao_encontrada');
  END IF;

  -- Autorização por tenant
  IF v_medida.empresa_id IS NULL OR v_medida.empresa_id NOT IN (SELECT get_user_empresas(auth.uid())) THEN
    -- permitir trigger interna (auth.uid() null)
    IF auth.uid() IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'sem_permissao');
    END IF;
  END IF;

  SELECT id, nome, cpf, matricula, cargo, salario_base
    INTO v_colab
  FROM colaboradores WHERE id = v_medida.colaborador_id;

  v_competencia := to_char(coalesce(v_medida.data_ocorrencia, current_date), 'YYYY-MM');

  IF v_medida.tipo = 'justa_causa' THEN
    v_tipo_evento := 'S-2299';
    v_dados := jsonb_build_object(
      'medida_id', v_medida.id,
      'colaborador', jsonb_build_object(
        'id', v_colab.id, 'nome', v_colab.nome, 'cpf', v_colab.cpf, 'matricula', v_colab.matricula
      ),
      'desligamento', jsonb_build_object(
        'motivo', 'justa_causa',
        'artigo_clt', coalesce(v_medida.artigo_clt, '482'),
        'data', v_medida.data_ocorrencia,
        'descricao', v_medida.descricao_ocorrido
      ),
      'origem', 'medida_disciplinar'
    );
  ELSIF v_medida.tipo = 'suspensao' THEN
    v_tipo_evento := 'S-2206';
    v_dados := jsonb_build_object(
      'medida_id', v_medida.id,
      'colaborador', jsonb_build_object(
        'id', v_colab.id, 'nome', v_colab.nome, 'cpf', v_colab.cpf, 'matricula', v_colab.matricula
      ),
      'alteracao', jsonb_build_object(
        'motivo', 'suspensao_disciplinar',
        'artigo_clt', coalesce(v_medida.artigo_clt, '474'),
        'data_inicio', v_medida.data_ocorrencia,
        'dias', v_medida.dias_suspensao
      ),
      'origem', 'medida_disciplinar'
    );
  ELSE
    RETURN jsonb_build_object('ok', false, 'erro', 'tipo_nao_gera_esocial', 'tipo', v_medida.tipo);
  END IF;

  -- Idempotência: evita duplicidade para a mesma medida
  SELECT id INTO v_evento_id
  FROM esocial_eventos
  WHERE empresa_id = v_medida.empresa_id
    AND tipo_evento = v_tipo_evento
    AND (dados->>'medida_id')::uuid = v_medida.id
  LIMIT 1;

  IF v_evento_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'evento_id', v_evento_id, 'reused', true);
  END IF;

  INSERT INTO esocial_eventos (empresa_id, tipo_evento, dados, competencia, status)
  VALUES (v_medida.empresa_id, v_tipo_evento, v_dados, v_competencia, 'rascunho')
  RETURNING id INTO v_evento_id;

  RETURN jsonb_build_object('ok', true, 'evento_id', v_evento_id, 'tipo', v_tipo_evento);
END;
$function$
