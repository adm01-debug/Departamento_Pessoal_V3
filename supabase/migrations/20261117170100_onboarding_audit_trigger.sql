-- =============================================================================
-- Resgate da branch `muri` (20261005010000), redatado para aplicar depois do
-- ultimo item do ledger. Autorizado pelo dono na issue #628.
--
-- PROBLEMA, verificado em producao: `information_schema.triggers` nao tem
-- `audit_tarefas_onboarding`. Existem 5 triggers em tabelas `onboarding*`,
-- mas nenhum em `tarefas_onboarding` — ou seja, criar, concluir, reatribuir ou
-- apagar tarefa de onboarding de um admitido NAO deixa rastro na auditoria.
--
-- Conferido antes de escrever: `public.log_audit_change()` existe e
-- `public.tarefas_onboarding` existe. Reaproveita a MESMA funcao de auditoria
-- que as outras tabelas do projeto usam, sem inventar formato de log novo.
--
-- Idempotente: o DO/IF NOT EXISTS vem do arquivo original e esta mantido, para
-- que reaplicar nao erre.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'audit_tarefas_onboarding'
      AND tgrelid = 'public.tarefas_onboarding'::regclass
  ) THEN
    CREATE TRIGGER audit_tarefas_onboarding
      AFTER INSERT OR UPDATE OR DELETE ON public.tarefas_onboarding
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();
  END IF;
END $$;
