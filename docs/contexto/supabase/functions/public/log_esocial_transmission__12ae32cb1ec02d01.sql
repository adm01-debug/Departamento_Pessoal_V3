CREATE OR REPLACE FUNCTION public.log_esocial_transmission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'enviado') THEN
        INSERT INTO public.auditoria_logs(entidade, entidade_id, acao, dados_anteriores, dados_novos, user_id)
        VALUES ('esocial_eventos', NEW.id::text, 'TRANSMISSAO_ESOCIAL', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    END IF;
    RETURN NEW;
END; $function$
