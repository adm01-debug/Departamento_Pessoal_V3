CREATE OR REPLACE FUNCTION public.gerar_rubricas_ferias(p_ferias_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ferias record;
  v_competencia date;
  v_inseridos integer := 0;
  v_rid uuid;
  v_rubricas jsonb := jsonb_build_array(
    jsonb_build_object('codigo','1050','descricao','Férias','tipo','provento','campo','valor_ferias'),
    jsonb_build_object('codigo','1051','descricao','1/3 Constitucional Férias','tipo','provento','campo','valor_terco'),
    jsonb_build_object('codigo','1052','descricao','Abono Pecuniário','tipo','provento','campo','valor_abono'),
    jsonb_build_object('codigo','1053','descricao','1/3 sobre Abono','tipo','provento','campo','valor_terco_abono'),
    jsonb_build_object('codigo','1054','descricao','INSS Férias','tipo','desconto','campo','descontos_inss'),
    jsonb_build_object('codigo','1055','descricao','IRRF Férias','tipo','desconto','campo','descontos_irrf'),
    jsonb_build_object('codigo','1056','descricao','Adiantamento 13º nas Férias (Lei 4.749/65)','tipo','provento','campo','valor_adiantamento_13')
  );
  v_rubrica jsonb;
  v_valor numeric;
BEGIN
  SELECT * INTO v_ferias FROM public.ferias WHERE id = p_ferias_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_competencia := date_trunc('month', v_ferias.data_inicio)::date;

  FOR v_rubrica IN SELECT * FROM jsonb_array_elements(v_rubricas) LOOP
    EXECUTE format('SELECT ($1).%I', v_rubrica->>'campo') INTO v_valor USING v_ferias;
    IF COALESCE(v_valor, 0) <= 0 THEN CONTINUE; END IF;

    SELECT id INTO v_rid FROM public.rubricas_folha
      WHERE codigo = v_rubrica->>'codigo'
        AND (empresa_id = v_ferias.empresa_id OR empresa_id IS NULL)
      ORDER BY empresa_id NULLS LAST LIMIT 1;

    INSERT INTO public.eventos_variaveis (
      competencia, colaborador_id, rubrica_id, referencia, valor, observacao,
      origem_ferias_id, empresa_id
    ) VALUES (
      v_competencia, v_ferias.colaborador_id, v_rid,
      COALESCE(v_ferias.dias_gozo,0)::text || ' dias',
      v_valor,
      format('Gerado automaticamente das férias %s (%s)', p_ferias_id, v_rubrica->>'descricao'),
      p_ferias_id, v_ferias.empresa_id
    )
    ON CONFLICT (origem_ferias_id, rubrica_id) DO UPDATE
      SET valor = EXCLUDED.valor,
          referencia = EXCLUDED.referencia,
          observacao = EXCLUDED.observacao;
    v_inseridos := v_inseridos + 1;
  END LOOP;

  RETURN v_inseridos;
END;
$function$;

INSERT INTO public.rubricas_folha (codigo, descricao, tipo, ativo, empresa_id, incide_inss, incide_irrf, incide_fgts)
SELECT '1056', 'Adiantamento 13º nas Férias (Lei 4.749/65)', 'provento', true, e.id, false, false, false
FROM public.empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM public.rubricas_folha r
  WHERE r.codigo = '1056' AND r.empresa_id = e.id
);