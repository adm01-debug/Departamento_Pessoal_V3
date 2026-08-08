-- ============================================================
-- CORREÇÃO 1: INDIVIDAS que o FRONT chama autenticado
-- REVOKE anon/PUBLIC + GRANT authenticated (guard interno já existe)
-- ============================================================
DO $$
DECLARE fn_list text[] := ARRAY[
  'admin_set_user_role','admin_list_user_roles','_is_admin_bypass','get_user_roles',
  'get_user_default_empresa','aprovar_despesa','rejeitar_despesa','pagar_desligamento',
  'assinar_desligamento','assinar_aviso_ferias','assinar_espelho_ponto','verificar_espelho_ponto',
  'revogar_espelho_ponto','registrar_pagamento_ferias','solicitar_adiantamento_13_ferias',
  'registrar_comunicado_ferias_coletivas','gerar_rubricas_ferias','contrato_gerar_token_assinatura',
  'contrato_revogar_token','contrato_estender_expiracao','contrato_montar_variaveis',
  'contrato_resolver_template','contrato_token_evento_registrar','aplicar_medida_folha_ponto',
  'medida_aprovar','medida_rejeitar','medida_arquivar','medida_contestar',
  'medida_responder_contestacao','medida_enviar_aprovacao','medida_gerar_link_ciencia',
  'sugerir_proxima_medida','consumir_pendencias_medida_no_holerite','enfileirar_esocial_medida_disciplinar',
  'medidas_analytics_reincidencia','registrar_batida_ponto','processar_ajuste_aprovado',
  'programacao_ferias_mover','programacao_ferias_aprovar_gestor','programacao_ferias_aprovar_rh',
  'programacao_ferias_rejeitar','programacao_ferias_converter','reconciliar_afdt',
  'resolver_divergencia_afdt','criar_batida_da_divergencia_afdt','associar_pis_colaborador_afdt',
  'notificar_divergencias_afdt','reconciliar_ferias_folha_batch','gerar_canonical_espelho_ponto',
  'garantir_rubrica_suspensao','sst_cat_dashboard','sst_dashboard_sla','sst_extintores_dashboard',
  'sst_regimento_assinar','sst_regimento_dashboard','sst_regimento_pendentes_lista',
  'sst_regimento_publicar','sst_regimento_notificar_pendentes','search_audit_unified',
  'get_audit_trail_by_entity','get_audit_trail_by_user','get_security_alerts_summary',
  'resolve_security_alert','get_cron_jobs_health','get_dlq_stats','get_idempotency_health',
  'get_query_telemetry','folha_conflict_stats','log_frontend_error','next_cnab_sequencial',
  'anonimizar_dados_pessoais','fn_link_gov_br_account','get_colaborador_banco_horas',
  'validar_contrato_clt','validate_ponto_compliance','user_empresa_id'
]; r record;
BEGIN
  FOR r IN SELECT n.nspname AS s, p.proname, pg_get_function_identity_arguments(p.oid) AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE p.proname = ANY(fn_list) AND n.nspname='public' AND p.prokind='f'
      AND has_function_privilege('anon', p.oid, 'EXECUTE') LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', r.s, r.proname, r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', r.s, r.proname, r.sig);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FALHOU %.%: %', r.s, r.proname, SQLERRM; END;
  END LOOP;
END $$;
