-- Inventario do banco canonico (so leitura) para inventario/estado/banco.json.
--
-- Uso (credencial viva):  DATABASE_URL=... node scripts/inventario/gerar-banco.mjs
--                         (no CI: secret SUPABASE_DB_URL_READONLY, role ci_auditor)
-- Uso (agente com MCP):   rodar CADA secao abaixo no banco canonico, juntar as respostas num
--                         objeto { "<secao>": <valor de j> } e
--                         node scripts/inventario/gerar-banco.mjs --entrada <arquivo.json>
--
-- Cada secao comeca em "-- @secao <nome>" e devolve UMA linha com UMA coluna `j` (JSON).
-- As secoes rodam separadas de proposito: o ci_auditor so le catalogo (sem public, sem ledger,
-- sem historico do cron); secao sem permissao vira null + aviso, sem derrubar as outras.
-- Nada de texto livre que possa carregar segredo: de cron.job sai so o nome das funcoes chamadas
-- (nunca o command, que pode ter URL/cabecalho). Ordem de toda lista e explicita (diff estavel).

-- @secao resumo
SELECT jsonb_build_object(
  'postgres', current_setting('server_version'),
  'papel', current_user,
  'papel_ignora_rls', (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user),
  'tabelas_public', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')),
  'tabelas_sem_rls', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                       WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity),
  'policies', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'),
  'funcoes_public', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                      WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')),
  'funcoes_security_definer', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                                WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p') AND p.prosecdef),
  'views_public', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')),
  'triggers_public', (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
                       JOIN pg_namespace n ON n.oid = c.relnamespace
                      WHERE n.nspname = 'public' AND NOT t.tgisinternal),
  'extensoes', (SELECT coalesce(jsonb_agg(extname ORDER BY extname), '[]'::jsonb) FROM pg_extension),
  'max_connections', current_setting('max_connections')::int,
  'tamanho_bytes', pg_database_size(current_database())
) AS j;

-- @secao tabelas
-- Linhas: count(*) exato so quando o papel pode ler a tabela e a estimativa do planner
-- (reltuples, persiste entre reinicios) fica abaixo de 200 mil; senao, a estimativa
-- (reltuples = -1: tabela nunca analisada -> null). O ci_auditor nao le public: sai estimativa.
WITH base AS (
  SELECT c.oid, c.relname AS nome, c.relrowsecurity AS rls, c.relforcerowsecurity AS rls_forcado,
         c.reltuples, pg_total_relation_size(c.oid)::bigint AS bytes,
         has_table_privilege(c.oid, 'SELECT') AS legivel
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
),
corpos AS (  -- tudo no banco que pode citar uma tabela: funcoes e views do public
  SELECT p.prosrc AS txt FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
  UNION ALL
  SELECT pg_get_viewdef(c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
),
policies AS (
  SELECT tablename AS nome, count(*)::int AS n,
         bool_or(coalesce(qual, '') || ' ' || coalesce(with_check, '') ~ '\mempresa_id\M') AS cita_empresa
    FROM pg_policies WHERE schemaname = 'public' GROUP BY 1
),
gatilhos AS (
  SELECT t.tgrelid AS oid, count(*)::int AS n FROM pg_trigger t WHERE NOT t.tgisinternal GROUP BY 1
),
colunas AS (
  SELECT a.attrelid AS oid, bool_or(a.attname = 'empresa_id') AS tem_empresa_id,
         bool_or(a.attname = 'deleted_at') AS tem_deleted_at
    FROM pg_attribute a WHERE a.attnum > 0 AND NOT a.attisdropped GROUP BY 1
)
SELECT coalesce(jsonb_agg(jsonb_build_object(
         'nome', b.nome,
         'rls', b.rls,
         'rls_forcado', b.rls_forcado,
         'policies', coalesce(p.n, 0),
         'policy_cita_empresa_id', coalesce(p.cita_empresa, false),
         'tem_empresa_id', coalesce(co.tem_empresa_id, false),
         'soft_delete', coalesce(co.tem_deleted_at, false),
         'triggers', coalesce(g.n, 0),
         'linhas', CASE WHEN b.legivel AND b.reltuples < 200000
                        THEN (xpath('/row/n/text()',
                               query_to_xml(format('SELECT count(*) AS n FROM public.%I', b.nome), false, true, '')))[1]::text::bigint
                        WHEN b.reltuples < 0 THEN NULL
                        ELSE b.reltuples::bigint END,
         'linhas_exatas', b.legivel AND b.reltuples < 200000,
         'bytes', b.bytes,
         'citada_no_banco', EXISTS (SELECT 1 FROM corpos c WHERE c.txt ~ ('\m' || b.nome || '\M'))
       ) ORDER BY b.nome), '[]'::jsonb) AS j
  FROM base b
  LEFT JOIN policies p ON p.nome = b.nome
  LEFT JOIN gatilhos g ON g.oid = b.oid
  LEFT JOIN colunas co ON co.oid = b.oid;

-- @secao cron_jobs
-- O pg_cron protege cron.job com RLS (username = current_user): um papel sem BYPASSRLS que nao
-- e dono dos jobs ve lista vazia sem erro. `visivel` diz se a lista e confiavel.
SELECT jsonb_build_object(
  'visivel', NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = 'cron.job'::regclass)
             OR (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user),
  'config', (SELECT jsonb_object_agg(name, setting ORDER BY name) FROM pg_settings
              WHERE name IN ('cron.use_background_workers', 'cron.max_running_jobs', 'max_worker_processes')),
  'jobs', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'nome', j.jobname,
             'agenda', j.schedule,
             'ativo', j.active,
             'chama', (SELECT coalesce(jsonb_agg(DISTINCT m[1] ORDER BY m[1]), '[]'::jsonb)
                         FROM regexp_matches(j.command, '((?:public|net|cron)\.[a-z_0-9]+)\s*\(', 'g') AS m)
           ) ORDER BY j.jobname), '[]'::jsonb)
      FROM cron.job j
  )
) AS j;

-- @secao cron_execucoes
-- Exige SELECT em cron.job_run_details (o ci_auditor hoje nao tem: a secao sai null).
WITH execucoes AS (
  SELECT d.jobid, d.status, d.return_message, d.start_time, d.end_time
    FROM cron.job_run_details d WHERE d.start_time > now() - interval '7 days'
),
por_job AS (
  SELECT e.jobid,
         count(*) FILTER (WHERE e.start_time > now() - interval '24 hours')::int AS exec_24h,
         count(*) FILTER (WHERE e.start_time > now() - interval '24 hours' AND e.status = 'failed')::int AS falhas_24h,
         count(*)::int AS exec_7d,
         count(*) FILTER (WHERE e.status = 'failed')::int AS falhas_7d,
         max(e.start_time) FILTER (WHERE e.status = 'failed') AS ultima_falha,
         round(max(extract(epoch FROM e.end_time - e.start_time)) FILTER (WHERE e.status = 'succeeded'))::int AS duracao_max_s_7d
    FROM execucoes e GROUP BY e.jobid
),
por_hora AS (
  SELECT date_trunc('hour', e.start_time) AS hora, count(*)::int AS execucoes,
         count(*) FILTER (WHERE e.status = 'failed')::int AS falhas
    FROM execucoes e GROUP BY 1
)
SELECT jsonb_build_object(
  'por_job', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'nome', j.jobname,
             'execucoes_24h', coalesce(pj.exec_24h, 0),
             'falhas_24h', coalesce(pj.falhas_24h, 0),
             'execucoes_7d', coalesce(pj.exec_7d, 0),
             'falhas_7d', coalesce(pj.falhas_7d, 0),
             'taxa_falha_7d_pct', CASE WHEN coalesce(pj.exec_7d, 0) = 0 THEN 0
                                       ELSE round(100.0 * pj.falhas_7d / pj.exec_7d, 1) END,
             'ultima_falha', to_char(pj.ultima_falha AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
             'duracao_max_s_7d', pj.duracao_max_s_7d
           ) ORDER BY j.jobname), '[]'::jsonb)
      FROM cron.job j LEFT JOIN por_job pj ON pj.jobid = j.jobid
  ),
  -- Hora com mais da metade das execucoes falhando: o cron ficou parado naquela hora.
  'horas_paradas_7d', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'hora', to_char(h.hora AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24":00Z"'),
             'execucoes', h.execucoes, 'falhas', h.falhas) ORDER BY h.hora), '[]'::jsonb)
      FROM por_hora h WHERE h.falhas * 2 > h.execucoes
  ),
  'historico', jsonb_build_object(
    'linhas', (SELECT count(*) FROM cron.job_run_details),
    'mais_de_7_dias', (SELECT count(*) FROM cron.job_run_details WHERE start_time <= now() - interval '7 days'),
    'bytes', pg_total_relation_size('cron.job_run_details')
  )
) AS j;

-- @secao ledger
-- Exige SELECT em supabase_migrations.schema_migrations (o ci_auditor hoje nao tem: sai null).
SELECT jsonb_build_object(
  'registros', (SELECT count(*) FROM supabase_migrations.schema_migrations),
  'versao_max', (SELECT max(version) FROM supabase_migrations.schema_migrations)
) AS j;
