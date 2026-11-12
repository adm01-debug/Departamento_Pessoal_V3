-- Art. 145 CLT — antecipação do prazo D-2 para o dia útil anterior quando
-- cai em fim de semana/feriado (TST OJ-123 SDI-I).
--
-- Achado (auditoria scripts/simulacao/simulate_art145.cjs, PR #433): a view
-- v_ferias_alerta_pagamento_d2 (migration 20260723112647) escala severidade
-- só por dias-até-início, sem antecipar o prazo nesses casos. Ex.: férias
-- começando numa segunda-feira → D-2 cai no sábado → a view só mostrava
-- 'critico' no próprio sábado, um dia depois do prazo legal real (sexta,
-- por antecipação). Medido: 140/18.000 cenários simulados já em violação
-- legal sem a view escalar a tempo.
--
-- Escopo: só o limiar 'critico' (prazo legal) muda. O limiar 'atencao'
-- (≤5 dias) é só janela de aviso do produto, sem base legal — não tocado.

-- Feriados nacionais de data fixa (mesmo conjunto de
-- scripts/simulacao/simulate_art145.cjs::FERIADOS_FIXOS — Carnaval e
-- Sexta-feira Santa são feriados móveis, fora do escopo de um check por
-- mês/dia; não eram considerados antes desta migration e continuam não
-- sendo, para não introduzir uma tabela de feriados nova neste fix).
CREATE OR REPLACE FUNCTION public.eh_feriado_fixo_br(p_data date)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT to_char(p_data, 'MM-DD') IN (
    '01-01', -- Ano Novo
    '04-21', -- Tiradentes
    '05-01', -- Dia do Trabalho
    '09-07', -- Independência
    '10-12', -- Nossa Senhora Aparecida
    '11-02', -- Finados
    '11-15', -- Proclamação da República
    '11-20', -- Consciência Negra (Lei 14.759/2023)
    '12-25'  -- Natal
  );
$$;

CREATE OR REPLACE FUNCTION public.eh_dia_util_br(p_data date)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXTRACT(ISODOW FROM p_data) BETWEEN 1 AND 5
     AND NOT public.eh_feriado_fixo_br(p_data);
$$;

-- Prazo legal real do Art. 145 (D-2 recuado até o último dia útil anterior).
-- Espelha scripts/simulacao/simulate_art145.cjs::deadlineLegal.
CREATE OR REPLACE FUNCTION public.deadline_legal_pagamento_ferias(p_data_inicio date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_deadline date := p_data_inicio - 2;
BEGIN
  WHILE NOT public.eh_dia_util_br(v_deadline) LOOP
    v_deadline := v_deadline - 1;
  END LOOP;
  RETURN v_deadline;
END;
$$;

REVOKE ALL ON FUNCTION public.eh_feriado_fixo_br(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eh_dia_util_br(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.deadline_legal_pagamento_ferias(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eh_feriado_fixo_br(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_dia_util_br(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deadline_legal_pagamento_ferias(date) TO authenticated;

-- View: só o ramo 'critico' muda — CURRENT_DATE >= prazo legal real (em vez
-- de dias_ate_inicio <= 2). Para datas sem fim de semana/feriado no meio,
-- deadline_legal_pagamento_ferias(data_inicio) = data_inicio - 2, então a
-- condição vira idêntica à original (CURRENT_DATE >= data_inicio - 2 ⟺
-- dias_ate_inicio <= 2) — comportamento inalterado fora dos casos OJ-123.
CREATE OR REPLACE VIEW public.v_ferias_alerta_pagamento_d2
WITH (security_invoker = true) AS
SELECT
  f.id,
  f.empresa_id,
  f.colaborador_id,
  f.data_inicio,
  f.data_pagamento,
  f.pagamento_confirmado_em,
  f.status,
  (f.data_inicio - CURRENT_DATE) AS dias_ate_inicio,
  CASE
    WHEN f.pagamento_confirmado_em IS NOT NULL THEN 'ok'
    WHEN f.data_inicio < CURRENT_DATE THEN 'violacao_grave'   -- férias iniciadas sem pagamento
    WHEN CURRENT_DATE >= public.deadline_legal_pagamento_ferias(f.data_inicio) THEN 'critico'  -- prazo legal (com antecipação OJ-123) estourado
    WHEN (f.data_inicio - CURRENT_DATE) <= 5 THEN 'atencao'   -- janela de ação (sem base legal, não antecipada)
    ELSE 'ok'
  END AS severidade
FROM public.ferias f
WHERE f.status IN ('aprovada','programada','em_gozo')
  AND f.cancelado IS NOT TRUE;

GRANT SELECT ON public.v_ferias_alerta_pagamento_d2 TO authenticated;
