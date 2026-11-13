-- Corrige drift: a #447 editou 20261111000000_ferias_art145_antecipacao_oj123.sql
-- DEPOIS de ela ter sido aplicada em produção, acrescentando o feriado nacional de
-- 20/11 (Consciência Negra, Lei 14.759/2023). O ledger já marca a versão como
-- aplicada, então a edição nunca chegou ao banco: eh_feriado_fixo_br em produção
-- não conhece 20/11 (prosrc sem '11-20', consulta read-only em 13/11/2026) e o
-- sidecar 20261111000000_*.verify.sql reprova o canonical-migrations (verify).
-- Efeito no negócio: férias que começam em 22/11/2026 recebem prazo de pagamento
-- (Art. 145 CLT) em 20/11, que é feriado, em vez de 19/11.
-- Idempotente: CREATE OR REPLACE com o mesmo corpo do arquivo original + ACL igual.

DO $$
BEGIN
  IF to_regprocedure('public.eh_feriado_fixo_br(date)') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.eh_feriado_fixo_br(date) não existe — aplicar 20261111000000 antes';
  END IF;
END $$;

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

REVOKE ALL ON FUNCTION public.eh_feriado_fixo_br(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eh_feriado_fixo_br(date) TO authenticated;
