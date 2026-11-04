CREATE OR REPLACE FUNCTION public.trg_contab_msg_bump_thread()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.contabilidade_threads
  SET ultima_atividade_em = now(),
      updated_at = now(),
      status = CASE
        WHEN NEW.autor_tipo = 'contabilidade' AND status = 'aberto' THEN 'respondido'
        WHEN NEW.autor_tipo = 'rh' AND status = 'respondido' THEN 'aberto'
        ELSE status
      END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$function$
