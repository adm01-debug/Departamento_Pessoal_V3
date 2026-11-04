CREATE OR REPLACE FUNCTION public.training_images_track_outcomes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'succeeded' AND OLD.status IS DISTINCT FROM 'succeeded' THEN
    NEW.generations := OLD.generations + 1;
  ELSIF NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed' THEN
    IF coalesce(NEW.last_error, '') LIKE 'resultado_desconhecido%' THEN
      NEW.unknown_outcomes := OLD.unknown_outcomes + 1;
    ELSE
      NEW.failures := OLD.failures + 1;
    END IF;
  END IF;

  IF NEW.status IN ('pending', 'processing') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_attempt_at := now();
  END IF;

  RETURN NEW;
END
$function$
