-- P0: serialize scheduled-report dispatches across concurrent cron invocations.
-- External delivery remains at-least-once; the caller supplies a deterministic
-- occurrence key to the provider so retries do not send the same e-mail twice.

DO $preflight$
BEGIN
  IF to_regclass('public.relatorios_agendados') IS NULL THEN
    RAISE EXCEPTION 'P0 report schedule claims require public.relatorios_agendados';
  END IF;
END
$preflight$;

ALTER TABLE public.relatorios_agendados
  ADD COLUMN IF NOT EXISTS dispatch_claim_token uuid,
  ADD COLUMN IF NOT EXISTS dispatch_claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_relatorios_agendados_dispatch_claim
  ON public.relatorios_agendados (ativo, proximo_envio, dispatch_claimed_at)
  WHERE ativo IS TRUE;

CREATE OR REPLACE FUNCTION public.claim_due_report_schedules(
  p_now timestamptz,
  p_limit integer DEFAULT 100
)
RETURNS SETOF public.relatorios_agendados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF p_now IS NULL OR p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'invalid report schedule claim arguments';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT ra.id
    FROM public.relatorios_agendados AS ra
    WHERE ra.ativo IS TRUE
      AND (ra.proximo_envio IS NULL OR ra.proximo_envio <= p_now)
      AND (
        ra.dispatch_claimed_at IS NULL
        OR ra.dispatch_claimed_at < p_now - interval '5 minutes'
      )
    ORDER BY ra.proximo_envio NULLS LAST, ra.id
    FOR UPDATE OF ra SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.relatorios_agendados AS ra
  SET dispatch_claim_token = gen_random_uuid(),
      dispatch_claimed_at = p_now
  FROM candidates
  WHERE ra.id = candidates.id
  RETURNING ra.*;
END
$function$;

CREATE OR REPLACE FUNCTION public.finish_report_schedule_claim(
  p_schedule_id uuid,
  p_claim_token uuid,
  p_next timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  affected integer;
BEGIN
  IF p_schedule_id IS NULL OR p_claim_token IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.relatorios_agendados
  SET proximo_envio = COALESCE(p_next, proximo_envio),
      dispatch_claim_token = NULL,
      dispatch_claimed_at = NULL
  WHERE id = p_schedule_id
    AND dispatch_claim_token = p_claim_token;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END
$function$;

REVOKE ALL ON FUNCTION public.claim_due_report_schedules(timestamptz, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_report_schedule_claim(uuid, uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_report_schedules(timestamptz, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_report_schedule_claim(uuid, uuid, timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.claim_due_report_schedules(timestamptz, integer) IS
  'Claims due schedules atomically with row locks and a five-minute stale-lease recovery window.';
