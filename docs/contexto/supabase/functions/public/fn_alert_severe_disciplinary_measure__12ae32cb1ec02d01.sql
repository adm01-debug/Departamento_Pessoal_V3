CREATE OR REPLACE FUNCTION public.fn_alert_severe_disciplinary_measure()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (NEW.tipo = 'justa_causa' OR NEW.tipo = 'suspensao') THEN
        INSERT INTO public.notificacoes (
            user_id,
            titulo,
            mensagem,
            tipo,
            lida
        )
        SELECT 
            user_id,
            'ALERTA CRÍTICO: Medida Disciplinar Grave',
            'O colaborador ' || (SELECT nome_completo FROM public.colaboradores WHERE id = NEW.colaborador_id) || ' recebeu uma ' || NEW.tipo || '.',
            'urgente',
            false
        FROM public.user_roles 
        WHERE role IN ('admin', 'rh');
    END IF;
    RETURN NEW;
END;
$function$
