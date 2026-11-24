-- ============================================================
-- CORREÇÃO 2: INDIVIDAS internas/cron/trigger/PII — service_role only
-- ============================================================
DO $$
DECLARE fn_list text[] := ARRAY[
  'dp_encrypt_pii','dp_decrypt_pii','dp_hash_pii','dp_catalog_pii','dp_track_pii_access',
  'dp_has_role','dp_require_role','dp_check_log_rotation','dp_check_rls_index_coverage',
  'dp_connection_health','dp_create_next_partition','dp_missing_indexes','dp_post_migration_check',
  'dp_pre_deploy_gate','dp_run_retention','dp_audit_log_immutable','dp_audit_log_prevent_future',
  'auto_vincular_admins_empresa','enforce_afastamento_hash','enforce_aso_hash',
  'enforce_batida_ponto_hash','enforce_cat_hash','enforce_cnab_remessa_hash',
  'enforce_documento_assinatura_hash','enforce_epi_entrega_hash','enforce_esocial_evento_hash',
  'enforce_ferias_hash','enforce_folha_pagamento_hash','enforce_holerite_signed_hash',
  'enforce_log_retention','enforce_medida_disciplinar_hash','trg_audit_status_change',
  'trg_contab_msg_bump_thread','trg_contrato_token_auditar','trg_detect_status_anomaly',
  'trg_ferias_gerar_rubricas','trg_ferias_reconciliacao_alert','trg_medida_aplicada_integrar',
  'trg_medida_contestacao_notify','trg_medida_contestacao_notify_after','trg_medida_esocial_on_aplicada',
  'handle_new_user','handle_new_user_role','fn_alert_severe_disciplinary_measure',
  'fn_audit_biometric_failure','fn_auto_generate_training_certificate','fn_consolidar_batidas',
  'fn_create_default_onboarding_tasks','fn_enqueue_notification','fn_recalcular_dobra_e_alertas',
  'fn_trigger_whatsapp_on_event','fn_update_admissao_checklist','fn_update_candidatura_history',
  'fn_validar_medida_disciplinar_clt','fn_workflow_admissao_auto','pgaudit_ddl_command_end',
  'pgaudit_sql_drop','process_audit_log','process_ferias_audit','fwd_to_audit_unified',
  'log_audit_change','log_despesa_status_change','log_esocial_transmission',
  'registrar_auditoria_contratual','registrar_auditoria_ponto','_purge_audit_log_internal',
  'purge_audit_log_old','purge_expired_idempotency_keys','purge_expired_security_data',
  'purge_old_lock_conflicts','maintenance_archive_old_audit','maintenance_weekly_analyze',
  'notificar_ferias_pagamento_d5','notificar_ferias_reconciliacao_sla_baixo',
  'purgar_ferias_reconciliacao_logs_antigos','process_lgpd_cleanup_queue',
  'processar_auditoria_premiacao','refresh_dashboard_mvs','contrato_lembretes_pendentes',
  'contratos_alertar_vencimentos','contratos_enviar_lembretes_assinatura',
  'check_idempotency_anomalies','check_processamento_timeout','_scan_status_anomalies_global',
  'gerar_alertas_preditivos_ia','gerar_qr_extintor','update_extintor_status_vencimento',
  'limpar_govbr_states_expirados','detectar_fraude_ponto','admin_list_security_definer_rpcs'
]; r record;
BEGIN
  FOR r IN SELECT n.nspname AS s, p.proname, pg_get_function_identity_arguments(p.oid) AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.proname = ANY(fn_list) AND n.nspname='public' AND p.prokind='f'
      AND (has_function_privilege('anon', p.oid, 'EXECUTE')
           OR has_function_privilege('authenticated', p.oid, 'EXECUTE')) LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', r.s, r.proname, r.sig);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FALHOU %.%: %', r.s, r.proname, SQLERRM; END;
  END LOOP;
END $$;
