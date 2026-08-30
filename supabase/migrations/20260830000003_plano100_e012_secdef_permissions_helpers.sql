-- ============================================================================
-- PLANO_100 · E-012 · [P0] · banco — `get_my_permissions` / `get_user_tenants`
-- com definer seguro
-- ----------------------------------------------------------------------------
-- A auditoria encontrou essas funções em produção sem garantia de search_path
-- fixo e sem revogação de EXECUTE de anon (drift: não existem no repo).
-- Esta migration as (re)cria na forma endurecida:
--   * SECURITY DEFINER + SET search_path = public, pg_catalog (anti-hijack)
--   * Escopo estrito ao chamador: só devolve dados de auth.uid() — nunca de
--     um id vindo por parâmetro (elimina o IDOR por parâmetro)
--   * REVOKE de PUBLIC/anon; EXECUTE apenas para authenticated
-- Fail-loud proposital: se objetos dependentes (policies) referenciarem as
-- funções antigas, o DROP sem CASCADE aborta a migration em preview — que é
-- exatamente o comportamento desejado antes da promoção (ver E-026).
-- ============================================================================

-- ── 1. get_my_permissions(): permissões do usuário autenticado ─────────────
DROP FUNCTION IF EXISTS public.get_my_permissions();

CREATE FUNCTION public.get_my_permissions()
RETURNS TABLE(permissao text, papel text, empresa_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN; -- anon: conjunto vazio (fail-closed)
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(ur.papel, ur.role::text) AS permissao,
    COALESCE(ur.papel, ur.role::text) AS papel,
    ur.empresa_id
  FROM public.user_empresas ur
  WHERE ur.user_id = v_uid;
EXCEPTION
  -- Se a tabela/colunas divergirem por drift, fail-closed (vazio) em vez de
  -- vazar estrutura via erro para o chamador.
  WHEN undefined_table OR undefined_column THEN
    RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_my_permissions() IS
  'E-012: permissões/papéis do usuário autenticado. Definer seguro (search_path fixo), escopo = auth.uid(), sem parâmetro de id (anti-IDOR).';

REVOKE ALL ON FUNCTION public.get_my_permissions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_permissions() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;

-- ── 1b. Anti-drift: sobrecargas legadas com argumentos ────────────────────
-- `DROP FUNCTION ...()` acima só remove a variante sem argumentos. Produção
-- pode conter sobrecargas antigas (ex.: get_my_permissions(uuid)) concedidas
-- a anon/authenticated — o IDOR que esta etapa elimina. Em vez de DROP cego
-- (poderia quebrar views/policies dependentes), revogamos EXECUTE de TODAS
-- as sobrecargas com argumentos desses dois nomes. Fail-safe idempotente.
DO $$
DECLARE
  sig text;
BEGIN
  FOR sig IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname,
                   pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_my_permissions', 'get_user_tenants')
      AND pg_get_function_identity_arguments(p.oid) <> ''  -- só as COM argumentos
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
    RAISE NOTICE 'E-012 anti-drift: EXECUTE revogado de %', sig;
  END LOOP;
END $$;

-- ── 2. get_user_tenants(): empresas às quais o usuário autenticado pertence ─
DROP FUNCTION IF EXISTS public.get_user_tenants();

CREATE FUNCTION public.get_user_tenants()
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN; -- fail-closed
  END IF;

  RETURN QUERY
  SELECT ur.empresa_id
  FROM public.user_empresas ur
  WHERE ur.user_id = v_uid;
EXCEPTION
  WHEN undefined_table OR undefined_column THEN
    RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_user_tenants() IS
  'E-012: tenants do usuário autenticado. Definer seguro, escopo = auth.uid(), sem parâmetro de id.';

REVOKE ALL ON FUNCTION public.get_user_tenants() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_tenants() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_tenants() TO authenticated;

-- Nota: o bloco anti-drift do §1 já cobre sobrecargas de get_user_tenants.

-- ── Verificação (preview) ──────────────────────────────────────────────────
-- SELECT prosecdef, proconfig FROM pg_proc
--  WHERE proname IN ('get_my_permissions','get_user_tenants');
-- -- esperado: prosecdef = true, proconfig contém search_path=public, pg_catalog
-- SELECT has_function_privilege('anon',
--   'public.get_my_permissions()'::regprocedure, 'EXECUTE'); -- false
-- SELECT has_function_privilege('authenticated',
--   'public.get_user_tenants()'::regprocedure, 'EXECUTE');   -- true
