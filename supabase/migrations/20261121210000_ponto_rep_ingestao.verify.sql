-- ok só se as 5 tabelas existem com RLS ligada, cada uma tem exatamente a policy
-- de leitura de admin/RH por empresa, o navegador não escreve em nenhuma e não
-- enxerga token_hash.
SELECT CASE
  WHEN (
    SELECT count(*) FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND c.relrowsecurity
      AND c.relname IN ('ponto_rep_dispositivos', 'ponto_rep_lotes', 'ponto_rep_funcionarios',
                        'ponto_rep_dias', 'ponto_rep_justificativas')
  ) <> 5 THEN 'FALHOU: faltam tabelas ponto_rep_* com RLS ligada'
  WHEN (
    SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('ponto_rep_dispositivos', 'ponto_rep_lotes', 'ponto_rep_funcionarios',
                        'ponto_rep_dias', 'ponto_rep_justificativas')
      AND p.policyname = p.tablename || '_select_rh' AND p.cmd = 'SELECT'
      AND p.roles = '{authenticated}'
      AND p.qual LIKE '%pertence_a_empresa%' AND p.qual LIKE '%has_role%'
  ) <> 5 THEN 'FALHOU: policy de leitura admin/RH ausente ou diferente'
  WHEN (
    SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename IN ('ponto_rep_dispositivos', 'ponto_rep_lotes', 'ponto_rep_funcionarios',
                        'ponto_rep_dias', 'ponto_rep_justificativas')
  ) <> 5 THEN 'FALHOU: ha policy alem da leitura em ponto_rep_*'
  WHEN EXISTS (
    SELECT 1
    FROM unnest(ARRAY['ponto_rep_dispositivos', 'ponto_rep_lotes', 'ponto_rep_funcionarios',
                      'ponto_rep_dias', 'ponto_rep_justificativas']) AS t(nome),
         unnest(ARRAY['anon', 'authenticated']) AS r(papel),
         unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS p(priv)
    WHERE has_table_privilege(r.papel, format('public.%I', t.nome), p.priv)
  ) THEN 'FALHOU: navegador tem escrita em ponto_rep_*'
  WHEN has_column_privilege('authenticated', 'public.ponto_rep_dispositivos', 'token_hash', 'SELECT')
    THEN 'FALHOU: authenticated enxerga token_hash'
  WHEN NOT has_column_privilege('authenticated', 'public.ponto_rep_dispositivos', 'ultimo_contato_em', 'SELECT')
    THEN 'FALHOU: authenticated nao le ponto_rep_dispositivos'
  WHEN has_table_privilege('anon', 'public.ponto_rep_dias', 'SELECT')
    THEN 'FALHOU: anon le ponto_rep_dias'
  ELSE 'ok'
END;
