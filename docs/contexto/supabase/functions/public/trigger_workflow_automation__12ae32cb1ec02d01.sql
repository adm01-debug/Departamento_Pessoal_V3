CREATE OR REPLACE FUNCTION public.trigger_workflow_automation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert a log entry for the start of automation
    NEW.log_execucao = NEW.log_execucao || jsonb_build_object(
        'timestamp', now(),
        'event', 'automation_triggered',
        'message', 'Engine de automação iniciou o processamento do workflow'
    );
    RETURN NEW;
END;
$function$
