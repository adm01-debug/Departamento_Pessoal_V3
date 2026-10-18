-- QA round-3: revogação 671 quebrada pelo trigger append-only
-- ----------------------------------------------------------------------------
-- Achado QA-r3-3 (crítico): trg_ponto_espelhos_assinados_no_update usa
-- audit_log_append_only() — RAISE em QUALQUER UPDATE da tabela. Isso matou
-- (a) `revogar_espelho_ponto`, cujo `UPDATE ... SET revogado_em` sempre
--     aborta a transação inteira (incl. a trilha de revogação); o escape
--     app.audit_log_purge='on' faria RETURN OLD → UPDATE no-op silencioso.
-- (b) o backfill de revogado_em em 20261022000000_qa5_db_fixes.sql, que numa
--     base populada aborta a migration inteira (passou no replay local só
--     porque a tabela estava vazia).
--
-- Fix: a tabela ganha guarda de UPDATE dedicada — append-only continua, mas a
-- ÚNICA mutação permitida é a transição revogado_em NULL → timestamp (todos
-- os demais campos precisam ficar IS NOT DISTINCT FROM o original).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ponto_espelhos_assinados_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_rev TIMESTAMP WITH TIME ZONE := NEW.revogado_em;
BEGIN
  IF OLD.revogado_em IS NULL AND v_rev IS NOT NULL THEN
    NEW.revogado_em := OLD.revogado_em;
    IF NEW IS NOT DISTINCT FROM OLD THEN
      NEW.revogado_em := v_rev;
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Trilha de auditoria é append-only. UPDATE/DELETE não são permitidos em %.', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_ponto_espelhos_assinados_no_update ON public.ponto_espelhos_assinados;
CREATE TRIGGER trg_ponto_espelhos_assinados_no_update
  BEFORE UPDATE ON public.ponto_espelhos_assinados
  FOR EACH ROW EXECUTE FUNCTION public.ponto_espelhos_assinados_guard_update();

-- Backfill re-executado (idempotente): cobre o caso do apply de
-- 20261022000000 ter abortado este UPDATE no canônico.
UPDATE public.ponto_espelhos_assinados a
SET revogado_em = sub.revogado_em
FROM (
  SELECT espelho_id, min(revogado_em) AS revogado_em
  FROM public.ponto_espelhos_revogacoes
  GROUP BY espelho_id
) sub
WHERE a.id = sub.espelho_id
  AND a.revogado_em IS NULL;
