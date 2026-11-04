CREATE OR REPLACE FUNCTION public.resolve_security_alert(_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem resolver alertas de segurança.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.security_alerts
     SET resolved = true,
         resolved_by = v_uid,
         resolved_at = now()
   WHERE id = _id
     AND resolved = false;

  RETURN FOUND;
END;
$function$
