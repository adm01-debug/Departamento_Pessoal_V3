-- ============================================================
-- ETAPA 3: recrutamento e logs de relatorios
-- ============================================================

DROP POLICY IF EXISTS "Anotações acessíveis por empresa" ON public.recrutamento_anotacoes;
DROP POLICY IF EXISTS "Entrevistas acessíveis por empresa" ON public.recrutamento_entrevistas;
DROP POLICY IF EXISTS "Testes acessíveis por empresa" ON public.recrutamento_testes;
DROP POLICY IF EXISTS "Users can view their company's delivery logs" ON public.log_envio_relatorios;

-- Anotacoes: escopo de empresa + respeito ao flag "privada"
CREATE POLICY "recrutamento_anotacoes_tenant_select"
ON public.recrutamento_anotacoes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidaturas c
    WHERE c.id = recrutamento_anotacoes.candidatura_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
  AND (privada IS NOT TRUE OR usuario_id = auth.uid() OR public.is_admin(auth.uid()))
);

CREATE POLICY "recrutamento_anotacoes_tenant_write"
ON public.recrutamento_anotacoes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidaturas c
    WHERE c.id = recrutamento_anotacoes.candidatura_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
  AND (usuario_id = auth.uid() OR public.is_admin(auth.uid()))
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidaturas c
    WHERE c.id = recrutamento_anotacoes.candidatura_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "recrutamento_entrevistas_tenant_all"
ON public.recrutamento_entrevistas FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidaturas c
    WHERE c.id = recrutamento_entrevistas.candidatura_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidaturas c
    WHERE c.id = recrutamento_entrevistas.candidatura_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "recrutamento_testes_tenant_all"
ON public.recrutamento_testes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidaturas c
    WHERE c.id = recrutamento_testes.candidatura_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidaturas c
    WHERE c.id = recrutamento_testes.candidatura_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "log_envio_relatorios_tenant_select"
ON public.log_envio_relatorios FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.relatorios_agendados ra
    WHERE ra.id = log_envio_relatorios.agendamento_id
      AND ra.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE INDEX IF NOT EXISTS idx_recr_anotacoes_candidatura ON public.recrutamento_anotacoes (candidatura_id);
CREATE INDEX IF NOT EXISTS idx_recr_entrevistas_candidatura ON public.recrutamento_entrevistas (candidatura_id);
CREATE INDEX IF NOT EXISTS idx_recr_testes_candidatura ON public.recrutamento_testes (candidatura_id);
CREATE INDEX IF NOT EXISTS idx_log_envio_relatorios_agendamento ON public.log_envio_relatorios (agendamento_id);

REVOKE SELECT ON public.recrutamento_anotacoes, public.recrutamento_entrevistas,
                 public.recrutamento_testes, public.log_envio_relatorios FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recrutamento_anotacoes,
      public.recrutamento_entrevistas, public.recrutamento_testes TO authenticated;
GRANT SELECT ON public.log_envio_relatorios TO authenticated;
GRANT ALL ON public.recrutamento_anotacoes, public.recrutamento_entrevistas,
      public.recrutamento_testes, public.log_envio_relatorios TO service_role;
