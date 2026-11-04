CREATE OR REPLACE FUNCTION public.finish_training_image_request(p_id uuid, p_status text, p_error text DEFAULT NULL::text, p_retry_after_seconds integer DEFAULT NULL::integer)
 RETURNS training_image_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_linha public.training_image_requests;
BEGIN
  IF p_status NOT IN ('done', 'skipped', 'failed', 'queued') THEN
    RAISE EXCEPTION 'status_invalido';
  END IF;

  UPDATE public.training_image_requests
     SET status = p_status,
         last_error = left(coalesce(p_error, ''), 500),
         finished_at = CASE WHEN p_status IN ('done', 'skipped', 'failed') THEN now() ELSE NULL END,
         available_at = CASE
           WHEN p_status = 'queued'
             THEN now() + make_interval(secs => greatest(coalesce(p_retry_after_seconds, 300), 30))
           ELSE now()
         END
   WHERE id = p_id
  RETURNING * INTO v_linha;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'requisicao_inexistente';
  END IF;

  RETURN v_linha;
END
$function$
