-- Sidecar de 20261117170000. Somente leitura: catalogo do Postgres.
-- Formato obrigatorio: CASE WHEN (...) THEN 'ok' ELSE 'FALHOU' END.

-- 1. As 2 policies de DELETE existem, em storage.objects, para authenticated.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'DELETE'
     AND policyname IN ('documentos_delete_rh_admin', 'docs_colab_delete_rh_admin')
     AND roles::text LIKE '%authenticated%'
) = 2 THEN 'ok' ELSE 'FALHOU' END;

-- 2. Cada uma amarra o SEU bucket (sem policy larga que valha para qualquer um).
SELECT CASE WHEN (
  SELECT bool_and(
    (policyname = 'documentos_delete_rh_admin'   AND qual LIKE '%''documentos''%')
 OR (policyname = 'docs_colab_delete_rh_admin'   AND qual LIKE '%''documentos-colaboradores''%')
  ) FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'DELETE'
     AND policyname IN ('documentos_delete_rh_admin', 'docs_colab_delete_rh_admin')
) THEN 'ok' ELSE 'FALHOU' END;

-- 3. As duas usam o parser SEGURO de path (storage_path_empresa_id) e NAO o
--    cast cru para uuid, que estouraria em path malformado.
SELECT CASE WHEN (
  SELECT bool_and(qual LIKE '%storage_path_empresa_id%'
              AND qual NOT LIKE '%foldername%')
  FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'DELETE'
     AND policyname IN ('documentos_delete_rh_admin', 'docs_colab_delete_rh_admin')
) THEN 'ok' ELSE 'FALHOU' END;

-- 4. A permissao e `pode_gerir_rh` (admin/RH) e NAO
--    `user_can_manage_tenant_storage` (que incluiria 'gestor').
SELECT CASE WHEN (
  SELECT bool_and(qual LIKE '%pode_gerir_rh%'
              AND qual NOT LIKE '%user_can_manage_tenant_storage%')
  FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'DELETE'
     AND policyname IN ('documentos_delete_rh_admin', 'docs_colab_delete_rh_admin')
) THEN 'ok' ELSE 'FALHOU' END;

-- 5. Fail-closed: path malformado nao resolve empresa, e sem empresa a funcao
--    nega. Prova direta do helper, sem depender de sessao autenticada.
SELECT CASE WHEN (
  SELECT public.storage_path_empresa_id('nao-e-uuid/arquivo.pdf') IS NULL
) THEN 'ok' ELSE 'FALHOU' END;
