CREATE OR REPLACE FUNCTION public.claim_training_image_requests(p_limit integer DEFAULT 5)
 RETURNS SETOF training_image_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 20);
BEGIN
  RETURN QUERY
  WITH alvo AS (
    SELECT r.id
    FROM public.training_image_requests r
    WHERE (r.status = 'queued' AND r.available_at <= now())
       OR (
         r.status = 'processing'
         -- 30 min >> wall clock máximo da plataforma (400 s) e timeout do
         -- provedor (90 s): reduz a chance de recuperar algo ainda em execução.
         AND r.started_at < now() - interval '30 minutes'
         AND r.attempts < 5
       )
    ORDER BY r.available_at, r.requested_at
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.training_image_requests r
     SET status = 'processing',
         attempts = r.attempts + 1,
         started_at = now(),
         available_at = now(),
         finished_at = NULL,
         last_error = NULL
    FROM alvo
   WHERE r.id = alvo.id
  RETURNING r.*;
END
$function$
