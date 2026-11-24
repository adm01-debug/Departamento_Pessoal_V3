-- 20261018160000_dedup_idempotency_anomalies_job.sql
--
-- Desagenda o job duplicado 'check-idempotency-anomalies' (*/15min, criado
-- por 20260712215808 chamando a função SQL direto — não é pg_net). O job
-- canônico é 'check_idempotency_anomalies_hourly'
-- (1x/hora) — a função já deduplica alertas em janela de 1h, então as
-- execuções de 15 em 15 minutos só geravam ruído e carga. A onda 3b
-- removeu 'check-idempotency-anomalies-hourly' (variante com hífen que
-- nunca existiu) e deixou este para trás (achado QA).
--
-- Idempotente: só desagenda se o job existir; se o canônico faltar, cria.

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN; END IF;

  PERFORM cron.unschedule('check-idempotency-anomalies')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-idempotency-anomalies');

  -- Job inativo (active=false) também conta como faltando: desagenda e
  -- re-cria ativo — senão a remoção do duplicado deixava zero monitoramento.
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'check_idempotency_anomalies_hourly' AND active
  ) THEN
    PERFORM cron.unschedule('check_idempotency_anomalies_hourly')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check_idempotency_anomalies_hourly');
    PERFORM cron.schedule(
      'check_idempotency_anomalies_hourly',
      '7 * * * *',
      $cmd$SELECT public.check_idempotency_anomalies();$cmd$
    );
  END IF;
END $$;
