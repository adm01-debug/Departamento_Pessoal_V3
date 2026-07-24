
ALTER TABLE public.eventos_variaveis
  ADD COLUMN IF NOT EXISTS origem_ferias_id uuid REFERENCES public.ferias(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS empresa_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_eventos_variaveis_ferias_rubrica
  ON public.eventos_variaveis (origem_ferias_id, rubrica_id)
  WHERE origem_ferias_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_variaveis_origem_ferias
  ON public.eventos_variaveis (origem_ferias_id);

CREATE OR REPLACE FUNCTION public.gerar_rubricas_ferias(p_ferias_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ferias record;
  v_competencia date;
  v_inseridos integer := 0;
  v_rid uuid;
  -- códigos padrão do sistema (ver src/constants/rubricas.ts)
  v_rubricas jsonb := jsonb_build_array(
    jsonb_build_object('codigo','1050','descricao','Férias','tipo','provento','campo','valor_ferias'),
    jsonb_build_object('codigo','1051','descricao','1/3 Constitucional Férias','tipo','provento','campo','valor_terco'),
    jsonb_build_object('codigo','1052','descricao','Abono Pecuniário','tipo','provento','campo','valor_abono'),
    jsonb_build_object('codigo','1053','descricao','1/3 sobre Abono','tipo','provento','campo','valor_terco_abono'),
    jsonb_build_object('codigo','1054','descricao','INSS Férias','tipo','desconto','campo','descontos_inss'),
    jsonb_build_object('codigo','1055','descricao','IRRF Férias','tipo','desconto','campo','descontos_irrf')
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

    -- localizar rubrica_id pelo código (opcional; pode ser nulo)
    SELECT id INTO v_rid FROM public.rubricas_folha
      WHERE codigo = v_rubrica->>'codigo' LIMIT 1;

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
$$;

REVOKE ALL ON FUNCTION public.gerar_rubricas_ferias(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_rubricas_ferias(uuid) TO service_role;

-- Trigger AFTER UPDATE: quando aprovada + enviada à contabilidade
CREATE OR REPLACE FUNCTION public.trg_ferias_gerar_rubricas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovada'
     AND COALESCE(NEW.enviado_contabilidade, false) = true
     AND (
       OLD.status IS DISTINCT FROM NEW.status
       OR OLD.enviado_contabilidade IS DISTINCT FROM NEW.enviado_contabilidade
     )
  THEN
    PERFORM public.gerar_rubricas_ferias(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ferias_gerar_rubricas ON public.ferias;
CREATE TRIGGER trg_ferias_gerar_rubricas
AFTER UPDATE OF status, enviado_contabilidade
ON public.ferias
FOR EACH ROW
EXECUTE FUNCTION public.trg_ferias_gerar_rubricas();
