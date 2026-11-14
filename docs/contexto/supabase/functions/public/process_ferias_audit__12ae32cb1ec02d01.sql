CREATE OR REPLACE FUNCTION public.process_ferias_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_empresa_id UUID;
    v_acao TEXT;
    v_old JSONB;
    v_new JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_empresa_id := OLD.empresa_id;
        v_acao := 'DELETE';
    ELSE
        v_empresa_id := NEW.empresa_id;
        IF (TG_OP = 'INSERT') THEN
            v_acao := 'CREATE';
        ELSE
            v_acao := 'UPDATE';
            -- Detecção específica de aprovação (via jsonb: coluna ausente = NULL)
            IF (TG_TABLE_NAME = 'ferias_solicitacoes') THEN
                v_old := to_jsonb(OLD);
                v_new := to_jsonb(NEW);
                IF ((v_old->>'status_gestor') <> (v_new->>'status_gestor') AND (v_new->>'status_gestor') = 'aprovado') THEN
                    v_acao := 'APPROVE_GESTOR';
                ELSIF ((v_old->>'status_rh') <> (v_new->>'status_rh') AND (v_new->>'status_rh') = 'aprovado') THEN
                    v_acao := 'APPROVE_RH';
                ELSIF ((v_old->>'status') <> (v_new->>'status') AND (v_new->>'status') = 'rejeitado') THEN
                    v_acao := 'REJECT';
                END IF;
            END IF;
        END IF;
    END IF;

    INSERT INTO public.ferias_audit_log (
        empresa_id, 
        usuario_id, 
        entidade_tipo, 
        entidade_id, 
        acao, 
        dados_anteriores, 
        dados_novos
    )
    VALUES (
        v_empresa_id,
        auth.uid(),
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        v_acao,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    
    RETURN NULL;
END;
$function$
