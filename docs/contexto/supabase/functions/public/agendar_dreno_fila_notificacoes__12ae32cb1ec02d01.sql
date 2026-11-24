CREATE OR REPLACE FUNCTION public.agendar_dreno_fila_notificacoes()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'net'
AS $function$
DECLARE
  v_proc text;
  v_url text;
  v_secret text;
BEGIN
  SELECT format('%I.%I', n.nspname, p.proname) INTO v_proc
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE p.oid::regprocedure::text LIKE '%.http_post(text,jsonb,jsonb,jsonb,integer)'
  ORDER BY (n.nspname = 'net') DESC, (n.nspname = 'extensions') DESC, n.nspname
  LIMIT 1;

  IF v_proc IS NULL THEN
    RAISE EXCEPTION
      'pg_net sem http_post(text,jsonb,jsonb,jsonb,integer): sem pg_net nao ha como o cron chamar a funcao.';
  END IF;

  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'agendamentos_dispatch_url';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'agendamentos_dispatch_secret';

  IF v_url IS NULL OR v_secret IS NULL THEN
    -- Sem os segredos o job so geraria 401 a cada 5 minutos. Remove um job
    -- antigo para nao deixar agendamento apontando para credencial revogada.
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drenar-fila-notificacoes') THEN
      PERFORM cron.unschedule('drenar-fila-notificacoes');
    END IF;
    RETURN 'sem_segredos';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drenar-fila-notificacoes') THEN
    PERFORM cron.unschedule('drenar-fila-notificacoes');
  END IF;

  PERFORM cron.schedule(
    'drenar-fila-notificacoes',
    '*/5 * * * *',
    format($job$
      SELECT %s(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agendamentos_dispatch_url'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agendamentos_dispatch_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $job$, v_proc)
  );

  RETURN 'agendado';
END;
$function$
