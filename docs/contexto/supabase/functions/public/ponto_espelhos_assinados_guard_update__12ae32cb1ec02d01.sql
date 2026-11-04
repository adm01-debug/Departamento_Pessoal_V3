CREATE OR REPLACE FUNCTION public.ponto_espelhos_assinados_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rev TIMESTAMP WITH TIME ZONE := NEW.revogado_em;
BEGIN
  IF OLD.revogado_em IS NULL AND v_rev IS NOT NULL THEN
    NEW.revogado_em := OLD.revogado_em;
    IF NEW IS NOT DISTINCT FROM OLD THEN
      NEW.revogado_em := v_rev;
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Trilha de auditoria é append-only. UPDATE/DELETE não são permitidos em %.', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$function$
