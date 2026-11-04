CREATE OR REPLACE FUNCTION public.fn_workflow_admissao_auto()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.workflows_execucoes (workflow_id, empresa_id, entidade_id, entidade_tipo, status, etapa_atual, metadata)
    SELECT id, NEW.empresa_id, NEW.id, 'admissao', 'em_andamento', 1, jsonb_build_object('auto_start', true)
    FROM public.workflows_definicoes
    WHERE tipo = 'admissao' AND empresa_id = NEW.empresa_id
    LIMIT 1;
    RETURN NEW;
END;
$function$
