CREATE OR REPLACE FUNCTION public.purge_old_lock_conflicts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_removed integer;
BEGIN
  DELETE FROM public.folha_lock_conflicts WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RETURN v_removed;
END $function$
