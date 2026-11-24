-- Onda 16: CHECK constraints de integridade em tabelas de recursos/cadastro.
--
-- Modelo defensivo (mesmo de 20261011170000/20261011180000): cada constraint
-- entra NOT VALID (já vale para novos writes) e depois VALIDATE — se houver
-- linha legada violando, a constraint permanece NOT VALID com WARNING contendo
-- a contagem, sem abortar o deploy. Idempotente: se a constraint já existe,
-- só o VALIDATE é reexecutado. Ao final falha fechado se alguma não existir.
--
-- Convenções confirmadas: candidaturas.nota_geral é 0–10 (mesma faixa do
-- schema Zod de avaliação); CURRENT_DATE não pode entrar em CHECK (não é
-- imutável), então a sanidade de dependentes.data_nascimento usa piso fixo.

DO $$
DECLARE
  r RECORD;
  v_bad BIGINT;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('cargo_faixas_salariais',    'faixas_minimo_nao_negativo',      'valor_minimo >= 0'),
      ('cargo_faixas_salariais',    'faixas_maximo_coerente',          'valor_maximo IS NULL OR valor_maximo >= valor_minimo'),
      ('convenios',                 'convenios_limite_nao_negativo',   'limite_global IS NULL OR limite_global >= 0'),
      ('convenios_colaboradores',   'conv_colab_valores_nao_negativos','(limite_individual IS NULL OR limite_individual >= 0) AND COALESCE(saldo_utilizado,0) >= 0'),
      ('contratos',                 'contratos_vigencia_coerente',     'data_fim IS NULL OR data_fim >= data_inicio'),
      ('candidatos',                'candidatos_valores_nao_negativos','(pretensao_salarial IS NULL OR pretensao_salarial >= 0) AND (experiencia_anos IS NULL OR experiencia_anos >= 0)'),
      ('candidaturas',              'candidaturas_nota_faixa',         'nota_geral IS NULL OR nota_geral BETWEEN 0 AND 10'),
      ('configuracoes_ponto',       'cfg_ponto_tolerancias_nao_negativas','COALESCE(tolerancia_minutos,0) >= 0 AND COALESCE(intervalo_minimo_minutos,0) >= 0 AND COALESCE(raio_maximo_metros,0) >= 0'),
      ('comunicados',               'comunicados_vigencia_coerente',   'data_expiracao IS NULL OR data_publicacao IS NULL OR data_expiracao >= data_publicacao'),
      ('dependentes',               'dependentes_nascimento_plausivel','data_nascimento IS NULL OR data_nascimento >= ''1900-01-01''::date')
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
