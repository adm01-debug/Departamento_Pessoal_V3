-- ============================================================================
-- ROLLBACK **DE SEGURANÇA** — reverte APENAS o endurecimento (R2/R3)
-- ----------------------------------------------------------------------------
-- 🚫  DESACONSELHADO. Este arquivo RESTAURA permissões excessivas: qualquer
--     `authenticated` da empresa volta a poder CRIAR e APAGAR avaliações sem
--     papel de RH e sem auditoria. Só execute com decisão registrada e, de
--     preferência, nunca em produção.
--
-- ⚠️  ARQUIVO FORA DE `supabase/migrations` (execução manual).
-- ⚠️  NÃO EXECUTADO.
--
-- Use quando: for necessário voltar ao estado ANTERIOR à migration para
-- investigar um incidente, com o ambiente isolado e por tempo limitado.
-- ============================================================================

-- 1) Reabre o INSERT para qualquer autenticado da empresa (estado anterior)
drop policy if exists "feedbacks_360_insert" on public.feedbacks_360;
create policy "feedbacks_360_insert" on public.feedbacks_360
  for insert to authenticated
  with check (empresa_id in (select public.get_user_empresas(auth.uid())));

-- 2) Devolve o DELETE direto (a exclusão física volta a ser possível)
grant delete on public.feedbacks_360 to authenticated;
drop policy if exists "feedbacks_360_delete" on public.feedbacks_360;
create policy "feedbacks_360_delete" on public.feedbacks_360
  for delete to authenticated
  using (empresa_id in (select public.get_user_empresas(auth.uid())));

-- 3) Devolve o UPDATE direto (volta a permitir contornar a RPC de status)
grant update on public.feedbacks_360 to authenticated;
drop policy if exists "feedbacks_360_update" on public.feedbacks_360;
create policy "feedbacks_360_update" on public.feedbacks_360
  for update to authenticated
  using (empresa_id in (select public.get_user_empresas(auth.uid())));

-- 4) Os helpers de papel permanecem (não concedem nada por si; são usados só
--    pelas policies/RPCs). Remover apenas se a migration for totalmente revertida:
--    drop function if exists public.pode_gerir_avaliacoes();
--    drop function if exists public.pode_validar_potencial();

-- ============================================================================
-- O QUE ESTE ARQUIVO **NÃO** RESTAURA DE PROPÓSITO — TRUNCATE
-- ----------------------------------------------------------------------------
-- 🚫  A revogação de `TRUNCATE` (§3b da migration) NÃO é revertida aqui.
--     Mesmo no cenário "restaurar permissões amplas", o privilégio de
--     destruição TOTAL de `feedbacks_360` permanece fechado para PUBLIC, `anon`
--     e `authenticated`. Motivos:
--       • não é um privilégio de ESCRITA de registro: esvazia a tabela inteira
--         numa única instrução, sem WHERE, SEM RLS e sem trilha por linha;
--       • nenhuma rotina do app (frontend, RPCs ou Edge Functions) trunca —
--         o inventário está no §3b da migration;
--       • não existe caminho autorizado de RH/proprietário que dependa dele, e
--         portanto restaurá-lo não "conserta" nada: só reabre um risco.
--     Se, por decisão registrada e fora deste módulo, alguém precisar do
--     privilégio de manutenção, use `service_role` (que o mantém) em vez de
--     devolvê-lo aos papéis de aplicação.
--     Comando NÃO incluído aqui, de propósito:
--       grant truncate on table public.feedbacks_360 to authenticated;  -- ❌
-- ============================================================================

-- ============================================================================
-- O QUE ESTE ARQUIVO **NÃO** RESTAURA DE PROPÓSITO — HISTÓRICO E REVISÃO
-- ----------------------------------------------------------------------------
-- 🚫  Mesmo no cenário "restaurar permissões amplas", NÃO se reverte:
--       • `feedbacks_360.revisao` (§0 da migration) — continua na tabela. A
--         coluna é aditiva (o app lê `*`) e é o que garante que reabrir e
--         concluir de novo invalide a validação anterior do RH, inclusive
--         dentro da MESMA transação (onde `now()` é constante);
--       • o TRIGGER `trg_feedbacks_360_revisao` (§0.1) — continua ativo: é ele
--         quem incrementa `revisao` a CADA UPDATE, inclusive numa correção
--         privilegiada que não passe pela RPC. Comando NÃO incluído de
--         propósito:
--           drop trigger if exists trg_feedbacks_360_revisao on public.feedbacks_360;  -- ❌
--       • a coluna `audit_log.empresa_id` (§0g) — continua na tabela de
--         auditoria. É o vínculo por empresa que a Trilha usa para recortar os
--         eventos; também é replicada em `dados_novos.empresa_id`;
--       • as FKs de `feedbacks_360_operacoes` e
--         `feedbacks_360_validacoes_potencial` — continuam em
--         `ON DELETE RESTRICT`. Comando NÃO incluído, de propósito:
--           alter table public.feedbacks_360_operacoes
--             drop constraint feedbacks_360_operacoes_feedback_id_fkey;  -- ❌
--         Voltar para `ON DELETE CASCADE` faria uma exclusão privilegiada
--         apagar, em cascata, o histórico de operações (idempotência) e as
--         APROVAÇÕES do RH — destruindo prova, não corrigindo nada.
--     Restaurar permissões de escrita é uma decisão operacional; destruir
--     histórico por efeito colateral nunca é.
-- ============================================================================
