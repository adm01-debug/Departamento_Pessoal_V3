-- P1: fechar hiato de escrita do gestor em ferias.
--
-- Auditoria no canônico (canonical-sql-diag) provou que ferias tem apenas
-- policies de leitura (ferias_gestor_read, FOR SELECT) e gestão RH
-- (ferias_rh_manage, FOR ALL -> pode_gerir_rh). O gestor (pode_gerir_pessoas)
-- lê (SELECT via pode_gerir_pessoas) mas NÃO edita: feriasService.aprovarGestor
-- e aprovarRH fazem UPDATE direto em `ferias`, e o gestor aprova férias pelo
-- fluxo de aprovação — sem policy UPDATE o UPDATE falha por RLS.
--
-- Este hiato é o único gap funcional provado de escrita por papel. Segue o
-- mesmo padrão já usado em 20260924200000 (pode_gerir_rh OR pode_gerir_pessoas
-- para UPDATE de afastamentos/medidas_disciplinares/contatos_emergencia etc).
--
-- NOTA DE ESCOPO (revisto pós-review #729): a versão original desta migration
-- incluía a mesma policy em folhas_pagamento (folhas_gestor_update). A
-- 20261119130000 (policy UPDATE do gestor só em ferias) deliberadamente
-- manteve folhas_pagamento sem escrita de gestor — não há fluxo de gestor que
-- escreva nessa tabela — e sua pós-condição falha se folhas_pagamento receber
-- UPDATE/ALL com pode_gerir_pessoas. Como esta 120000 NUNCA foi aplicada em
-- ambiente algum (não consta no ledger do canônico), a parte de
-- folhas_pagamento foi removida para não quebrar reconstruções a partir de
-- main. A parte de ferias fica (idempotente com a 130000).
--
-- Rótulo: DDL em produção -> regra 8, aguarda ok do dono antes de aplicar no canônico.

-- ============================================================
-- ferias
-- ============================================================
-- audit-migration-style: allow-silent-drop policy nova ainda não existe em produção; DROP é idempotência
DROP POLICY IF EXISTS "ferias_gestor_update" ON public.ferias;
CREATE POLICY "ferias_gestor_update" ON public.ferias
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id))
  WITH CHECK (public.pode_gerir_pessoas(empresa_id));

