CREATE OR REPLACE FUNCTION public.purge_audit_log_old(_dias integer DEFAULT 365)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _deleted integer;
BEGIN
  IF _dias < 30 THEN
    RAISE EXCEPTION 'Retenção mínima de 30 dias por compliance';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem purgar audit_log'
      USING ERRCODE = '42501';
  END IF;

  WITH del AS (
    DELETE FROM public.audit_log
    WHERE created_at < now() - (_dias || ' days')::interval
    RETURNING 1
  )
  SELECT count(*) INTO _deleted FROM del;

  RETURN _deleted;
END;
$function$
