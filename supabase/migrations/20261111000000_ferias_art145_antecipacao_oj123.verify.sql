-- Verifica que as funções de antecipação OJ-123 existem e que a view usa a
-- nova lógica (não mais o literal "<= 2" no ramo crítico).
-- Contrato do sidecar (gate em canonical-migrations.yml): cada linha não-vazia
-- da saída deve ser literalmente 'ok'; sem ela a migration é reprovada.
DO $dp_verify$
BEGIN
  IF (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('eh_feriado_fixo_br', 'eh_dia_util_br', 'deadline_legal_pagamento_ferias')) <> 3 THEN
    RAISE EXCEPTION 'funções OJ-123 ausentes';
  END IF;

  IF NOT (SELECT pg_get_viewdef('public.v_ferias_alerta_pagamento_d2'::regclass) ILIKE '%deadline_legal_pagamento_ferias%') THEN
    RAISE EXCEPTION 'view v_ferias_alerta_pagamento_d2 não usa deadline_legal_pagamento_ferias';
  END IF;

  -- Caso de teste real: início numa segunda-feira → D-2 cai no sábado → o
  -- prazo legal deve recuar para a sexta-feira anterior (3 dias antes, não 2).
  IF public.deadline_legal_pagamento_ferias(DATE '2026-11-16') <> DATE '2026-11-13' THEN
    RAISE EXCEPTION 'caso OJ-123 falhou';
  END IF;

  -- Caso sem fim de semana/feriado no meio: comportamento idêntico ao
  -- original (D-2 exato).
  IF public.deadline_legal_pagamento_ferias(DATE '2026-11-20') <> DATE '2026-11-18' THEN
    RAISE EXCEPTION 'caso normal falhou';
  END IF;
END
$dp_verify$;

SELECT 'ok';
