CREATE OR REPLACE FUNCTION public.enqueue_training_image_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT autoqueue_enabled INTO v_enabled
  FROM public.training_image_settings
  WHERE id = true;

  IF coalesce(v_enabled, false) IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.empresa_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.training_image_requests (empresa_id, content_type, content_id, requested_by)
  VALUES (NEW.empresa_id, TG_ARGV[0], NEW.id, auth.uid())
  ON CONFLICT (empresa_id, content_type, content_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- O cadastro é soberano: falha na fila nunca impede o INSERT original.
    RAISE WARNING 'training_image autoqueue ignorado: %', SQLERRM;
    RETURN NEW;
END
$function$
