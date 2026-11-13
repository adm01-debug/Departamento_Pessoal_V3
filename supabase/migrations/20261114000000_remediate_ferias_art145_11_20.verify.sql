-- Verifica que o canônico passou a reconhecer 20/11 (Consciência Negra) como
-- feriado fixo nacional: D-2 de um início em 22/11 cai em 20/11 (feriado) →
-- o prazo legal recua para quinta 19/11. Caso 16/11→13/11 permanece (regressão).
SELECT 'ok'
WHERE (
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('eh_feriado_fixo_br', 'eh_dia_util_br', 'deadline_legal_pagamento_ferias')) = 3
  AND public.eh_feriado_fixo_br(DATE '2026-11-20') IS TRUE
  AND public.deadline_legal_pagamento_ferias(DATE '2026-11-22') = DATE '2026-11-19'
  AND public.deadline_legal_pagamento_ferias(DATE '2026-11-16') = DATE '2026-11-13'
);