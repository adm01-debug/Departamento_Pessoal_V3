-- ============================================================
-- ETAPA 4: escopo de empresa em auditoria/regimento + integridade da trilha
-- ============================================================

-- folha_auditoria: leitura escopada pela folha; escrita apenas service_role
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar auditoria" ON public.folha_auditoria;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir auditoria" ON public.folha_auditoria;

CREATE POLICY "folha_auditoria_tenant_select"
ON public.folha_auditoria FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.folhas_pagamento f
    WHERE f.id = folha_auditoria.folha_id
      AND f.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE INDEX IF NOT EXISTS idx_folha_auditoria_folha_id ON public.folha_auditoria (folha_id);

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.folha_auditoria FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.folha_auditoria FROM authenticated;
GRANT SELECT ON public.folha_auditoria TO authenticated;
GRANT ALL ON public.folha_auditoria TO service_role;

-- sst_regimento_interno: escopo de empresa
DROP POLICY IF EXISTS "Leitura para autenticados" ON public.sst_regimento_interno;

CREATE POLICY "sst_regimento_interno_tenant_select"
ON public.sst_regimento_interno FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

REVOKE SELECT ON public.sst_regimento_interno FROM anon;
GRANT SELECT ON public.sst_regimento_interno TO authenticated;
GRANT ALL ON public.sst_regimento_interno TO service_role;

-- audit_log: impedir insercao de eventos forjados por usuarios finais
DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON public.audit_log;
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated, anon;
REVOKE SELECT ON public.audit_log FROM anon;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

-- auditoria: mesma protecao (INSERT liberado a qualquer autenticado)
DROP POLICY IF EXISTS "audit_insert" ON public.auditoria;
REVOKE INSERT, UPDATE, DELETE ON public.auditoria FROM authenticated, anon;
REVOKE SELECT ON public.auditoria FROM anon;
GRANT SELECT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
