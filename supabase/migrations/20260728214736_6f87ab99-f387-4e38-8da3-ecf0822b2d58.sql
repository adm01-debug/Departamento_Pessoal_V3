-- =========================================================
-- AUDIT_LOG
-- =========================================================
DROP POLICY IF EXISTS "Users can view relevant audit_logs" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_self_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_privileged_insert" ON public.audit_log;

CREATE POLICY "audit_log_self_select"
ON public.audit_log FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "audit_log_privileged_insert"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
);

REVOKE ALL ON public.audit_log FROM anon;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);

-- =========================================================
-- FOLHA_AUDITORIA
-- =========================================================
ALTER TABLE public.folha_auditoria ALTER COLUMN folha_id SET NOT NULL;

DROP POLICY IF EXISTS "folha_auditoria_privileged_insert" ON public.folha_auditoria;

CREATE POLICY "folha_auditoria_privileged_insert"
ON public.folha_auditoria FOR INSERT TO authenticated
WITH CHECK (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  AND EXISTS (
    SELECT 1 FROM public.folhas_pagamento f
    WHERE f.id = folha_auditoria.folha_id
      AND f.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

REVOKE ALL ON public.folha_auditoria FROM anon;
GRANT SELECT, INSERT ON public.folha_auditoria TO authenticated;
GRANT ALL ON public.folha_auditoria TO service_role;

CREATE INDEX IF NOT EXISTS idx_folha_auditoria_folha_id ON public.folha_auditoria(folha_id);

-- =========================================================
-- SST_REGIMENTO_INTERNO
-- =========================================================
DROP POLICY IF EXISTS "sst_regimento_interno_privileged_insert" ON public.sst_regimento_interno;
DROP POLICY IF EXISTS "sst_regimento_interno_privileged_update" ON public.sst_regimento_interno;
DROP POLICY IF EXISTS "sst_regimento_interno_privileged_delete" ON public.sst_regimento_interno;

CREATE POLICY "sst_regimento_interno_privileged_insert"
ON public.sst_regimento_interno FOR INSERT TO authenticated
WITH CHECK (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
);

CREATE POLICY "sst_regimento_interno_privileged_update"
ON public.sst_regimento_interno FOR UPDATE TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
);

CREATE POLICY "sst_regimento_interno_privileged_delete"
ON public.sst_regimento_interno FOR DELETE TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  )
  AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
);

REVOKE ALL ON public.sst_regimento_interno FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_regimento_interno TO authenticated;
GRANT ALL ON public.sst_regimento_interno TO service_role;

CREATE INDEX IF NOT EXISTS idx_sst_regimento_interno_empresa_id ON public.sst_regimento_interno(empresa_id);
