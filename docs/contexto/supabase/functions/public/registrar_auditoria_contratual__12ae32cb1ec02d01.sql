CREATE OR REPLACE FUNCTION public.registrar_auditoria_contratual()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.salario_proposto IS DISTINCT FROM NEW.salario_proposto) THEN
        INSERT INTO public.auditoria_contratual (colaborador_id, campo_alterado, valor_antigo, valor_novo, alterado_por)
        VALUES (NEW.id, 'salario', OLD.salario_proposto::text, NEW.salario_proposto::text, auth.uid());
    END IF;
    -- Adicionar outros campos conforme necessário
    RETURN NEW;
END;
$function$
