CREATE OR REPLACE FUNCTION public.calcular_provisao_mensal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.provisoes_folha (empresa_id, colaborador_id, competencia, valor_13_salario, valor_ferias, encargos_provisao)
    VALUES (
        NEW.empresa_id,
        NEW.colaborador_id,
        NEW.competencia,
        NEW.total_proventos / 12,
        (NEW.total_proventos / 12) * 1.33, -- 1/12 + 1/3
        (NEW.total_proventos / 12) * 0.28 -- Simulação de encargos (FGTS + RAT + etc)
    );
    RETURN NEW;
END;
$function$
