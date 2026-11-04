CREATE OR REPLACE FUNCTION public.validar_suspensao_beneficio_obrigatorio()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.obrigatorio_por_lei = true AND NEW.ativo = false) THEN
        RAISE EXCEPTION 'Não é permitido desativar benefícios obrigatórios por lei sem a devida justificativa legal e anexo de dispensa assinado pelo colaborador.';
    END IF;
    RETURN NEW;
END;
$function$
