-- ============================================================================
-- ONBOARDING — TRILHA TÉCNICA DA JORNADA (FASE 3 do fechamento)
--
-- ADITIVA E IDEMPOTENTE. Nenhum DROP, nenhum DELETE, nenhuma coluna nova.
--
-- PROBLEMA (auditoria): `public.tarefas_onboarding` ficou FORA da lista de
-- tabelas auditadas pelas migrations anteriores — a última varredura
-- (`20260317125552_ab20d4cd-...sql`) instala o trigger genérico
-- `audit_<tabela>` em exatamente 10 tabelas (colaboradores, admissoes,
-- desligamentos, ferias, folhas_pagamento, afastamentos, beneficios,
-- registros_ponto, departamentos, cargos). Resultado: **concluir uma tarefa de
-- onboarding era INVISÍVEL para `public.audit_log`**.
--
-- SOLUÇÃO: instalar o MESMO trigger, apontando para a MESMA função
-- (`public.log_audit_change()`), no MESMO formato das outras 10 tabelas.
-- Nada de sistema paralelo de logs; nenhuma escrita vinda do cliente (a função é
-- `SECURITY DEFINER`, então não depende de policy de INSERT em `audit_log`).
--
-- O QUE ISSO COBRE AUTOMATICAMENTE (1 ação de negócio = 1 evento lógico):
--   • tarefa concluída      → UPDATE com `concluida`/`concluida_em` em `campos_alterados`
--   • tarefa REABERTA       → UPDATE com `concluida` voltando para false
--   • responsável alterado  → UPDATE de `responsavel_id`
--   • prazo alterado        → UPDATE de `prazo_dias`
--   • tarefa criada         → INSERT (as 3 tarefas padrão do trigger
--                             `tr_create_onboarding_tasks`)
--   • jornada iniciada      → já coberta: `admissoes` JÁ é auditada (INSERT)
--   • jornada concluída     → DERIVADA no Histórico (100% concluído), sem
--                             log duplicado
-- ============================================================================

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
