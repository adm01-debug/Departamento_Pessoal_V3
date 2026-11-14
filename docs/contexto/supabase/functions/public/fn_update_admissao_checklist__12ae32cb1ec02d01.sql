CREATE OR REPLACE FUNCTION public.fn_update_admissao_checklist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (NEW.validado AND NOT COALESCE(OLD.validado, false)) THEN
        IF (NEW.tipo = 'RG' OR NEW.tipo = 'CPF') THEN
            UPDATE public.admissoes SET checklist_documentos_pessoais = true WHERE id = NEW.admissao_id;
        ELSIF (NEW.tipo = 'COMPROVANTE_RESIDENCIA') THEN
            UPDATE public.admissoes SET checklist_comprovante_endereco = true WHERE id = NEW.admissao_id;
        ELSIF (NEW.tipo = 'ASO') THEN
            UPDATE public.admissoes SET checklist_exame_admissional = true WHERE id = NEW.admissao_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
