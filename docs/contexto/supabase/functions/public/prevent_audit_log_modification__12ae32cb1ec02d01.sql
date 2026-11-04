CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF current_setting('app.audit_log_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log records are immutable — UPDATE and DELETE are prohibited';
END;
$function$
