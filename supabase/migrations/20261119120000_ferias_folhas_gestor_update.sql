-- P1: fechar hiato de escrita do gestor em ferias/folhas_pagamento.
--
-- Auditoria no canônico (canonical-sql-diag) provou que ferias e
-- folhas_pagamento têm apenas policies de leitura (ferias_gestor_read /
-- folhas_gestor_read, FOR SELECT) e gestão RH (ferias_rh_manage /
-- folhas_rh_manage, FOR ALL -> pode_gerir_rh). O gestor (pode_gerir_pessoas)
-- lê (SELECT via pode_gerir_pessoas) mas NÃO edita: feriasService.aprovarGestor
-- e aprovarRH fazem UPDATE direto em `ferias`, e o gestor aprova férias pelo
-- fluxo de aprovação — sem policy UPDATE o UPDATE falha por RLS.
--
-- Este hiato é o único gap funcional provado de escrita por papel. Segue o
-- mesmo padrão já usado em 20260924200000 (pode_gerir_rh OR pode_gerir_pessoas
-- para UPDATE de afastamentos/medidas_disciplinares/contatos_emergencia etc).
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

-- ============================================================
-- folhas_pagamento
-- ============================================================
-- audit-migration-style: allow-silent-drop policy nova ainda não existe em produção; DROP é idempotência
DROP POLICY IF EXISTS "folhas_gestor_update" ON public.folhas_pagamento;
CREATE POLICY "folhas_gestor_update" ON public.folhas_pagamento
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id))
  WITH CHECK (public.pode_gerir_pessoas(empresa_id));
