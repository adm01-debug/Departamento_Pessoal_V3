CREATE OR REPLACE FUNCTION public.fn_enqueue_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_competencia text;
    v_status text;
    v_empresa_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'holerites' THEN
        BEGIN
            SELECT f.competencia, f.status::text, f.empresa_id
              INTO v_competencia, v_status, v_empresa_id
              FROM public.folhas_pagamento f
             WHERE f.id = NEW.folha_id;

            -- Holerite de folha ainda em cálculo não está disponível. O vínculo
            -- colaborador ↔ login é colaborador_id = auth.uid() (sou_o_colaborador).
            IF v_status IN ('fechada', 'paga')
               AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.colaborador_id) THEN
                IF v_competencia ~ '^\d{4}-\d{2}$' THEN
                    v_competencia := substr(v_competencia, 6, 2) || '/' || substr(v_competencia, 1, 4);
                END IF;

                INSERT INTO public.notificacoes (
                    user_id, empresa_id, titulo, mensagem, tipo, entidade_tipo, entidade_id, lida
                ) VALUES (
                    NEW.colaborador_id,
                    v_empresa_id,
                    'Novo Holerite Disponível',
                    'Seu holerite de ' || COALESCE(v_competencia, 'referência atual') ||
                    ' já está disponível para visualização.',
                    'folha',
                    'holerite',
                    NEW.id,
                    false
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'fn_enqueue_notification: notificação ignorada para holerite % (%)', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$function$
