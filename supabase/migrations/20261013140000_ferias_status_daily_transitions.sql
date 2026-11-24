-- Fix da revisão #221: o mapa de transições de ferias (trg_ferias_status_transition)
-- permite aprovada->em_gozo e em_gozo->concluida, mas NÃO aprovada->concluida.
-- A reconciliação direta introduzida em 20261013130000 quebraria o job diário.
-- Solução em 2 passos válidos: toda férias APROVADA/AGENDADA e PAGA cujo início
-- já chegou vai a em_gozo; em seguida toda em_gozo com fim ultrapassado vira
-- concluida (o que cobre as recém-promovidas). Férias sem pagamento seguem
-- intocadas — a v_ferias_alerta_pagamento_d2 as sinaliza (Art. 145).
CREATE OR REPLACE FUNCTION public.fn_atualizar_status_ferias_diario()
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_total integer := 0; v_n integer;
BEGIN
  UPDATE public.ferias SET status = 'em_gozo'
   WHERE status IN ('aprovada','agendada')
     AND pagamento_confirmado_em IS NOT NULL
     AND CURRENT_DATE >= data_inicio;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  UPDATE public.ferias SET status = 'concluida'
   WHERE status = 'em_gozo' AND CURRENT_DATE > data_fim;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_atualizar_status_ferias_diario() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_atualizar_status_ferias_diario() TO service_role;

COMMENT ON FUNCTION public.fn_atualizar_status_ferias_diario() IS
  'Transições diárias de férias via pg_cron: aprovada/agendada paga iniciada -> em_gozo; em_gozo vencida -> concluida.';
