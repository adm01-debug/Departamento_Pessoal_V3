CREATE OR REPLACE FUNCTION public.dp_track_pii_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE v_event TEXT; v_user_id UUID;
BEGIN
  v_event := left(TG_TABLE_NAME || '_' || lower(TG_OP), 150);
  BEGIN v_user_id := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  BEGIN
    INSERT INTO public.dp_audit_log(event,event_type,actor_user_id,request_id,payload)
    VALUES(v_event,'security',v_user_id,gen_random_uuid(),
      jsonb_build_object('table',TG_TABLE_NAME,'operation',TG_OP,'when',NOW()));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dp_track_pii_access: audit log falhou: % %', SQLSTATE, SQLERRM;
  END;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$function$
