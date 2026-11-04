CREATE OR REPLACE FUNCTION public.set_training_image_autoqueue(p_enabled boolean)
 RETURNS training_image_settings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_linha public.training_image_settings;
BEGIN
  INSERT INTO public.training_image_settings (id, autoqueue_enabled)
  VALUES (true, coalesce(p_enabled, false))
  ON CONFLICT (id) DO UPDATE
    SET autoqueue_enabled = excluded.autoqueue_enabled,
        updated_at = now()
  RETURNING * INTO v_linha;
  RETURN v_linha;
END
$function$
