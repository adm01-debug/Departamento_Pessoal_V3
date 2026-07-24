-- ============================================================================
-- MELHORIA 5 (achado D da auditoria adversarial) — public.ferias_programacao
--
-- O índice único `uq_fprog_unico_ativo (colaborador_id, ano, periodo_aquisitivo_id)
-- WHERE status <> 'cancelado'` NÃO impedia duplicatas quando periodo_aquisitivo_id
-- é NULL, porque em índice único do Postgres valores NULL são DISTINTOS entre si.
-- Resultado: um colaborador podia ter 2+ programações ATIVAS para o mesmo ano sem
-- período vinculado — que depois converteriam em férias sobrepostas.
--
-- Regra de negócio correta: 1 programação ativa por (colaborador, ano), mesmo sem
-- período. Correção via NULLS NOT DISTINCT (PG 15+).
--
-- Passo 1 — resolução SEGURA de duplicatas pré-existentes (sem DELETE):
--   mantém a mais recente por (colaborador, ano) e marca as demais como
--   'cancelado' (o que também as remove do índice parcial). Reversível e
--   auditado em audit_log_unified. Só toca linhas que SÃO duplicatas reais.
-- Passo 2 — recria o índice com NULLS NOT DISTINCT.
-- Idempotente: reexecutar não cancela nada novo e recria o índice igual.
-- ============================================================================

DO $$
DECLARE v_canceladas INT := 0;
BEGIN
  WITH dups AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY colaborador_id, ano
             ORDER BY created_at DESC, id DESC
           ) AS rn
    FROM public.ferias_programacao
    WHERE periodo_aquisitivo_id IS NULL
      AND status <> 'cancelado'
  ),
  to_cancel AS (
    SELECT id FROM dups WHERE rn > 1
  ),
  upd AS (
    UPDATE public.ferias_programacao f
       SET status = 'cancelado'
      FROM to_cancel c
     WHERE f.id = c.id
    RETURNING f.id, f.empresa_id
  )
  INSERT INTO public.audit_log_unified(source_table, entity, entity_id, action, empresa_id, payload)
  SELECT 'ferias_programacao', 'ferias_programacao', upd.id::text, 'AUTO_CANCEL_DUPLICATA', upd.empresa_id,
         jsonb_build_object(
           'motivo', 'dedupe para uq_fprog_unico_ativo NULLS NOT DISTINCT',
           'migracao', '20260723140000'
         )
  FROM upd;

  GET DIAGNOSTICS v_canceladas = ROW_COUNT;
  RAISE NOTICE 'ferias_programacao: % programação(ões) duplicada(s) canceladas no dedupe', v_canceladas;
END $$;

DROP INDEX IF EXISTS public.uq_fprog_unico_ativo;
CREATE UNIQUE INDEX uq_fprog_unico_ativo
  ON public.ferias_programacao(colaborador_id, ano, periodo_aquisitivo_id)
  NULLS NOT DISTINCT
  WHERE status <> 'cancelado';
