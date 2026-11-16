CREATE OR REPLACE FUNCTION public.replace_monthly_provisions(p_empresa_id uuid, p_competencia text, p_rows jsonb, p_user_id uuid, p_audit_data jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  inserted_count integer;
  competence_date date;
  v_bps_recebido integer;
  v_bps_vigente integer;
  v_aliquotas integer;
  v_regime_recebido text;
  v_anexo_recebido text;
BEGIN
  -- IS DISTINCT FROM, nao <>, e NULL explicito em p_competencia (achado da
  -- revisao desta PR): com p_rows = NULL SQL, jsonb_typeof(NULL) e NULL e
  -- NULL <> 'array' tambem e NULL -- a condicao nao disparava, o lote nulo
  -- passava pela validacao e o DELETE apagava a competencia inteira sem
  -- inserir substituta, devolvendo sucesso. A exclusao explicita continua
  -- sendo o array vazio '[]', que e intencional; NULL agora e recusado.
  IF p_empresa_id IS NULL OR p_user_id IS NULL
     OR p_competencia IS NULL
     OR p_competencia !~ '^\d{4}-(0[1-9]|1[0-2])$'
     OR jsonb_typeof(p_rows) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_rows) > 20000
     OR jsonb_typeof(p_audit_data) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'invalid monthly provision replacement arguments';
  END IF;
  competence_date := to_date(p_competencia || '-01', 'YYYY-MM-DD');

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS row_data(item)
    WHERE jsonb_typeof(item) <> 'object'
       OR COALESCE(item->>'colaborador_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR item->>'tipo' NOT IN ('ferias', '13_salario')
       OR jsonb_typeof(item->'valor_principal') <> 'number'
       OR jsonb_typeof(item->'encargos_inss') <> 'number'
       OR jsonb_typeof(item->'encargos_fgts') <> 'number'
       OR (item->>'valor_principal')::numeric < 0
       OR (item->>'encargos_inss')::numeric < 0
       OR (item->>'encargos_fgts')::numeric < 0
  ) THEN
    RAISE EXCEPTION 'invalid monthly provision row';
  END IF;

  -- A aliquota aplicada e OBRIGATORIA e fail-closed: sem ela a linha nao
  -- entra, para que nenhum lancamento novo nasca sem a prova de qual
  -- aliquota o originou. O regime e o anexo sao o retrato do cadastro no
  -- momento do calculo e podem ser nulos (empresa fora do Simples, ou anexo
  -- nao informado).
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS row_data(item)
    -- IS DISTINCT FROM, nao <>: com a chave AUSENTE, item->'...' e SQL NULL,
    -- jsonb_typeof(NULL) e NULL, e NULL <> 'number' tambem e NULL -- o WHERE
    -- nao pegava a linha e a RPC gravava provisao sem aliquota. Achado da
    -- revisao desta PR.
    WHERE jsonb_typeof(item->'encargos_aliquota_bps') IS DISTINCT FROM 'number'
       OR (item->>'encargos_aliquota_bps')::numeric <> trunc((item->>'encargos_aliquota_bps')::numeric)
       OR (item->>'encargos_aliquota_bps')::numeric < 0
       OR (item->>'encargos_aliquota_bps')::numeric > 1000
       OR (item->>'regime_tributario' IS NOT NULL
           AND item->>'regime_tributario' NOT IN ('simples_nacional','lucro_presumido','lucro_real','mei'))
       OR (item ? 'simples_anexo'
           AND jsonb_typeof(item->'simples_anexo') NOT IN ('string','null'))
  ) THEN
    RAISE EXCEPTION 'invalid monthly provision tax contract';
  END IF;

  -- O lote e de UMA competencia e por isso tem UMA aliquota: se vierem
  -- valores diferentes na mesma chamada, o lote esta incoerente.
  -- Mas lote VAZIO e legitimo e nao pode virar erro (achado da revisao desta
  -- PR): quando todo salario elegivel e zero, a edge descarta as linhas
  -- (index.ts pula salarioCents <= 0) e chama a RPC com [].
  -- O contrato historico desta funcao e substituicao: com [], o DELETE zera a
  -- competencia e a auditoria e gravada. Exigir exatamente 1 aliquota
  -- devolveria 500 e, pior, deixaria o passivo antigo de pe.
  -- min() em vez do primeiro elemento: deterministico e sem ORDER BY. Como
  -- todas as linhas do lote vem do mesmo retrato de cadastro, min() e o valor.
  SELECT count(DISTINCT (item->>'encargos_aliquota_bps')::integer),
         min((item->>'encargos_aliquota_bps')::integer),
         min(item->>'regime_tributario'),
         min(item->>'simples_anexo')
    INTO STRICT v_aliquotas, v_bps_recebido, v_regime_recebido, v_anexo_recebido
    FROM jsonb_array_elements(p_rows) AS item;
  IF v_aliquotas > 1 THEN
    RAISE EXCEPTION 'monthly provision batch carries % distinct tax rates', v_aliquotas;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS row_data(item)
    LEFT JOIN public.colaboradores AS c
      ON c.id = (item->>'colaborador_id')::uuid
     AND c.empresa_id = p_empresa_id
    WHERE c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'monthly provision collaborator is outside the company';
  END IF;

  -- Serialize recalculations for the same tenant/month. If any row or the
  -- mandatory audit insert fails, PostgreSQL rolls back the deletion too.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_empresa_id::text || ':' || p_competencia, 0));

  -- REVALIDACAO DEPOIS DO LOCK (achado da revisao desta PR): a edge escolhe a
  -- aliquota numa consulta HTTP ANTERIOR, fora desta transacao. Dois calculos
  -- concorrentes podiam ambos ver a competencia vazia, escolher do cadastro e
  -- o segundo sobrescrever o passivo do primeiro com outra aliquota. Aqui,
  -- JA sob o lock, se a competencia tem aliquota gravada e ela diverge da
  -- recebida, a gravacao e RECUSADA -- nao basta trocar a aliquota da linha,
  -- porque os valores de encargo que vieram foram calculados com a outra.
  -- ERRCODE 40001 diz "refaca": a edge recalcula e, na segunda passada, le a
  -- aliquota ja gravada e converge.
  -- A fonte e o CONTRATO da competencia, nao as linhas: linha some com a
  -- substituicao vazia, contrato nao.
  SELECT t.encargos_aliquota_bps INTO v_bps_vigente
    FROM public.provisoes_competencia_tributaria t
   WHERE t.empresa_id = p_empresa_id
     AND t.competencia = competence_date;
  -- v_bps_recebido e NULL quando o lote e vazio: nesse caso nao ha aliquota
  -- nova para conflitar com a gravada, e a substituicao vazia segue valendo.
  IF v_bps_vigente IS NOT NULL AND v_bps_recebido IS NOT NULL
     AND v_bps_vigente <> v_bps_recebido THEN
    RAISE EXCEPTION 'monthly provision tax rate changed under lock: stored % bps, received % bps', v_bps_vigente, v_bps_recebido
      USING ERRCODE = '40001';
  END IF;

  DELETE FROM public.provisoes_mensais
  WHERE empresa_id = p_empresa_id AND competencia = competence_date;

  INSERT INTO public.provisoes_mensais (
    empresa_id, colaborador_id, competencia, tipo,
    valor_principal, encargos_inss, encargos_fgts,
    encargos_aliquota_bps, regime_tributario, simples_anexo
  )
  SELECT
    p_empresa_id,
    (item->>'colaborador_id')::uuid,
    competence_date,
    item->>'tipo',
    (item->>'valor_principal')::numeric,
    (item->>'encargos_inss')::numeric,
    (item->>'encargos_fgts')::numeric,
    (item->>'encargos_aliquota_bps')::integer,
    (item->>'regime_tributario')::public.regime_tributario,
    item->>'simples_anexo'
  FROM jsonb_array_elements(p_rows) AS item;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count <> jsonb_array_length(p_rows) THEN
    RAISE EXCEPTION 'monthly provision replacement row count mismatch';
  END IF;

  -- Registra o contrato da competencia na primeira vez que ela e calculada.
  -- DO NOTHING, nao DO UPDATE: se a linha existe, a revalidacao sob o lock JA
  -- provou que a aliquota e a mesma, e o registro original (com quem e quando)
  -- e o que vale. Lote vazio nao chega aqui (v_bps_recebido e NULL), e por isso
  -- a substituicao vazia apaga o passivo sem apagar o contrato.
  IF v_bps_recebido IS NOT NULL THEN
    INSERT INTO public.provisoes_competencia_tributaria (
      empresa_id, competencia, encargos_aliquota_bps,
      regime_tributario, simples_anexo, registrado_por
    ) VALUES (
      p_empresa_id, competence_date, v_bps_recebido,
      v_regime_recebido::public.regime_tributario, v_anexo_recebido, p_user_id
    )
    ON CONFLICT (empresa_id, competencia) DO NOTHING;
  END IF;

  INSERT INTO public.audit_log (
    tabela, registro_id, acao, user_id, dados_novos
  ) VALUES (
    'provisoes_mensais', gen_random_uuid(), 'PROVISOES_CALC', p_user_id,
    COALESCE(p_audit_data, '{}'::jsonb) || jsonb_build_object('empresa_id', p_empresa_id, 'evento', 'CALCULATE_BATCH')
  );

  RETURN inserted_count;
END
$function$
