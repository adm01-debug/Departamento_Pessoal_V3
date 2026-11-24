-- Remediacao: Consciencia Negra (20/11) ausente no canônico.
--
-- O canônico aplicou 20261111000000 a partir de um SHA anterior à PR #447
-- (bfb3cb01, 23:12Z 11/11), que não incluía o feriado '11-20' na função
-- eh_feriado_fixo_br. As aplicações posteriores pulam a versão por já estar
-- no ledger, então a correção OJ-123 para datas após 20/11 nunca chegou ao
-- banco (ex.: férias iniciando em 22/11 → D-2 = 20/11 → sem a correção o
-- prazo não recua para 19/11). Esta migration refaz a função com o feriado.

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