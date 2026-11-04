CREATE OR REPLACE FUNCTION public.dp_run_retention(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE v_p RECORD; v_n INT; v_cut TIMESTAMPTZ;
BEGIN
  -- Guard: rejeitar chamadas de anon ou authenticated nao-autorizados
  IF current_user NOT IN ('postgres','supabase_admin') AND
     current_setting('request.jwt.claim.role', true) NOT IN ('service_role') THEN
    RAISE EXCEPTION 'dp_run_retention: Unauthorized. Requires service_role.';
  END IF;
  
  SELECT * INTO v_p FROM public.dp_retention_policy WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Policy not found: %', p_id; END IF;
  IF NOT v_p.enabled THEN RETURN '{"status":"skipped","dry_run":true}'::jsonb; END IF;
  v_cut := NOW()-((v_p.retention_days||' days')::INTERVAL);
  EXECUTE 'SELECT COUNT(*) FROM public.dp_audit_log WHERE created_at<$1' USING v_cut INTO v_n;
  IF v_p.dry_run THEN
    UPDATE public.dp_retention_policy SET last_run_at=NOW(),last_run_count=v_n WHERE id=p_id;
    RETURN jsonb_build_object('dry_run',true,'would_affect',v_n,'cutoff',v_cut,'status','dry_run_ok');
  END IF;
  IF v_p.action='anonymize' THEN
    UPDATE public.dp_audit_log SET ip_address=NULL,session_id=NULL WHERE created_at<v_cut AND (ip_address IS NOT NULL OR session_id IS NOT NULL);
  ELSIF v_p.action='delete' THEN
    DELETE FROM public.dp_audit_log WHERE created_at<v_cut;
  END IF;
  UPDATE public.dp_retention_policy SET last_run_at=NOW(),last_run_count=v_n WHERE id=p_id;
  RETURN jsonb_build_object('executed',true,'action',v_p.action,'affected',v_n);
END;
$function$
