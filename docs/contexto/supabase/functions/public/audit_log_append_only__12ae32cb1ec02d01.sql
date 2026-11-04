CREATE OR REPLACE FUNCTION public.audit_log_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Bypass autorizado e restrito: o expurgo LGPD (só service_role) liga o
  -- GUC só nesta transação; qualquer outro UPDATE/DELETE segue proibido.
  IF current_setting('app.audit_log_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Trilha de auditoria é append-only. UPDATE/DELETE não são permitidos em %.', TG_TABLE_NAME;
END;
$function$
