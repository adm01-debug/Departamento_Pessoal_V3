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

-- 3) NENHUMA LINHA FOI APAGADA de desligamentos. Esta e a assercao central do
--    arquivo: a migration original fazia
--    `DELETE FROM public.desligamentos WHERE empresa_id IS NULL` e esta nao faz.
--    Medido antes do apply: 2 linhas. Se o DELETE tivesse rodado por engano, ou
--    se alguem reintroduzisse o DELETE num merge futuro, a contagem cairia e
--    isso apareceria aqui. Uso >= porque criar desligamento e operacao normal
--    do sistema; o que nao pode e a contagem DIMINUIR.
SELECT CASE WHEN (SELECT count(*) FROM public.desligamentos) >= 2
  THEN 'ok' ELSE 'FALHOU: desligamentos tem menos de 2 linhas — a migration apagou dado' END;

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
