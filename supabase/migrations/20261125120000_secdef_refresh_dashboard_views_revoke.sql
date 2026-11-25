-- ============================================================================
-- refresh_dashboard_views(): fecha o EXECUTE de anon/authenticated
-- ----------------------------------------------------------------------------
-- A 20260724140000_p4_072_mv_dashboards.sql cria a funcao como SECURITY
-- DEFINER (precisa, para REFRESH MATERIALIZED VIEW fora do dono) e nunca
-- revoga o EXECUTE. Como o Supabase concede EXECUTE a PUBLIC por padrao, ela
-- fica alcancavel por POST /rest/v1/rpc/refresh_dashboard_views com a chave
-- anon -- sem nenhuma checagem de tenant no corpo.
--
-- O gate scripts/audit-secdef-authz.mjs reprovou exatamente isso no canonico
-- (job "Integridade do banco canonico (live)"). Ela e rotina de cron/operacao,
-- nao de usuario final: o caminho correto e REVOKE, nao allowlist.
-- Aditiva e idempotente: so age se a funcao existir e nao toca em dados.
-- ============================================================================
DO $$
BEGIN
  IF to_regprocedure('public.refresh_dashboard_views()') IS NULL THEN
    RAISE NOTICE '[refresh_dashboard_views] ausente - nada a revogar';
    RETURN;
  END IF;

  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.refresh_dashboard_views() FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.refresh_dashboard_views() TO service_role';
END $$;
