CREATE OR REPLACE FUNCTION public.check_rate_limit(check_ip text, check_endpoint text, check_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  config_record RECORD;
  current_count INTEGER;
  is_blocked BOOLEAN;
  result JSONB;
BEGIN
  -- Verificar se IP está na whitelist
  IF public.is_ip_whitelisted(check_ip) THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'whitelisted');
  END IF;

  -- Verificar se IP está bloqueado
  IF public.is_ip_blocked(check_ip) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'blocked');
  END IF;

  -- Obter configuração de rate limit
  SELECT * INTO config_record FROM public.rate_limit_config
  WHERE endpoint = check_endpoint OR endpoint = '*'
  ORDER BY CASE WHEN endpoint = check_endpoint THEN 0 ELSE 1 END
  LIMIT 1;

  IF NOT FOUND OR NOT config_record.enabled THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_limit');
  END IF;

  -- Contar requisições na janela de tempo
  SELECT COUNT(*) INTO current_count
  FROM public.rate_limit_logs
  WHERE ip_address = check_ip
  AND endpoint = check_endpoint
  AND created_at > now() - (config_record.window_seconds || ' seconds')::INTERVAL;

  IF current_count >= config_record.max_requests THEN
    -- Bloquear IP temporariamente
    INSERT INTO public.blocked_ips (ip_address, reason, expires_at, permanent)
    VALUES (
      check_ip,
      'Rate limit exceeded for ' || check_endpoint,
      now() + (config_record.block_duration_seconds || ' seconds')::INTERVAL,
      false
    )
    ON CONFLICT (ip_address) DO UPDATE SET
      expires_at = now() + (config_record.block_duration_seconds || ' seconds')::INTERVAL;

    -- Criar alerta de segurança
    INSERT INTO public.security_alerts (type, severity, ip_address, user_id, details)
    VALUES (
      'rate_limit_exceeded',
      'high',
      check_ip,
      check_user_id,
      jsonb_build_object('endpoint', check_endpoint, 'count', current_count)
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'retry_after', config_record.block_duration_seconds
    );
  END IF;

  -- Registrar requisição
  INSERT INTO public.rate_limit_logs (ip_address, endpoint, user_id)
  VALUES (check_ip, check_endpoint, check_user_id);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', config_record.max_requests - current_count - 1,
    'reset_in', config_record.window_seconds
  );
END;
$function$
