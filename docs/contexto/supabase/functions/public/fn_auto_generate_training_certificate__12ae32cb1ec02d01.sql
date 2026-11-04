CREATE OR REPLACE FUNCTION public.fn_auto_generate_training_certificate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _curso_id UUID;
    _validade_meses INTEGER;
BEGIN
    IF (NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido')) THEN
        -- Busca dados do curso
        SELECT id, COALESCE((metadata->>'validade_meses')::INTEGER, 0) 
        INTO _curso_id, _validade_meses
        FROM public.catalogo_cursos 
        WHERE id = NEW.curso_id;

        -- Insere certificado
        INSERT INTO public.treinamento_certificados (
            colaborador_id,
            curso_id,
            inscricao_id,
            data_validade
        ) VALUES (
            NEW.colaborador_id,
            NEW.curso_id,
            NEW.id,
            CASE WHEN _validade_meses > 0 THEN (CURRENT_DATE + (_validade_meses * interval '1 month'))::DATE ELSE NULL END
        );
    END IF;
    RETURN NEW;
END;
$function$
