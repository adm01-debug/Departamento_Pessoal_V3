CREATE OR REPLACE FUNCTION public.trg_medida_contestacao_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_colab_user uuid;
  v_colab_nome text;
BEGIN
  -- Set prazo quando vira aplicada
  IF NEW.status_workflow = 'aplicada' AND (OLD.status_workflow IS DISTINCT FROM 'aplicada') THEN
    IF NEW.contestacao_prazo_ate IS NULL THEN
      NEW.contestacao_prazo_ate := now() + make_interval(hours => COALESCE(NEW.contestacao_prazo_horas, 48));
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
