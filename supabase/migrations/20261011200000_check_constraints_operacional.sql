-- Onda 16b: CHECK constraints operacionais (ASO/exames, desligamentos, CNAB,
-- escalas/jornadas, treinamentos, triagem, premiações, documentos, EPIs,
-- promoções). Defensivas: NOT VALID + VALIDATE tolera linhas legadas
-- (WARNING com contagem) mas vale imediatamente para novos writes.
-- Fail-closed: tabela ausente ou constraint não criada aborta a migration
-- antes do ledger registrar a versão.

DO $$
DECLARE
  r RECORD;
  v_bad BIGINT;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('adiantamentos_salariais','adiantamentos_pagamento_coerente',   'data_pagamento IS NULL OR data_pagamento >= data_solicitacao'),
      ('asos',                   'asos_validade_coerente',           'data_validade IS NULL OR data_validade >= data_exame'),
      ('exames',                 'exames_validade_coerente',         'data_validade IS NULL OR data_exame IS NULL OR data_validade >= data_exame'),
      ('desligamentos',          'desligamentos_componentes_nao_neg','COALESCE(salario_base,0) >= 0 AND COALESCE(saldo_salario,0) >= 0 AND COALESCE(aviso_previo,0) >= 0 AND COALESCE(ferias_vencidas,0) >= 0 AND COALESCE(ferias_proporcionais,0) >= 0 AND COALESCE(terco_constitucional,0) >= 0 AND COALESCE(decimo_terceiro,0) >= 0 AND COALESCE(multa_fgts,0) >= 0'),
      ('cnab_itens',             'cnab_itens_valor_positivo',        'valor_pagamento > 0'),
      ('escalas',                'escalas_ciclo_valido',             'dias_trabalho BETWEEN 1 AND 7 AND COALESCE(dias_folga,0) BETWEEN 0 AND 6 AND COALESCE(intervalo_minutos,0) >= 0'),
      ('jornadas',               'jornadas_carga_plausivel',         'carga_horaria_semanal IS NULL OR (carga_horaria_semanal > 0 AND carga_horaria_semanal <= 80)'),
      ('jornadas_horarios',      'jornadas_horarios_dia_valido',     'dia_semana BETWEEN 0 AND 7'),
      ('treinamentos',           'treinamentos_carga_nao_negativa',  'carga_horaria IS NULL OR carga_horaria >= 0'),
      ('triagem_notas',          'triagem_notas_nota_faixa',         'nota IS NULL OR nota BETWEEN 0 AND 10'),
      ('premiacoes_pagamentos',  'premiacoes_valores_nao_negativos', 'COALESCE(valor_calculado,0) >= 0 AND (valor_aprovado IS NULL OR valor_aprovado >= 0) AND (valor_folha_real IS NULL OR valor_folha_real >= 0)'),
      ('documentos_colaborador', 'documentos_tamanho_nao_negativo',  'tamanho_bytes IS NULL OR tamanho_bytes >= 0'),
      ('documentos_historico',   'doc_historico_tamanho_nao_neg',    'tamanho IS NULL OR tamanho >= 0'),
      ('epis_entregas',          'epis_entregas_qtd_positiva',       'COALESCE(quantidade,1) > 0'),
      ('epis_entregas',          'epis_devolucao_coerente',          'data_devolucao IS NULL OR data_devolucao >= data_entrega'),
      ('promocoes',              'promocoes_salarios_nao_negativos', '(salario_anterior IS NULL OR salario_anterior >= 0) AND (salario_novo IS NULL OR salario_novo >= 0)')
    ) AS s(tabela, conname, expr)
  LOOP
    IF to_regclass(format('public.%I', r.tabela)) IS NULL THEN
      -- Tabela obrigatória ausente: fail-closed para não registrar a versão
      -- no ledger sem aplicar a regra (ela nunca seria criada depois).
      v_missing := v_missing || format('%I (tabela ausente)', r.conname);
      CONTINUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.conname) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID', r.tabela, r.conname, r.expr);
    END IF;

    -- Valida só se a constraint existe; violação legada só gera WARNING
    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', r.tabela, r.conname);
    EXCEPTION WHEN check_violation THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE (%s) IS FALSE', r.tabela, r.expr) INTO v_bad;
      RAISE WARNING 'CHECK %.%: % linha(s) legada(s) violam a regra — constraint permanece NOT VALID (válida para novos writes)', r.tabela, r.conname, v_bad;
    END;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.conname) THEN
      v_missing := v_missing || r.conname;
    END IF;
  END LOOP;

  IF cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION 'CHECK constraints ausentes após migration: %', array_to_string(v_missing, ', ');
  END IF;
END $$;
