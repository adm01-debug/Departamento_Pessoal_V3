-- ok só se as duas RPCs de coletor existem como SECURITY DEFINER com search_path
-- fixo, authenticated executa e anon/PUBLIC não.
SELECT CASE
  WHEN to_regprocedure('public.gerar_token_coletor_ponto(uuid, text, text)') IS NULL
    THEN 'FALHOU: gerar_token_coletor_ponto ausente'
  WHEN to_regprocedure('public.revogar_coletor_ponto(uuid)') IS NULL
    THEN 'FALHOU: revogar_coletor_ponto ausente'
  WHEN (
    SELECT count(*) FROM pg_proc p
    WHERE p.oid IN ('public.gerar_token_coletor_ponto(uuid, text, text)'::regprocedure,
                    'public.revogar_coletor_ponto(uuid)'::regprocedure)
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=public']
  ) <> 2 THEN 'FALHOU: RPC de coletor sem SECURITY DEFINER ou search_path fixo'
  WHEN NOT has_function_privilege('authenticated', 'public.gerar_token_coletor_ponto(uuid, text, text)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.revogar_coletor_ponto(uuid)', 'EXECUTE')
    THEN 'FALHOU: authenticated nao executa RPC de coletor'
  WHEN has_function_privilege('anon', 'public.gerar_token_coletor_ponto(uuid, text, text)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.revogar_coletor_ponto(uuid)', 'EXECUTE')
    THEN 'FALHOU: anon executa RPC de coletor'
  WHEN EXISTS (
    SELECT 1 FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid IN ('public.gerar_token_coletor_ponto(uuid, text, text)'::regprocedure,
                    'public.revogar_coletor_ponto(uuid)'::regprocedure)
      AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) THEN 'FALHOU: PUBLIC executa RPC de coletor'
  ELSE 'ok'
END;
