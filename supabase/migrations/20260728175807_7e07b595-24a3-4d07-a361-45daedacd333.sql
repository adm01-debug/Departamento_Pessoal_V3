-- Expurgo de contadores órfãos: a poda dentro de edge_rate_limit_check só ocorre
-- quando a MESMA chave volta a ser usada. Chaves de uso único (ex.: IPs pontuais)
-- ficariam para sempre. 24h cobre com folga a maior janela usada (minutos).
CREATE OR REPLACE FUNCTION public.purge_rate_limits(p_older_than_sec integer DEFAULT 86400)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff  bigint := EXTRACT(EPOCH FROM now())::bigint - GREATEST(p_older_than_sec, 3600);
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limits WHERE "timestamp" < v_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_rate_limits(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_rate_limits(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_rate_limits(integer) TO service_role;

COMMENT ON FUNCTION public.purge_rate_limits(integer) IS
  'Expurga contadores de rate limit expirados. Agendado de hora em hora via pg_cron.';

DO $$
BEGIN
  PERFORM cron.unschedule('purge-rate-limits-hourly');
EXCEPTION WHEN others THEN
  NULL; -- job ainda não existe
END $$;

SELECT cron.schedule(
  'purge-rate-limits-hourly',
  '7 * * * *',
  $cron$ SELECT public.purge_rate_limits(86400); $cron$
);