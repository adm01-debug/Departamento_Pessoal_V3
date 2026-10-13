-- ============================================================
-- Onda 4a — lockdown de superfície (H-RUN-13/27/28, A-088)
--
-- Reconcilia produção com o estado que o repositório já declara:
-- o levantamento 2026-10-12 achou 26 funções SECURITY DEFINER
-- executáveis por `anon` (6 sem justificativa) e 28 policies
-- `qual='true'` fora de service_role — em parte porque as
-- migrations corretivas antigas nunca chegaram ao canônico
-- (drift de ledger, H-AGD-07). Tudo aqui é idempotente:
-- DROP IF EXISTS / REVOKE são no-ops quando já aplicados.
--
-- 1) is_admin com auto-escopo (mesmo padrão de get_user_empresas
--    20260730125644): usuário logado só consulta o próprio papel.
--    Chamadas de backend (service_role/postgres, auth.uid() NULL)
--    seguem livres para as ~289 políticas e edge functions.
-- 2) REVOKEs da superfície anon sem justificativa.
-- 3) Policies driftadas: taxas_cambio pública, periodos_ponto
--    aberta, provisao_auditoria USING(true) — reescritas no
--    estado final que as migrations corretivas já definiam.
-- ============================================================

-- ------------------------------------------------------------
-- 1) is_admin(_user_id): auto-escopo
--    Antes: qualquer autenticado/anon descobria se ARBITRÁRIO
--    user_id era admin (enumeração de alvos para phishing/social).
--    Depois: authenticated só resolve o próprio auth.uid();
--    service_role/postgres (auth.uid() IS NULL) conserva o
--    comportamento — políticas e edges dependem disso.
--    Corpo segue single-statement para preservar inlining.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (_user_id = auth.uid() OR auth.uid() IS NULL)
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'admin'
    )
$$;

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'Admin global do usuário. SECDEF com auto-escopo: só responde sobre '
  'o próprio auth.uid() (ou contexto de backend sem JWT, ex. service_role '
  'nas edge functions). Padrão idêntico a get_user_empresas '
  '(20260730125644) — antes revelava o admin de qualquer empresa (A-088).';

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 2) REVOKEs — superfície anon/authenticated sem justificativa
-- ------------------------------------------------------------

-- clinicas_proximas: lista clínicas parceiras por p_empresa_id.
-- O corpo já correlaciona com o tenant (pertence_a_empresa), então
-- authenticated fica — mas anon não tem sessão e não deve nem
-- invocar. (AdminAgendamentoExamesPage chama logada.)
REVOKE EXECUTE ON FUNCTION
  public.clinicas_proximas(uuid, numeric, numeric, text, numeric, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.clinicas_proximas(uuid, numeric, numeric, text, numeric, integer)
  TO authenticated, service_role;

-- check_ciencia_rate_limit: helper interno de rate-limit chamado
-- por outras funções definer (o EXECUTE do caller externo não é
-- necessário — a chamada aninhada resolve como o OWNER da fn).
REVOKE EXECUTE ON FUNCTION
  public.check_ciencia_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;

-- enforce_report_schedule_authorship / pgaudit_*: funções de
-- trigger/event-trigger — ninguém as invoca diretamente.
REVOKE ALL ON FUNCTION public.enforce_report_schedule_authorship()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pgaudit_ddl_command_end()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pgaudit_sql_drop()
  FROM PUBLIC, anon, authenticated;

-- rls_tenant_or_admin: predicado de policies (authenticated).
-- A migration 20260719100000 já revogava de anon — produção
-- perdeu esse revogação no drift de ledger.
REVOKE EXECUTE ON FUNCTION public.rls_tenant_or_admin(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rls_tenant_or_admin(uuid)
  TO authenticated, service_role;

-- ------------------------------------------------------------
-- 3) Policies driftadas — estado final das correções antigas
-- ------------------------------------------------------------

-- taxas_cambio: catálogo nunca lido por código (I-producao); as
-- policies públicas ("Public can view exchange rates") já tinham
-- sido substituídas por leitura autenticada em 20260719120000,
-- mas produção ficou com as duas versões abertas.
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "Users can view exchange rates" ON public.taxas_cambio;
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "Public can view exchange rates" ON public.taxas_cambio;
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "taxas_cambio_authenticated_select" ON public.taxas_cambio;
CREATE POLICY "taxas_cambio_authenticated_select"
  ON public.taxas_cambio FOR SELECT TO authenticated
  USING (true);

-- periodos_ponto: produção manteve "Authenticated can read
-- periodos_ponto" (qual=true — qualquer logado lê períodos de
-- TODAS as empresas) em vez da policy tenant que 20260810000000
-- criou. Reaplicação defensiva (mesma checagem de coluna).
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "Authenticated can read periodos_ponto" ON public.periodos_ponto;
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "periodos_ponto_tenant_all" ON public.periodos_ponto;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='periodos_ponto' AND column_name='colaborador_id') THEN
    EXECUTE $pol$
      CREATE POLICY "periodos_ponto_tenant_all" ON public.periodos_ponto
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.colaboradores c
            WHERE c.id = periodos_ponto.colaborador_id
              AND c.empresa_id = public.get_auth_empresa_id()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.colaboradores c
            WHERE c.id = periodos_ponto.colaborador_id
              AND c.empresa_id = public.get_auth_empresa_id()
          )
        )
    $pol$;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='periodos_ponto' AND column_name='empresa_id') THEN
    EXECUTE $pol$
      CREATE POLICY "periodos_ponto_tenant_all" ON public.periodos_ponto
        FOR ALL TO authenticated
        USING (empresa_id = public.get_auth_empresa_id())
        WITH CHECK (empresa_id = public.get_auth_empresa_id())
    $pol$;
  ELSE
    RAISE EXCEPTION 'periodos_ponto sem colaborador_id/empresa_id — schema inesperado, abortando por segurança';
  END IF;
END $$;

-- provisao_auditoria: "Gestores podem ver auditoria de provisão"
-- com USING(true) vazava a trilha de auditoria de provisões
-- (valores anteriores/novos de folha) para qualquer autenticado.
-- 20260728201706 já tinha a versão por papel; produção nunca a
-- recebeu.
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "Gestores podem ver auditoria de provisão" ON public.provisao_auditoria;
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "Auditoria de provisao para perfis internos" ON public.provisao_auditoria;
CREATE POLICY "Auditoria de provisao para perfis internos"
  ON public.provisao_auditoria FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  );
