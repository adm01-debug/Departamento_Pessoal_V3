CREATE OR REPLACE FUNCTION public.registrar_auditoria_sst()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.auditoria_logs(entidade, entidade_id, acao, dados_novos, user_id)
    VALUES (TG_TABLE_NAME, NEW.id::text, TG_OP, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
END; $function$
