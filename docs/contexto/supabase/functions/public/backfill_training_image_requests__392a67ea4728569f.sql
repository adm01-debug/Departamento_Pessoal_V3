CREATE OR REPLACE FUNCTION public.backfill_training_image_requests(p_limit integer DEFAULT 50)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit      integer := least(greatest(coalesce(p_limit, 50), 1), 500);
  v_inseridos  integer;
BEGIN
  WITH candidatos AS (
    SELECT c.empresa_id, 'course'::text AS content_type, c.id AS content_id
    FROM public.catalogo_cursos c
    WHERE c.empresa_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.training_images ti
        WHERE ti.empresa_id = c.empresa_id
          AND ti.content_type = 'course'
          AND ti.content_id = c.id
          AND ti.status IN ('succeeded', 'pending', 'processing')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.training_image_requests r
        WHERE r.empresa_id = c.empresa_id
          AND r.content_type = 'course'
          AND r.content_id = c.id
      )
    UNION ALL
    SELECT t.empresa_id, 'learning_path'::text, t.id
    FROM public.trilhas_aprendizado t
    WHERE t.empresa_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.training_images ti
        WHERE ti.empresa_id = t.empresa_id
          AND ti.content_type = 'learning_path'
          AND ti.content_id = t.id
          AND ti.status IN ('succeeded', 'pending', 'processing')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.training_image_requests r
        WHERE r.empresa_id = t.empresa_id
          AND r.content_type = 'learning_path'
          AND r.content_id = t.id
      )
  ), alvo AS (
    SELECT empresa_id, content_type, content_id
    FROM candidatos
    ORDER BY empresa_id, content_type, content_id
    LIMIT v_limit
  )
  INSERT INTO public.training_image_requests (empresa_id, content_type, content_id, requested_by)
  SELECT empresa_id, content_type, content_id, NULL FROM alvo
  ON CONFLICT (empresa_id, content_type, content_id) DO NOTHING;

  GET DIAGNOSTICS v_inseridos = ROW_COUNT;
  RETURN v_inseridos;
END
$function$
