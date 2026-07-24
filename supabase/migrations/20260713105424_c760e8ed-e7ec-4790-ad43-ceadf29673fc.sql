
-- Melhoria #16: Hardening RLS/GRANTS na tabela rate_limits e correlatas
-- Simulação de cenários considerada:
-- 1) anon tentando SELECT/INSERT via PostgREST -> deve receber permission denied (sem GRANT + policy false)
-- 2) authenticated tentando ler chaves de outros usuários -> deve receber permission denied
-- 3) service_role (edge functions) -> BYPASSRLS + GRANT ALL explícito garante operação
-- 4) role public herdando privilégios legados -> REVOKE ALL remove qualquer resíduo
-- 5) Novo role futuro -> policy USING(false) fecha por padrão

REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role only access" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_deny_all" ON public.rate_limits;

DROP POLICY IF EXISTS "rate_limits_deny_all_non_service" ON public.rate_limits;
CREATE POLICY "rate_limits_deny_all_non_service"
  ON public.rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated, public
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.rate_limits IS 'Rate limit tracking. Acessível apenas via service_role (edge functions). RLS FORCE + policy restritiva + sem GRANTs para anon/authenticated.';

-- Aplicar mesmo hardening em rate_limit_logs e rate_limit_config
REVOKE ALL ON TABLE public.rate_limit_logs FROM PUBLIC, anon;
GRANT ALL ON TABLE public.rate_limit_logs TO service_role;
ALTER TABLE public.rate_limit_logs FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rate_limit_config FROM PUBLIC, anon;
GRANT ALL ON TABLE public.rate_limit_config TO service_role;
ALTER TABLE public.rate_limit_config FORCE ROW LEVEL SECURITY;
