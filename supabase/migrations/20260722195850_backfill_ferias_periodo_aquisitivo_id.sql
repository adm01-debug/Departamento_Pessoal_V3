-- Backfill guard: remove ferias órfãs antes do SET NOT NULL em 20260722200247_*.
--
-- 20260722195800_fix_ferias_add_periodo_aquisitivo_id.sql adicionou a coluna
-- como nullable. 20260722200247_* aplica SET NOT NULL logo em seguida.
-- Em bancos com rows existentes (produção), todas as rows antigas têm NULL
-- (coluna recém criada) → o SET NOT NULL falharia.
--
-- Estratégia: marcar como canceladas (auditoria) e em seguida remover as
-- rows cujo periodo_aquisitivo_id ainda é NULL. São rows inválidas — sem
-- vínculo com um período aquisitivo elas não são calculáveis nem exibíveis.
-- Em bancos frescos (preview) não há rows → esta migration é no-op total.

-- Passo 1: marcar como canceladas para deixar rastro de auditoria
UPDATE public.ferias
  SET cancelado = true,
      motivo_cancelamento = 'Migração automática: período aquisitivo não vinculado'
  WHERE periodo_aquisitivo_id IS NULL
    AND COALESCE(cancelado, false) = false;

-- Passo 2: remover (todos as rows com NULL período são inválidas para a constraint)
DELETE FROM public.ferias
  WHERE periodo_aquisitivo_id IS NULL;
