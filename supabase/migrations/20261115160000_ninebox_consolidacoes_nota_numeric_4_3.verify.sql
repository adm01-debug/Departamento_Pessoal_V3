-- Sidecar de 20261115160000_ninebox_consolidacoes_nota_numeric_4_3.sql
-- Prova o ESTADO-ALVO: as 4 notas de public.feedbacks_360_consolidacoes com o
-- numeric(4,3) que 20261021090000_ninebox_aprovacao_confirmada.sql:21-24
-- declarou e o `add column if not exists` nunca aplicou — a mesma exigência de
-- 20261021090000_ninebox_aprovacao_confirmada.verify.sql:22-28.
-- Somente leitura: pg_attribute, pg_constraint e a própria tabela. Nenhuma RPC.

-- 1. As 4 notas são numeric(4,3).
SELECT CASE WHEN (
  (SELECT count(*) FROM pg_attribute a
    WHERE a.attrelid = 'public.feedbacks_360_consolidacoes'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attname IN ('desempenho_proposto','potencial_proposto',
                        'desempenho_aprovado','potencial_aprovado')
      AND format_type(a.atttypid, a.atttypmod) = 'numeric(4,3)') = 4
) THEN 'ok' ELSE 'FALHOU' END;

-- 2. Os 4 CHECK fbc_*_escala sobreviveram à troca de tipo, validados.
SELECT CASE WHEN (
  (SELECT count(*) FROM pg_constraint k
    WHERE k.conrelid = 'public.feedbacks_360_consolidacoes'::regclass
      AND k.contype = 'c' AND k.convalidated
      AND k.conname IN ('fbc_desempenho_proposto_escala','fbc_potencial_proposto_escala',
                        'fbc_desempenho_aprovado_escala','fbc_potencial_aprovado_escala')) = 4
) THEN 'ok' ELSE 'FALHOU' END;

-- 3. Nenhum dado foi perdido ou truncado fora da escala: toda nota não nula
--    continua entre 1 e 5 com no máximo 3 casas decimais.
SELECT CASE WHEN (
  NOT EXISTS (
    SELECT 1 FROM public.feedbacks_360_consolidacoes c
     WHERE (c.desempenho_proposto IS NOT NULL
            AND (scale(c.desempenho_proposto) > 3 OR c.desempenho_proposto < 1 OR c.desempenho_proposto > 5))
        OR (c.potencial_proposto IS NOT NULL
            AND (scale(c.potencial_proposto) > 3 OR c.potencial_proposto < 1 OR c.potencial_proposto > 5))
        OR (c.desempenho_aprovado IS NOT NULL
            AND (scale(c.desempenho_aprovado) > 3 OR c.desempenho_aprovado < 1 OR c.desempenho_aprovado > 5))
        OR (c.potencial_aprovado IS NOT NULL
            AND (scale(c.potencial_aprovado) > 3 OR c.potencial_aprovado < 1 OR c.potencial_aprovado > 5))
  )
) THEN 'ok' ELSE 'FALHOU' END;
