CREATE OR REPLACE FUNCTION public.check_processamento_timeout()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Se o status for alterado para 'failed' e o erro contiver 'timeout'
    IF NEW.status = 'failed' AND NEW.erro_log ILIKE '%timeout%' THEN
        INSERT INTO public.security_alerts (
            title,
            description,
            severity,
            metadata
        ) VALUES (
            'Timeout Detectado na Fila',
            'A tarefa do tipo ' || NEW.tipo_tarefa || ' (ID: ' || NEW.id || ') falhou por timeout.',
            'medium',
            jsonb_build_object('task_id', NEW.id, 'task_type', NEW.tipo_tarefa)
        );
    END IF;
    RETURN NEW;
END;
$function$
