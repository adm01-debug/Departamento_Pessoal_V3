
-- 1. Fix config_alertas_indicadores - admin only for writes
DROP POLICY IF EXISTS "config_alertas_insert" ON public.config_alertas_indicadores;
DROP POLICY IF EXISTS "config_alertas_update" ON public.config_alertas_indicadores;
DROP POLICY IF EXISTS "Admins can insert config_alertas" ON public.config_alertas_indicadores;
CREATE POLICY "Admins can insert config_alertas" ON public.config_alertas_indicadores
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update config_alertas" ON public.config_alertas_indicadores;
CREATE POLICY "Admins can update config_alertas" ON public.config_alertas_indicadores
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- 2. Fix historico_alertas - admin only for insert
DROP POLICY IF EXISTS "Authenticated users can insert historico_alertas" ON public.historico_alertas;
DROP POLICY IF EXISTS "Admins can insert historico_alertas" ON public.historico_alertas;
CREATE POLICY "Admins can insert historico_alertas" ON public.historico_alertas
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- 3. Fix jornadas_horarios - remove redundant jh_sel
DROP POLICY IF EXISTS "jh_sel" ON public.jornadas_horarios;

-- 4. Fix bitrix24_config - remove old SELECT
DROP POLICY IF EXISTS "Usuários autenticados podem ver config bitrix24" ON public.bitrix24_config;

-- 5. Fix configuracoes - admin-only SELECT
DROP POLICY IF EXISTS "Authenticated can read configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Admins can read configuracoes" ON public.configuracoes;
CREATE POLICY "Admins can read configuracoes" ON public.configuracoes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 6. Fix log_envio_relatorios - scope via relatorios_agendados.empresa_id
DROP POLICY IF EXISTS "log_envio_relatorios_select" ON public.log_envio_relatorios;
DROP POLICY IF EXISTS "Authenticated can view log_envio_relatorios" ON public.log_envio_relatorios;

-- Check what policies exist
DROP POLICY IF EXISTS "Tenant scoped log_envio_relatorios" ON public.log_envio_relatorios;
CREATE POLICY "Tenant scoped log_envio_relatorios" ON public.log_envio_relatorios
  FOR SELECT TO authenticated
  USING (agendamento_id IN (SELECT id FROM public.relatorios_agendados WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))));
