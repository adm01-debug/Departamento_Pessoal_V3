# Views


## public.contas_bancarias_decrypted (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | public.contas_bancarias |
| populada | n/a |
| comentário | Leitura descriptografada de contas bancárias, restrita às empresas do usuário (ou admin). |


```sql
SELECT id,
    colaborador_id,
    empresa_id,
    banco_nome,
    banco_codigo,
    decrypt_dados_bancarios_tenant(agencia_encrypted, empresa_id) AS agencia,
    decrypt_dados_bancarios_tenant(conta_encrypted, empresa_id) AS conta,
    decrypt_dados_bancarios_tenant(digito_encrypted, empresa_id) AS digito,
    tipo_conta,
    decrypt_dados_bancarios_tenant(pix_chave_encrypted, empresa_id) AS pix_chave,
    pix_tipo,
    modalidade,
    principal,
    ativo,
    created_at,
    updated_at
   FROM contas_bancarias
  WHERE pode_gerir_rh(empresa_id) OR is_admin(auth.uid());
```

## public.dp_audit_log_colaborador (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.dp_audit_log |
| populada | n/a |
| comentário | SEGURANCA: esta view usa SECURITY INVOKER (padrao) — o RLS da tabela base eh respeitado. O WHERE actor_user_id = auth.uid() e o filtro de RLS garantem dupla protecao. |


```sql
SELECT id,
    event,
    event_type,
    actor_user_id,
        CASE
            WHEN ip_address IS NULL THEN NULL::inet
            ELSE (((((split_part(ip_address::text, '.'::text, 1) || '.'::text) || split_part(ip_address::text, '.'::text, 2)) || '.'::text) || split_part(ip_address::text, '.'::text, 3)) || '.X'::text)::inet
        END AS ip_address_masked,
    payload,
    created_at
   FROM dp_audit_log
  WHERE actor_user_id = auth.uid();
```

## public.dp_audit_log_rh (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.dp_audit_log |
| populada | n/a |
| comentário | View para RH/Auditoria: todos os eventos, IP /16 mascarado. Requer JWT claim role=rh\|auditoria\|admin. LGPD: acesso fundamentado em interesse legítimo e obrigação legal. |


```sql
SELECT id,
    event,
    event_type,
    actor_user_id,
    actor_role,
        CASE
            WHEN ip_address IS NULL THEN NULL::text
            ELSE ((split_part(ip_address::text, '.'::text, 1) || '.'::text) || split_part(ip_address::text, '.'::text, 2)) || '.X.X'::text
        END AS ip_address_masked,
    request_id,
    payload,
    created_at
   FROM dp_audit_log
  WHERE (auth.jwt() ->> 'role'::text) = ANY (ARRAY['rh'::text, 'auditoria'::text, 'admin'::text]);
```

## public.dp_data_catalog_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.dp_data_catalog |
| populada | n/a |
| comentário | Inventario PII para DPO e auditoria. Requer role dpo\|admin\|auditoria. Base: LGPD Art. 37 - obrigacao de manter registros de atividades de tratamento. |


```sql
SELECT table_name,
    column_name,
    sensitivity::text AS sensitivity,
    lgpd_category,
    legal_basis,
    retention_days,
    encrypted,
    masking_rule
   FROM dp_data_catalog
  WHERE (auth.jwt() ->> 'role'::text) = ANY (ARRAY['rh'::text, 'auditoria'::text, 'admin'::text, 'dpo'::text]);
```

## public.dp_security_advisors (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | pg_catalog.pg_tables |
| populada | n/a |
| comentário | Vista de advisors para CI: lista problemas de seguranca detectaveis automaticamente. No CI: SELECT COUNT(*) FROM dp_security_advisors WHERE severity='HIGH'; deve ser 0. |


```sql
SELECT 'RLS_DISABLED'::text AS category,
    pg_tables.tablename AS object_name,
    'HIGH'::text AS severity,
    ('ALTER TABLE public.'::text || pg_tables.tablename::text) || ' ENABLE ROW LEVEL SECURITY'::text AS fix_sql
   FROM pg_tables
  WHERE pg_tables.schemaname = 'public'::name AND pg_tables.tablename ~~ 'dp_%'::text AND pg_tables.tablename !~~ 'dp_audit_log_20%'::text AND NOT (pg_tables.tablename IN ( SELECT pg_class.relname
           FROM pg_class
          WHERE pg_class.relrowsecurity = true))
UNION ALL
 SELECT 'FUNCTION_NO_COMMENT'::text AS category,
    p.proname AS object_name,
    'LOW'::text AS severity,
    ('COMMENT ON FUNCTION public.'::text || p.proname::text) || ' IS ''...'';'::text AS fix_sql
   FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'::name AND p.proname ~~ 'dp_%'::text AND NOT (EXISTS ( SELECT 1
           FROM pg_description d
          WHERE d.objoid = p.oid AND d.description IS NOT NULL));
```

## public.dp_slow_queries (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | extensions.pg_stat_statements |
| populada | n/a |
| comentário | Queries com media > 100ms. Usar para tuning de performance. Requer: pg_stat_statements instalado (ja esta). |


```sql
SELECT "left"(query, 200) AS query_snippet,
    calls,
    round(mean_exec_time::numeric, 2) AS avg_ms,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    rows,
    round(100.0 * shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0)::numeric, 2) AS cache_hit_pct
   FROM extensions.pg_stat_statements
  WHERE mean_exec_time > 100::double precision AND query !~~ '%pg_stat_statements%'::text
  ORDER BY mean_exec_time DESC;
```

## public.excecoes_ponto (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.batidas_ponto, public.colaboradores |
| populada | n/a |
| comentário |  |


```sql
SELECT b.colaborador_id,
    c.nome_completo AS colaborador_nome,
    b.data,
    count(*) AS total_batidas,
        CASE
            WHEN (count(*) % 2::bigint) <> 0 THEN 'Batida Ímpar (Possível esquecimento)'::text
            WHEN count(*) < 4 AND count(*) > 0 THEN 'Batidas Insuficientes'::text
            ELSE 'Ok'::text
        END AS status_alerta
   FROM batidas_ponto b
     JOIN colaboradores c ON b.colaborador_id = c.id
  GROUP BY b.colaborador_id, c.nome_completo, b.data
 HAVING (count(*) % 2::bigint) <> 0 OR count(*) < 4;
```

## public.mv_folha_summary (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções | fillfactor=80 |
| depende de | public.folhas_pagamento |
| populada | sim |
| comentário |  |


```sql
SELECT empresa_id,
    to_date(competencia || '-01'::text, 'YYYY-MM-DD'::text) AS competencia_month,
    sum(total_colaboradores) AS headcount_folha,
    sum(total_proventos) AS total_bruto,
    sum(total_descontos) AS total_descontos,
    sum(total_liquido) AS total_liquido,
    sum(total_fgts) AS total_fgts,
    sum(total_inss_patronal) AS total_inss,
    sum(total_proventos) / NULLIF(sum(total_colaboradores), 0)::numeric AS salario_medio,
    min(total_proventos / NULLIF(total_colaboradores, 0)::numeric) AS piso_salarial,
    max(total_proventos / NULLIF(total_colaboradores, 0)::numeric) AS teto_salarial,
    sum(total_proventos) / NULLIF(sum(total_colaboradores), 0)::numeric AS custo_medio
   FROM folhas_pagamento f
  WHERE to_date(competencia || '-01'::text, 'YYYY-MM-DD'::text) >= (now() - '3 years'::interval)
  GROUP BY empresa_id, (to_date(competencia || '-01'::text, 'YYYY-MM-DD'::text));
```

## public.mv_telemetry_dashboard (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.query_telemetry |
| populada | sim |
| comentário |  |


```sql
SELECT empresa_id,
    date_trunc('hour'::text, created_at) AS hour,
    table_name,
    operation,
    severity,
    count(*) AS query_count,
    avg(duration_ms) AS avg_ms,
    min(duration_ms) AS min_ms,
    max(duration_ms) AS max_ms,
    percentile_cont(0.50::double precision) WITHIN GROUP (ORDER BY (duration_ms::double precision)) AS p50_ms,
    percentile_cont(0.75::double precision) WITHIN GROUP (ORDER BY (duration_ms::double precision)) AS p75_ms,
    percentile_cont(0.90::double precision) WITHIN GROUP (ORDER BY (duration_ms::double precision)) AS p90_ms,
    percentile_cont(0.95::double precision) WITHIN GROUP (ORDER BY (duration_ms::double precision)) AS p95_ms,
    percentile_cont(0.99::double precision) WITHIN GROUP (ORDER BY (duration_ms::double precision)) AS p99_ms,
    count(*) FILTER (WHERE severity = ANY (ARRAY['error'::text, 'fatal'::text])) AS error_count
   FROM query_telemetry
  WHERE empresa_id IS NOT NULL AND created_at >= (now() - '90 days'::interval)
  GROUP BY empresa_id, (date_trunc('hour'::text, created_at)), table_name, operation, severity;
```

## public.pontos_abertos (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.registros_ponto |
| populada | n/a |
| comentário |  |


```sql
SELECT rp.id,
    rp.colaborador_id,
    c.nome_completo,
    rp.data,
    rp.entrada_1,
    rp.saida_1,
    rp.entrada_2,
    rp.saida_2,
    rp.empresa_id
   FROM registros_ponto rp
     JOIN colaboradores c ON c.id = rp.colaborador_id
  WHERE rp.saida_1 IS NULL AND rp.data <= CURRENT_DATE
  ORDER BY rp.data DESC;
```

## public.v_alertas_timeout (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.metricas_processamento |
| populada | n/a |
| comentário |  |


```sql
SELECT funcao_nome,
    count(*) AS ocorrencias,
    avg(tempo_execucao_ms) AS media_ms,
    max("timestamp") AS ultima_ocorrencia
   FROM metricas_processamento
  WHERE tempo_execucao_ms > 55000 OR status = 'timeout'::text
  GROUP BY funcao_nome;
```

## public.v_audit_events_unified (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.audit_log, public.audit_logs, public.auditoria, public.auditoria_logs, public.ferias_audit_log, public.folha_auditoria, public.ponto_auditoria, public.premiacoes_auditoria |
| populada | n/a |
| comentário |  |


```sql
SELECT 'audit_log'::text AS source_table,
    audit_log.tabela AS entidade,
    audit_log.registro_id::text AS entidade_id,
    audit_log.acao,
    audit_log.user_id,
    audit_log.dados_anteriores,
    audit_log.dados_novos,
    audit_log.created_at
   FROM audit_log
UNION ALL
 SELECT 'audit_logs'::text AS source_table,
    audit_logs.entity AS entidade,
    audit_logs.entity_id AS entidade_id,
    audit_logs.action AS acao,
    audit_logs.user_id,
    audit_logs.old_values AS dados_anteriores,
    audit_logs.new_values AS dados_novos,
    audit_logs.created_at
   FROM audit_logs
UNION ALL
 SELECT 'auditoria'::text AS source_table,
    auditoria.entidade,
    auditoria.entidade_id,
    auditoria.acao,
    auditoria.usuario_id AS user_id,
    auditoria.dados_anteriores,
    auditoria.dados_novos,
    auditoria.created_at
   FROM auditoria
UNION ALL
 SELECT 'auditoria_logs'::text AS source_table,
    auditoria_logs.entidade::text AS entidade,
    auditoria_logs.entidade_id::text AS entidade_id,
    auditoria_logs.acao::text AS acao,
    auditoria_logs.user_id,
    auditoria_logs.dados_anteriores,
    auditoria_logs.dados_novos,
    auditoria_logs.created_at
   FROM auditoria_logs
UNION ALL
 SELECT 'ferias_audit_log'::text AS source_table,
    ferias_audit_log.entidade_tipo AS entidade,
    ferias_audit_log.entidade_id::text AS entidade_id,
    ferias_audit_log.acao,
    ferias_audit_log.usuario_id AS user_id,
    ferias_audit_log.dados_anteriores,
    ferias_audit_log.dados_novos,
    ferias_audit_log.created_at
   FROM ferias_audit_log
UNION ALL
 SELECT 'premiacoes_auditoria'::text AS source_table,
    premiacoes_auditoria.entidade_tipo AS entidade,
    premiacoes_auditoria.entidade_id::text AS entidade_id,
    premiacoes_auditoria.acao,
    premiacoes_auditoria.usuario_id AS user_id,
    premiacoes_auditoria.dados_anteriores,
    premiacoes_auditoria.dados_novos,
    premiacoes_auditoria.created_at
   FROM premiacoes_auditoria
UNION ALL
 SELECT 'ponto_auditoria'::text AS source_table,
    ponto_auditoria.tabela_nome AS entidade,
    ponto_auditoria.registro_id::text AS entidade_id,
    ponto_auditoria.acao,
    ponto_auditoria.usuario_id AS user_id,
    ponto_auditoria.dados_anteriores,
    ponto_auditoria.dados_novos,
    ponto_auditoria.created_at
   FROM ponto_auditoria
UNION ALL
 SELECT 'folha_auditoria'::text AS source_table,
    'folha_pagamento'::text AS entidade,
    folha_auditoria.folha_id::text AS entidade_id,
    folha_auditoria.tipo_evento AS acao,
    folha_auditoria.criado_por AS user_id,
    NULL::jsonb AS dados_anteriores,
    folha_auditoria.detalhes AS dados_novos,
    folha_auditoria.created_at
   FROM folha_auditoria;
```

## public.v_audit_legacy (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.audit_log_unified |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    source_table,
    source_id,
    empresa_id,
    user_id,
    action,
    entity,
    entity_id,
    payload,
    ip_address,
    user_agent,
    occurred_at,
    ingested_at
   FROM audit_log_unified;
```

## public.v_audit_trail (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | auth.users, public.audit_log, public.profiles |
| populada | n/a |
| comentário |  |


```sql
SELECT a.id,
    a.created_at,
    a.tabela,
    a.registro_id,
    a.acao,
    a.user_id,
    u.email AS user_email,
    p.nome AS user_nome,
    a.dados_anteriores ->> 'status'::text AS status_anterior,
    a.dados_novos ->> 'status'::text AS status_novo,
    NULLIF(a.dados_novos ->> 'empresa_id'::text, ''::text)::uuid AS empresa_id,
    a.dados_anteriores,
    a.dados_novos
   FROM audit_log a
     LEFT JOIN auth.users u ON u.id = a.user_id
     LEFT JOIN profiles p ON p.user_id = a.user_id;
```

## public.v_contrato_token_timeline (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.contrato_token_eventos, public.profiles |
| populada | n/a |
| comentário |  |


```sql
SELECT e.id,
    e.empresa_id,
    e.contrato_id,
    e.token_id,
    e.evento,
    e.detalhes,
    e.ator_id,
    p.nome AS ator_nome,
    e.ip,
    e.user_agent,
    e.created_at
   FROM contrato_token_eventos e
     LEFT JOIN profiles p ON p.user_id = e.ator_id;
```

## public.v_contratos_assinatura_kpi (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.contrato_assinatura_tokens |
| populada | n/a |
| comentário |  |


```sql
SELECT empresa_id,
    count(*) AS tokens_gerados,
    count(*) FILTER (WHERE usado_em IS NOT NULL) AS tokens_assinados,
    count(*) FILTER (WHERE usado_em IS NULL AND revogado_em IS NULL AND expira_em > now()) AS tokens_pendentes,
    count(*) FILTER (WHERE usado_em IS NULL AND (revogado_em IS NOT NULL OR expira_em <= now())) AS tokens_expirados,
    round(100.0 * count(*) FILTER (WHERE usado_em IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 2) AS taxa_conversao_pct,
    avg(EXTRACT(epoch FROM usado_em - created_at) / 3600.0) FILTER (WHERE usado_em IS NOT NULL) AS tempo_medio_assinatura_h
   FROM contrato_assinatura_tokens t
  GROUP BY empresa_id;
```

## public.v_contratos_tokens_pendentes (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.contrato_assinatura_tokens, public.contrato_templates, public.contratos_gerados |
| populada | n/a |
| comentário |  |


```sql
SELECT t.id,
    t.empresa_id,
    t.contrato_id,
    t.email_destinatario,
    t.expira_em,
    t.created_at,
    t.reminders_enviados,
    t.ultimo_reminder_at,
    EXTRACT(day FROM now() - t.created_at)::integer AS dias_desde_geracao,
    EXTRACT(day FROM t.expira_em - now())::integer AS dias_para_expirar,
    c.status AS contrato_status,
    c.data_inicio,
    c.data_fim,
    c.colaborador_id,
    col.nome_completo AS colaborador_nome,
    tpl.tipo_contrato
   FROM contrato_assinatura_tokens t
     JOIN contratos_gerados c ON c.id = t.contrato_id
     LEFT JOIN colaboradores col ON col.id = c.colaborador_id
     LEFT JOIN contrato_templates tpl ON tpl.id = c.template_id
  WHERE t.usado_em IS NULL AND t.revogado_em IS NULL AND t.expira_em > now();
```

## public.v_contratos_vencendo (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.contrato_templates, public.contratos_gerados |
| populada | n/a |
| comentário |  |


```sql
SELECT cg.id,
    cg.empresa_id,
    cg.admissao_id,
    cg.colaborador_id,
    cg.data_inicio,
    cg.data_fim,
    cg.status,
    cg.prorrogado,
    ct.tipo_contrato,
    ct.nome AS template_nome,
    cg.data_fim - CURRENT_DATE AS dias_para_vencer,
        CASE
            WHEN cg.data_fim < CURRENT_DATE THEN 'vencido'::text
            WHEN (cg.data_fim - CURRENT_DATE) <= 3 THEN 'critico'::text
            WHEN (cg.data_fim - CURRENT_DATE) <= 7 THEN 'atencao'::text
            ELSE 'ok'::text
        END AS severidade
   FROM contratos_gerados cg
     JOIN contrato_templates ct ON ct.id = cg.template_id
  WHERE cg.data_fim IS NOT NULL AND (cg.status = ANY (ARRAY['gerado'::text, 'enviado'::text, 'assinado'::text])) AND (ct.tipo_contrato = ANY (ARRAY['clt_experiencia'::text, 'clt_determinado'::text, 'estagio'::text, 'temporario'::text]));
```

## public.v_ferias_adiant13_elegibilidade (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.ferias |
| populada | n/a |
| comentário |  |


```sql
SELECT id AS ferias_id,
    empresa_id,
    colaborador_id,
    data_inicio,
    EXTRACT(year FROM data_inicio)::integer AS ano_exercicio,
    adiantamento_13o AS ja_solicitado,
    CURRENT_DATE <= make_date(EXTRACT(year FROM data_inicio)::integer, 1, 31) AS dentro_do_prazo,
    NOT (EXISTS ( SELECT 1
           FROM ferias f2
          WHERE f2.colaborador_id = f.colaborador_id AND f2.adiantamento_13o = true AND f2.adiantamento_13_ano_exercicio = EXTRACT(year FROM f.data_inicio)::integer AND f2.id <> f.id)) AS sem_duplicidade
   FROM ferias f;
```

## public.v_ferias_alerta_pagamento_d2 (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.ferias |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    empresa_id,
    colaborador_id,
    data_inicio,
    data_pagamento,
    pagamento_confirmado_em,
    status,
    data_inicio - CURRENT_DATE AS dias_ate_inicio,
        CASE
            WHEN pagamento_confirmado_em IS NOT NULL THEN 'ok'::text
            WHEN data_inicio < CURRENT_DATE THEN 'violacao_grave'::text
            WHEN (data_inicio - CURRENT_DATE) <= 2 THEN 'critico'::text
            WHEN (data_inicio - CURRENT_DATE) <= 5 THEN 'atencao'::text
            ELSE 'ok'::text
        END AS severidade
   FROM ferias f
  WHERE (status::text = ANY (ARRAY['aprovada'::character varying::text, 'programada'::character varying::text, 'em_gozo'::character varying::text])) AND cancelado IS NOT TRUE;
```

## public.v_ferias_alertas_criticos (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.ferias, public.periodos_aquisitivos |
| populada | n/a |
| comentário |  |


```sql
SELECT pa.id AS periodo_aquisitivo_id,
    pa.colaborador_id,
    c.empresa_id,
    c.nome_completo AS colaborador,
    pa.data_inicio AS aquisitivo_inicio,
    pa.data_fim AS aquisitivo_fim,
    pa.data_limite_concessao,
    pa.dias_direito,
    pa.em_dobra,
    pa.perdeu_direito,
    pa.data_limite_concessao - CURRENT_DATE AS dias_para_limite,
        CASE
            WHEN pa.em_dobra THEN 'DOBRA_VENCIDA'::text
            WHEN (pa.data_limite_concessao - CURRENT_DATE) <= 30 THEN 'DOBRA_IMINENTE_30'::text
            WHEN (pa.data_limite_concessao - CURRENT_DATE) <= 60 THEN 'DOBRA_IMINENTE_60'::text
            ELSE 'OK'::text
        END AS severidade
   FROM periodos_aquisitivos pa
     JOIN colaboradores c ON c.id = pa.colaborador_id
  WHERE COALESCE(pa.perdeu_direito, false) = false AND COALESCE(pa.dias_direito, 0) > 0 AND (pa.data_limite_concessao - CURRENT_DATE) <= 60
UNION ALL
 SELECT NULL::uuid AS periodo_aquisitivo_id,
    f.colaborador_id,
    f.empresa_id,
    c.nome_completo AS colaborador,
    NULL::date AS aquisitivo_inicio,
    NULL::date AS aquisitivo_fim,
    NULL::date AS data_limite_concessao,
    f.dias_gozo AS dias_direito,
    false AS em_dobra,
    false AS perdeu_direito,
    f.data_inicio - f.data_pagamento AS dias_para_limite,
    'PAGAMENTO_ATRASADO_ART_145'::text AS severidade
   FROM ferias f
     JOIN colaboradores c ON c.id = f.colaborador_id
  WHERE f.data_pagamento IS NOT NULL AND f.data_inicio IS NOT NULL AND (f.data_inicio - f.data_pagamento) < 2 AND COALESCE(f.cancelado, false) = false AND (f.status::text = ANY (ARRAY['aprovada'::character varying::text, 'concluida'::character varying::text, 'em_gozo'::character varying::text]));
```

## public.v_ferias_folha_reconciliacao (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.eventos_variaveis, public.ferias |
| populada | n/a |
| comentário |  |


```sql
SELECT f.id AS ferias_id,
    f.empresa_id,
    f.colaborador_id,
    c.nome_completo AS colaborador_nome,
    f.data_inicio,
    f.data_fim,
    f.status,
    f.enviado_contabilidade,
    date_trunc('month'::text, f.data_inicio::timestamp with time zone)::date AS competencia,
    (COALESCE(f.valor_ferias, 0::numeric) > 0::numeric)::integer + (COALESCE(f.valor_terco, 0::numeric) > 0::numeric)::integer + (COALESCE(f.valor_abono, 0::numeric) > 0::numeric)::integer + (COALESCE(f.valor_terco_abono, 0::numeric) > 0::numeric)::integer + (COALESCE(f.descontos_inss, 0::numeric) > 0::numeric)::integer + (COALESCE(f.descontos_irrf, 0::numeric) > 0::numeric)::integer + (COALESCE(f.valor_adiantamento_13, 0::numeric) > 0::numeric)::integer AS rubricas_esperadas,
    COALESCE(ev.total, 0) AS rubricas_geradas,
        CASE
            WHEN COALESCE(f.enviado_contabilidade, false) = false THEN 'pendente_envio'::text
            WHEN ((COALESCE(f.valor_ferias, 0::numeric) > 0::numeric)::integer + (COALESCE(f.valor_terco, 0::numeric) > 0::numeric)::integer + (COALESCE(f.valor_abono, 0::numeric) > 0::numeric)::integer + (COALESCE(f.valor_terco_abono, 0::numeric) > 0::numeric)::integer + (COALESCE(f.descontos_inss, 0::numeric) > 0::numeric)::integer + (COALESCE(f.descontos_irrf, 0::numeric) > 0::numeric)::integer + (COALESCE(f.valor_adiantamento_13, 0::numeric) > 0::numeric)::integer) = COALESCE(ev.total, 0) THEN 'ok'::text
            ELSE 'divergente'::text
        END AS situacao
   FROM ferias f
     JOIN colaboradores c ON c.id = f.colaborador_id
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS total
           FROM eventos_variaveis ev_1
          WHERE ev_1.origem_ferias_id = f.id) ev ON true
  WHERE f.status::text = 'aprovada'::text AND COALESCE(f.cancelado, false) = false;
```

## public.v_idempotency_metrics (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.idempotency_keys |
| populada | n/a |
| comentário |  |


```sql
SELECT endpoint,
    count(*) FILTER (WHERE created_at > (now() - '24:00:00'::interval)) AS total_24h,
    count(*) FILTER (WHERE created_at > (now() - '7 days'::interval)) AS total_7d,
    count(*) FILTER (WHERE status = 'completed'::text AND created_at > (now() - '24:00:00'::interval)) AS completed_24h,
    count(*) FILTER (WHERE status = 'pending'::text AND created_at > (now() - '24:00:00'::interval)) AS pending_24h,
    count(*) FILTER (WHERE status = 'failed'::text AND created_at > (now() - '24:00:00'::interval)) AS failed_24h,
    count(*) FILTER (WHERE response_status = 409 AND created_at > (now() - '24:00:00'::interval)) AS conflict_24h,
    round(100.0 * count(*) FILTER (WHERE status = 'failed'::text AND created_at > (now() - '24:00:00'::interval))::numeric / NULLIF(count(*) FILTER (WHERE created_at > (now() - '24:00:00'::interval)), 0)::numeric, 2) AS failure_rate_pct_24h,
    max(created_at) AS last_seen_at
   FROM idempotency_keys
  GROUP BY endpoint;
```

## public.v_login_anomalies (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | public.v_login_anomalies_email, public.v_login_anomalies_ip |
| populada | n/a |
| comentário | P3-057: Anomalias de login (brute force) combinadas IP+email. Threshold: >=3 falhas/min. |


```sql
SELECT 'ip'::text AS anomaly_type,
    v_login_anomalies_ip.ip_address AS identifier,
    v_login_anomalies_ip.failed_attempts,
    v_login_anomalies_ip.successful_attempts,
    v_login_anomalies_ip.failure_rate_pct,
    v_login_anomalies_ip.first_attempt,
    v_login_anomalies_ip.last_attempt,
    NULLIF(v_login_anomalies_ip.failures_per_minute_proj, 'NaN'::numeric) AS failures_per_minute,
    v_login_anomalies_ip.last_failure_reason,
    NULL::text AS last_ip,
    NULL::text AS ip_type
   FROM v_login_anomalies_ip
UNION ALL
 SELECT 'email'::text AS anomaly_type,
    v_login_anomalies_email.email AS identifier,
    v_login_anomalies_email.failed_attempts,
    v_login_anomalies_email.successful_attempts,
    v_login_anomalies_email.failure_rate_pct,
    v_login_anomalies_email.first_attempt,
    v_login_anomalies_email.last_attempt,
    NULLIF(v_login_anomalies_email.failures_per_minute_proj, 'NaN'::numeric) AS failures_per_minute,
    v_login_anomalies_email.last_failure_reason,
    v_login_anomalies_email.last_ip,
    NULL::text AS ip_type
   FROM v_login_anomalies_email
  ORDER BY 3 DESC, 7 DESC;
```

## public.v_login_anomalies_email (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | public.login_attempts |
| populada | n/a |
| comentário |  |


```sql
SELECT email,
    count(*) AS total_attempts,
    count(*) FILTER (WHERE success = false) AS failed_attempts,
    count(*) FILTER (WHERE success = true) AS successful_attempts,
    round(count(*) FILTER (WHERE success = false)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS failure_rate_pct,
    min(created_at) AS first_attempt,
    max(created_at) AS last_attempt,
    count(*) FILTER (WHERE success = false)::numeric / NULLIF(GREATEST(EXTRACT(epoch FROM max(created_at) - min(created_at)) / 60::numeric, 1::numeric), 0::numeric) AS failures_per_minute_proj,
    ( SELECT la2.ip_address
           FROM login_attempts la2
          WHERE la2.email = la1.email
          ORDER BY la2.created_at DESC
         LIMIT 1) AS last_ip,
    ( SELECT la2.failure_reason
           FROM login_attempts la2
          WHERE la2.email = la1.email
          ORDER BY la2.created_at DESC
         LIMIT 1) AS last_failure_reason
   FROM login_attempts la1
  WHERE created_at >= (now() - '01:00:00'::interval)
  GROUP BY email
 HAVING count(*) FILTER (WHERE success = false) >= 3 AND (count(*) FILTER (WHERE success = false)::double precision / NULLIF(GREATEST(EXTRACT(epoch FROM max(created_at) - min(created_at)) / 60::numeric, 1::numeric), 0::numeric)::double precision) >= 3::double precision
  ORDER BY (count(*) FILTER (WHERE success = false)) DESC;
```

## public.v_login_anomalies_ip (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | public.login_attempts |
| populada | n/a |
| comentário |  |


```sql
SELECT ip_address,
    count(*) AS total_attempts,
    count(*) FILTER (WHERE success = false) AS failed_attempts,
    count(*) FILTER (WHERE success = true) AS successful_attempts,
    round(count(*) FILTER (WHERE success = false)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS failure_rate_pct,
    min(created_at) AS first_attempt,
    max(created_at) AS last_attempt,
    max(created_at) - min(created_at) AS window_duration,
        CASE
            WHEN (max(created_at) - min(created_at)) < '00:01:00'::interval THEN count(*) FILTER (WHERE success = false)::numeric / NULLIF(EXTRACT(epoch FROM max(created_at) - min(created_at)), 0::numeric) / 60::numeric
            ELSE count(*) FILTER (WHERE success = false)::numeric / NULLIF(EXTRACT(epoch FROM max(created_at) - min(created_at)) / 60::numeric, 0::numeric)
        END AS failures_per_minute_proj,
    ( SELECT la2.failure_reason
           FROM login_attempts la2
          WHERE la2.ip_address = la1.ip_address
          ORDER BY la2.created_at DESC
         LIMIT 1) AS last_failure_reason,
        CASE
            WHEN ip_address ~ '^10\.'::text OR ip_address ~ '^172\.(1[6-9]|2[0-9]|3[0-1])\.'::text OR ip_address ~ '^192\.168\.'::text THEN 'internal'::text
            WHEN ip_address = '127.0.0.1'::text OR ip_address = '::1'::text THEN 'localhost'::text
            ELSE 'external'::text
        END AS ip_type
   FROM login_attempts la1
  WHERE created_at >= (now() - '01:00:00'::interval)
  GROUP BY ip_address
 HAVING count(*) FILTER (WHERE success = false) >= 5 AND (count(*) FILTER (WHERE success = false)::double precision / NULLIF(GREATEST(EXTRACT(epoch FROM max(created_at) - min(created_at)) / 60::numeric, 1::numeric), 0::numeric)::double precision) >= 5::double precision
  ORDER BY (count(*) FILTER (WHERE success = false)) DESC, (max(created_at)) DESC;
```

## public.v_pii_access_suspeitos (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.pii_access_logs |
| populada | n/a |
| comentário |  |


```sql
SELECT user_id,
    empresa_id,
    tabela,
    acao,
    date_trunc('hour'::text, created_at) AS janela,
    sum(registro_count) AS total_registros,
    count(*) AS total_eventos,
    max(created_at) AS ultimo_evento
   FROM pii_access_logs
  WHERE created_at > (now() - '24:00:00'::interval)
  GROUP BY user_id, empresa_id, tabela, acao, (date_trunc('hour'::text, created_at))
 HAVING sum(registro_count) > 200 OR (acao = ANY (ARRAY['export'::text, 'download'::text])) AND sum(registro_count) > 50;
```

## public.v_slow_queries_top50 (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | extensions.pg_stat_statements |
| populada | n/a |
| comentário |  |


```sql
SELECT "substring"(query, 1, 500) AS query_sample,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round(max_exec_time::numeric, 2) AS max_ms,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    rows,
    round(shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0)::numeric * 100::numeric, 2) AS cache_hit_pct
   FROM extensions.pg_stat_statements pss
  WHERE query !~~* '%pg_stat_statements%'::text AND query !~~* '%pg_catalog%'::text
  ORDER BY total_exec_time DESC
 LIMIT 50;
```

## public.v_system_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | pg_catalog.pg_tables, public.audit_log_unified, public.security_alerts |
| populada | n/a |
| comentário |  |


```sql
SELECT ( SELECT count(*) AS count
           FROM pg_tables t
          WHERE t.schemaname = 'public'::name AND (EXISTS ( SELECT 1
                   FROM pg_class c
                     JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE n.nspname = 'public'::name AND c.relname = t.tablename AND c.relrowsecurity))) AS tables_with_rls,
    ( SELECT count(*) AS count
           FROM pg_tables
          WHERE pg_tables.schemaname = 'public'::name) AS tables_total,
    ( SELECT count(*) AS count
           FROM audit_log_unified) AS audit_events_total,
    ( SELECT max(audit_log_unified.occurred_at) AS max
           FROM audit_log_unified) AS audit_last_event_at,
    ( SELECT count(*) AS count
           FROM security_alerts
          WHERE security_alerts.resolved_at IS NULL) AS security_alerts_open,
    ( SELECT count(*) AS count
           FROM ( SELECT c.conrelid,
                    c.conkey::integer[] AS keys
                   FROM pg_constraint c
                  WHERE c.contype = 'f'::"char" AND c.connamespace = 'public'::regnamespace::oid
                EXCEPT
                 SELECT c.conrelid,
                    c.conkey::integer[] AS conkey
                   FROM pg_constraint c
                     JOIN pg_index i ON i.indrelid = c.conrelid AND c.conkey::integer[] <@ i.indkey::integer[]
                  WHERE c.contype = 'f'::"char" AND c.connamespace = 'public'::regnamespace::oid) missing) AS fks_without_index,
    now() AS snapshot_at
  WHERE has_role(auth.uid(), 'admin'::app_role);
```

## public.v_telemetry_last_hour (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.query_telemetry |
| populada | n/a |
| comentário |  |


```sql
SELECT empresa_id,
    table_name,
    operation,
    severity,
    count(*) AS query_count,
    avg(duration_ms)::integer AS avg_ms,
    max(duration_ms) AS max_ms,
    count(*) FILTER (WHERE severity = ANY (ARRAY['error'::text, 'fatal'::text])) AS error_count
   FROM query_telemetry
  WHERE empresa_id IS NOT NULL AND created_at >= (now() - '01:00:00'::interval)
  GROUP BY empresa_id, table_name, operation, severity;
```

## public.v_telemetry_slow_queries (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.query_telemetry |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    empresa_id,
    created_at,
    user_id,
    table_name,
    operation,
    duration_ms,
    severity
   FROM query_telemetry
  WHERE empresa_id IS NOT NULL AND created_at >= (now() - '01:00:00'::interval) AND duration_ms > 5000
  ORDER BY created_at DESC;
```

## public.vw_alertas_compensacao (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.banco_horas, public.colaboradores |
| populada | n/a |
| comentário |  |


```sql
SELECT bh.colaborador_id,
    c.nome_completo,
    bh.empresa_id,
    sum(
        CASE
            WHEN bh.tipo::text = 'credito'::text THEN split_part(bh.horas::text, ':'::text, 1)::integer * 60 + COALESCE(split_part(bh.horas::text, ':'::text, 2)::integer, 0)
            ELSE - (split_part(bh.horas::text, ':'::text, 1)::integer * 60 + COALESCE(split_part(bh.horas::text, ':'::text, 2)::integer, 0))
        END) AS saldo_minutos,
        CASE
            WHEN sum(
            CASE
                WHEN bh.tipo::text = 'credito'::text THEN split_part(bh.horas::text, ':'::text, 1)::integer * 60 + COALESCE(split_part(bh.horas::text, ':'::text, 2)::integer, 0)
                ELSE - (split_part(bh.horas::text, ':'::text, 1)::integer * 60 + COALESCE(split_part(bh.horas::text, ':'::text, 2)::integer, 0))
            END) < '-480'::integer THEN 'critico'::text
            WHEN sum(
            CASE
                WHEN bh.tipo::text = 'credito'::text THEN split_part(bh.horas::text, ':'::text, 1)::integer * 60 + COALESCE(split_part(bh.horas::text, ':'::text, 2)::integer, 0)
                ELSE - (split_part(bh.horas::text, ':'::text, 1)::integer * 60 + COALESCE(split_part(bh.horas::text, ':'::text, 2)::integer, 0))
            END) < '-240'::integer THEN 'alerta'::text
            ELSE 'normal'::text
        END AS nivel_alerta
   FROM banco_horas bh
     JOIN colaboradores c ON c.id = bh.colaborador_id
  GROUP BY bh.colaborador_id, c.nome_completo, bh.empresa_id
 HAVING sum(
        CASE
            WHEN bh.tipo::text = 'credito'::text THEN split_part(bh.horas::text, ':'::text, 1)::integer * 60 + COALESCE(split_part(bh.horas::text, ':'::text, 2)::integer, 0)
            ELSE - (split_part(bh.horas::text, ':'::text, 1)::integer * 60 + COALESCE(split_part(bh.horas::text, ':'::text, 2)::integer, 0))
        END) < 0;
```

## public.vw_alertas_rh (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.notificacoes |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    user_id,
    tipo,
    titulo,
    mensagem,
    entidade_tipo,
    entidade_id,
    lida,
    data_referencia,
    created_at,
    empresa_id
   FROM notificacoes
  WHERE lida = false;
```

## public.vw_banco_horas_saldo (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.banco_horas, public.colaboradores |
| populada | n/a |
| comentário |  |


```sql
SELECT bh.colaborador_id,
    c.nome_completo,
    c.empresa_id,
    sum(
        CASE
            WHEN bh.tipo::text = 'credito'::text THEN 1
            ELSE '-1'::integer
        END::numeric * EXTRACT(epoch FROM bh.horas) / 3600::numeric) AS saldo_horas,
    max(bh.data) AS ultima_movimentacao
   FROM banco_horas bh
     JOIN colaboradores c ON c.id = bh.colaborador_id
  GROUP BY bh.colaborador_id, c.nome_completo, c.empresa_id;
```

## public.vw_batidas_dia (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.batidas_ponto, public.colaboradores |
| populada | n/a |
| comentário |  |


```sql
SELECT bp.id,
    bp.colaborador_id,
    bp.data,
    bp.hora,
    bp.ordem,
    bp.tipo,
    bp.origem,
    bp.ajustado,
    bp.latitude,
    bp.longitude,
    bp.dentro_raio,
    bp.empresa_id,
    c.nome_completo,
    c.foto_url,
    c.departamento
   FROM batidas_ponto bp
     JOIN colaboradores c ON c.id = bp.colaborador_id;
```

## public.vw_batidas_resumo (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.batidas_ponto, public.colaboradores |
| populada | n/a |
| comentário |  |


```sql
SELECT bp.colaborador_id,
    c.nome_completo,
    bp.data,
    bp.empresa_id,
    jsonb_agg(jsonb_build_object('ordem', bp.ordem, 'hora', bp.hora::text, 'tipo', bp.tipo) ORDER BY bp.ordem) AS batidas,
    count(*) AS total_batidas,
    min(
        CASE
            WHEN bp.tipo = 'entrada'::text THEN bp.hora
            ELSE NULL::time without time zone
        END)::text AS primeira_entrada,
    max(
        CASE
            WHEN bp.tipo = 'saida'::text THEN bp.hora
            ELSE NULL::time without time zone
        END)::text AS ultima_saida
   FROM batidas_ponto bp
     JOIN colaboradores c ON c.id = bp.colaborador_id
  GROUP BY bp.colaborador_id, c.nome_completo, bp.data, bp.empresa_id;
```

## public.vw_cadastro_incompleto (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    nome_completo,
    empresa_id,
    status,
    array_remove(ARRAY[
        CASE
            WHEN cpf IS NULL OR cpf = ''::text THEN 'CPF'::text
            ELSE NULL::text
        END,
        CASE
            WHEN rg IS NULL OR rg = ''::text THEN 'RG'::text
            ELSE NULL::text
        END,
        CASE
            WHEN email IS NULL OR email = ''::text THEN 'Email'::text
            ELSE NULL::text
        END,
        CASE
            WHEN celular IS NULL OR celular = ''::text THEN 'Celular'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cep IS NULL OR cep = ''::text THEN 'CEP'::text
            ELSE NULL::text
        END,
        CASE
            WHEN pis_pasep IS NULL OR pis_pasep = ''::text THEN 'PIS'::text
            ELSE NULL::text
        END,
        CASE
            WHEN data_nascimento IS NULL THEN 'Data Nascimento'::text
            ELSE NULL::text
        END], NULL::text) AS campos_faltantes,
    array_length(array_remove(ARRAY[
        CASE
            WHEN cpf IS NULL OR cpf = ''::text THEN 'CPF'::text
            ELSE NULL::text
        END,
        CASE
            WHEN rg IS NULL OR rg = ''::text THEN 'RG'::text
            ELSE NULL::text
        END,
        CASE
            WHEN email IS NULL OR email = ''::text THEN 'Email'::text
            ELSE NULL::text
        END,
        CASE
            WHEN celular IS NULL OR celular = ''::text THEN 'Celular'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cep IS NULL OR cep = ''::text THEN 'CEP'::text
            ELSE NULL::text
        END,
        CASE
            WHEN pis_pasep IS NULL OR pis_pasep = ''::text THEN 'PIS'::text
            ELSE NULL::text
        END,
        CASE
            WHEN data_nascimento IS NULL THEN 'Data Nascimento'::text
            ELSE NULL::text
        END], NULL::text), 1) AS total_faltantes
   FROM colaboradores c
  WHERE status = 'ativo'::status_colaborador AND (cpf IS NULL OR cpf = ''::text OR rg IS NULL OR rg = ''::text OR email IS NULL OR email = ''::text OR pis_pasep IS NULL OR pis_pasep = ''::text)
  ORDER BY (array_length(array_remove(ARRAY[
        CASE
            WHEN cpf IS NULL OR cpf = ''::text THEN 'CPF'::text
            ELSE NULL::text
        END,
        CASE
            WHEN rg IS NULL OR rg = ''::text THEN 'RG'::text
            ELSE NULL::text
        END,
        CASE
            WHEN email IS NULL OR email = ''::text THEN 'Email'::text
            ELSE NULL::text
        END,
        CASE
            WHEN celular IS NULL OR celular = ''::text THEN 'Celular'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cep IS NULL OR cep = ''::text THEN 'CEP'::text
            ELSE NULL::text
        END,
        CASE
            WHEN pis_pasep IS NULL OR pis_pasep = ''::text THEN 'PIS'::text
            ELSE NULL::text
        END,
        CASE
            WHEN data_nascimento IS NULL THEN 'Data Nascimento'::text
            ELSE NULL::text
        END], NULL::text), 1)) DESC NULLS LAST;
```

## public.vw_colaboradores_completo (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.empresas |
| populada | n/a |
| comentário |  |


```sql
SELECT c.id,
    c.nome_completo,
    c.cpf,
    c.email_corporativo,
    c.data_admissao,
    c.status,
    e.nome_fantasia AS empresa_nome,
    c.departamento AS departamento_nome,
    c.cargo AS cargo_nome,
    c.empresa_id
   FROM colaboradores c
     LEFT JOIN empresas e ON c.empresa_id = e.id
  WHERE c.status::text = 'ativo'::text;
```

## public.vw_dashboard_time (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores |
| populada | n/a |
| comentário |  |


```sql
SELECT empresa_id,
    count(*) AS total_colaboradores,
    count(*) FILTER (WHERE status = 'ativo'::status_colaborador) AS ativos,
    count(*) FILTER (WHERE status = 'afastado'::status_colaborador) AS afastados
   FROM colaboradores
  GROUP BY empresa_id;
```

## public.vw_espelho_ponto_mensal (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.batidas_ponto, public.colaboradores |
| populada | n/a |
| comentário |  |


```sql
SELECT bp.colaborador_id,
    bp.data,
    min(bp.hora) FILTER (WHERE bp.tipo = 'entrada'::text) AS entrada_1,
    max(bp.hora) FILTER (WHERE bp.tipo = 'saida'::text) AS saida_1,
    count(bp.id) AS total_batidas,
    c.empresa_id
   FROM batidas_ponto bp
     JOIN colaboradores c ON bp.colaborador_id = c.id
  GROUP BY bp.colaborador_id, bp.data, c.empresa_id;
```

## public.vw_faltas_mensal (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.faltas |
| populada | n/a |
| comentário |  |


```sql
SELECT to_char(data::timestamp with time zone, 'YYYY-MM'::text) AS mes,
    empresa_id,
    tipo,
    count(*) AS total,
    sum(dias_total) AS dias_total,
    count(*) FILTER (WHERE justificada = true) AS justificadas,
    count(*) FILTER (WHERE justificada = false OR justificada IS NULL) AS injustificadas
   FROM faltas f
  GROUP BY (to_char(data::timestamp with time zone, 'YYYY-MM'::text)), empresa_id, tipo;
```

## public.vw_feedbacks_360_versao (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.feedbacks_360 |
| populada | n/a |
| comentário |  |


```sql
SELECT id AS feedback_id,
    empresa_id,
    ciclo_id,
    avaliado_id,
    avaliador_id,
    tipo,
    status,
    potencial,
    updated_at,
    versao_avaliacao_feedback(id) AS versao_avaliacao
   FROM feedbacks_360 f;
```

## public.vw_ferias_resumo (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.ferias |
| populada | n/a |
| comentário |  |


```sql
SELECT f.id,
    f.colaborador_id,
    f.data_inicio,
    f.data_fim,
    f.status,
    f.dias_gozo,
    f.dias_abono,
    f.empresa_id,
    c.nome_completo,
    c.departamento,
    c.cargo,
    c.data_admissao
   FROM ferias f
     JOIN colaboradores c ON c.id = f.colaborador_id;
```

## public.vw_folha_compliance (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.audit_log |
| populada | n/a |
| comentário | Tenant-scoped payroll compliance trail. Legacy CLOSE/REOPEN rows are normalized to PAYROLL_CLOSE/PAYROLL_REOPEN; security_invoker preserves audit_log RLS. |


```sql
SELECT id AS audit_id,
    created_at AS event_at,
        CASE acao
            WHEN 'CLOSE'::text THEN 'PAYROLL_CLOSE'::text
            WHEN 'REOPEN'::text THEN 'PAYROLL_REOPEN'::text
            ELSE acao
        END AS acao,
    registro_id AS folha_id,
    COALESCE(empresa_id,
        CASE
            WHEN COALESCE(dados_novos ->> 'empresaId'::text, dados_novos ->> 'empresa_id'::text, ''::text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text THEN COALESCE(dados_novos ->> 'empresaId'::text, dados_novos ->> 'empresa_id'::text)::uuid
            ELSE NULL::uuid
        END) AS empresa_id,
    COALESCE(dados_novos ->> 'competencia'::text, (dados_novos -> 'integritySnapshot'::text) ->> 'competencia'::text) AS competencia,
    NULLIF(dados_novos ->> 'version_nova'::text, ''::text)::integer AS version_nova,
    NULLIF(dados_novos ->> 'version_anterior'::text, ''::text)::integer AS version_anterior,
    COALESCE(dados_novos ->> 'audit_hash'::text, dados_novos ->> 'integrity_hash'::text) AS integrity_hash,
    NULLIF(dados_novos ->> 'total_proventos'::text, ''::text)::numeric AS total_proventos,
    NULLIF(dados_novos ->> 'total_descontos'::text, ''::text)::numeric AS total_descontos,
    NULLIF(dados_novos ->> 'total_liquido'::text, ''::text)::numeric AS total_liquido,
    NULLIF(dados_novos ->> 'total_fgts'::text, ''::text)::numeric AS total_fgts,
    NULLIF(dados_novos ->> 'holerites_count'::text, ''::text)::integer AS holerites_count,
    NULLIF(dados_novos ->> 'itens_count'::text, ''::text)::integer AS itens_count,
    dados_novos ->> 'motivo'::text AS motivo,
    (dados_novos ->> 'override_esocial'::text)::boolean AS override_esocial,
    user_id,
    user_email,
    ip_address,
    dados_novos
   FROM audit_log a
  WHERE tabela = 'folhas_pagamento'::text AND (acao = ANY (ARRAY['PAYROLL_CALC'::text, 'PAYROLL_CLOSE'::text, 'PAYROLL_REOPEN'::text, 'CLOSE'::text, 'REOPEN'::text]));
```

## public.vw_folha_ponto_mensal (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.registros_ponto |
| populada | n/a |
| comentário |  |


```sql
SELECT rp.colaborador_id,
    c.nome_completo,
    c.empresa_id,
    c.departamento,
    to_char(rp.data::timestamp with time zone, 'YYYY-MM'::text) AS mes_referencia,
    count(*) AS dias_trabalhados,
    count(*) FILTER (WHERE rp.entrada_1 IS NOT NULL AND rp.saida_1 IS NOT NULL) AS dias_completos
   FROM registros_ponto rp
     JOIN colaboradores c ON c.id = rp.colaborador_id
  GROUP BY rp.colaborador_id, c.nome_completo, c.empresa_id, c.departamento, (to_char(rp.data::timestamp with time zone, 'YYYY-MM'::text));
```

## public.vw_kpi_absenteismo (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.faltas |
| populada | n/a |
| comentário |  |


```sql
SELECT to_char(data::timestamp with time zone, 'YYYY-MM'::text) AS mes,
    count(*) AS total_faltas,
    sum(dias_total) AS dias_faltados,
    empresa_id
   FROM faltas f
  WHERE data >= (CURRENT_DATE - '1 year'::interval)
  GROUP BY (to_char(data::timestamp with time zone, 'YYYY-MM'::text)), empresa_id
  ORDER BY (to_char(data::timestamp with time zone, 'YYYY-MM'::text));
```

## public.vw_kpi_beneficios_custo (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.beneficios |
| populada | n/a |
| comentário |  |


```sql
SELECT tipo,
    empresa_id,
    count(*) AS total_beneficios,
    sum(COALESCE(valor, 0::numeric)) AS valor_total,
    sum(COALESCE(valor_empresa, 0::numeric)) AS custo_empresa,
    sum(COALESCE(valor_colaborador, 0::numeric)) AS custo_colaborador,
    count(DISTINCT colaborador_id) AS colaboradores_vinculados
   FROM beneficios b
  WHERE ativo = true
  GROUP BY tipo, empresa_id;
```

## public.vw_kpi_ponto_resumo (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.registros_ponto |
| populada | n/a |
| comentário |  |


```sql
SELECT rp.colaborador_id,
    c.nome_completo,
    c.empresa_id,
    to_char(rp.data::timestamp with time zone, 'YYYY-MM'::text) AS mes,
    count(*) AS dias_registrados,
    count(*) FILTER (WHERE rp.entrada_1 IS NOT NULL) AS dias_com_entrada,
    count(*) FILTER (WHERE rp.saida_1 IS NOT NULL) AS dias_com_saida
   FROM registros_ponto rp
     JOIN colaboradores c ON c.id = rp.colaborador_id
  GROUP BY rp.colaborador_id, c.nome_completo, c.empresa_id, (to_char(rp.data::timestamp with time zone, 'YYYY-MM'::text));
```

## public.vw_kpi_turnover (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.desligamentos |
| populada | n/a |
| comentário |  |


```sql
SELECT to_char(data_desligamento::timestamp with time zone, 'YYYY-MM'::text) AS mes,
    count(*) AS desligamentos_mes,
    ( SELECT count(*) AS count
           FROM colaboradores
          WHERE colaboradores.status = 'ativo'::status_colaborador) AS ativos_atual,
    round(count(*)::numeric / NULLIF(( SELECT count(*) AS count
           FROM colaboradores
          WHERE colaboradores.status = 'ativo'::status_colaborador), 0)::numeric * 100::numeric, 2) AS taxa_turnover
   FROM desligamentos d
  WHERE data_desligamento IS NOT NULL AND data_desligamento >= (CURRENT_DATE - '1 year'::interval)
  GROUP BY (to_char(data_desligamento::timestamp with time zone, 'YYYY-MM'::text))
  ORDER BY (to_char(data_desligamento::timestamp with time zone, 'YYYY-MM'::text));
```

## public.vw_matriz_nine_box (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.feedbacks_360 |
| populada | n/a |
| comentário |  |


```sql
SELECT f.avaliado_id,
    c.nome_completo,
    f.empresa_id,
    avg(f.performance)::numeric(3,2) AS media_performance,
    avg(f.potencial)::numeric(3,2) AS media_potencial,
    count(f.id) AS total_avaliacoes
   FROM feedbacks_360 f
     JOIN colaboradores c ON f.avaliado_id = c.id
  WHERE f.status = 'concluido'::text
  GROUP BY f.avaliado_id, c.nome_completo, f.empresa_id;
```

## public.vw_metricas_fila (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.fila_processamento |
| populada | n/a |
| comentário |  |


```sql
SELECT tipo_tarefa,
    count(*) FILTER (WHERE status = 'completed'::text) AS sucessos,
    count(*) FILTER (WHERE status = 'failed'::text) AS falhas,
    avg(EXTRACT(epoch FROM updated_at - created_at)) AS tempo_medio_segundos
   FROM fila_processamento
  GROUP BY tipo_tarefa;
```

## public.vw_passivo_trabalhista_consolidado (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.periodos_aquisitivos |
| populada | n/a |
| comentário |  |


```sql
SELECT c.id AS colaborador_id,
    c.nome_completo,
    c.salario_base,
    c.data_admissao,
    pa.data_inicio AS periodo_aquisitivo_inicio,
    pa.data_fim AS periodo_aquisitivo_fim,
    LEAST(30::numeric, floor(EXTRACT(day FROM now() - pa.data_inicio::timestamp with time zone) / 30::numeric) * 2.5) AS dias_direito,
    c.salario_base / 30::numeric * LEAST(30::numeric, floor(EXTRACT(day FROM now() - pa.data_inicio::timestamp with time zone) / 30::numeric) * 2.5) * 1.33 AS valor_ferias_projetado,
        CASE
            WHEN (pa.data_fim + '9 mons'::interval) < now() THEN 'critico'::text
            WHEN (pa.data_fim + '6 mons'::interval) < now() THEN 'alerta'::text
            ELSE 'normal'::text
        END AS status_risco_ferias
   FROM colaboradores c
     JOIN periodos_aquisitivos pa ON c.id = pa.colaborador_id
  WHERE c.status = 'ativo'::status_colaborador AND pa.status::text = 'aberto'::text;
```

## public.vw_saldo_compensacao_mensal (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.colaboradores, public.registros_ponto |
| populada | n/a |
| comentário |  |


```sql
SELECT rp.colaborador_id,
    c.nome_completo,
    rp.empresa_id,
    to_char(rp.data::timestamp with time zone, 'YYYY-MM'::text) AS competencia,
    count(*) AS dias_trabalhados,
    sum(EXTRACT(epoch FROM COALESCE(rp.horas_extras, '00:00:00'::interval))::integer / 60) AS minutos_extras,
    sum(EXTRACT(epoch FROM COALESCE(rp.horas_falta, '00:00:00'::interval))::integer / 60) AS minutos_falta,
    sum(COALESCE(rp.atraso_minutos, 0)) AS total_atrasos_minutos
   FROM registros_ponto rp
     JOIN colaboradores c ON c.id = rp.colaborador_id
  WHERE rp.horas_trabalhadas IS NOT NULL
  GROUP BY rp.colaborador_id, c.nome_completo, rp.empresa_id, (to_char(rp.data::timestamp with time zone, 'YYYY-MM'::text));
```
