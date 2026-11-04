CREATE OR REPLACE FUNCTION public.asos_auto_marcar_agendamento_realizado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'validado' AND OLD.status <> 'validado' AND NEW.agendamento_id IS NOT NULL THEN
    UPDATE public.exames_agendamentos
       SET status = 'realizado', updated_at = now()
     WHERE id = NEW.agendamento_id AND status <> 'realizado';
  END IF;
  RETURN NEW;
END;
$function$
