-- Correção de tipo: folhas_pagamento.competencia e provisoes_folha.competencia
-- são TEXT (não date). O to_char() da migração anterior abortava o fechamento.
-- Repasso o valor como está — os dois lados são TEXT, sem conversão nem
-- suposição de formato.

CREATE OR REPLACE FUNCTION public.calcular_provisao_mensal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.provisoes_folha
     WHERE empresa_id  = NEW.empresa_id
       AND competencia = NEW.competencia;

    INSERT INTO public.provisoes_folha (
        empresa_id, colaborador_id, competencia,
        valor_13_salario, valor_ferias, encargos_provisao
    )
    SELECT
        NEW.empresa_id,
        h.colaborador_id,
        NEW.competencia,
        ROUND(h.total_proventos / 12, 2),
        ROUND((h.total_proventos / 12) * 1.3333, 2),
        ROUND((h.total_proventos / 12) * 0.28, 2)
    FROM public.holerites h
    WHERE h.folha_id = NEW.id
      AND h.colaborador_id IS NOT NULL
      AND COALESCE(h.total_proventos, 0) > 0;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_enqueue_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_competencia text;
    v_user_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'holerites' THEN
        BEGIN
            SELECT f.competencia INTO v_competencia
              FROM public.folhas_pagamento f
             WHERE f.id = NEW.folha_id;

            -- exibição tolerante: 'YYYY-MM' vira 'MM/YYYY'; qualquer outro
            -- formato é mostrado como veio, sem quebrar.
            IF v_competencia ~ '^\d{4}-\d{2}$' THEN
                v_competencia := substr(v_competencia, 6, 2) || '/' || substr(v_competencia, 1, 4);
            END IF;

            SELECT c.user_id INTO v_user_id
              FROM public.colaboradores c
             WHERE c.id = NEW.colaborador_id;

            IF v_user_id IS NOT NULL THEN
                INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida)
                VALUES (
                    v_user_id,
                    'Novo Holerite Disponível',
                    'Seu holerite de ' || COALESCE(v_competencia, 'referência atual') ||
                    ' já está disponível para visualização.',
                    'folha',
                    false
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'fn_enqueue_notification: notificação ignorada para holerite % (%)', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$function$;