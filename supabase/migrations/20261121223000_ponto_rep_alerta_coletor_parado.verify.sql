-- ok só se a função existe como SECURITY DEFINER com search_path fixo, o
-- navegador não a executa e o job de 15 em 15 minutos está agendado.
SELECT CASE
  WHEN to_regprocedure('public.alertar_coletores_ponto_parados(timestamptz)') IS NULL
    THEN 'FALHOU: funcao alertar_coletores_ponto_parados ausente'
  WHEN NOT (SELECT p.prosecdef FROM pg_proc p
             WHERE p.oid = 'public.alertar_coletores_ponto_parados(timestamptz)'::regprocedure)
    THEN 'FALHOU: funcao nao e SECURITY DEFINER'
  WHEN NOT EXISTS (SELECT 1 FROM pg_proc p
                    WHERE p.oid = 'public.alertar_coletores_ponto_parados(timestamptz)'::regprocedure
                      AND 'search_path=public' = ANY (p.proconfig))
    THEN 'FALHOU: funcao sem search_path=public'
  WHEN has_function_privilege('anon', 'public.alertar_coletores_ponto_parados(timestamptz)', 'EXECUTE')
    THEN 'FALHOU: anon executa alertar_coletores_ponto_parados'
  WHEN has_function_privilege('authenticated', 'public.alertar_coletores_ponto_parados(timestamptz)', 'EXECUTE')
    THEN 'FALHOU: authenticated executa alertar_coletores_ponto_parados'
  WHEN (SELECT count(*) FROM cron.job
         WHERE jobname = 'alertar-coletores-ponto-parados'
           AND schedule = '*/15 * * * *'
           AND command LIKE '%public.alertar_coletores_ponto_parados()%') <> 1
    THEN 'FALHOU: job alertar-coletores-ponto-parados ausente ou diferente'
  ELSE 'ok'
END;
