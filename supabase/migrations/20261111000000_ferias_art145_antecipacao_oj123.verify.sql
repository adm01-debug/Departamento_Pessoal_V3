-- Verifica que as funções de antecipação OJ-123 existem e que a view usa a
-- nova lógica (não mais o literal "<= 2" no ramo crítico).
WITH funcoes AS (
  SELECT COUNT(*) = 3 AS ok
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('eh_feriado_fixo_br', 'eh_dia_util_br', 'deadline_legal_pagamento_ferias')
),
view_def AS (
  SELECT pg_get_viewdef('public.v_ferias_alerta_pagamento_d2'::regclass) AS def
),
view_usa_deadline AS (
  SELECT def ILIKE '%deadline_legal_pagamento_ferias%' AS ok
  FROM view_def
),
-- Caso de teste real: início numa segunda-feira → D-2 cai no sábado → o
-- prazo legal deve recuar para a sexta-feira anterior (3 dias antes, não 2).
caso_oj123 AS (
  SELECT public.deadline_legal_pagamento_ferias(DATE '2026-11-16') = DATE '2026-11-13' AS ok
),
-- Caso sem fim de semana/feriado no meio: comportamento idêntico ao
-- original (D-2 exato).
caso_normal AS (
  SELECT public.deadline_legal_pagamento_ferias(DATE '2026-11-20') = DATE '2026-11-18' AS ok
)
SELECT
  (SELECT ok FROM funcoes)
  AND (SELECT ok FROM view_usa_deadline)
  AND (SELECT ok FROM caso_oj123)
  AND (SELECT ok FROM caso_normal) AS ok;
