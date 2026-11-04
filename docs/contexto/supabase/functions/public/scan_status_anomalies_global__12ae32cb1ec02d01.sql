CREATE OR REPLACE FUNCTION public._scan_status_anomalies_global()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _alerts integer := 0;
  _max_alerts_per_run constant integer := 20;
  _cooldown_interval constant interval := interval '1 hour';
  _lock_acquired boolean;
  r record;
BEGIN
  -- Advisory lock não-bloqueante: se outro scan já roda, retorna imediatamente
  -- Hash 'scan_anomalies_global' → int estável
  SELECT pg_try_advisory_lock(hashtext('scan_anomalies_global')::bigint) INTO _lock_acquired;
  IF NOT _lock_acquired THEN
    RETURN 0;
  END IF;

  BEGIN
    FOR r IN
      SELECT tabela, count(*) AS c
      FROM public.audit_log
      WHERE acao = 'STATUS_CHANGE'
        AND created_at >= now() - interval '10 minutes'
      GROUP BY tabela
      HAVING count(*) >= 500
      ORDER BY count(*) DESC
      LIMIT _max_alerts_per_run
    LOOP
      -- Cooldown 1h (era 10min) — reduz spam em incidentes prolongados
      IF NOT EXISTS (
        SELECT 1 FROM public.security_alerts
        WHERE type = 'status_change_burst_global'
          AND details->>'tabela' = r.tabela
          AND created_at >= now() - _cooldown_interval
      ) THEN
        INSERT INTO public.security_alerts (type, severity, details)
        VALUES ('status_change_burst_global', 'critical',
                jsonb_build_object('tabela', r.tabela, 'count', r.c,
                                   'window_minutes', 10, 'threshold', 500,
                                   'cooldown_minutes', 60,
                                   'detected_at', now()));
        _alerts := _alerts + 1;

        EXIT WHEN _alerts >= _max_alerts_per_run;
      END IF;
    END LOOP;

    -- Observabilidade — sempre loga execução (mesmo com 0 alerts)
    IF _alerts > 0 THEN
      INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos)
      VALUES ('security_alerts', gen_random_uuid(), 'ANOMALY_SCAN_RUN',
              jsonb_build_object('alerts_created', _alerts,
                                 'max_per_run', _max_alerts_per_run,
                                 'ran_at', now()));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(hashtext('scan_anomalies_global')::bigint);
    RAISE;
  END;

  PERFORM pg_advisory_unlock(hashtext('scan_anomalies_global')::bigint);
  RETURN _alerts;
END; $function$
