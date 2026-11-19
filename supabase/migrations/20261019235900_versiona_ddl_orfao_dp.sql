-- ============================================================================
-- VERSIONA O DDL ÓRFÃO DA FAMÍLIA dp_* — destrava o replay a partir da `main`
--
-- ADITIVA E IDEMPOTENTE. Nenhum DROP de dado, nenhum DELETE, nenhum seed.
-- No canônico de hoje é NO-OP: tudo aqui já existe lá. O ganho é para QUALQUER
-- banco novo (preview, ambiente de teste, DR), onde hoje nada disso nasce.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ VERSÃO ESCOLHIDA DE PROPÓSITO: 20261019235900, ou seja ANTES do primeiro ║
-- ║ arquivo que depende destes objetos (20261020120000). A primeira versão   ║
-- ║ deste arquivo era 20261119180000 e, por rodar DEPOIS dos dependentes,    ║
-- ║ não destravava replay nenhum — achado de revisão, e estava certo.        ║
-- ║                                                                          ║
-- ║ Renumerar é seguro aqui, e isso foi verificado, não suposto:             ║
-- ║  • o arquivo nunca foi aplicado em lugar algum, então não há linha de    ║
-- ║    ledger para contradizer;                                             ║
-- ║  • o canonical-migrations.yml NÃO usa `supabase db push`: ele copia uma   ║
-- ║    LISTA EXPLÍCITA para um stage e aplica com \i numa transação          ║
-- ║    (linhas 215, 245 e 319), inserindo a linha do ledger ele mesmo. Nada  ║
-- ║    no repo impõe ordem monotônica de versão;                            ║
-- ║  • a dependência desta migration (as funções de trigger, criadas em      ║
-- ║    20260912140000) é ANTERIOR a 20261019235900, então a ordem fica       ║
-- ║    coerente nas duas pontas.                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ OS DOIS PONTOS QUE ABORTAVAM O REPLAY, medidos — e que esta migration,   ║
-- ║ na posição 20261019235900, passa a satisfazer ANTES de cada um:          ║
-- ║                                                                          ║
-- ║  1. `20261115000000_revoke_dml_audit_log_anon_auth.sql:14-16` tem         ║
-- ║     `RAISE EXCEPTION 'preflight: nenhuma relação dp_audit_log*           ║
-- ║     encontrada'` — e NENHUMA migration cria `dp_audit_log`.              ║
-- ║  2. `20261020120000_ninebox_permissoes_homologacao_versiona_tabela.sql:62`║
-- ║     tem `GRANT SELECT ... TO dp_mcp_role` solto, e o sidecar dela exige   ║
-- ║     `grantee = 'dp_mcp_role'` — e NENHUMA migration cria esse papel. O    ║
-- ║     único `CREATE ROLE` de toda a `main` é `ci_auditor`                   ║
-- ║     (`20261015160000_ci_auditor_readonly_role.sql:19`).                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- ORIGEM DO DRIFT: 30 versões constam aplicadas no ledger do canônico com nome
-- real, mas o arquivo na `main` é um stub no-op (`*_placeholder_ledger_remoto.sql`),
-- que afirma em comentário que "o conteúdo real já foi reconciliado fisicamente
-- no schema canônico". Isso é **meia-verdade**, e a varredura de 19/11/2026
-- mostrou onde: `20260912140000_replay_backfill_canonical_routines.sql` fez
-- backfill de 2 `CREATE TYPE` e 26 `CREATE OR REPLACE FUNCTION` e **zero**
-- `CREATE TABLE`/`VIEW`/`TRIGGER`/`INDEX`. Rotina e tipo foram reconciliados;
-- tabela, índice e TRIGGER não. O DDL deles só existe em
-- `supabase/baseline/20260831_canonical/canonical_schema.sql`, que nenhum
-- workflow aplica (`canonical-migrations.yml:215` copia só de
-- `supabase/migrations/`) e cuja ativação o runbook mantém bloqueada.
--
-- O PIOR CASO, e o que esta migration conserta primeiro: as funções
-- `dp_audit_log_immutable()` e `dp_audit_log_prevent_future()` SÃO versionadas
-- (`20260912140000:63,81`), mas os 3 TRIGGERS que as ligam à tabela não. Num
-- banco recriado as funções nascem e nada as chama: o log de auditoria aceita
-- UPDATE e DELETE, enquanto o `COMMENT ON TABLE` segue dizendo "IMUTÁVEL" e o
-- próprio `20260912140000:74` declara "DELETE proibido".
--
-- ESCOPO DELIBERADAMENTE LIMITADO ao que destrava o replay e devolve um
-- controle de integridade. FICA DE FORA, de propósito:
--   • `dp_mcp_config` — a tabela existe em produção com DUAS CREDENCIAIS BEARER
--     em texto claro (`auth_path_token`, `auth_api_key`). Versionar a tabela
--     sem resolver o segredo seria registrar o problema; o caminho é rotação +
--     secret store, decisão do dono. NADA sobre ela aqui.
--   • `dp_data_catalog`, `dp_environments`, `dp_backup_runbook`, `dp_audit_config`
--     e as 5 views `dp_*` — documentação materializada como dado; sem efeito em
--     controle e sem quebrar replay. Vão em PR própria se o dono quiser.
--   • papel `dp_ci_auditor` (existe com LOGIN, sem fonte) — nada na `main`
--     depende dele, então não bloqueia replay. Registrado, não criado aqui.
--   • SEED de `dp_retention_policy` — as 2 políticas de produção estão
--     `enabled=false`/`dry_run=true` e nunca rodaram. Qual janela de retenção
--     ligar é regra de negócio do dono, não de migration.
-- ============================================================================

-- ============================================================
-- 1. PAPÉIS — sem senha, de propósito
-- ============================================================
-- `dp_mcp_user` nasce com LOGIN mas SEM SENHA: um papel sem senha não
-- autentica, então isto NÃO cria caminho de acesso. A senha vive no secret
-- store do serviço e é aplicada fora de migration — nunca em arquivo
-- versionado. No canônico de hoje os dois papéis já existem e este bloco é
-- no-op (não toca senha nem atributo de papel existente).
DO $papeis$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dp_mcp_role') THEN
    CREATE ROLE dp_mcp_role WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
    RAISE NOTICE 'papel dp_mcp_role criado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dp_mcp_user') THEN
    CREATE ROLE dp_mcp_user WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 5;
    RAISE NOTICE 'papel dp_mcp_user criado SEM SENHA (definir no secret store)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members m
    JOIN pg_roles herdado ON herdado.oid = m.roleid
    JOIN pg_roles membro ON membro.oid = m.member
    WHERE herdado.rolname = 'dp_mcp_role' AND membro.rolname = 'dp_mcp_user'
  ) THEN
    GRANT dp_mcp_role TO dp_mcp_user;
  END IF;
END
$papeis$;

COMMENT ON ROLE dp_mcp_role IS 'Papel de infra do gateway MCP (NOLOGIN). Versionado em 20261019235900 após a varredura de 19/11/2026 constatar que existia no canônico sem fonte, e que 20261020120000 já dependia dele.';
COMMENT ON ROLE dp_mcp_user IS 'Usuário de login do gateway MCP, herda dp_mcp_role. Criado SEM senha por migration: a senha vem do secret store, nunca de arquivo versionado.';

-- ============================================================
-- 2. dp_audit_log — tabela particionada, PK, CHECKs e índices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dp_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event text NOT NULL,
  event_type text DEFAULT 'system'::text NOT NULL,
  actor_user_id uuid,
  actor_role text,
  ip_address inet,
  request_id uuid,
  session_id uuid,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT dp_audit_log_actor_role_valid CHECK (
    actor_role IS NULL
    OR actor_role = ANY (ARRAY['colaborador'::text, 'gestor'::text, 'rh'::text, 'admin'::text, 'sistema'::text, 'auditoria'::text])
  ),
  CONSTRAINT dp_audit_log_event_length CHECK (length(event) <= 200),
  CONSTRAINT dp_audit_log_event_nonempty CHECK (length(btrim(event)) > 0),
  CONSTRAINT dp_audit_log_event_type_valid CHECK (
    event_type = ANY (ARRAY['system'::text, 'user'::text, 'admin'::text, 'compliance'::text, 'security'::text, 'error'::text])
  ),
  CONSTRAINT dp_audit_log_payload_must_be_object CHECK (
    payload IS NULL OR jsonb_typeof(payload) = 'object'::text
  )
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE public.dp_audit_log IS 'Audit log Departamento Pessoal — IMUTÁVEL (sem UPDATE/DELETE de roles de aplicação). Particionado por mês. LGPD Art.37. Conteúdo: metadata de eventos — NÃO armazena PII raw no payload.';

-- PK composta: particionamento por RANGE exige a chave de partição na PK.
DO $pk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dp_audit_log_pkey' AND conrelid = 'public.dp_audit_log'::regclass
  ) THEN
    ALTER TABLE public.dp_audit_log ADD CONSTRAINT dp_audit_log_pkey PRIMARY KEY (id, created_at);
  END IF;
END
$pk$;

-- Partições: as mensais do período já existente no canônico + a DEFAULT, que
-- é o para-raios (linha fora de faixa não é recusada, cai na default).
-- Mês futuro é responsabilidade de `dp_create_next_partition()`, já versionada
-- em 20260912140000:186 e agendada em 20261014120000.
DO $parts$
DECLARE
  v_mes date := date '2026-07-01';
  v_nome text;
BEGIN
  WHILE v_mes < date '2027-02-01' LOOP
    v_nome := 'dp_audit_log_' || to_char(v_mes, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = v_nome AND relnamespace = 'public'::regnamespace) THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.dp_audit_log FOR VALUES FROM (%L) TO (%L)',
        v_nome, v_mes, (v_mes + interval '1 month')::date
      );
    END IF;
    -- RLS em CADA partição, não só no pai: RLS do pai governa a consulta VIA
    -- pai, mas consulta DIRETA a uma filha usa a RLS da filha. No canônico as
    -- 9 relações têm RLS ligada, e o AGENTS.md §5 exige RLS em tabela nova.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_nome);
    v_mes := (v_mes + interval '1 month')::date;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'dp_audit_log_default' AND relnamespace = 'public'::regnamespace) THEN
    CREATE TABLE public.dp_audit_log_default PARTITION OF public.dp_audit_log DEFAULT;
  END IF;
  ALTER TABLE public.dp_audit_log_default ENABLE ROW LEVEL SECURITY;
END
$parts$;

-- Índices no PAI: em tabela particionada eles se propagam para as partições.
CREATE INDEX IF NOT EXISTS dp_audit_log_created_at_idx ON public.dp_audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS dp_audit_log_event_idx ON public.dp_audit_log USING btree (event);
CREATE INDEX IF NOT EXISTS dp_audit_log_event_type_idx ON public.dp_audit_log USING btree (event_type);
CREATE INDEX IF NOT EXISTS dp_audit_log_actor_idx ON public.dp_audit_log USING btree (actor_user_id) WHERE (actor_user_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS dp_audit_log_ip_idx ON public.dp_audit_log USING btree (ip_address) WHERE (ip_address IS NOT NULL);
CREATE INDEX IF NOT EXISTS dp_audit_log_request_idx ON public.dp_audit_log USING btree (request_id) WHERE (request_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS dp_audit_log_payload_gin ON public.dp_audit_log USING gin (payload) WHERE (payload IS NOT NULL);

ALTER TABLE public.dp_audit_log ENABLE ROW LEVEL SECURITY;

-- As 3 policies do canônico. Sem policy nenhuma, RLS ligada significa que
-- NINGUÉM lê — e `20261115000000_revoke_dml_audit_log_anon_auth.sql:5,8`
-- declara preservar "SELECT authenticated filtrado por actor_user_id
-- (auth_own_events)". Versionar a RLS sem as policies deixaria um banco
-- recriado contradizendo esse contrato.
DROP POLICY IF EXISTS "auth_own_events" ON public.dp_audit_log;
CREATE POLICY "auth_own_events" ON public.dp_audit_log
  FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_insert_only" ON public.dp_audit_log;
CREATE POLICY "service_role_insert_only" ON public.dp_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_select" ON public.dp_audit_log;
CREATE POLICY "service_role_select" ON public.dp_audit_log
  FOR SELECT TO service_role
  USING (true);

-- GRANT MÍNIMO: só SELECT, só authenticated. A RLS filtra para o próprio
-- evento. NÃO concede INSERT nem toca em anon — seria desfazer a
-- 20261115000000, que revoga DML de anon/authenticated e ALL de anon.
GRANT SELECT ON public.dp_audit_log TO authenticated;

-- ============================================================
-- 3. OS 3 TRIGGERS DE IMUTABILIDADE — o coração desta migration
-- ============================================================
-- As funções já são versionadas (20260912140000:63 e :81); só o vínculo
-- faltava. Sem estes 3 triggers a tabela aceita UPDATE e DELETE.
-- audit-migration-style: allow-silent-drop — trigger recriado logo abaixo, o
-- DROP é só idempotência; não há janela em que a tabela fique sem o guard,
-- porque os três comandos rodam na mesma transação da migration.
DROP TRIGGER IF EXISTS dp_audit_log_no_update ON public.dp_audit_log;
CREATE TRIGGER dp_audit_log_no_update
  BEFORE UPDATE ON public.dp_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.dp_audit_log_immutable();

DROP TRIGGER IF EXISTS dp_audit_log_no_delete ON public.dp_audit_log;
CREATE TRIGGER dp_audit_log_no_delete
  BEFORE DELETE ON public.dp_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.dp_audit_log_immutable();

DROP TRIGGER IF EXISTS dp_audit_log_integrity_check ON public.dp_audit_log;
CREATE TRIGGER dp_audit_log_integrity_check
  BEFORE INSERT ON public.dp_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.dp_audit_log_prevent_future();

-- ============================================================
-- 4. dp_retention_policy — tabela, unique key e índice. SEM SEED.
-- ============================================================
-- `20261014120000_fix_cron_jobs_onda3b.sql:335-336` já agenda dois jobs que
-- fazem `SELECT id FROM public.dp_retention_policy WHERE ...`: migration
-- versionada dependendo de tabela não versionada.
CREATE TABLE IF NOT EXISTS public.dp_retention_policy (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  table_name text NOT NULL,
  retention_days integer NOT NULL,
  action text DEFAULT 'anonymize'::text NOT NULL,
  target_columns jsonb,
  dry_run boolean DEFAULT true NOT NULL,
  enabled boolean DEFAULT false NOT NULL,
  last_run_at timestamp with time zone,
  last_run_count integer,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT dp_ret_action CHECK (action = ANY (ARRAY['anonymize'::text, 'delete'::text, 'archive'::text])),
  CONSTRAINT dp_ret_days CHECK (retention_days > 0 AND retention_days <= 3650)
);

COMMENT ON TABLE public.dp_retention_policy IS 'Politicas retencao LGPD. dry_run+disabled por padrao — ativar somente apos validar.';

DO $ret$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dp_retention_policy_pkey' AND conrelid = 'public.dp_retention_policy'::regclass
  ) THEN
    ALTER TABLE public.dp_retention_policy ADD CONSTRAINT dp_retention_policy_pkey PRIMARY KEY (id);
  END IF;

  -- A unique key é o que impede política duplicada. Sem ela o
  -- `SELECT id ... LIMIT 1` dos cron jobs escolheria arbitrariamente.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dp_retention_policy_table_name_retention_days_action_key'
      AND conrelid = 'public.dp_retention_policy'::regclass
  ) THEN
    ALTER TABLE public.dp_retention_policy
      ADD CONSTRAINT dp_retention_policy_table_name_retention_days_action_key
      UNIQUE (table_name, retention_days, action);
  END IF;
END
$ret$;

CREATE INDEX IF NOT EXISTS dp_retention_policy_enabled_idx ON public.dp_retention_policy USING btree (enabled);

ALTER TABLE public.dp_retention_policy ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. PÓS-CONDIÇÕES fail-closed
-- ============================================================
DO $pos$
DECLARE
  v_trg int;
  v_part int;
  v_idx int;
BEGIN
  -- Os 3 triggers, pelo catálogo. tgtype: 2=BEFORE, 1=ROW, 4=INSERT,
  -- 8=DELETE, 16=UPDATE → BEFORE UPDATE ROW=19, BEFORE DELETE ROW=11,
  -- BEFORE INSERT ROW=7.
  SELECT count(*) INTO v_trg
  FROM pg_trigger
  WHERE tgrelid = 'public.dp_audit_log'::regclass
    AND NOT tgisinternal
    AND tgname IN ('dp_audit_log_no_update', 'dp_audit_log_no_delete', 'dp_audit_log_integrity_check');
  IF v_trg <> 3 THEN
    RAISE EXCEPTION 'pos-condicao: esperava os 3 triggers de imutabilidade em dp_audit_log, achei %', v_trg;
  END IF;

  -- Partições: 7 mensais + a default.
  SELECT count(*) INTO v_part
  FROM pg_inherits i
  JOIN pg_class c ON c.oid = i.inhrelid
  WHERE i.inhparent = 'public.dp_audit_log'::regclass;
  IF v_part < 8 THEN
    RAISE EXCEPTION 'pos-condicao: esperava ao menos 8 particoes em dp_audit_log, achei %', v_part;
  END IF;

  SELECT count(*) INTO v_idx
  FROM pg_index x
  JOIN pg_class c ON c.oid = x.indexrelid
  WHERE x.indrelid = 'public.dp_audit_log'::regclass;
  IF v_idx < 8 THEN
    RAISE EXCEPTION 'pos-condicao: esperava ao menos 8 indices (7 + PK) em dp_audit_log, achei %', v_idx;
  END IF;

  -- As 3 policies recriadas acima. Esta verificacao e fail-closed e cita
  -- pg_policies e a tabela: sem ela, um DROP POLICY cujo CREATE seguinte
  -- falhasse deixaria a tabela com RLS ligada e ZERO policies, ou seja
  -- ninguem lendo, e a migration passaria em silencio.
  IF (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dp_audit_log'
      AND policyname IN ('auth_own_events', 'service_role_insert_only', 'service_role_select')
  ) <> 3 THEN
    RAISE EXCEPTION 'pos-condicao: as 3 policies de dp_audit_log nao estao presentes apos o recreate';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dp_mcp_role') THEN
    RAISE EXCEPTION 'pos-condicao: papel dp_mcp_role ausente — 20261020120000 falharia';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dp_retention_policy_table_name_retention_days_action_key'
      AND conrelid = 'public.dp_retention_policy'::regclass
  ) THEN
    RAISE EXCEPTION 'pos-condicao: unique key de dp_retention_policy ausente';
  END IF;

  RAISE NOTICE '[versiona ddl orfao] triggers=% particoes=% indices=% — ok', v_trg, v_part, v_idx;
END
$pos$;
