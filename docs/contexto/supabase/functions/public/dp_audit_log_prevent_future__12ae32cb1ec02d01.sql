CREATE OR REPLACE FUNCTION public.dp_audit_log_prevent_future()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.created_at > NOW() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'dp_audit_log: created_at não pode ser no futuro (drift: %)', 
      (NEW.created_at - NOW());
  END IF;
  -- Garantir que updated_at e actor_user_id sejam consistentes
  IF NEW.actor_user_id IS NULL AND NEW.actor_role = 'colaborador' THEN
    RAISE EXCEPTION 'dp_audit_log: actor_role=colaborador exige actor_user_id';
  END IF;
  RETURN NEW;
END;
$function$
