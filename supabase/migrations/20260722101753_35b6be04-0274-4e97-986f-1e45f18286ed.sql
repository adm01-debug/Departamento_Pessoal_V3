-- Etapa 1: revogar EXECUTE de `authenticated` em RPCs SECURITY DEFINER que
-- são administrativas, apenas-trigger, ou de uso interno de edge functions.
-- As demais permanecem acessíveis a usuários autenticados (necessárias ao app).

DO $$
DECLARE
  targets text[] := ARRAY[
    -- trigger-only (nunca chamadas via RPC pelo cliente)
    'public.log_despesa_status_change()',
    'public.trg_contab_msg_bump_thread()',
    'public.update_extintor_status_vencimento()',
    'public.gerar_qr_extintor()',
    'public.calcular_prazo_cat()',
    -- admin-only (já validam role internamente)
    'public.admin_list_security_definer_rpcs()',
    'public.admin_list_user_roles()',
    'public.admin_set_user_role(uuid, app_role)',
    'public.get_cron_jobs_health()',
    'public.get_dlq_stats()',
    'public.get_idempotency_health()',
    'public.get_query_telemetry(integer)',
    'public.get_security_alerts_summary(integer)',
    'public.folha_conflict_stats(integer)',
    'public.resolve_security_alert(uuid, text)',
    'public.resolve_security_alert(uuid)',
    'public.sst_regimento_notificar_pendentes(uuid)',
    'public.sst_regimento_publicar(uuid)',
    'public.sst_regimento_pendentes_lista(uuid)',
    'public.sst_regimento_dashboard(uuid)',
    'public.sst_dashboard_sla(uuid)',
    'public.sst_cat_dashboard(uuid)',
    'public.sst_extintores_dashboard(uuid)',
    'public.notificar_divergencias_afdt(uuid)',
    'public.reconciliar_afdt(uuid, integer)',
    -- backend-only (chamadas por edge functions/service_role)
    'public.next_cnab_sequencial(uuid, text)',
    'public.log_frontend_error(text, text, jsonb)',
    'public.check_login_lock(text, text)',
    'public.record_failed_login(text, text)',
    'public.reset_login_attempts(text, text)'
  ];
  fn text;
BEGIN
  FOREACH fn IN ARRAY targets LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated, anon, public', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Função inexistente, ignorada: %', fn;
    END;
  END LOOP;
END$$;