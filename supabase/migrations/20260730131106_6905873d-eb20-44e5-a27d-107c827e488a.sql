-- =====================================================================
-- FIX: provisoes_folha inacessível — fechamento da folha ainda quebraria
--
-- Reproduzido no fluxo real:
--   ERROR: permission denied for table provisoes_folha
--   CONTEXT: PL/pgSQL function calcular_provisao_mensal() line 3
--
-- Dois defeitos somados:
--   (a) calcular_provisao_mensal é SECURITY INVOKER, logo o DELETE/INSERT
--       roda com o privilégio do usuário que fecha a folha;
--   (b) provisoes_folha não possui NENHUM grant para authenticated —
--       nem SELECT. A política RLS de leitura por tenant existia, mas
--       sem GRANT ela é inalcançável (RLS não substitui GRANT).
--
-- Decisão:
--   Provisão é dado DERIVADO do fechamento, nunca digitado. Portanto:
--   - a função vira SECURITY DEFINER, com search_path travado;
--   - authenticated recebe apenas SELECT (a RLS por tenant já filtra);
--   - a escrita direta continua negada, de propósito.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.calcular_provisao_mensal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- recálculo da mesma competência substitui as provisões anteriores,
    -- evitando duplicidade (não há UNIQUE para ON CONFLICT)
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

-- Leitura para o app (RLS por tenant já vigente); escrita permanece negada.
GRANT SELECT ON public.provisoes_folha TO authenticated;
GRANT ALL    ON public.provisoes_folha TO service_role;