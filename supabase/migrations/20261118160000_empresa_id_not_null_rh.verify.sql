-- Sidecar da 20261118160000_empresa_id_not_null_rh.
-- Contrato: toda linha nao-vazia da saida tem de ser exatamente 'ok'.
-- Somente leitura (roda em sessao default_transaction_read_only).
--
-- Escrito em 18/11/2026. Mede o que a migration promete E o que ela promete NAO
-- fazer: a versao original (20260724000200:19) apagava linhas, e a garantia de
-- que esta nao apaga precisa estar prendida aqui, nao so no comentario.

-- 1) empresa_id e NOT NULL em todas as 9 tabelas-alvo que existem e tem a
--    coluna. A assercao e sobre o conjunto, nao sobre uma amostra: qualquer
--    tabela que ficar de fora reprova.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['colaboradores','folhas_pagamento','despesas',
                      'contas_bancarias','ferias','beneficios','asos',
                      'batidas_ponto','desligamentos']) AS t(nome)
    JOIN pg_attribute a
      ON a.attrelid = to_regclass('public.' || quote_ident(t.nome))
     AND a.attname = 'empresa_id'
     AND a.attnum > 0
     AND NOT a.attisdropped
    WHERE NOT a.attnotnull
  ) THEN 'ok' ELSE 'FALHOU: alguma das 9 tabelas-alvo ainda tem empresa_id NULLABLE' END;

-- 2) e a coluna continua sendo uuid nas 9. Um NOT NULL nao deve mexer no tipo;
--    se o tipo mudasse, o isolamento por empresa passaria a comparar outra
--    coisa.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['colaboradores','folhas_pagamento','despesas',
                      'contas_bancarias','ferias','beneficios','asos',
                      'batidas_ponto','desligamentos']) AS t(nome)
    JOIN pg_attribute a
      ON a.attrelid = to_regclass('public.' || quote_ident(t.nome))
     AND a.attname = 'empresa_id'
     AND a.attnum > 0
     AND NOT a.attisdropped
    WHERE a.atttypid <> 'uuid'::regtype
  ) THEN 'ok' ELSE 'FALHOU: empresa_id deixou de ser uuid em alguma das 9' END;

-- 3) PISO de linhas em desligamentos. Medido antes do apply: 2 linhas.
--    Devin Review em #695, com razao: isto NAO prova ausencia de exclusao —
--    3 antes e 2 depois tambem passa, e a propria aplicacao permite excluir
--    (src/pages/DesligamentosPage.tsx:132-149), o que pode mexer no piso sem
--    participacao nenhuma da migration. Comparar antes/depois na mesma
--    transacao nao e possivel aqui: o sidecar roda DEPOIS do DDL.
--    Fica como tripwire grosseiro; a prova de verdade e a assercao 8.
SELECT CASE WHEN (SELECT count(*) FROM public.desligamentos) >= 2
  THEN 'ok' ELSE 'FALHOU: desligamentos caiu abaixo de 2 linhas' END;

-- 4) a RLS continua LIGADA nas 9. Garantia por coluna nao substitui garantia por
--    policy: se a RLS caisse, o NOT NULL so garantiria que o dado tem dono, nao
--    que o dono e quem le.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['colaboradores','folhas_pagamento','despesas',
                      'contas_bancarias','ferias','beneficios','asos',
                      'batidas_ponto','desligamentos']) AS t(nome)
    JOIN pg_class c ON c.oid = to_regclass('public.' || quote_ident(t.nome))
    WHERE NOT c.relrowsecurity
  ) THEN 'ok' ELSE 'FALHOU: RLS desligada em alguma das 9 tabelas' END;

-- 5) nenhuma linha orfa restou em nenhuma das 9. Redundante com a assercao 1
--    (NOT NULL torna isso impossivel), e esta aqui de proposito: se um apply
--    futuro afrouxar a restricao, esta linha pega o dado antes de a 1 pegar o
--    schema.
SELECT CASE WHEN (
    SELECT count(*) FROM (
      SELECT 1 FROM public.colaboradores    WHERE empresa_id IS NULL
      UNION ALL SELECT 1 FROM public.folhas_pagamento WHERE empresa_id IS NULL
      UNION ALL SELECT 1 FROM public.despesas         WHERE empresa_id IS NULL
      UNION ALL SELECT 1 FROM public.contas_bancarias WHERE empresa_id IS NULL
      UNION ALL SELECT 1 FROM public.ferias           WHERE empresa_id IS NULL
      UNION ALL SELECT 1 FROM public.beneficios       WHERE empresa_id IS NULL
      UNION ALL SELECT 1 FROM public.asos             WHERE empresa_id IS NULL
      UNION ALL SELECT 1 FROM public.batidas_ponto    WHERE empresa_id IS NULL
      UNION ALL SELECT 1 FROM public.desligamentos    WHERE empresa_id IS NULL
    ) q
  ) = 0 THEN 'ok' ELSE 'FALHOU: existe linha com empresa_id NULL em alguma das 9' END;

-- A assercao de ledger NAO mora aqui: o `validate` roda em transacao que termina
-- em ROLLBACK e o ledger so e escrito no `apply`. A prova de ledger esta em
-- scripts/canonical-invariants.sql, no modo `verify`.

-- 6) o gatilho que deriva empresa_id do colaborador existe em desligamentos, e
--    aponta para o helper certo. Sem ele, o NOT NULL quebra a rescisao
--    automatica por justa causa: aplicar_medida_folha_ponto insere em
--    desligamentos SEM empresa_id (canonical_schema.sql:667-677) e
--    trg_medida_aplicada_integrar engole o 23502 com EXCEPTION WHEN OTHERS
--    (canonical_schema.sql:9883-9905), deixando a medida aplicada sem rescisao
--    e sem erro visivel. Achado pela Devin Review em #695.
--    Esta assercao e o que impede alguem derrubar o gatilho e manter o NOT NULL.
SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM pg_trigger tg
    JOIN pg_proc p ON p.oid = tg.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
    WHERE tg.tgrelid = 'public.desligamentos'::regclass
      AND NOT tg.tgisinternal
      AND tg.tgname = 'trg_sync_empresa_colaborador'
      AND p.proname = 'dp_sync_empresa_from_colaborador'
  ) THEN 'ok' ELSE 'FALHOU: desligamentos sem o gatilho trg_sync_empresa_colaborador — o NOT NULL quebraria a rescisao por justa causa' END;

-- 7) e ele e BEFORE INSERT (um AFTER nao preencheria nada em tempo de
--    verificacao da constraint).
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.desligamentos'::regclass
      AND tgname = 'trg_sync_empresa_colaborador'
      AND (tgtype & 2) = 2    -- BEFORE
      AND (tgtype & 4) = 4    -- INSERT
  ) THEN 'ok' ELSE 'FALHOU: trg_sync_empresa_colaborador nao e BEFORE INSERT em desligamentos' END;

-- 8) PROVA de que o que foi aplicado nao apaga linha. Responde direto a Devin
--    Review em #695: a assercao 3 e so um piso. Esta aqui e estatica e forte —
--    o `apply` grava em supabase_migrations.schema_migrations.statements o
--    CONTEUDO EXATO do arquivo executado. Se o SQL aplicado contivesse DELETE
--    ou TRUNCATE em qualquer forma, apareceria ali.
--
--    Condicional de proposito: no `validate` a transacao termina em ROLLBACK e
--    a linha do ledger ainda nao existe, entao ausencia de linha devolve 'ok'
--    (sem isso o dry-run reprovaria sempre). No `verify`, apos o COMMIT, a
--    linha existe e a assercao morde.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261118160000'
      AND array_to_string(statements, ' ') ~* '(delete[[:space:]]+from|truncate)'
  ) THEN 'ok' ELSE 'FALHOU: o SQL aplicado como 20261118160000 contem DELETE/TRUNCATE — esta migration nao deve apagar dado' END;
