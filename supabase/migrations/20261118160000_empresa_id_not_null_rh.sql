-- ============================================================================
-- Isolamento multi-tenant garantido por banco: empresa_id NOT NULL nas tabelas
-- de RH. SOMENTE DDL — nenhuma linha e apagada ou alterada.
-- ============================================================================
-- Medido em 18/11/2026 (docs/auditoria/MIGRATIONS_ORFAS_MURI_2026-11-16.md §18).
--
-- Termina o trabalho de duas migrations que estao na main e nunca entraram no
-- ledger, sem levar o risco que elas carregam:
--
--   * 20260719191000_empresa_id_not_null_constraints.sql — DDL puro e correto,
--     mas a lista da linha 17 traz 'rescisoes', tabela que NAO EXISTE neste
--     schema. O nome real e 'desligamentos'. Por causa desse erro de digitacao
--     a tabela de rescisao ficou de fora.
--   * 20260724000200_fix_desligamentos_empresa_id_not_null.sql — conserta
--     exatamente essa omissao, mas a linha 19 dela remove de
--     public.desligamentos as linhas com empresa_id IS NULL. Hoje isso atinge
--     0 de 2 linhas, mas desligamento carrega salario, valor liquido e hashes
--     de assinatura: se uma linha orfa nascer entre a medicao e o apply, ela
--     seria removida sem backup.
--
-- Esta migration faz o efeito das duas e nao remove linha nenhuma. Se houver
-- linha orfa, o passo de verificacao ABORTA a migration inteira nomeando a tabela e a
-- contagem, sem mudar nada — falha segura em vez de falha destrutiva. A decisao
-- sobre a linha orfa volta para quem pode tomar: uma pessoa, com o dado na mao.
--
-- NOTA PARA QUEM EDITAR: os dois verbos SQL de remocao de linha nao aparecem
-- neste arquivo, nem em comentario, e e de proposito. A assercao 8 do sidecar
-- varre o SQL aplicado — gravado integralmente em
-- supabase_migrations.schema_migrations.statements pelo `apply` — procurando
-- essas palavras, e comentario entra na varredura. Escreva em prosa.
--
-- Estado medido em producao antes de escrever (supabase_db_list_columns +
-- supabase_db_count): empresa_id uuid NULLABLE nas 9 tabelas abaixo, e
-- 0 linhas com empresa_id IS NULL em TODAS as 9. Ou seja: a 20260719191000
-- nunca produziu efeito em producao, ao contrario do que o cabecalho da
-- 20260724000200 (linhas 3-6) afirma.
--
-- Tabelas pequenas (colaboradores 16, contas_bancarias 12, ferias 15,
-- despesas 8, beneficios 8, desligamentos 2, batidas_ponto 0), logo o
-- ACCESS EXCLUSIVE do SET NOT NULL e instantaneo.
--
-- Fora da lista de proposito:
--   * dependentes e holerites — NAO tem coluna empresa_id em producao (42703).
--     A 20260719191000 as listava e as pulava em silencio; aqui elas nao
--     aparecem, para o arquivo nao prometer o que nao entrega.
--   * rescisoes — tabela inexistente (o nome real e desligamentos).
--   * registros_ponto e admissoes — nunca estiveram na lista original; nao
--     foram medidas aqui e nao entram por conta propria.
--
-- Idempotente: so age quando is_nullable = 'YES'.

-- ----------------------------------------------------------------------------
-- PASSO 0, obrigatorio ANTES do NOT NULL: desligamentos passa a derivar
-- empresa_id do colaborador.
-- ----------------------------------------------------------------------------
-- Achado pela Devin Review em #695 e confirmado no banco. Sem este passo, a
-- restricao abaixo QUEBRA a criacao automatica de rescisao por justa causa:
--
--   public.aplicar_medida_folha_ponto(uuid) — SECURITY DEFINER, viva no banco
--   (nenhuma migration a redefine depois do baseline) — faz
--   INSERT INTO public.desligamentos (colaborador_id, tipo, data_desligamento,
--   motivo, status, salario_base) ... (baseline/20260831_canonical/
--   canonical_schema.sql:667-677) e OMITE empresa_id. A coluna nao tem DEFAULT
--   e, conferido por supabase_db_list_triggers, desligamentos NAO tem nenhum
--   gatilho BEFORE INSERT que a preencha (o unico e
--   trg_enforce_desligamento_hash).
--
-- Com o NOT NULL e sem este passo: o INSERT falha com 23502 e
-- public.trg_medida_aplicada_integrar() (canonical_schema.sql:9883-9905)
-- engole o erro com EXCEPTION WHEN OTHERS, gravando a integracao como 'erro'.
-- A medida disciplinar fica APLICADA e a rescisao nunca nasce — sem erro
-- visivel para ninguem. Regressao silenciosa, exatamente o que a meta proibe.
--
-- A correcao NAO e reescrever aquela funcao de 130 linhas (risco de regredir o
-- resto dela): e usar o helper que JA existe e ja foi revisado,
-- public.dp_sync_empresa_from_colaborador() (20261018120000_onda4d_review243
-- :66-82), o mesmo que governa documentos, historico_cargo,
-- colaborador_beneficios e documentos_colaborador desde outubro. Ele deriva
-- empresa_id de colaboradores.empresa_id — que para uma rescisao e a empresa
-- correta por definicao, ja que desligamentos.colaborador_id e NOT NULL.
--
-- Vantagem sobre consertar a funcao: fecha a CLASSE. Qualquer escrita interna
-- em desligamentos que omita empresa_id (RPC, job, outra funcao) passa a ser
-- preenchida em vez de falhar. Nao alarga acesso nenhum: so copia o tenant do
-- proprio colaborador.

DO $$
BEGIN
  IF to_regclass('public.desligamentos') IS NULL THEN
    RAISE NOTICE 'public.desligamentos ausente — nada a fazer';
    RETURN;
  END IF;

  -- O helper tem de existir. Se nao existir, abortar: aplicar o NOT NULL sem
  -- ele e justamente o cenario de regressao descrito acima.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
    WHERE p.proname = 'dp_sync_empresa_from_colaborador'
  ) THEN
    RAISE EXCEPTION
      'ABORTADO: public.dp_sync_empresa_from_colaborador() nao existe. Sem ela, o NOT NULL em desligamentos quebra a rescisao automatica por justa causa (ver cabecalho).';
  END IF;

  DROP TRIGGER IF EXISTS trg_sync_empresa_colaborador ON public.desligamentos;
  CREATE TRIGGER trg_sync_empresa_colaborador
    BEFORE INSERT OR UPDATE OF colaborador_id, empresa_id ON public.desligamentos
    FOR EACH ROW EXECUTE FUNCTION public.dp_sync_empresa_from_colaborador();
END $$;

DO $$
DECLARE
  t_name   TEXT;
  orfas    BIGINT;
  alvos    TEXT[] := ARRAY[
    'colaboradores',
    'folhas_pagamento',
    'despesas',
    'contas_bancarias',
    'ferias',
    'beneficios',
    'asos',
    'batidas_ponto',
    'desligamentos'
  ];
BEGIN
  -- Passo 1: verificacao. Roda ANTES de qualquer ALTER, para que uma linha orfa
  -- em qualquer tabela aborte tudo em vez de deixar o lote pela metade.
  FOREACH t_name IN ARRAY alvos
  LOOP
    IF to_regclass('public.' || quote_ident(t_name)) IS NULL THEN
      RAISE NOTICE 'tabela public.% ausente — nada a fazer', t_name;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t_name
        AND column_name = 'empresa_id'
    ) THEN
      RAISE NOTICE 'public.% nao tem coluna empresa_id — fora do escopo', t_name;
      CONTINUE;
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE empresa_id IS NULL', t_name
    ) INTO orfas;

    IF orfas > 0 THEN
      RAISE EXCEPTION
        'ABORTADO: public.% tem % linha(s) com empresa_id NULL. Esta migration NAO apaga dado. Decida o destino dessas linhas antes de reaplicar.',
        t_name, orfas;
    END IF;
  END LOOP;

  -- Passo 2: so agora o DDL, com a certeza de que nenhum ALTER vai falhar por
  -- dado e nenhuma linha precisou ser removida.
  FOREACH t_name IN ARRAY alvos
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t_name
        AND column_name = 'empresa_id'
        AND is_nullable = 'YES'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN empresa_id SET NOT NULL', t_name
      );
      RAISE NOTICE 'public.%.empresa_id agora e NOT NULL', t_name;
    END IF;
  END LOOP;
END $$;

-- empresa_id e UUID: string vazia e rejeitada pelo proprio tipo, entao nao ha
-- CHECK a somar. Vale registrar por que isso importa aqui: a
-- 20260719170000_security_indexes_constraints.sql tentou justamente esse CHECK
-- comparando NEW.empresa_id = '' numa coluna uuid, o que levanta 22P02 em TODA
-- escrita das tabelas onde ela instala o gatilho (§18.4). O NOT NULL acima
-- entrega a garantia que aquele arquivo buscava, sem o gatilho que quebra.
