-- Contrato do sidecar: saída 'ok' só quando eh_feriado_fixo_br conhece 20/11 e o
-- prazo do Art. 145 recua corretamente (vazio = reprova).
SELECT 'ok'
WHERE (SELECT p.prosrc ILIKE '%''11-20''%' FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'eh_feriado_fixo_br')
  AND public.eh_feriado_fixo_br(DATE '2026-11-20')
  AND NOT public.eh_feriado_fixo_br(DATE '2026-11-19')
  AND public.deadline_legal_pagamento_ferias(DATE '2026-11-22') = DATE '2026-11-19';
