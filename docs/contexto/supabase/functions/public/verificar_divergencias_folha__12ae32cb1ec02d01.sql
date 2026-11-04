CREATE OR REPLACE FUNCTION public.verificar_divergencias_folha()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    media_anterior DECIMAL;
BEGIN
    -- Busca média dos últimos 3 meses para o mesmo colaborador
    SELECT AVG(total_proventos) INTO media_anterior 
    FROM public.folhas_pagamento 
    WHERE colaborador_id = NEW.colaborador_id 
      AND status = 'fechada'
      AND competencia < NEW.competencia
    LIMIT 3;

    -- Se houver uma variação maior que 30%, marca alerta
    IF media_anterior IS NOT NULL AND (ABS(NEW.total_proventos - media_anterior) / media_anterior) > 0.3 THEN
        NEW.alerta_calculo = jsonb_build_object(
            'tipo', 'VARIACAO_SALARIAL_ALTA',
            'valor_anterior', media_anterior,
            'variacao_percentual', ROUND(((NEW.total_proventos - media_anterior) / media_anterior) * 100, 2),
            'mensagem', 'Variação de proventos superior a 30% detectada.'
        );
    END IF;

    RETURN NEW;
END;
$function$
