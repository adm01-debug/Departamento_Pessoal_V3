CREATE OR REPLACE FUNCTION public.registrar_auditoria_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.ponto_auditoria (
        tabela_nome, 
        registro_id, 
        acao, 
        dados_anteriores, 
        dados_novos, 
        usuario_id,
        justificativa
    )
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        auth.uid(),
        current_setting('app.ponto_justificativa', true)
    );
    RETURN NEW;
END;
$function$
