-- P0: make tenant/RBAC decisions server-owned and remove permissive PII reads.
--
-- This is deliberately progressive: it does not depend on reconciling the
-- historical ledger and it fails before changing anything when a required
-- contract is absent.

DO $preflight$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'user_empresas', 'user_roles', 'audit_log', 'cnab_configuracoes',
    'historico_rescisoes', 'admissoes', 'batidas_ponto',
    'provisoes_mensais', 'registros_ponto', 'faltas', 'esocial_eventos',
    'exames', 'folhas_pagamento', 'desligamentos', 'banco_horas',
    'solicitacoes_ajuste_ponto', 'documentos_assinatura',
    'colaborador_beneficios', 'colaboradores'
  ]
  LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'P0 identity/RLS remediation requires public.%', required_table;
    END IF;
  END LOOP;

  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL
     OR to_regprocedure('public.is_admin(uuid)') IS NULL
     OR to_regprocedure('public.get_user_empresas(uuid)') IS NULL
     OR to_regprocedure('public.reset_login_attempts(text,text)') IS NULL THEN
    RAISE EXCEPTION 'P0 identity/RLS remediation requires has_role, is_admin, get_user_empresas and reset_login_attempts';
  END IF;

  IF to_regclass('public.v_system_health') IS NULL
     OR to_regclass('public.v_audit_trail') IS NULL THEN
    RAISE EXCEPTION 'P0 identity/RLS remediation requires v_system_health and v_audit_trail';
  END IF;
END
$preflight$;

-- Compatibility helper used by legacy policies. The previous body trusted
-- user_metadata. It now resolves only persisted membership controlled by the
-- database. Prefer get_user_empresas(auth.uid()) in new policies.
CREATE OR REPLACE FUNCTION public.user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT ue.empresa_id
  FROM public.user_empresas AS ue
  WHERE ue.user_id = auth.uid()
  ORDER BY COALESCE(ue.is_default, false) DESC, ue.created_at ASC, ue.id ASC
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.user_empresa_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_empresa_id() TO authenticated, service_role;

-- Explicit-user variants are needed by service-role Edge Functions. They are
-- never exposed to clients because choosing _user_id would enable impersonation.
CREATE OR REPLACE FUNCTION public.pode_gerir_rh_para(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT _user_id IS NOT NULL
     AND _empresa_id IS NOT NULL
     AND (
       public.is_admin(_user_id)
       OR (
         EXISTS (
           SELECT 1 FROM public.user_empresas AS ue
           WHERE ue.user_id = _user_id AND ue.empresa_id = _empresa_id
         )
         AND public.has_role(_user_id, 'rh'::public.app_role)
       )
     )
$function$;

CREATE OR REPLACE FUNCTION public.pode_gerir_pessoas_para(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT _user_id IS NOT NULL
     AND _empresa_id IS NOT NULL
     AND (
       public.is_admin(_user_id)
       OR (
         EXISTS (
           SELECT 1 FROM public.user_empresas AS ue
           WHERE ue.user_id = _user_id AND ue.empresa_id = _empresa_id
         )
         AND (
           public.has_role(_user_id, 'rh'::public.app_role)
           OR public.has_role(_user_id, 'gestor'::public.app_role)
         )
       )
     )
$function$;

CREATE OR REPLACE FUNCTION public.pode_gerir_rh(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT public.pode_gerir_rh_para(auth.uid(), _empresa_id)
$function$;

CREATE OR REPLACE FUNCTION public.pode_gerir_pessoas(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT public.pode_gerir_pessoas_para(auth.uid(), _empresa_id)
$function$;

REVOKE ALL ON FUNCTION public.pode_gerir_rh_para(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pode_gerir_pessoas_para(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pode_gerir_rh_para(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pode_gerir_pessoas_para(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.pode_gerir_rh(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_gerir_pessoas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerir_rh(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_gerir_pessoas(uuid) TO authenticated, service_role;

-- Successful login is already recorded atomically by record_login_attempt.
-- No browser caller may reset an arbitrary identifier.
REVOKE ALL ON FUNCTION public.reset_login_attempts(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_login_attempts(text, text) TO service_role;

-- Remove the three confirmed allow-all policies and preserve their legitimate
-- paths using database-owned membership/roles.
DROP POLICY IF EXISTS "view_audit" ON public.audit_log;
DROP POLICY IF EXISTS "Admins podem ver todo audit_log" ON public.audit_log;
CREATE POLICY "Admins podem ver todo audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Usuários podem ver configurações de suas empresas"
  ON public.cnab_configuracoes;

DROP POLICY IF EXISTS "Usuarios autenticados podem ver rescisoes"
  ON public.historico_rescisoes;
DROP POLICY IF EXISTS "Rescisoes por empresa" ON public.historico_rescisoes;
CREATE POLICY "Rescisoes por empresa"
  ON public.historico_rescisoes FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    OR public.is_admin(auth.uid())
  );

-- Replace the 13 remotely observed policies that derived scope from
-- user_empresa_id/user JWT business-role branches. Every replacement is tied
-- to persisted membership or a server-owned administrator role.
DROP POLICY IF EXISTS admissoes_tenant_select ON public.admissoes;
CREATE POLICY admissoes_tenant_select ON public.admissoes FOR SELECT TO authenticated
USING ((empresa_id IS NOT NULL AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS batidas_ponto_tenant_select ON public.batidas_ponto;
CREATE POLICY batidas_ponto_tenant_select ON public.batidas_ponto FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS provisoes_mensais_tenant_select ON public.provisoes_mensais;
CREATE POLICY provisoes_mensais_tenant_select ON public.provisoes_mensais FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS registros_ponto_tenant_select ON public.registros_ponto;
CREATE POLICY registros_ponto_tenant_select ON public.registros_ponto FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS faltas_tenant_select ON public.faltas;
CREATE POLICY faltas_tenant_select ON public.faltas FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS esocial_eventos_tenant_select ON public.esocial_eventos;
CREATE POLICY esocial_eventos_tenant_select ON public.esocial_eventos FOR SELECT TO authenticated
USING ((empresa_id IS NOT NULL AND empresa_id IN (SELECT public.get_user_empresas(auth.uid()))) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS exames_tenant_select ON public.exames;
CREATE POLICY exames_tenant_select ON public.exames FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores AS c
    WHERE c.id = exames.colaborador_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  ) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS folhas_pagamento_tenant_select ON public.folhas_pagamento;
CREATE POLICY folhas_pagamento_tenant_select ON public.folhas_pagamento FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS desligamentos_tenant_select ON public.desligamentos;
CREATE POLICY desligamentos_tenant_select ON public.desligamentos FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS banco_horas_tenant_select ON public.banco_horas;
CREATE POLICY banco_horas_tenant_select ON public.banco_horas FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS solicitacoes_ajuste_ponto_tenant_select ON public.solicitacoes_ajuste_ponto;
CREATE POLICY solicitacoes_ajuste_ponto_tenant_select ON public.solicitacoes_ajuste_ponto FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS documentos_assinatura_tenant_select ON public.documentos_assinatura;
CREATE POLICY documentos_assinatura_tenant_select ON public.documentos_assinatura FOR SELECT TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS colaborador_beneficios_tenant_select ON public.colaborador_beneficios;
CREATE POLICY colaborador_beneficios_tenant_select ON public.colaborador_beneficios FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores AS c
    WHERE c.id = colaborador_beneficios.colaborador_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  ) OR public.is_admin(auth.uid())
);

REVOKE SELECT ON public.audit_log, public.cnab_configuracoes,
  public.historico_rescisoes FROM anon;

-- These views either expose administrative health or join auth.users. Direct
-- client access is not a safe contract; a scoped RPC can be added per caller.
REVOKE SELECT ON public.v_system_health FROM PUBLIC, anon;
REVOKE SELECT ON public.v_audit_trail FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_system_health, public.v_audit_trail TO service_role;
