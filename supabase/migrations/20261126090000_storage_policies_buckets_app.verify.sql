-- Sidecar de verificacao da 20261126090000.
-- Roda dentro da transacao do apply/verify: a contagem e o numero de policies
-- que a migration declara. Qualquer policy faltante derruba o gate, e o
-- INSERT publico da 20260719150000 (se algum dia for aplicado) tambem.
--
-- Contagem 15 (era 17): as duas policies de `documentos-admissao`
-- (`pol_admissao_docs_insert_tenant_ou_temp` e `..._select_tenant_ou_temp`)
-- saem na 20261126120000 -- bucket sem consumidor autenticado, e a versao
-- anterior contrariava a decisao da 20261117193000. A ausencia delas e
-- afirmada pelo sidecar daquela migration.
SELECT CASE
  WHEN (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'pol_avatars_select_owner',
        'pol_avatars_insert_owner',
        'pol_avatars_update_owner',
        'pol_avatars_delete_owner',
        'pol_ferias_avisos_select_tenant',
        'pol_ferias_avisos_insert_tenant',
        'pol_ferias_avisos_update_tenant',
        'pol_comunicados_coletivas_select_tenant',
        'pol_comunicados_coletivas_insert_tenant',
        'pol_comunicados_coletivas_update_tenant',
        'pol_medidas_contestacoes_select_tenant',
        'pol_medidas_contestacoes_insert_tenant',
        'pol_medidas_disciplinares_select_tenant',
        'pol_ponto_biometria_insert_tenant',
        'pol_contratos_trabalho_select_tenant'
      )
  ) = 15
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'admissao_docs_insert_public'
  )
  THEN 'ok'
  ELSE 'FALHOU: policies de storage dos buckets do app incompletas'
END;