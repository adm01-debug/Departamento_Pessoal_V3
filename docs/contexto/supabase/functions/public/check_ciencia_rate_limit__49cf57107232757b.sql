CREATE OR REPLACE FUNCTION public.check_ciencia_rate_limit(p_rpc_name text, p_identifier text DEFAULT NULL::text, p_max_requests integer DEFAULT 30, p_window_minutes integer DEFAULT 10)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ip INET;
  v_count INT;
BEGIN
  BEGIN
    v_ip := COALESCE(
      NULLIF(current_setting('request.headers', true)::json->>'x-forwarded-for', ''),
      NULLIF(current_setting('request.headers', true)::json->>'cf-connecting-ip', ''),
      '0.0.0.0'
    )::INET;
  EXCEPTION WHEN OTHERS THEN
    v_ip := '0.0.0.0'::INET;
  END;

  SELECT COUNT(*) INTO v_count
  FROM public.ciencia_rate_limits
  WHERE ip_address = v_ip
    AND rpc_name = p_rpc_name
    AND created_at > now() - (p_window_minutes || ' minutes')::INTERVAL;

  INSERT INTO public.ciencia_rate_limits (ip_address, rpc_name, identifier, success)
  VALUES (v_ip, p_rpc_name, p_identifier, v_count < p_max_requests);

  RETURN v_count < p_max_requests;
END;
$function$
