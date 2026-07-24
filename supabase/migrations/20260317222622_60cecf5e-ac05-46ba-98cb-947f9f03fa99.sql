
-- Fix views: set security_invoker = true
ALTER VIEW IF EXISTS public.vw_colaboradores_completo SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_batidas_dia SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_batidas_resumo SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_ferias_resumo SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_alertas_rh SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_banco_horas_saldo SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_cadastro_incompleto SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_folha_ponto_mensal SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_kpi_ponto_resumo SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_saldo_compensacao_mensal SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_kpi_beneficios_custo SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_kpi_absenteismo SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_kpi_turnover SET (security_invoker = true);
ALTER VIEW IF EXISTS public.pontos_abertos SET (security_invoker = true);

-- Fix jornadas_horarios
DROP POLICY IF EXISTS "jh_sel" ON public.jornadas_horarios;
CREATE POLICY "jh_sel" ON public.jornadas_horarios FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Fix bitrix24_config - admin only
DROP POLICY IF EXISTS "bitrix24_config_select" ON public.bitrix24_config;
DROP POLICY IF EXISTS "bitrix24_config_insert" ON public.bitrix24_config;
DROP POLICY IF EXISTS "bitrix24_config_update" ON public.bitrix24_config;
DROP POLICY IF EXISTS "Usuários autenticados podem ver bitrix24_config" ON public.bitrix24_config;
DROP POLICY IF EXISTS "Admins can manage bitrix24_config" ON public.bitrix24_config;
CREATE POLICY "Admins can manage bitrix24_config" ON public.bitrix24_config FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Fix logs_integracoes - admin only
DROP POLICY IF EXISTS "auth_logs_integracoes" ON public.logs_integracoes;
DROP POLICY IF EXISTS "Admins can view logs_integracoes" ON public.logs_integracoes;
CREATE POLICY "Admins can view logs_integracoes" ON public.logs_integracoes FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can insert logs_integracoes" ON public.logs_integracoes;
CREATE POLICY "Admins can insert logs_integracoes" ON public.logs_integracoes FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- Fix bitrix24_sync_logs - admin only
DROP POLICY IF EXISTS "Usuários autenticados podem ver logs bitrix24" ON public.bitrix24_sync_logs;
DROP POLICY IF EXISTS "Admins can view bitrix24_sync_logs" ON public.bitrix24_sync_logs;
CREATE POLICY "Admins can view bitrix24_sync_logs" ON public.bitrix24_sync_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Fix relatorios_agendados - remove permissive INSERT
DROP POLICY IF EXISTS "Usuários autenticados podem criar agendamentos" ON public.relatorios_agendados;
