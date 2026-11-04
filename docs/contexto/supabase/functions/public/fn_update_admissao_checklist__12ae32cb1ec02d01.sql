CREATE OR REPLACE FUNCTION public.fn_update_admissao_checklist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (NEW.status = 'aprovado' AND OLD.status != 'aprovado') THEN
        IF (NEW.tipo_documento = 'RG' OR NEW.tipo_documento = 'CPF') THEN
            UPDATE public.admissoes SET checklist_documentos_pessoais = true WHERE id = NEW.admissao_id;
        ELSIF (NEW.tipo_documento = 'COMPROVANTE_RESIDENCIA') THEN
            UPDATE public.admissoes SET checklist_comprovante_endereco = true WHERE id = NEW.admissao_id;
        ELSIF (NEW.tipo_documento = 'ASO') THEN
            UPDATE public.admissoes SET checklist_exame_admissional = true WHERE id = NEW.admissao_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
