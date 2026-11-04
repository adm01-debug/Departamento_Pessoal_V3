CREATE OR REPLACE FUNCTION public.processar_auditoria_premiacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to get current user ID (might be null in some contexts)
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    INSERT INTO public.premiacoes_auditoria (
        entidade_tipo,
        entidade_id,
        usuario_id,
        acao,
        dados_anteriores,
        dados_novos,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_user_id,
        TG_OP,
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        to_jsonb(NEW),
        now()
    );
    RETURN NEW;
END;
$function$
