-- ok só se as 3 RPCs de vínculo/de-para existem, são SECURITY DEFINER com
-- search_path fixo, authenticated executa e anon/PUBLIC não.
SELECT CASE
  WHEN (
    SELECT count(*) FROM pg_proc p
    WHERE p.oid IN (
      to_regprocedure('public.vincular_funcionario_relogio(uuid, uuid)'),
      to_regprocedure('public.desvincular_funcionario_relogio(uuid)'),
      to_regprocedure('public.definir_tipo_dia_justificativa_relogio(uuid, text)')
    )
      AND p.prosecdef
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
  ) <> 3 THEN 'FALHOU: RPCs de vinculo do relogio ausentes ou sem SECURITY DEFINER/search_path'
  WHEN EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'public.vincular_funcionario_relogio(uuid, uuid)',
      'public.desvincular_funcionario_relogio(uuid)',
      'public.definir_tipo_dia_justificativa_relogio(uuid, text)'
    ]) AS f(sig)
    WHERE has_function_privilege('anon', f.sig, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', f.sig, 'EXECUTE')
  ) THEN 'FALHOU: EXECUTE das RPCs de vinculo errado (anon executa ou authenticated nao)'
  WHEN EXISTS (
    SELECT 1 FROM pg_proc p, aclexplode(p.proacl) a
    WHERE p.oid IN (
      to_regprocedure('public.vincular_funcionario_relogio(uuid, uuid)'),
      to_regprocedure('public.desvincular_funcionario_relogio(uuid)'),
      to_regprocedure('public.definir_tipo_dia_justificativa_relogio(uuid, text)')
    )
      AND a.grantee = 0
  ) THEN 'FALHOU: PUBLIC executa RPC de vinculo do relogio'
  ELSE 'ok'
END;
