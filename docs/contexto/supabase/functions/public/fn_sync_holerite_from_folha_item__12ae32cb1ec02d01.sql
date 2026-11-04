CREATE OR REPLACE FUNCTION public.fn_sync_holerite_from_folha_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_folha_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.folha_id ELSE NEW.folha_id END;
BEGIN
    -- Folha fechada/paga é imutável: o espelho não reescreve o histórico.
    IF EXISTS (
        SELECT 1 FROM public.folhas_pagamento f
         WHERE f.id = v_folha_id AND f.status::text IN ('fechada', 'paga')
    ) THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.holerites h
         WHERE h.folha_id = OLD.folha_id
           AND h.colaborador_id = OLD.colaborador_id
           AND h.assinado IS NOT TRUE;
        RETURN NULL;
    END IF;

    -- Holerite já assinado não é tocado; se o item mudou depois da assinatura,
    -- a verificação de integridade do fechamento acusa a divergência.
    INSERT INTO public.holerites AS h (
        folha_id, colaborador_id,
        colaborador_nome, colaborador_cpf, colaborador_cargo,
        colaborador_departamento, colaborador_matricula,
        salario_base, total_proventos, total_descontos, liquido,
        valor_inss, valor_irrf, valor_fgts
    )
    SELECT
        NEW.folha_id, NEW.colaborador_id,
        c.nome_completo, COALESCE(c.cpf, 'N/A'), COALESCE(c.cargo, 'N/A'),
        COALESCE(c.departamento, 'N/A'), c.matricula,
        COALESCE(NEW.salario_base, c.salario_base, 0),
        COALESCE(NEW.total_proventos, 0), COALESCE(NEW.total_descontos, 0), COALESCE(NEW.total_liquido, 0),
        COALESCE(NEW.inss_mes, 0), COALESCE(NEW.irrf_mes, 0), COALESCE(NEW.fgts_mes, 0)
      FROM public.colaboradores c
     WHERE c.id = NEW.colaborador_id
    ON CONFLICT (folha_id, colaborador_id) DO UPDATE SET
        colaborador_nome         = EXCLUDED.colaborador_nome,
        colaborador_cpf          = EXCLUDED.colaborador_cpf,
        colaborador_cargo        = EXCLUDED.colaborador_cargo,
        colaborador_departamento = EXCLUDED.colaborador_departamento,
        colaborador_matricula    = EXCLUDED.colaborador_matricula,
        salario_base             = EXCLUDED.salario_base,
        total_proventos          = EXCLUDED.total_proventos,
        total_descontos          = EXCLUDED.total_descontos,
        liquido                  = EXCLUDED.liquido,
        valor_inss               = EXCLUDED.valor_inss,
        valor_irrf               = EXCLUDED.valor_irrf,
        valor_fgts               = EXCLUDED.valor_fgts
     WHERE h.assinado IS NOT TRUE;

    RETURN NULL;
END;
$function$
