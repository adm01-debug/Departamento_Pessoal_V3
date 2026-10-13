-- Onda 3b — conserta os jobs/funções que SEGUIAM quebrando em produção,
-- diagnosticados via workflow canonical-sql-diag (13/10/2026):
--
--   notificar-ferias-pagamento-d5 : INSERT em notificacoes viola
--     chk_notificacoes_tipo (tipo 'ferias_pagamento_d5' fora da lista) e os
--     inserts de log usam colunas inexistentes (categoria/metadata).
--   cleanup-logs-sistema-daily / cleanup-old-logs-weekly : fn_cleanup_old_logs
--     faz DELETE em logs_sistema, bloqueado por triggers append-only
--     (trg_logs_sistema_no_delete/no_update) que NÃO existem em nenhuma
--     migration — drift aplicado à mão em produção.
--   lovable-log-retention : enforce_log_retention deleta
--     login_attempts.attempted_at; a coluna real é created_at.
--   audit_log_monthly_purge (job 9) : _purge_audit_log_internal insere
--     acao 'AUTO_PURGE', ausente de audit_log_acao_check.
--   lgpd-retention-dry-run : comando insere colaborador_id; a tabela
--     lgpd_fila_limpeza usa (tabela, registro_id).
--   H-AGD-02 : jobs de produção sem migration (dp-*, lovable-*, alertas)
--     passam a ser declarados aqui — repo e prod convergem.
--   Jobs duplicados/órfãos são desagendados.

SET client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- 1) logs_sistema: remove triggers append-only aplicadas fora de migration.
--    logs_sistema é log operacional (info/erro de runtime) com retenção de
--    30d — NÃO é trilha de auditoria (essa é a família audit_log*, protegida
--    por triggers próprios). Sem este DROP, fn_cleanup_old_logs falha todo dia.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_logs_sistema_no_delete ON public.logs_sistema;
DROP TRIGGER IF EXISTS trg_logs_sistema_no_update ON public.logs_sistema;

-- ---------------------------------------------------------------------------
-- 2) chk_notificacoes_tipo: a lista fechada não cobria os tipos reais que o
--    app e as funções gravam — todo insert desses tipos falhava (a tabela
--    está vazia em prod por causa disso). Lista canônica ampliada.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS chk_notificacoes_tipo;
ALTER TABLE public.notificacoes
  ADD CONSTRAINT chk_notificacoes_tipo CHECK (
    tipo IS NULL OR tipo IN (
      -- conjunto original
      'info','sucesso','aviso','erro','sistema','ponto','ferias','folha',
      'beneficio','documento','avaliacao','treinamento','admissao','desligamento',
      -- tipos genéricos gravados pelo app
      'alerta','aprovacao','tarefa','notificacao','ciencia','nova_admissao',
      'holerites','rescisao','pdi',
      -- férias
      'ferias_vencendo','ferias_aprovada','ferias_pagamento_d5',
      'ferias_reconciliacao','sla_reconciliacao_ferias','periodo_aquisitivo',
      -- contratos/documentos
      'contrato_vencendo','contrato_pendente','contrato_gerado',
      'contrato_assinatura_pendente','documento_vencendo',
      -- ponto / SST / disciplinar
      'ponto_aprovado','ponto_recusado','sem_batida','medida_aplicada',
      'regimento_sst_pendente','sst_regimento_pendente'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) notificar_ferias_pagamento_d5: logs em logs_sistema usam as colunas
--    reais (nivel, mensagem, contexto) — categoria/metadata não existem.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_ferias_pagamento_d5()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerta RECORD;
  v_user RECORD;
  v_count INT := 0;
  v_titulo TEXT;
  v_msg TEXT;
BEGIN
  FOR v_alerta IN
    SELECT id, empresa_id, colaborador_id, data_inicio, dias_ate_inicio, severidade
      FROM public.v_ferias_alerta_pagamento_d2
     WHERE severidade IN ('atencao','critico','violacao_grave')
  LOOP
    v_titulo := CASE v_alerta.severidade
      WHEN 'violacao_grave' THEN '🚨 Férias iniciada SEM pagamento (Art. 145 CLT)'
      WHEN 'critico'        THEN '⚠️ Pagamento de férias vence em ≤2 dias (Art. 145)'
      ELSE                       'ℹ️ Pagamento de férias vence em ≤5 dias'
    END;
    v_msg := format(
      'Colaborador %s — início %s (em %s dia(s)). Confirme o pagamento no painel de Férias.',
      v_alerta.colaborador_id, to_char(v_alerta.data_inicio, 'DD/MM/YYYY'), v_alerta.dias_ate_inicio
    );

    FOR v_user IN
      SELECT DISTINCT ur.user_id
        FROM public.user_roles ur
        JOIN public.user_empresas ue ON ue.user_id = ur.user_id
       WHERE ue.empresa_id = v_alerta.empresa_id
         AND ur.role IN ('admin','rh')
    LOOP
      INSERT INTO public.notificacoes (
        user_id, empresa_id, tipo, titulo, mensagem,
        entidade_tipo, entidade_id, data_referencia, lida
      ) VALUES (
        v_user.user_id, v_alerta.empresa_id, 'ferias_pagamento_d5',
        v_titulo, v_msg, 'ferias', v_alerta.id, CURRENT_DATE, false
      )
      ON CONFLICT DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
  VALUES ('info', format('Notificações Art.145 geradas: %s', v_count),
          jsonb_build_object('categoria', 'ferias_d5', 'executed_at', now(), 'count', v_count));

  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
  VALUES ('error', SQLERRM, jsonb_build_object('categoria', 'ferias_d5', 'sqlstate', SQLSTATE));
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_ferias_pagamento_d5() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notificar_ferias_pagamento_d5() TO service_role;

-- ---------------------------------------------------------------------------
-- 4) enforce_log_retention: login_attempts usa created_at (não attempted_at).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_log_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_audit_deleted BIGINT := 0;
  v_alerts_deleted BIGINT := 0;
  v_telemetry_deleted BIGINT := 0;
  v_metricas_deleted BIGINT := 0;
  v_login_deleted BIGINT := 0;
  v_result JSONB;
BEGIN
  -- 180d: audit_log_unified
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_log_unified') THEN
    DELETE FROM public.audit_log_unified WHERE occurred_at < (now() - INTERVAL '180 days');
    GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;
  END IF;

  -- 90d: alertas de segurança resolvidos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='security_alerts') THEN
    DELETE FROM public.security_alerts
      WHERE resolved = true AND COALESCE(resolved_at, created_at) < (now() - INTERVAL '90 days');
    GET DIAGNOSTICS v_alerts_deleted = ROW_COUNT;
  END IF;

  -- 30d: telemetria de queries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='query_telemetry') THEN
    DELETE FROM public.query_telemetry WHERE created_at < (now() - INTERVAL '30 days');
    GET DIAGNOSTICS v_telemetry_deleted = ROW_COUNT;
  END IF;

  -- 30d: métricas de processamento
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='metricas_processamento') THEN
    DELETE FROM public.metricas_processamento WHERE timestamp < (now() - INTERVAL '30 days');
    GET DIAGNOSTICS v_metricas_deleted = ROW_COUNT;
  END IF;

  -- 90d: tentativas de login (evita brute-force histórico inútil)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='login_attempts') THEN
    DELETE FROM public.login_attempts WHERE created_at < (now() - INTERVAL '90 days');
    GET DIAGNOSTICS v_login_deleted = ROW_COUNT;
  END IF;

  v_result := jsonb_build_object(
    'audit_log_unified', v_audit_deleted,
    'security_alerts_resolved', v_alerts_deleted,
    'query_telemetry', v_telemetry_deleted,
    'metricas_processamento', v_metricas_deleted,
    'login_attempts', v_login_deleted,
    'executed_at', now()
  );

  -- Registra o resultado
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='metricas_processamento') THEN
    INSERT INTO public.metricas_processamento (tipo, valor, metadata, timestamp)
    VALUES ('retention_cleanup', (v_audit_deleted + v_alerts_deleted + v_telemetry_deleted + v_metricas_deleted + v_login_deleted), v_result, now());
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_log_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_log_retention() TO service_role;

-- ---------------------------------------------------------------------------
-- 5) audit_log_acao_check: _purge_audit_log_internal registra sua própria
--    execução com acao 'AUTO_PURGE', ausente da lista — o job mensal de
--    purge falhava no INSERT de observabilidade. Mantida a lista canônica
--    de 20260912206000 + AUTO_PURGE.
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_acao_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_acao_check CHECK (
  acao IN (
    'INSERT', 'UPDATE', 'DELETE',
    'PAYROLL_CALC', 'PAYROLL_CALC_BLOCKED', 'PAYROLL_CLOSE', 'PAYROLL_REOPEN',
    'FERIAS_CALC', 'FERIAS_CANCEL', 'RESCISAO_CALC', 'PROVISOES_CALC',
    'ESOCIAL_SEND', 'DECIMO_CALC',
    'IDEMPOTENCY_REPLAY', 'IDEMPOTENCY_CONFLICT',
    'BACKUP_CREATED', 'BACKUP_FAILED',
    'CLOSE', 'REOPEN', 'BACKUP_RUN',
    'SYSTEM_ACTION', 'AUTH_ACTION',
    'EXPORT', 'IMPORT', 'VISUALIZACAO', 'EXECUTE_CALC', 'SIGN',
    'STATUS_CHANGE', 'AUTO_PURGE'
  )
);

-- ---------------------------------------------------------------------------
-- 6) Jobs duplicados/órfãos: desagenda (H-AGD-02).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN; END IF;

  -- No-op: UPDATE num id fixo que não existe (tabela/coluna erradas na origem)
  PERFORM cron.unschedule('update-despesa-updated-at-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='update-despesa-updated-at-daily');
  -- Duplicado de check_idempotency_anomalies_hourly (e do job de 15min)
  PERFORM cron.unschedule('check-idempotency-anomalies-hourly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='check-idempotency-anomalies-hourly');
  -- Duplicado de cleanup-logs-sistema-daily (mesma função)
  PERFORM cron.unschedule('cleanup-old-logs-weekly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='cleanup-old-logs-weekly');
  -- Duplicado de purge_expired_idempotency_keys_daily (mesma função)
  PERFORM cron.unschedule('purge-idempotency-keys-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='purge-idempotency-keys-daily');
  -- Duplicados de gerar-alertas-preditivos-ia-daily (mesma função)
  PERFORM cron.unschedule('lovable-ia-provisao-alertas')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='lovable-ia-provisao-alertas');
  PERFORM cron.unschedule('gerar-alertas-ia-diario')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='gerar-alertas-ia-diario');
  PERFORM cron.unschedule('ia-provisao-alertas-diario')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='ia-provisao-alertas-diario');
  -- lgpd-retention-dry-run é reagendado abaixo com o comando corrigido
  PERFORM cron.unschedule('lgpd-retention-dry-run')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='lgpd-retention-dry-run');
END $$;

-- ---------------------------------------------------------------------------
-- 7) H-AGD-02: declara os jobs que existem em prod sem migration. Cada
--    schedule é IF-NOT-EXISTS, então aplicar em prod é no-op para quem já
--    existe; em replay/DR o conjunto inteiro é recriado.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_jobs CONSTANT text[][] := ARRAY[
    -- jobname, schedule, command
    ['audit_log_monthly_purge', '0 3 1 * *', 'SELECT public._purge_audit_log_internal(365);'],
    ['cleanup-ciencia-rate-limits', '0 7 * * *', 'SELECT public.cleanup_ciencia_rate_limits();'],
    ['cleanup-logs-sistema-daily', '30 3 * * *', 'SELECT public.fn_cleanup_old_logs();'],
    ['dp-health-snapshot', '0 7 * * *', 'INSERT INTO public.dp_audit_log(event,event_type,payload) SELECT ''health_snapshot'',''system'',public.dp_connection_health()'],
    ['dp-log-rotation-check', '0 6 * * *', 'SELECT public.dp_check_log_rotation()'],
    ['dp-partition-monthly', '0 0 1 * *', 'SELECT public.dp_create_next_partition()'],
    ['dp-retention-anonymize-90d', '0 3 * * *', 'SELECT public.dp_run_retention((SELECT id FROM public.dp_retention_policy WHERE table_name=''dp_audit_log'' AND retention_days=90 LIMIT 1))'],
    ['dp-retention-delete-730d', '0 4 * * *', 'SELECT public.dp_run_retention((SELECT id FROM public.dp_retention_policy WHERE table_name=''dp_audit_log'' AND retention_days=730 LIMIT 1))'],
    ['ferias-recalcular-dobra-diario', '15 3 * * *', 'SELECT public.fn_recalcular_dobra_e_alertas();'],
    ['gerar-alertas-preditivos-ia-daily', '0 4 * * *', 'SELECT public.gerar_alertas_preditivos_ia();'],
    ['lovable-audit-retention-daily', '0 3 * * *', 'SELECT public.maintenance_archive_old_audit(180, 5000);'],
    ['lovable-log-retention', '0 3 * * *', 'SELECT public.enforce_log_retention();'],
    ['notificar-ferias-pagamento-d5', '0 11 * * 1-5', 'SELECT public.notificar_ferias_pagamento_d5();'],
    ['purgar_ferias_reconciliacao_logs_diario', '15 7 * * *', 'SELECT public.purgar_ferias_reconciliacao_logs_antigos();'],
    -- Comando corrigido: lgpd_fila_limpeza usa (tabela, registro_id, dry_run)
    ['lgpd-retention-dry-run', '0 3 * * *', 'INSERT INTO public.lgpd_fila_limpeza (tabela, registro_id, dry_run, created_at) SELECT ''colaboradores'', c.id, true, now() FROM public.colaboradores c WHERE c.status_contrato = ''desligado'' AND c.data_desligamento IS NOT NULL AND c.data_desligamento < (now() - interval ''5 years'') AND NOT EXISTS (SELECT 1 FROM public.lgpd_fila_limpeza f WHERE f.tabela = ''colaboradores'' AND f.registro_id = c.id AND f.executado = false)']
  ];
  v_job text[];
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN; END IF;
  FOREACH v_job SLICE 1 IN ARRAY v_jobs LOOP
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job[1]) THEN
      PERFORM cron.schedule(v_job[1], v_job[2], v_job[3]);
    END IF;
  END LOOP;
END $$;

RESET client_min_messages;
