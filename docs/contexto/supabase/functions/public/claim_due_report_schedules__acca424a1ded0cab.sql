CREATE OR REPLACE FUNCTION public.claim_due_report_schedules(p_now timestamp with time zone, p_limit integer DEFAULT 100)
 RETURNS SETOF relatorios_agendados
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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
$function$
