-- ==========================================================================
-- CRITICAL RLS FIX: Replace USING(true) with proper tenant-scoped policies
-- Targets: Tables with empresa_id that contain sensitive employee/financial data
-- Pattern: public.user_belongs_to_empresa(auth.uid(), empresa_id)
-- ==========================================================================

-- Helper: admin bypass (service_role always bypasses RLS, but is_admin() allows
-- platform admins to see all tenants via the authenticated role)
CREATE OR REPLACE FUNCTION public.rls_tenant_or_admin(row_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_belongs_to_empresa(auth.uid(), row_empresa_id)
    OR public.is_admin(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.rls_tenant_or_admin(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_tenant_or_admin(UUID) FROM anon, PUBLIC;

-- ==========================================================================
-- 1. COLABORADORES (most critical — contains PII)
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can view colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can insert colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can update colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can delete colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Allow all" ON public.colaboradores;

DROP POLICY IF EXISTS "colaboradores_tenant_select" ON public.colaboradores;
CREATE POLICY "colaboradores_tenant_select" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id));

DROP POLICY IF EXISTS "colaboradores_tenant_insert" ON public.colaboradores;
CREATE POLICY "colaboradores_tenant_insert" ON public.colaboradores
  FOR INSERT TO authenticated
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

DROP POLICY IF EXISTS "colaboradores_tenant_update" ON public.colaboradores;
CREATE POLICY "colaboradores_tenant_update" ON public.colaboradores
  FOR UPDATE TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

DROP POLICY IF EXISTS "colaboradores_tenant_delete" ON public.colaboradores;
CREATE POLICY "colaboradores_tenant_delete" ON public.colaboradores
  FOR DELETE TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 2. FOLHAS_PAGAMENTO (payroll — financial data)
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can manage folhas" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "Empresas gerenciam suas proprias folhas" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "Allow all" ON public.folhas;

DROP POLICY IF EXISTS "folhas_pagamento_tenant" ON public.folhas_pagamento;
CREATE POLICY "folhas_pagamento_tenant" ON public.folhas_pagamento
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 3. HOLERITES (payslips — highly sensitive)
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can manage holerites" ON public.holerites;

DROP POLICY IF EXISTS "holerites_tenant" ON public.holerites;
CREATE POLICY "holerites_tenant" ON public.holerites
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 4. REGISTROS_PONTO (time clock records)
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can manage registros_ponto" ON public.registros_ponto;

DROP POLICY IF EXISTS "registros_ponto_tenant" ON public.registros_ponto;
CREATE POLICY "registros_ponto_tenant" ON public.registros_ponto
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 5. FERIAS (vacation — contains employee absence data)
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can manage ferias" ON public.ferias;
DROP POLICY IF EXISTS "Allow all" ON public.ferias;

DROP POLICY IF EXISTS "ferias_tenant" ON public.ferias;
CREATE POLICY "ferias_tenant" ON public.ferias
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 6. AFASTAMENTOS (leave/absence — medical data)
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can manage afastamentos" ON public.afastamentos;
DROP POLICY IF EXISTS "Acesso por empresa_id em afastamentos" ON public.afastamentos;

DROP POLICY IF EXISTS "afastamentos_tenant" ON public.afastamentos;
CREATE POLICY "afastamentos_tenant" ON public.afastamentos
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 7. DEPENDENTES (employee dependents — PII)
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can manage dependentes" ON public.dependentes;

DROP POLICY IF EXISTS "dependentes_tenant" ON public.dependentes;
CREATE POLICY "dependentes_tenant" ON public.dependentes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = dependentes.colaborador_id
    AND public.rls_tenant_or_admin(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = dependentes.colaborador_id
    AND public.rls_tenant_or_admin(c.empresa_id)
  ));

-- ==========================================================================
-- 8. CONTAS_BANCARIAS (bank accounts — highly sensitive)
-- ==========================================================================
DROP POLICY IF EXISTS "contas_bancarias_auth" ON public.contas_bancarias;

DROP POLICY IF EXISTS "contas_bancarias_tenant" ON public.contas_bancarias;
CREATE POLICY "contas_bancarias_tenant" ON public.contas_bancarias
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = contas_bancarias.colaborador_id
    AND public.rls_tenant_or_admin(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = contas_bancarias.colaborador_id
    AND public.rls_tenant_or_admin(c.empresa_id)
  ));

-- ==========================================================================
-- 9. CONTATOS_EMERGENCIA (emergency contacts — PII)
-- ==========================================================================
DROP POLICY IF EXISTS "contatos_emergencia_auth" ON public.contatos_emergencia;

DROP POLICY IF EXISTS "contatos_emergencia_tenant" ON public.contatos_emergencia;
CREATE POLICY "contatos_emergencia_tenant" ON public.contatos_emergencia
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = contatos_emergencia.colaborador_id
    AND public.rls_tenant_or_admin(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = contatos_emergencia.colaborador_id
    AND public.rls_tenant_or_admin(c.empresa_id)
  ));

-- ==========================================================================
-- 10. HISTORICO_SALARIAL (salary history — financial PII)
-- ==========================================================================
DROP POLICY IF EXISTS "historico_salarial_auth" ON public.historico_salarial;

DROP POLICY IF EXISTS "historico_salarial_tenant" ON public.historico_salarial;
CREATE POLICY "historico_salarial_tenant" ON public.historico_salarial
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = historico_salarial.colaborador_id
    AND public.rls_tenant_or_admin(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = historico_salarial.colaborador_id
    AND public.rls_tenant_or_admin(c.empresa_id)
  ));

-- ==========================================================================
-- 11. DEPARTAMENTOS (org structure)
-- ==========================================================================
DROP POLICY IF EXISTS "Auth users manage departamentos" ON public.departamentos;

DROP POLICY IF EXISTS "departamentos_tenant" ON public.departamentos;
CREATE POLICY "departamentos_tenant" ON public.departamentos
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 12. CARGOS (job titles)
-- ==========================================================================
DROP POLICY IF EXISTS "Auth users manage cargos" ON public.cargos;

DROP POLICY IF EXISTS "cargos_tenant" ON public.cargos;
CREATE POLICY "cargos_tenant" ON public.cargos
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 13. BENEFICIOS (benefits — financial)
-- ==========================================================================
DROP POLICY IF EXISTS "Auth users manage beneficios" ON public.beneficios;

DROP POLICY IF EXISTS "beneficios_tenant" ON public.beneficios;
CREATE POLICY "beneficios_tenant" ON public.beneficios
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 14. ESOCIAL_EVENTOS (eSocial government compliance)
-- ==========================================================================
DROP POLICY IF EXISTS "Auth users manage esocial_eventos" ON public.esocial_eventos;

DROP POLICY IF EXISTS "esocial_eventos_tenant" ON public.esocial_eventos;
CREATE POLICY "esocial_eventos_tenant" ON public.esocial_eventos
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 15. PENSOES (alimony/support — highly sensitive financial/legal)
-- ==========================================================================
DROP POLICY IF EXISTS "Auth users manage pensoes" ON public.pensoes;

DROP POLICY IF EXISTS "pensoes_tenant" ON public.pensoes;
CREATE POLICY "pensoes_tenant" ON public.pensoes
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 16. DOCUMENTOS (employee documents)
-- ==========================================================================
DROP POLICY IF EXISTS "Auth users manage documentos" ON public.documentos;

DROP POLICY IF EXISTS "documentos_tenant" ON public.documentos;
CREATE POLICY "documentos_tenant" ON public.documentos
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 17. LGPD_CONSENTIMENTOS (GDPR consents — compliance-critical)
-- ==========================================================================
DROP POLICY IF EXISTS "auth_lgpd_consentimentos_all" ON public.lgpd_consentimentos;

DROP POLICY IF EXISTS "lgpd_consentimentos_tenant" ON public.lgpd_consentimentos;
CREATE POLICY "lgpd_consentimentos_tenant" ON public.lgpd_consentimentos
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 18. LGPD_SOLICITACOES (GDPR requests — compliance-critical)
-- ==========================================================================
DROP POLICY IF EXISTS "auth_lgpd_solicitacoes_all" ON public.lgpd_solicitacoes;

DROP POLICY IF EXISTS "lgpd_solicitacoes_tenant" ON public.lgpd_solicitacoes;
CREATE POLICY "lgpd_solicitacoes_tenant" ON public.lgpd_solicitacoes
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 19. CERTIFICADOS_DIGITAIS (digital certificates — auth material)
-- ==========================================================================
DROP POLICY IF EXISTS "Users can manage certificates" ON public.certificados_digitais;

DROP POLICY IF EXISTS "certificados_digitais_tenant" ON public.certificados_digitais;
CREATE POLICY "certificados_digitais_tenant" ON public.certificados_digitais
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 20. CANAL_ETICA (ethics channel — whistleblower protection)
-- ==========================================================================
DROP POLICY IF EXISTS "auth_canal_etica_all" ON public.canal_etica;

DROP POLICY IF EXISTS "canal_etica_tenant" ON public.canal_etica;
CREATE POLICY "canal_etica_tenant" ON public.canal_etica
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 21. BANCO_HORAS (time bank — labor compliance)
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can manage banco_horas" ON public.banco_horas;

DROP POLICY IF EXISTS "banco_horas_tenant" ON public.banco_horas;
CREATE POLICY "banco_horas_tenant" ON public.banco_horas
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 22. LANCAMENTOS_FOLHA (payroll entries — financial)
-- ==========================================================================
DROP POLICY IF EXISTS "Authenticated users can manage lancamentos" ON public.lancamentos_folha;

DROP POLICY IF EXISTS "lancamentos_folha_tenant" ON public.lancamentos_folha;
CREATE POLICY "lancamentos_folha_tenant" ON public.lancamentos_folha
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 23. CONTRATOS (employment contracts)
-- ==========================================================================
DROP POLICY IF EXISTS "Auth users manage contratos" ON public.contratos;

DROP POLICY IF EXISTS "contratos_tenant" ON public.contratos;
CREATE POLICY "contratos_tenant" ON public.contratos
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 24. JORNADAS (work schedules)
-- ==========================================================================
DROP POLICY IF EXISTS "Auth users manage jornadas" ON public.jornadas;

DROP POLICY IF EXISTS "jornadas_tenant" ON public.jornadas;
CREATE POLICY "jornadas_tenant" ON public.jornadas
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- 25. DESPESAS (expenses — financial)
-- ==========================================================================
DROP POLICY IF EXISTS "auth_despesas_all" ON public.despesas;

DROP POLICY IF EXISTS "despesas_tenant" ON public.despesas;
CREATE POLICY "despesas_tenant" ON public.despesas
  FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ==========================================================================
-- ENSURE RLS IS ENABLED on all critical tables
-- ==========================================================================
ALTER TABLE IF EXISTS public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.folhas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.holerites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dependentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contatos_emergencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.historico_salarial ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.esocial_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pensoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lgpd_consentimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.certificados_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.canal_etica ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.banco_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lancamentos_folha ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.despesas ENABLE ROW LEVEL SECURITY;
