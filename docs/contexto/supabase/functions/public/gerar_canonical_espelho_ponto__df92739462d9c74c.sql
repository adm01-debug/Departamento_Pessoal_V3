CREATE OR REPLACE FUNCTION public.gerar_canonical_espelho_ponto(_colaborador_id uuid, _competencia text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF NOT (public.sou_o_colaborador(_colaborador_id) OR public.pode_gerir_rh(v_colab.empresa_id)) THEN
    RAISE EXCEPTION 'Sem permissão para este espelho de ponto';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      -- data+hora já são horário local; monta o timestamp sem conversão de tz
      'data_hora', to_char(b.data + b.hora, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'tipo', b.tipo,
      'origem', b.origem,
      'ordem', b.ordem
    ) ORDER BY b.data ASC, b.hora ASC, b.ordem ASC, b.id ASC
  ), '[]'::jsonb)
  INTO v_batidas
  FROM public.batidas_ponto b
  WHERE b.colaborador_id = _colaborador_id
    AND b.data BETWEEN v_inicio AND v_fim;

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
$function$
