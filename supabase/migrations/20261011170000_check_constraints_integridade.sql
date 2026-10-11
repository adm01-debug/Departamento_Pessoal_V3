-- ============================================================================
-- CHECK constraints de integridade nas tabelas críticas (onda 14 / auditoria)
--
-- Por que: a auditoria apontou ~161 tabelas sem nenhum CHECK — invariantes de
-- domínio (valores ≥ 0, datas coerentes, limites legais CLT) dependiam só do
-- frontend. Um insert via RPC, SQL direto ou bug de cliente gravava valor
-- inválido silenciosamente (salário negativo, férias com fim < início, abono
-- de 25 dias — o legal é ≤ 10).
--
-- Como (defesa contra dados existentes): cada constraint é criada NOT VALID
-- — passa a valer IMEDIATAMENTE para novos INSERT/UPDATE, sem varrer a tabela.
-- Depois o DO-block tenta VALIDATE: se houver linha antiga violando, a
-- constraint fica NOT VALID (ainda aplicada a novos writes) e um WARNING
-- lista quantas linhas legadas violam — nunca aborta o deploy nem deixa a
-- regra desligada. Se TODAS validarem, o DO block não emite nada.
-- ============================================================================

-- -- ferias --------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ferias_datas_coerentes') THEN
    ALTER TABLE public.ferias ADD CONSTRAINT ferias_datas_coerentes
      CHECK (data_fim >= data_inicio) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ferias_dias_gozo_clt') THEN
    ALTER TABLE public.ferias ADD CONSTRAINT ferias_dias_gozo_clt
      CHECK (dias_gozo BETWEEN 1 AND 30) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ferias_dias_abono_clt') THEN
    ALTER TABLE public.ferias ADD CONSTRAINT ferias_dias_abono_clt
      CHECK (dias_abono BETWEEN 0 AND 10) NOT VALID;
  END IF;
END $$;

-- -- periodos_aquisitivos --------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'periodos_datas_coerentes') THEN
    ALTER TABLE public.periodos_aquisitivos ADD CONSTRAINT periodos_datas_coerentes
      CHECK (data_fim > data_inicio) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'periodos_numero_positivo') THEN
    ALTER TABLE public.periodos_aquisitivos ADD CONSTRAINT periodos_numero_positivo
      CHECK (numero_periodo > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'periodos_dias_direito_clt') THEN
    ALTER TABLE public.periodos_aquisitivos ADD CONSTRAINT periodos_dias_direito_clt
      CHECK (dias_direito BETWEEN 0 AND 30) NOT VALID;
  END IF;
END $$;

-- -- ferias_programacao ----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ferias_prog_mes_valido') THEN
    ALTER TABLE public.ferias_programacao ADD CONSTRAINT ferias_prog_mes_valido
      CHECK (mes_previsto BETWEEN 1 AND 12) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ferias_prog_datas_coerentes') THEN
    ALTER TABLE public.ferias_programacao ADD CONSTRAINT ferias_prog_datas_coerentes
      CHECK (data_fim_prevista IS NULL OR data_inicio_prevista IS NULL OR data_fim_prevista >= data_inicio_prevista) NOT VALID;
  END IF;
END $$;

-- -- premiacoes_pagamentos -------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prem_pag_valor_calculado_positivo') THEN
    ALTER TABLE public.premiacoes_pagamentos ADD CONSTRAINT prem_pag_valor_calculado_positivo
      CHECK (valor_calculado IS NULL OR valor_calculado >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prem_pag_valor_aprovado_positivo') THEN
    ALTER TABLE public.premiacoes_pagamentos ADD CONSTRAINT prem_pag_valor_aprovado_positivo
      CHECK (valor_aprovado IS NULL OR valor_aprovado >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prem_pag_valor_folha_positivo') THEN
    ALTER TABLE public.premiacoes_pagamentos ADD CONSTRAINT prem_pag_valor_folha_positivo
      CHECK (valor_folha_real IS NULL OR valor_folha_real >= 0) NOT VALID;
  END IF;
END $$;

-- -- cnab_itens ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cnab_itens_valor_positivo') THEN
    ALTER TABLE public.cnab_itens ADD CONSTRAINT cnab_itens_valor_positivo
      CHECK (valor_pagamento > 0) NOT VALID;
  END IF;
END $$;

-- -- desligamentos ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deslig_salario_positivo') THEN
    ALTER TABLE public.desligamentos ADD CONSTRAINT deslig_salario_positivo
      CHECK (salario_base IS NULL OR salario_base >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deslig_proventos_positivo') THEN
    ALTER TABLE public.desligamentos ADD CONSTRAINT deslig_proventos_positivo
      CHECK (total_proventos IS NULL OR total_proventos >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deslig_descontos_positivo') THEN
    ALTER TABLE public.desligamentos ADD CONSTRAINT deslig_descontos_positivo
      CHECK (total_descontos IS NULL OR total_descontos >= 0) NOT VALID;
  END IF;
END $$;

-- -- batidas_ponto ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'batidas_latitude_valida') THEN
    ALTER TABLE public.batidas_ponto ADD CONSTRAINT batidas_latitude_valida
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'batidas_longitude_valida') THEN
    ALTER TABLE public.batidas_ponto ADD CONSTRAINT batidas_longitude_valida
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'batidas_precisao_positiva') THEN
    ALTER TABLE public.batidas_ponto ADD CONSTRAINT batidas_precisao_positiva
      CHECK (precisao_metros IS NULL OR precisao_metros >= 0) NOT VALID;
  END IF;
END $$;

-- ============================================================================
-- VALIDATE: para cada constraint recém-criada, tenta validar os dados
-- existentes. Violação → WARNING com a contagem de linhas e a constraint
-- permanece NOT VALID (válida para novos writes, tolerante com legado).
-- ============================================================================
DO $$
DECLARE
  v_con RECORD;
  v_bad BIGINT;
BEGIN
  FOR v_con IN
    SELECT * FROM (VALUES
      ('ferias',                'ferias_datas_coerentes',          'data_fim < data_inicio'),
      ('ferias',                'ferias_dias_gozo_clt',            'NOT (dias_gozo BETWEEN 1 AND 30)'),
      ('ferias',                'ferias_dias_abono_clt',           'NOT (dias_abono BETWEEN 0 AND 10)'),
      ('periodos_aquisitivos',  'periodos_datas_coerentes',        'NOT (data_fim > data_inicio)'),
      ('periodos_aquisitivos',  'periodos_numero_positivo',        'NOT (numero_periodo > 0)'),
      ('periodos_aquisitivos',  'periodos_dias_direito_clt',       'NOT (dias_direito BETWEEN 0 AND 30)'),
      ('ferias_programacao',    'ferias_prog_mes_valido',          'NOT (mes_previsto BETWEEN 1 AND 12)'),
      ('ferias_programacao',    'ferias_prog_datas_coerentes',     'NOT (data_fim_prevista IS NULL OR data_inicio_prevista IS NULL OR data_fim_prevista >= data_inicio_prevista)'),
      ('premiacoes_pagamentos', 'prem_pag_valor_calculado_positivo','NOT (valor_calculado IS NULL OR valor_calculado >= 0)'),
      ('premiacoes_pagamentos', 'prem_pag_valor_aprovado_positivo','NOT (valor_aprovado IS NULL OR valor_aprovado >= 0)'),
      ('premiacoes_pagamentos', 'prem_pag_valor_folha_positivo',   'NOT (valor_folha_real IS NULL OR valor_folha_real >= 0)'),
      ('cnab_itens',            'cnab_itens_valor_positivo',       'NOT (valor_pagamento > 0)'),
      ('desligamentos',         'deslig_salario_positivo',         'NOT (salario_base IS NULL OR salario_base >= 0)'),
      ('desligamentos',         'deslig_proventos_positivo',       'NOT (total_proventos IS NULL OR total_proventos >= 0)'),
      ('desligamentos',         'deslig_descontos_positivo',       'NOT (total_descontos IS NULL OR total_descontos >= 0)'),
      ('batidas_ponto',         'batidas_latitude_valida',         'NOT (latitude IS NULL OR latitude BETWEEN -90 AND 90)'),
      ('batidas_ponto',         'batidas_longitude_valida',        'NOT (longitude IS NULL OR longitude BETWEEN -180 AND 180)'),
      ('batidas_ponto',         'batidas_precisao_positiva',       'NOT (precisao_metros IS NULL OR precisao_metros >= 0)')
    ) AS s(tabela, conname, violacao)
  LOOP
    -- Só tenta validar se a constraint existe (idempotente entre ambientes).
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = v_con.conname) THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', v_con.tabela, v_con.conname);
      EXCEPTION WHEN check_violation THEN
        EXECUTE format('SELECT count(*) FROM public.%I WHERE %s', v_con.tabela, v_con.violacao)
          INTO v_bad;
        RAISE WARNING 'CHECK %.%: % linha(s) legada(s) violam a regra — constraint permanece NOT VALID (válida para novos writes)',
          v_con.tabela, v_con.conname, v_bad;
      END;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Verificação fail-closed: todas as 18 constraints precisam existir ao final.
-- ============================================================================
DO $$
DECLARE
  v_missing TEXT[];
BEGIN
  SELECT array_agg(conname) INTO v_missing
  FROM (VALUES
    ('ferias_datas_coerentes'), ('ferias_dias_gozo_clt'), ('ferias_dias_abono_clt'),
    ('periodos_datas_coerentes'), ('periodos_numero_positivo'), ('periodos_dias_direito_clt'),
    ('ferias_prog_mes_valido'), ('ferias_prog_datas_coerentes'),
    ('prem_pag_valor_calculado_positivo'), ('prem_pag_valor_aprovado_positivo'), ('prem_pag_valor_folha_positivo'),
    ('cnab_itens_valor_positivo'),
    ('deslig_salario_positivo'), ('deslig_proventos_positivo'), ('deslig_descontos_positivo'),
    ('batidas_latitude_valida'), ('batidas_longitude_valida'), ('batidas_precisao_positiva')
  ) AS expected(conname)
  WHERE NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = expected.conname);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'CHECK constraints ausentes após migration: %', array_to_string(v_missing, ', ');
  END IF;
END $$;
