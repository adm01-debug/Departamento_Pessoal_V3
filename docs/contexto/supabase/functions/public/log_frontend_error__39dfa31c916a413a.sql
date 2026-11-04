CREATE OR REPLACE FUNCTION public.log_frontend_error(p_nivel text, p_mensagem text, p_contexto jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_nivel NOT IN ('warn', 'error', 'fatal') THEN
    RETURN;
  END IF;

  INSERT INTO public.audit_log_unified (
    source_table,
    user_id,
    action,
    entity,
    payload,
    user_agent,
    occurred_at
  ) VALUES (
    'frontend_logs',
    auth.uid(),
    p_nivel,
    left(p_mensagem, 500),
    p_contexto,
    left((p_contexto->>'user_agent')::text, 300),
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$function$
