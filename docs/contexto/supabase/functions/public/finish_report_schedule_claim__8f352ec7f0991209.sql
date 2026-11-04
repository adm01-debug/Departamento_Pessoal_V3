CREATE OR REPLACE FUNCTION public.finish_report_schedule_claim(p_schedule_id uuid, p_claim_token uuid, p_next timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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
$function$
