-- Sidecar da 20261117193000_storage_documentos_tenant_scope.
-- Contrato: toda linha nao-vazia da saida tem de ser exatamente 'ok'.
-- Somente leitura de catalogo.

-- 1) documentos: as 3 policies novas + a de DELETE da 20261117170000 = 4
SELECT CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
                  AND policyname IN ('documentos_select_authenticated','documentos_insert_authenticated',
                                     'documentos_update_authenticated','documentos_delete_rh_admin')) = 4
  THEN 'ok' ELSE 'FALHOU: bucket documentos sem as 4 policies' END;

-- 2) documentos-colaboradores: SELECT + INSERT
SELECT CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
                  AND policyname IN ('docs_colab_select_authenticated','docs_colab_insert_authenticated')) = 2
  THEN 'ok' ELSE 'FALHOU: documentos-colaboradores sem as 2 policies' END;

-- 3) afastamentos: SELECT + INSERT + UPDATE
SELECT CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
                  AND policyname IN ('afastamentos_select_authenticated','afastamentos_insert_authenticated',
                                     'afastamentos_update_authenticated')) = 3
  THEN 'ok' ELSE 'FALHOU: afastamentos sem as 3 policies' END;

-- 4) TODAS as policies novas usam o helper SEGURO, nenhuma usa o cru.
--    Esta e a correcao 1 em relacao a t008 — se alguem reintroduzir
--    `(storage.foldername(name))[1]::uuid` numa delas, isto reprova.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN ('documentos_select_authenticated','documentos_insert_authenticated',
                         'documentos_update_authenticated','docs_colab_select_authenticated',
                         'docs_colab_insert_authenticated','afastamentos_select_authenticated',
                         'afastamentos_insert_authenticated','afastamentos_update_authenticated')
      AND coalesce(qual, '') || coalesce(with_check, '') LIKE '%foldername%'
  ) THEN 'ok' ELSE 'FALHOU: policy nova usando foldername cru em vez de storage_path_empresa_id' END;

-- 5) e TODAS citam o helper seguro
SELECT CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
                  AND policyname IN ('documentos_select_authenticated','documentos_insert_authenticated',
                                     'documentos_update_authenticated','docs_colab_select_authenticated',
                                     'docs_colab_insert_authenticated','afastamentos_select_authenticated',
                                     'afastamentos_insert_authenticated','afastamentos_update_authenticated')
                    AND coalesce(qual,'') || coalesce(with_check,'') LIKE '%storage_path_empresa_id%') = 8
  THEN 'ok' ELSE 'FALHOU: policy nova sem storage_path_empresa_id' END;

-- 6) CORRECAO 2: comprovantes-despesas NAO ganhou policy desta leva.
--    Se `comprovantes_despesas_select` ou `_insert` aparecerem, alguem aplicou
--    a t008 crua por cima e o bucket ficou com policy PERMISSIVE duplicada.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN ('comprovantes_despesas_select','comprovantes_despesas_insert')
  ) THEN 'ok' ELSE 'FALHOU: comprovantes-despesas com policy duplicada da t008' END;

-- 7) as policies que JA protegiam comprovantes-despesas seguem de pe
SELECT CASE WHEN (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
                  AND policyname IN ('tenant_select_comprovantes_despesas','tenant_insert_comprovantes_despesas',
                                     'tenant_update_comprovantes_despesas','tenant_delete_comprovantes_despesas')) = 4
  THEN 'ok' ELSE 'FALHOU: policies originais de comprovantes-despesas alteradas' END;

-- 8) `documentos-admissao` segue SEM policy, de proposito (fluxo por token)
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND coalesce(qual,'') || coalesce(with_check,'') LIKE '%documentos-admissao%'
  ) THEN 'ok' ELSE 'FALHOU: documentos-admissao ganhou policy sem decisao' END;

-- 9) RLS segue ligada em storage.objects
SELECT CASE WHEN (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='storage' AND c.relname='objects')
  THEN 'ok' ELSE 'FALHOU: RLS desligada em storage.objects' END;

-- A assercao de ledger NAO mora aqui: o `validate` roda em transacao com
-- ROLLBACK e o ledger so e escrito no `apply`. Ver o cabecalho equivalente em
-- 20261117190000_permissions_matriz_seed.verify.sql. A prova de ledger esta em
-- scripts/canonical-invariants.sql, no modo `verify`.
