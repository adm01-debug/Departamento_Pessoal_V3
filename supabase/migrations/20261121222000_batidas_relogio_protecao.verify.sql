-- ok só se os 2 gatilhos de proteção do relógio estão ativos em batidas_ponto,
-- as RPCs de consulta existem e só authenticated/service_role as executam, e o
-- núcleo interno não é executável pelo navegador.
SELECT CASE
  WHEN (
    SELECT count(*) FROM pg_trigger t
    WHERE t.tgrelid = 'public.batidas_ponto'::regclass AND NOT t.tgisinternal
      AND t.tgenabled <> 'D'
      AND t.tgname IN ('trg_batida_relogio_protecao', 'trg_batida_relogio_autoatendimento')
  ) <> 2 THEN 'FALHOU: gatilhos de protecao do relogio ausentes ou desligados'
  WHEN to_regprocedure('public.colaborador_usa_relogio()') IS NULL
    THEN 'FALHOU: colaborador_usa_relogio() ausente'
  WHEN to_regprocedure('public.colaborador_usa_relogio_por_id(uuid)') IS NULL
    THEN 'FALHOU: colaborador_usa_relogio_por_id(uuid) ausente'
  WHEN NOT has_function_privilege('authenticated', 'public.colaborador_usa_relogio()', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.colaborador_usa_relogio_por_id(uuid)', 'EXECUTE')
    THEN 'FALHOU: authenticated nao executa as RPCs do relogio'
  WHEN has_function_privilege('anon', 'public.colaborador_usa_relogio()', 'EXECUTE')
    OR has_function_privilege('anon', 'public.colaborador_usa_relogio_por_id(uuid)', 'EXECUTE')
    THEN 'FALHOU: anon executa as RPCs do relogio'
  WHEN has_function_privilege('authenticated', 'public.ponto_rep_colaborador_usa_relogio(uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.ponto_rep_colaborador_usa_relogio(uuid)', 'EXECUTE')
    THEN 'FALHOU: navegador executa o nucleo interno ponto_rep_colaborador_usa_relogio'
  ELSE 'ok'
END;
