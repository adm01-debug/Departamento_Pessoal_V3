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
--     exatamente essa omissao, mas na linha 19 faz
--     `DELETE FROM public.desligamentos WHERE empresa_id IS NULL`.
--     Hoje isso atinge 0 de 2 linhas, mas desligamento carrega salario, valor
--     liquido e hashes de assinatura: se uma linha orfa nascer entre a medicao
--     e o apply, ela seria apagada sem backup.
--
-- Esta migration faz o efeito das duas e nao faz o DELETE. Se aparecer linha
-- orfa, o passo de verificacao ABORTA a migration inteira nomeando a tabela e a
-- contagem, sem mudar nada — falha segura em vez de falha destrutiva. A decisao
-- sobre a linha orfa volta para quem pode tomar: uma pessoa, com o dado na mao.
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
