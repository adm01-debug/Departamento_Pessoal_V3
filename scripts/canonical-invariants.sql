SELECT jsonb_build_object(
  'ledger_count', (
    SELECT count(*) FROM supabase_migrations.schema_migrations
    WHERE version IN ('20261012120000','20261013140000','20261014120000','20261013150000','20261013151000','20261013152000','20261014160000','20261014170000','20261015160000','20261015170000','20261018120000','20261018130000','20261018140000','20261018150000','20261018160000','20261018170000','20261018200000','20261019000000','20261020000000','20261021000000','20261021010000','20261022000000','20261023000000','20261024000000','20261027000000','20261027120000','20261028120000','20261028130000','20261029000000')
  ),
  'notificacoes_chk_wide', EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_notificacoes_tipo'
      AND pg_get_constraintdef(oid) LIKE '%ferias_pagamento_d5%'
  ),
  'logs_sistema_unlocked', NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.logs_sistema'::regclass AND NOT tgisinternal
      AND tgname IN ('trg_logs_sistema_no_delete','trg_logs_sistema_no_update')
  ),
  'elr_uses_created_at', NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'enforce_log_retention'
      AND p.prosrc LIKE '%attempted_at%'
  ),
  'd5_fn_uses_contexto', EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'notificar_ferias_pagamento_d5'
      AND p.prosrc LIKE '%nivel, mensagem, contexto%'
  ),
  'auto_purge_allowed', EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_log_acao_check'
      AND pg_get_constraintdef(oid) LIKE '%AUTO_PURGE%'
  ),
  'onda3b_jobs_ok', (
    SELECT count(*) FROM cron.job WHERE jobname IN (
      'audit_log_monthly_purge','cleanup-ciencia-rate-limits',
      'cleanup-logs-sistema-daily','dp-health-snapshot',
      'dp-log-rotation-check','dp-partition-monthly',
      'dp-retention-anonymize-90d','dp-retention-delete-730d',
      'ferias-recalcular-dobra-diario','gerar-alertas-preditivos-ia-daily',
      'lovable-audit-retention-daily','lovable-log-retention',
      'notificar-ferias-pagamento-d5','purgar_ferias_reconciliacao_logs_diario',
      'lgpd-retention-dry-run'
    )
  ),
  'onda3b_dupes_gone', NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname IN (
      'update-despesa-updated-at-daily','check-idempotency-anomalies-hourly',
      'cleanup-old-logs-weekly','purge-idempotency-keys-daily',
      'lovable-ia-provisao-alertas','gerar-alertas-ia-diario',
      'ia-provisao-alertas-diario'
    )
  ),
  'cron_fix_fns_ok', (
    SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'purge_rate_limits','fn_atualizar_status_ferias_diario',
      'drenar_fila_limpeza_lgpd','process_lgpd_cleanup_queue'
    )
  ),
  'ferias_daily_no_direct_concluida', NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_atualizar_status_ferias_diario'
      AND p.prosrc LIKE '%status = ''aprovada''%data_fim%'
  ),
  'cron_jobs_ok', (
    SELECT count(*) FROM cron.job
    WHERE jobname IN ('ferias-atualizar-status-diario','lgpd-fila-drenagem-daily')
  ),
  'ferias_job_uses_wrapper', EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'ferias-atualizar-status-diario'
      AND command LIKE '%fn_atualizar_status_ferias_diario%'
  ),
  'holerite_sync_trigger_ok', EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_holerite_folha_item'
      AND tgrelid = 'public.folha_itens'::regclass AND NOT tgisinternal
  ),
  'notify_fn_fixed', NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_enqueue_notification'
      AND p.prosrc LIKE '%NEW.competencia%'
  ),
  'self_read_requires_closed', EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'holerites'
      AND policyname = 'holerites_self_read' AND qual LIKE '%fechada%'
  ),
  'cnab_seq_table_ok', to_regclass('public.cnab_sequencias') IS NOT NULL,
  'cnab_remessa_uniq_ok', to_regclass('public.cnab_remessas_empresa_folha_uniq') IS NOT NULL,
  'check_constraints_count', (
    SELECT count(*) FROM pg_constraint WHERE conname IN (
      'ferias_datas_coerentes','batidas_precisao_positiva',
      'emprestimos_valor_total_positivo','benef_colab_vigencia_coerente',
      'faixas_maximo_coerente','candidaturas_nota_faixa',
      'promocoes_salarios_nao_negativos'
    )
  ),
  'search_path_ok', EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'contrato_assinar_por_token'
      AND p.pronargs = 5
      AND array_to_string(p.proconfig, ',') LIKE '%extensions%'
  ),
  'rls_helper_ok', to_regproc('public.rls_tenant_or_admin') IS NOT NULL,
  'admin_list_ok', to_regproc('public.admin_list_profiles') IS NOT NULL,
  'get_admin_ids_ok', to_regproc('public.get_empresa_admin_ids') IS NOT NULL,
  'competencia_fmt_ok', EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'folhas_pagamento_competencia_fmt'
  ),
  'legacy_rls_missing', (
    SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT c.relrowsecurity
      AND c.relname IN ('eventos_rh','folha_pagamento','ponto_registros','rubricas')
  ),
  'token_helper_locked', NOT has_function_privilege(
    'anon', 'public._admissao_token_row(text)', 'EXECUTE'
  ),
  'is_admin_self_scoped', EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
      AND p.prosrc LIKE '%auth.uid() IS NULL%'
  ),
  'is_admin_anon_locked', NOT has_function_privilege(
    'anon', 'public.is_admin(uuid)', 'EXECUTE'
  ),
  'scope_fn_anon_locked', NOT has_function_privilege(
    'anon', 'public.get_user_scope_empresas(uuid)', 'EXECUTE'
  ),
  'auditoria_empresa_col', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'provisao_auditoria'
      AND column_name = 'empresa_id'
  ),
  'auditoria_tenant_trigger', EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_provisao_auditoria_empresa'
      AND tgrelid = 'public.provisao_auditoria'::regclass
      AND NOT tgisinternal
  ),
  'auditoria_policy_scoped', EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'provisao_auditoria'
      AND policyname = 'Auditoria de provisao para perfis internos'
      AND qual LIKE '%empresa_id%'
  ),
  'taxas_policy_auth', EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'taxas_cambio'
      AND policyname = 'taxas_cambio_authenticated_select'
  ),
  'auditoria_no_permissive', NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'provisao_auditoria'
      AND NOT (policyname = 'Auditoria de provisao para perfis internos'
               AND roles = '{authenticated}'::name[] AND cmd = 'SELECT')
  ),
  'audit_fn_locked', NOT has_function_privilege(
    'anon', 'public.provisao_auditoria_set_empresa()', 'EXECUTE'
  ),
  'vinculo_col', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='colaboradores' AND column_name='user_id'
  ),
  'vinculo_fn_locked', NOT has_function_privilege(
    'anon', 'public.vincular_colaborador_ao_usuario()', 'EXECUTE'
  ) AND to_regprocedure('public.vincular_colaborador_ao_usuario()') IS NOT NULL,
  'doc_empresa_col', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='documentos' AND column_name='empresa_id'
  ),
  'lgpd_fns_locked', to_regprocedure('public.run_lgpd_purge(boolean)') IS NOT NULL
    AND to_regprocedure('public.drenar_fila_limpeza_lgpd(integer)') IS NOT NULL
    AND NOT has_function_privilege('anon','public.run_lgpd_purge(boolean)','EXECUTE')
    AND NOT has_function_privilege('anon','public.drenar_fila_limpeza_lgpd(integer)','EXECUTE'),
  'banco_enc_cols', (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND column_name LIKE '%\_encrypted'
      AND table_name IN ('contas_bancarias','pix_itens')) = 5,
  'banco_view_scoped', to_regclass('public.contas_bancarias_decrypted') IS NOT NULL,
  'taxas_no_permissive', NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'taxas_cambio'
      AND NOT (policyname = 'taxas_cambio_authenticated_select'
               AND roles = '{authenticated}'::name[] AND cmd = 'SELECT')
  ),
  'periodos_no_for_all', NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'periodos_ponto'
      AND policyname = 'auth_periodos_ponto'
  ),
  'onda4c_vinculo_unambiguous', pg_get_functiondef(
    'public.vincular_colaborador_ao_usuario()'::regprocedure
  ) LIKE '%email_confirmed_at%',
  'onda4c_no_guc_fallback', pg_get_functiondef(
    'public.encrypt_dados_bancarios(text)'::regprocedure
  ) NOT LIKE '%app.encryption_key%',
  'onda4c_purge_resets_guc', pg_get_functiondef(
    'public.run_lgpd_purge(boolean)'::regprocedure
  ) LIKE '%audit_log_purge%, %off%',
  'onda4c_docs_rh_policy', EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documentos'
      AND policyname = 'documentos_rh_empresa_manage'
  ),
  'onda4c_ledger_repaired', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20260809000000' -- lote p0_001_rls_batch_1 (repair)
  ),
  'onda4d_vinculo_counts_all', pg_get_functiondef(
    'public.vincular_colaborador_ao_usuario()'::regprocedure
  ) LIKE '%AND c.user_id IS NULL%',
  'onda4d_sync_trigger', EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_empresa_colaborador'
      AND tgrelid = 'public.documentos'::regclass
      AND NOT tgisinternal
  ),
  'onda4d_stmts_recorded', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261018120000'
      AND statements IS NOT NULL AND cardinality(statements) > 0
  )
) ||
jsonb_build_object(
  'onda4e_objs', (
    SELECT count(*) FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('health_checks','cbo','cnae','faixas_irrf','faixas_inss',
                        'mv_folha_summary','v_login_anomalies')
  ),
  'onda4e_mv_filled', EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'mv_folha_summary'
      AND ispopulated
  ),
  'onda4e_stmts_recorded', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261018130000'
      AND statements IS NOT NULL AND cardinality(statements) > 0
  ),
  'onda5_cols', (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'registros_ponto'
      AND column_name IN ('horas_extras_50','horas_extras_100',
                          'horas_noturnas','he_banco_horas')
  ),
  'onda5_stmts_recorded', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261018140000'
      AND statements IS NOT NULL AND cardinality(statements) > 0
  ),
  'rescisao_detalhes_col', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'desligamentos'
      AND column_name = 'detalhes_calculo'
  ),
  'rescisao_stmts_recorded', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261018150000'
      AND statements IS NOT NULL AND cardinality(statements) > 0
  ),
  'colab_metadata_col', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'colaboradores'
      AND column_name = 'metadata'
  ),
  'decrypt_wrapper_ok', to_regprocedure(
    'public.decrypt_dados_bancarios_tenant(text,uuid)') IS NOT NULL,
  'ferias_chk_wide', EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ferias'::regclass
      AND conname = 'chk_ferias_status'
      AND pg_get_constraintdef(oid) LIKE '%programada%'
  ),
  'qa3_stmts_recorded', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261019000000'
      AND statements IS NOT NULL AND cardinality(statements) > 0
  ),
  'ci_auditor_role', EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'ci_auditor' AND rolcanlogin
  ),
  'idem_dup_job_gone', NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'check-idempotency-anomalies'
  ),
  'idem_hourly_job_ok', EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'check_idempotency_anomalies_hourly' AND active
  ),
  'pix_lote_cols', (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pix_lotes'
      AND column_name IN ('folha_id','arquivo_lote')
  ),
  'espelho_revogado_col', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ponto_espelhos_assinados'
      AND column_name = 'revogado_em'
  ),
  'espelho_idx_partial', EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_espelho_colab_competencia'
      AND indexdef LIKE '%revogado_em IS NULL%'
  ),
  'desl_guard_detalhes', pg_get_functiondef(
    'public.impedir_alteracao_desligamento_homologado()'::regprocedure
  ) LIKE '%detalhes_calculo%',
  'qa5_stmts_recorded', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261022000000'
      AND statements IS NOT NULL AND cardinality(statements) > 0
  ),
  'espelho_guard_fn', EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'ponto_espelhos_assinados'
      AND t.tgname = 'trg_ponto_espelhos_assinados_no_update'
      AND p.proname = 'ponto_espelhos_assinados_guard_update'
  ),
  'qa_r4_stmts_recorded', EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261024000000'
      AND statements IS NOT NULL AND cardinality(statements) > 0
  ),
  'sec_cron_jobs_ok', (
    SELECT count(*) FROM cron.job
    WHERE jobname IN (
      'sec-audit-policies-daily',
      'sec-policy-regressions-purge',
      'sec-verify-seals-weekly'
    )
  ) = 3,
  'orphan_secdef_revoked', NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'versao_consolidada_avaliacao',
        'training_images_track_outcomes'
      )
      AND (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ),
  'sec_fns_ok', (
    SELECT count(*) FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'sec_audit_policies','sec_audit_policies_scan',
        'sec_policy_regressions_purge',
        'sec_verify_seals','sec_verify_seals_admin',
        'sec_verify_seals_scan'
      )
  ) = 6,
  'registros_ponto_gated', NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'registros_ponto'
      AND policyname = 'tenant_registros_ponto'
  ) AND EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'registros_ponto'
      AND policyname = 'registros_ponto_write'
      AND qual LIKE '%sou_o_colaborador%'
  ),
  'desl_delete_blocks_pago', pg_get_functiondef(
    'public.proibir_delete_desligamento_homologado()'::regprocedure
  ) LIKE '%pago%',
  'folha_delete_blocks_paga', pg_get_functiondef(
    'public.proibir_delete_folha_fechada()'::regprocedure
  ) LIKE '%paga%',
  'contas_admin_bypass', EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contas_bancarias'
      AND policyname = 'contas_bancarias_rh_manage'
      AND qual LIKE '%is_admin%'
  ),
  'anonimizar_latest', pg_get_functiondef(
    'public.anonimizar_dados_pessoais(uuid)'::regprocedure
  ) LIKE '%lgpd-anon%',
  'gaps_v2_parametros_manage', EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'parametros_sistema'
      AND policyname = 'parametros_sistema_tenant_manage'
      AND qual LIKE '%rls_tenant_or_admin%'
  ),
  'gaps_v2_faltas_trigger', EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.faltas'::regclass
      AND tgname = 'trg_faltas_sync_faltas_periodo'
  ),
  'gaps_v2_afd_table', EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'afd_geracoes'
      AND policyname = 'afd_geracoes_insert_membros'
  )
);
