CREATE OR REPLACE FUNCTION public.purge_expired_security_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_ips int; v_geo int;
BEGIN
  DELETE FROM public.blocked_ips WHERE expires_at IS NOT NULL AND expires_at < now() AND permanent = false;
  GET DIAGNOSTICS v_ips = ROW_COUNT;
  DELETE FROM public.geo_blocked_attempts WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_geo = ROW_COUNT;
  RETURN jsonb_build_object('ips_removed', v_ips, 'geo_removed', v_geo);
END $function$
