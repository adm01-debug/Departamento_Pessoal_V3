-- Verifica que as funções de antecipação OJ-123 existem e que a view usa a
-- nova lógica (não mais o literal "<= 2" no ramo crítico).
-- Contrato do sidecar (gate em canonical-migrations.yml): toda linha não-vazia
-- da saída deve ser literalmente 'ok'. Retorna 'ok' só quando TODAS as
-- asserções passam; qualquer falha deixa a saída vazia e o gate reprova.
SELECT 'ok'
WHERE (
  -- As 3 funções OJ-123 existem no schema public.
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('eh_feriado_fixo_br', 'eh_dia_util_br', 'deadline_legal_pagamento_ferias')) = 3
  -- A view usa a função de prazo legal (não mais o literal "<= 2").
  AND pg_get_viewdef('public.v_ferias_alerta_pagamento_d2'::regclass) ILIKE '%deadline_legal_pagamento_ferias%'
  -- Caso OJ-123: início numa segunda-feira → D-2 cai no sábado → o prazo legal
  -- recua para a sexta-feira anterior (3 dias antes, não 2).
  AND public.deadline_legal_pagamento_ferias(DATE '2026-11-16') = DATE '2026-11-13'
  -- Caso sem fim de semana/feriado no meio: D-2 exato, comportamento original.
  AND public.deadline_legal_pagamento_ferias(DATE '2026-11-20') = DATE '2026-11-18'
  -- 20/11 é feriado nacional (Lei 14.759/2023): início no domingo 22/11 →
  -- D-2 cai em 20/11 → prazo recua para quinta 19/11.
  AND public.deadline_legal_pagamento_ferias(DATE '2026-11-22') = DATE '2026-11-19'
);
