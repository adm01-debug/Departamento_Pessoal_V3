-- Sidecar de verificacao da 20261126090000.
-- Roda dentro da transacao do apply/verify: a contagem e o numero de policies
-- que a migration declara (17). Qualquer policy faltante derruba o gate, e o
-- INSERT publico da 20260719150000 (se algum dia for aplicado) tambem.
SELECT CASE
  WHEN (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'pol_avatars_select_owner',
        'pol_avatars_insert_owner',
        'pol_avatars_update_owner',
        'pol_avatars_delete_owner',
        'pol_admissao_docs_insert_tenant_ou_temp',
        'pol_admissao_docs_select_tenant_ou_temp',
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
  ) = 17
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'admissao_docs_insert_public'
  )
  THEN 'ok'
  ELSE 'FALHOU: policies de storage dos buckets do app incompletas'
END;