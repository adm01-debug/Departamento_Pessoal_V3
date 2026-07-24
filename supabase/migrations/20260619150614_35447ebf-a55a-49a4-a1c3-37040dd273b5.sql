-- ============================================================
-- 1) Restaurar políticas em tabelas que ficaram sem RLS após drops
-- ============================================================
DROP POLICY IF EXISTS "Simulacoes scoped by empresa" ON public.simulacoes_fiscais;
CREATE POLICY "Simulacoes scoped by empresa" ON public.simulacoes_fiscais FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "GovBR state service only" ON public.govbr_auth_state;
CREATE POLICY "GovBR state service only" ON public.govbr_auth_state FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 2) Restringir política de telemetria
-- ============================================================
DROP POLICY IF EXISTS "Telemetria inserível por service_role" ON public.query_telemetry;
DROP POLICY IF EXISTS "Telemetria insert service role" ON public.query_telemetry;
CREATE POLICY "Telemetria insert service role" ON public.query_telemetry FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================================
-- 3) Revogar EXECUTE de funções trigger SECURITY DEFINER
--    (Postgres dispara triggers internamente; não precisam ser callable)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.check_processamento_timeout() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_alert_severe_disciplinary_measure() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_audit_biometric_failure() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_auto_generate_training_certificate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_consolidar_batidas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_create_default_onboarding_tasks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_enqueue_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_whatsapp_on_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_update_admissao_checklist() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_update_candidatura_history() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_workflow_admissao_auto() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_esocial_transmission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_ferias_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.processar_auditoria_premiacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_auditoria_contratual() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_auditoria_ponto() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_ponto_compliance() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4) Revogar EXECUTE de jobs de manutenção (apenas service_role/cron)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.gerar_alertas_preditivos_ia() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.limpar_govbr_states_expirados() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.detectar_fraude_ponto(uuid, uuid, numeric, numeric, timestamptz) FROM PUBLIC, anon, authenticated;