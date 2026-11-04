CREATE OR REPLACE FUNCTION public.purge_expired_idempotency_keys()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM public.idempotency_keys WHERE expires_at < now();
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$function$
