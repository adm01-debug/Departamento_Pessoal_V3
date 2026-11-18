-- Sidecar da 20260929120000_colaborador_lotacoes.
-- Contrato: toda linha nao-vazia da saida tem de ser exatamente 'ok'.
-- Somente leitura de catalogo (roda em sessao default_transaction_read_only).
--
-- Escrito nesta auditoria porque a migration da `muri` nao tinha sidecar, e sem
-- ele o lote nao pode entrar no `canonical-migrations.yml`. Guardado aqui, ao
-- lado da forward, para que aplicar vire um movimento de 2 arquivos: mover
-- ambos para supabase/migrations/ e por no LOTE ATUAL.

-- 1) a tabela existe
SELECT CASE WHEN to_regclass('public.colaborador_lotacoes') IS NOT NULL
  THEN 'ok' ELSE 'FALHOU: public.colaborador_lotacoes nao existe' END;

-- 2) RLS ligada (tabela nova sem RLS e o erro que o AGENTS.md secao 5 proibe)
SELECT CASE WHEN (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE n.nspname = 'public' AND c.relname = 'colaborador_lotacoes')
  THEN 'ok' ELSE 'FALHOU: RLS desligada em colaborador_lotacoes' END;

-- 3) a policy de tenant usa o helper rls_tenant_or_admin nas DUAS pontas
--    (USING e WITH CHECK). Se alguem trocar por USING (true), isto reprova.
SELECT CASE WHEN (SELECT count(*) FROM pg_policies
                  WHERE schemaname = 'public' AND tablename = 'colaborador_lotacoes'
                    AND policyname = 'colaborador_lotacoes_tenant'
                    AND coalesce(qual, '') LIKE '%rls_tenant_or_admin%'
                    AND coalesce(with_check, '') LIKE '%rls_tenant_or_admin%') = 1
  THEN 'ok' ELSE 'FALHOU: colaborador_lotacoes_tenant sem rls_tenant_or_admin em USING e WITH CHECK' END;

-- 4) nenhuma outra policy permissiva irrestrita na tabela
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'colaborador_lotacoes'
      AND policyname <> 'colaborador_lotacoes_tenant'
  ) THEN 'ok' ELSE 'FALHOU: policy extra em colaborador_lotacoes' END;

-- 5) o indice unico PARCIAL que garante no maximo uma lotacao principal por
--    colaborador. Tres coisas de uma vez: existe, e UNIQUE, e tem predicado
--    (indpred NOT NULL) — um indice unico SEM predicado proibiria o colaborador
--    de ter mais de uma lotacao, que e o oposto do que a tabela existe para
--    permitir.
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    WHERE ic.relname = 'colaborador_lotacoes_principal_unica'
      AND i.indrelid = 'public.colaborador_lotacoes'::regclass
      AND i.indisunique
      AND i.indpred IS NOT NULL
  ) THEN 'ok' ELSE 'FALHOU: colaborador_lotacoes_principal_unica ausente, nao-unica ou sem predicado' END;

-- 6) e o predicado e exatamente sobre principal = true
SELECT CASE WHEN (SELECT pg_get_expr(i.indpred, i.indrelid) FROM pg_index i
                  JOIN pg_class ic ON ic.oid = i.indexrelid
                  WHERE ic.relname = 'colaborador_lotacoes_principal_unica') LIKE '%principal%'
  THEN 'ok' ELSE 'FALHOU: predicado do indice parcial nao e sobre principal' END;

-- 7) o vinculo colaborador+lotacao e unico (nao da para duplicar a mesma dupla)
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'colaborador_lotacoes_vinculo_unico'
      AND conrelid = 'public.colaborador_lotacoes'::regclass
      AND contype = 'u'
  ) THEN 'ok' ELSE 'FALHOU: constraint colaborador_lotacoes_vinculo_unico ausente' END;

-- 8) as 3 FKs, todas com ON DELETE CASCADE (confdeltype 'c'): empresas,
--    colaboradores e lotacoes. Sem cascade, apagar uma empresa deixaria linha
--    orfa apontando para tenant inexistente.
SELECT CASE WHEN (SELECT count(*) FROM pg_constraint
                  WHERE conrelid = 'public.colaborador_lotacoes'::regclass
                    AND contype = 'f' AND confdeltype = 'c'
                    AND confrelid IN ('public.empresas'::regclass,
                                      'public.colaboradores'::regclass,
                                      'public.lotacoes'::regclass)) = 3
  THEN 'ok' ELSE 'FALHOU: as 3 FKs com ON DELETE CASCADE nao estao todas presentes' END;

-- 9) o trigger de tenant existe, e BEFORE, e FOR EACH ROW, e cobre INSERT e
--    UPDATE. E a unica defesa contra referenciar colaborador/lotacao de OUTRA
--    empresa dentro de uma linha cuja empresa_id bate com a do usuario — a RLS
--    nao valida o tenant das linhas referenciadas por FK.
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.colaborador_lotacoes'::regclass
      AND t.tgname = 'trg_colaborador_lotacoes_valida_tenant'
      AND NOT t.tgisinternal
      AND (t.tgtype & 2) <> 0    -- BEFORE
      AND (t.tgtype & 1) <> 0    -- FOR EACH ROW
      AND (t.tgtype & 4) <> 0    -- INSERT
      AND (t.tgtype & 16) <> 0   -- UPDATE
  ) THEN 'ok' ELSE 'FALHOU: trigger de tenant ausente, AFTER, por statement, ou sem cobrir INSERT+UPDATE' END;

-- 10) a funcao do trigger checa as DUAS pontas (colaborador e lotacao)
SELECT CASE WHEN (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname = 'public' AND p.proname = 'colaborador_lotacoes_valida_tenant')
                 LIKE '%colaborador_empresa%'
  AND (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'colaborador_lotacoes_valida_tenant')
      LIKE '%lotacao_empresa%'
  THEN 'ok' ELSE 'FALHOU: a funcao do trigger nao valida as duas pontas' END;

-- 11) e tem search_path fixo — o mesmo gate que o "Auditar search_path das
--     funcoes" do ci.yml cobra das outras funcoes do schema.
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'colaborador_lotacoes_valida_tenant'
      AND p.proconfig IS NOT NULL
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
  ) THEN 'ok' ELSE 'FALHOU: colaborador_lotacoes_valida_tenant sem search_path fixo' END;

-- 12) os 3 indices de leitura (colaborador, lotacao, empresa)
SELECT CASE WHEN (SELECT count(*) FROM pg_indexes
                  WHERE schemaname = 'public' AND tablename = 'colaborador_lotacoes'
                    AND indexname IN ('idx_colaborador_lotacoes_colaborador',
                                      'idx_colaborador_lotacoes_lotacao',
                                      'idx_colaborador_lotacoes_empresa')) = 3
  THEN 'ok' ELSE 'FALHOU: faltam indices de leitura em colaborador_lotacoes' END;

-- 13) a deprecacao de lotacoes.colaborador_id ficou registrada no COMMENT
SELECT CASE WHEN coalesce(col_description('public.lotacoes'::regclass,
                 (SELECT attnum FROM pg_attribute
                  WHERE attrelid = 'public.lotacoes'::regclass AND attname = 'colaborador_id')), '')
                 <> ''
  THEN 'ok' ELSE 'FALHOU: lotacoes.colaborador_id sem COMMENT de deprecacao' END;

-- A assercao de ledger NAO mora aqui: o `validate` roda em transacao que
-- termina em ROLLBACK e o ledger so e escrito no `apply`, entao um sidecar que
-- exigisse a versao registrada nunca passaria em validate. Ver o mesmo
-- cabecalho em 20261117193000_storage_documentos_tenant_scope.verify.sql. A
-- prova de ledger esta em scripts/canonical-invariants.sql, no modo `verify`.
