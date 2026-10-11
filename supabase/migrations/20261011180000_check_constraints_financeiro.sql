-- ============================================================================
-- CHECK constraints de integridade — tabelas financeiras e de cadastro
-- (onda 14b / auditoria). Complementa 20261011170000 e os chk_* do baseline.
--
-- Mesmo modelo defensivo: cada regra entra NOT VALID (vale já para novos
-- INSERT/UPDATE, sem varrer a tabela) e em seguida tenta VALIDATE. Se houver
-- linha legada violando, a constraint segue NOT VALID e um WARNING informa a
-- contagem — o deploy nunca aborta e a regra nunca fica desligada.
--
-- Fora de propósito: total_liquido (folha/itens) pode ser negativo quando
-- descontos > proventos (saldo devedor); jornadas_horarios.dia_semana não tem
-- convenção documentada (0-6 vs 1-7) e não tem writer no app.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_bad BIGINT;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('emprestimos_consignados', 'emprestimos_valor_total_positivo',   'valor_total > 0'),
      ('emprestimos_consignados', 'emprestimos_valor_parcela_positivo', 'valor_parcela > 0'),
      ('emprestimos_consignados', 'emprestimos_num_parcelas_positivo',  'numero_parcelas > 0'),
      ('emprestimos_consignados', 'emprestimos_parcelas_pagas_faixa',   'parcelas_pagas IS NULL OR parcelas_pagas BETWEEN 0 AND numero_parcelas'),
      ('emprestimos_consignados', 'emprestimos_taxa_juros_positiva',    'taxa_juros IS NULL OR taxa_juros >= 0'),
      ('folha_itens',             'folha_itens_valores_nao_negativos',  'COALESCE(salario_base,0) >= 0 AND COALESCE(total_proventos,0) >= 0 AND COALESCE(total_descontos,0) >= 0 AND COALESCE(fgts_mes,0) >= 0 AND COALESCE(inss_mes,0) >= 0 AND COALESCE(irrf_mes,0) >= 0'),
      ('colaboradores',           'colaboradores_salario_nao_negativo', 'salario_base >= 0'),
      ('colaboradores',           'colaboradores_desligamento_coerente','data_desligamento IS NULL OR data_desligamento >= data_admissao'),
      ('colaboradores',           'colaboradores_intervalo_positivo',   'intervalo_minutos IS NULL OR intervalo_minutos >= 0'),
      ('afastamentos',            'afastamentos_dias_nao_negativos',    'COALESCE(dias_empresa,0) >= 0 AND COALESCE(dias_inss,0) >= 0 AND COALESCE(dias_total,0) >= 0'),
      ('beneficios',              'beneficios_valores_nao_negativos',   'COALESCE(valor,0) >= 0 AND COALESCE(valor_empresa,0) >= 0 AND COALESCE(valor_colaborador,0) >= 0 AND COALESCE(teto_coparticipacao,0) >= 0 AND COALESCE(carencia_dias,0) >= 0'),
      ('beneficios',              'beneficios_subsidio_percentual',     'percentual_subsidio_empresa IS NULL OR percentual_subsidio_empresa BETWEEN 0 AND 100'),
      ('beneficios_colaborador',  'benef_colab_valores_nao_negativos',  'valor >= 0 AND COALESCE(desconto,0) >= 0'),
      ('beneficios_colaborador',  'benef_colab_vigencia_coerente',      'data_fim IS NULL OR data_fim >= data_inicio')
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

    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', r.tabela, r.conname);
    EXCEPTION WHEN check_violation THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE (%s) IS FALSE', r.tabela, r.expr) INTO v_bad;
      RAISE WARNING 'CHECK %.%: % linha(s) legada(s) violam a regra — constraint permanece NOT VALID (válida para novos writes)',
        r.tabela, r.conname, v_bad;
    END;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.conname) THEN
      v_missing := v_missing || r.conname;
    END IF;
  END LOOP;

  IF cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION 'CHECK constraints ausentes após migration: %', array_to_string(v_missing, ', ');
  END IF;
END $$;
