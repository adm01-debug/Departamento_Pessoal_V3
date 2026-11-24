-- Sidecar da 20261118110000_drop_policy_inerte_recrutamento.
-- Contrato: toda linha nao-vazia da saida tem de ser exatamente 'ok'.
-- Somente leitura de catalogo (roda em sessao default_transaction_read_only).

-- 1) a policy inerte NAO existe mais em nenhuma das 5 tabelas. E o objetivo da
--    migration, e a assercao e sobre o conjunto todo, nao sobre uma amostra.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'Multi-tenant access'
      AND tablename IN ('vagas', 'candidatos', 'candidaturas',
                        'onboarding_colaborador', 'onboarding_tarefas')
  ) THEN 'ok' ELSE 'FALHOU: policy "Multi-tenant access" ainda existe em alguma das 5 tabelas' END;

-- 2) o que GOVERNA o acesso continua de pe: cada uma das 5 tabelas que existe
--    mantem ao menos uma policy para o role `authenticated`. Esta e a assercao
--    que impede a migration de virar um lockout: se o DROP tivesse removido a
--    policy errada, ou se alguma tabela dependesse unicamente da inerte, o
--    acesso legitimo cairia e isso apareceria aqui.
--    Deliberadamente NAO comparo nomes de policy: os nomes variam por tabela
--    (`Users can manage candidatos of their empresa`,
--     `Users can manage candidaturas via vaga empresa`, ...) e fixar os 5 no
--    sidecar seria chutar os que eu nao medi.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['vagas', 'candidatos', 'candidaturas',
                      'onboarding_colaborador', 'onboarding_tarefas']) AS t(nome)
    WHERE to_regclass('public.' || quote_ident(t.nome)) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = t.nome
          AND 'authenticated' = ANY (p.roles)
      )
  ) THEN 'ok' ELSE 'FALHOU: alguma das 5 tabelas ficou sem policy para authenticated' END;

-- 3) a RLS continua LIGADA nas 5. Remover policy nao deve mexer nisso, mas uma
--    RLS desligada por acidente transformaria "menos uma policy inerte" em
--    "tabela aberta" — o inverso do objetivo.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY['vagas', 'candidatos', 'candidaturas',
                      'onboarding_colaborador', 'onboarding_tarefas']) AS t(nome)
    JOIN pg_class c ON c.relname = t.nome
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE NOT c.relrowsecurity
  ) THEN 'ok' ELSE 'FALHOU: RLS desligada em alguma das 5 tabelas' END;

-- 4) nenhuma policy nova para o role `public` apareceu nessas tabelas. A
--    migration nao cria policy; esta assercao prende esse contrato para que uma
--    reaplicacao ou um merge futuro nao introduza permissiva por `public`.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('vagas', 'candidatos', 'candidaturas',
                        'onboarding_colaborador', 'onboarding_tarefas')
      AND 'public' = ANY (roles)
  ) THEN 'ok' ELSE 'FALHOU: existe policy para o role public em alguma das 5 tabelas' END;

-- A assercao de ledger NAO mora aqui: o `validate` roda em transacao que
-- termina em ROLLBACK e o ledger so e escrito no `apply`. A prova de ledger
-- esta em scripts/canonical-invariants.sql, no modo `verify`.
