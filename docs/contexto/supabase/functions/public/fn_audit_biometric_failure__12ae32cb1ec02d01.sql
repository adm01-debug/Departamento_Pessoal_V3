CREATE OR REPLACE FUNCTION public.fn_audit_biometric_failure()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (NEW.biometria_status = 'invalido') THEN
        INSERT INTO public.auditoria_logs(entidade, entidade_id, acao, dados_novos, user_id)
        VALUES ('batidas_ponto', NEW.id::text, 'ALERTA_FALHA_BIOMETRICA',
            jsonb_build_object('colaborador_id', NEW.colaborador_id, 'status', NEW.biometria_status,
                'score', NEW.biometria_score, 'data_batida', NEW.data || ' ' || NEW.hora),
            NEW.colaborador_id);
    END IF;
    RETURN NEW;
END; $function$
