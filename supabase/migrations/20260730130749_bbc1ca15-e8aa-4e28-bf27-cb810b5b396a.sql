-- =====================================================================
-- FIX CRÍTICO: fechamento da folha (status='calculada') abortava
--
-- Reproduzido:
--   INSERT em folhas_pagamento com status='calculada' =>
--   ERROR: column "colaborador_id" does not exist
--   CONTEXT: PL/pgSQL function verificar_divergencias_folha() line 6
--
-- Causa raiz: deriva de modelo. As duas funções foram escritas para uma
--   folha POR COLABORADOR. O modelo atual tem folhas_pagamento como
--   cabeçalho (empresa + competência) e holerites como linha por
--   colaborador. Os gatilhos têm WHEN (new.status='calculada'), por isso
--   o defeito ficou invisível em INSERTs com status 'aberta' e só
--   aparece exatamente no fechamento.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Alerta de divergência: comparar no nível correto (empresa)
--    Bug adicional corrigido: `SELECT AVG(...) ... LIMIT 3` NÃO limita a
--    3 competências — o LIMIT se aplica à linha agregada única, então a
--    média considerava TODO o histórico. Agora limito na subconsulta.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verificar_divergencias_folha()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    media_anterior numeric;
BEGIN
    SELECT AVG(f.total_proventos) INTO media_anterior
    FROM (
        SELECT total_proventos
        FROM public.folhas_pagamento
        WHERE empresa_id  = NEW.empresa_id
          AND status      = 'fechada'
          AND competencia < NEW.competencia
          AND total_proventos IS NOT NULL
          AND total_proventos > 0
          AND id <> NEW.id
        ORDER BY competencia DESC
        LIMIT 3
    ) f;

    IF media_anterior IS NOT NULL
       AND media_anterior > 0
       AND COALESCE(NEW.total_proventos, 0) > 0
       AND (ABS(NEW.total_proventos - media_anterior) / media_anterior) > 0.3
    THEN
        NEW.alerta_calculo = jsonb_build_object(
            'tipo', 'VARIACAO_SALARIAL_ALTA',
            'valor_anterior', ROUND(media_anterior, 2),
            'valor_atual', ROUND(NEW.total_proventos, 2),
            'variacao_percentual', ROUND(((NEW.total_proventos - media_anterior) / media_anterior) * 100, 2),
            'base_comparacao', 'media_ultimas_3_competencias_fechadas_da_empresa',
            'mensagem', 'Variação de proventos superior a 30% detectada.'
        );
    END IF;

    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- 2) Provisões: gerar por holerite (um registro por colaborador)
--    provisoes_folha.colaborador_id é NOT NULL, portanto o cabeçalho da
--    folha nunca poderia alimentá-la. A fonte correta são os holerites.
--    Recalcular a folha substitui as provisões daquela competência, em
--    vez de duplicar (não há UNIQUE na tabela para usar ON CONFLICT).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_provisao_mensal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_competencia text := to_char(NEW.competencia, 'YYYY-MM');
BEGIN
    DELETE FROM public.provisoes_folha
     WHERE empresa_id  = NEW.empresa_id
       AND competencia = v_competencia;

    INSERT INTO public.provisoes_folha (
        empresa_id, colaborador_id, competencia,
        valor_13_salario, valor_ferias, encargos_provisao
    )
    SELECT
        NEW.empresa_id,
        h.colaborador_id,
        v_competencia,
        ROUND(h.total_proventos / 12, 2),          -- 1/12 avos de 13º
        ROUND((h.total_proventos / 12) * 1.3333, 2), -- férias + 1/3
        ROUND((h.total_proventos / 12) * 0.28, 2)    -- encargos estimados
    FROM public.holerites h
    WHERE h.folha_id = NEW.id
      AND h.colaborador_id IS NOT NULL
      AND COALESCE(h.total_proventos, 0) > 0;

    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- 3) Notificação de holerite: competência vem da folha, não do holerite.
--    Sem WHEN, o gatilho dispara em TODO insert de holerite — logo,
--    `NEW.competencia` inexistente inviabilizaria qualquer holerite.
--    Envolvo em EXCEPTION: falha de notificação não pode derrubar a
--    emissão do holerite (mesmo princípio já aplicado no workflow de
--    admissão).
-- ---------------------------------------------------------------------
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
            SELECT to_char(f.competencia, 'MM/YYYY') INTO v_competencia
              FROM public.folhas_pagamento f
             WHERE f.id = NEW.folha_id;

            -- notificacoes.user_id referencia a conta de acesso, que nem
            -- todo colaborador possui; sem vínculo, não há quem notificar.
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