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
-- Os REVOKE/GRANT abaixo são guardados por to_regprocedure: o
-- replay do Supabase Preview pode não ter as funções (drift de
-- ledger) e um REVOKE sobre fn inexistente aborta a migration.
DO $$
BEGIN
  IF to_regprocedure('public.clinicas_proximas(uuid,numeric,numeric,text,numeric,integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.clinicas_proximas(uuid, numeric, numeric, text, numeric, integer) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.clinicas_proximas(uuid, numeric, numeric, text, numeric, integer) TO authenticated, service_role';
  END IF;
END $$;

-- check_ciencia_rate_limit: helper interno de rate-limit chamado
-- por outras funções definer (o EXECUTE do caller externo não é
-- necessário — a chamada aninhada resolve como o OWNER da fn).
DO $$
BEGIN
  IF to_regprocedure('public.check_ciencia_rate_limit(text,text,integer,integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.check_ciencia_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- enforce_report_schedule_authorship / pgaudit_*: funções de
-- trigger/event-trigger — ninguém as invoca diretamente.
DO $$
BEGIN
  IF to_regprocedure('public.enforce_report_schedule_authorship()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.enforce_report_schedule_authorship() FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.pgaudit_ddl_command_end()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.pgaudit_ddl_command_end() FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.pgaudit_sql_drop()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.pgaudit_sql_drop() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;

-- rls_tenant_or_admin: predicado de policies (authenticated).
-- A migration 20260719100000 já revogava de anon — produção
-- perdeu esse revogação no drift de ledger.
DO $$
BEGIN
  IF to_regprocedure('public.rls_tenant_or_admin(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_tenant_or_admin(uuid) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rls_tenant_or_admin(uuid) TO authenticated, service_role';
  END IF;
END $$;

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

-- periodos_ponto: tabela system-level (competencia/datas/status,
-- SEM coluna de tenant por desenho — canonical_schema.sql).
-- A leitura por qualquer autenticado é o estado pretendido:
-- competências são calendário global, sem dado por empresa —
-- é o que baseline e produção já têm ("Authenticated can read").
-- O risco real é a policy permissiva legada "auth_periodos_ponto"
-- (FOR ALL: abriria INSERT/UPDATE/DELETE a qualquer logado,
-- ofuscando as policies admin-only). Não existe hoje em prod,
-- mas removemos defensivamente — se alguém a recriar, este
-- DROP documentado registra a intenção.
-- audit-migration-style: allow-silent-drop remove policy permissiva legada FOR ALL; leitura autenticada e writes admin-only já são o estado canônico
DROP POLICY IF EXISTS "auth_periodos_ponto" ON public.periodos_ponto;

-- provisao_auditoria: "Gestores podem ver auditoria de provisão"
-- com USING(true) vazava a trilha de auditoria de provisões
-- (valores anteriores/novos de folha) para qualquer autenticado.
-- A versão por papel de 20260728201706 ainda vazava cross-empresa:
-- has_role é papel GLOBAL, então um gestor da empresa A lia a
-- trilha da empresa B. Escopo correto: admin global OU
-- (rh|gestor E a provisão auditada pertence a uma empresa do
-- usuário — resolvido via provisoes_mensais.empresa_id, já que
-- provisao_auditoria não tem coluna de tenant).
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "Gestores podem ver auditoria de provisão" ON public.provisao_auditoria;
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "Auditoria de provisao para perfis internos" ON public.provisao_auditoria;
CREATE POLICY "Auditoria de provisao para perfis internos"
  ON public.provisao_auditoria FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      (
        public.has_role(auth.uid(), 'rh'::app_role)
        OR public.has_role(auth.uid(), 'gestor'::app_role)
      )
      AND EXISTS (
        SELECT 1
        FROM public.provisoes_mensais pm
        WHERE pm.id = provisao_auditoria.provisao_id
          AND pm.empresa_id IN (
            SELECT public.get_user_empresas(auth.uid())
          )
      )
    )
  );

-- ------------------------------------------------------------
-- 4) get_user_scope_empresas: preservar semântica original
--    Com is_admin auto-escopado, is_admin(_user_id) do ALVO
--    passaria a ser sempre falso quando um admin consulta o
--    escopo de OUTRO admin — a fn devolveria só os vínculos
--    explícitos em vez de todas as empresas ativas.
--    O caller já foi autorizado no guard acima (self OU admin);
--    o papel do alvo passa a ser avaliado por leitura interna
--    direta (a fn é SECDEF), sem reabrir a enumeração pública.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_scope_empresas(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  actor uuid := auth.uid();
  service_request boolean := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
BEGIN
  IF _user_id IS NULL OR (
    NOT service_request
    AND (actor IS NULL OR (actor <> _user_id AND NOT public.is_admin(actor)))
  ) THEN
    RAISE EXCEPTION 'user scope outside caller authorization' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT e.id FROM public.empresas AS e
  WHERE e.ativa IS TRUE AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
  )
  UNION
  SELECT ue.empresa_id FROM public.user_empresas AS ue WHERE ue.user_id = _user_id;
END
$function$;
REVOKE ALL ON FUNCTION public.get_user_scope_empresas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_scope_empresas(uuid) TO authenticated, service_role;
