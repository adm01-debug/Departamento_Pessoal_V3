-- Sidecar de 20261119180000_versiona_ddl_orfao_dp.sql. SÓ LEITURA.
--
-- CONTRATO DO GATE: saída VAZIA é falha, e toda linha não vazia tem de ser
-- literalmente `ok`. Cada asserção é um `CASE ... ELSE 'FALHOU: …' END`, que
-- SEMPRE emite uma linha — o gate reprova E diz qual caiu.
--
-- Esta migration é DDL de reconciliação: ela não muda o canônico (lá tudo já
-- existe). Então as asserções provam o ESTADO, que é o que vale tanto no
-- canônico quanto num banco recriado.

-- 1. Os 3 triggers de imutabilidade, lidos do catálogo COM o tipo certo.
--    Não basta o nome existir: BEFORE e ROW importam. tgtype: 1=ROW, 2=BEFORE,
--    4=INSERT, 8=DELETE, 16=UPDATE → BEFORE UPDATE ROW=19, BEFORE DELETE
--    ROW=11, BEFORE INSERT ROW=7.
WITH t AS (
  SELECT
    count(*) FILTER (WHERE tgname = 'dp_audit_log_no_update' AND tgtype = 19) AS upd,
    count(*) FILTER (WHERE tgname = 'dp_audit_log_no_delete' AND tgtype = 11) AS del,
    count(*) FILTER (WHERE tgname = 'dp_audit_log_integrity_check' AND tgtype = 7) AS ins
  FROM pg_trigger
  WHERE tgrelid = 'public.dp_audit_log'::regclass AND NOT tgisinternal
)
SELECT CASE
         WHEN upd = 1 AND del = 1 AND ins = 1 THEN 'ok'
         ELSE 'FALHOU: triggers de imutabilidade — no_update=' || upd || ' no_delete=' || del || ' integrity=' || ins
       END
FROM t;

-- 2. Os triggers apontam para as funções versionadas, não para outra coisa.
WITH f AS (
  SELECT count(*) AS n
  FROM pg_trigger tg
  JOIN pg_proc p ON p.oid = tg.tgfoid
  WHERE tg.tgrelid = 'public.dp_audit_log'::regclass
    AND NOT tg.tgisinternal
    AND (
      (tg.tgname IN ('dp_audit_log_no_update', 'dp_audit_log_no_delete') AND p.proname = 'dp_audit_log_immutable')
      OR (tg.tgname = 'dp_audit_log_integrity_check' AND p.proname = 'dp_audit_log_prevent_future')
    )
)
SELECT CASE WHEN n = 3 THEN 'ok' ELSE 'FALHOU: ' || n || ' de 3 triggers ligados a funcao certa' END FROM f;

-- 3. Particionamento: a tabela é particionada por RANGE em created_at, tem as
--    7 mensais e a DEFAULT (para-raios de linha fora de faixa).
WITH p AS (
  SELECT
    (SELECT relkind FROM pg_class WHERE oid = 'public.dp_audit_log'::regclass) AS kind,
    (SELECT count(*) FROM pg_inherits WHERE inhparent = 'public.dp_audit_log'::regclass) AS filhas,
    (SELECT count(*) FROM pg_class WHERE relname = 'dp_audit_log_default' AND relnamespace = 'public'::regnamespace) AS padrao
)
SELECT CASE
         WHEN kind = 'p' AND filhas >= 8 AND padrao = 1 THEN 'ok'
         ELSE 'FALHOU: particionamento — relkind=' || kind::text || ' filhas=' || filhas || ' default=' || padrao
       END
FROM p;

-- 4. Os 5 CHECKs de domínio do log.
WITH c AS (
  SELECT count(*) AS n
  FROM pg_constraint
  WHERE conrelid = 'public.dp_audit_log'::regclass
    AND contype = 'c'
    AND conname IN (
      'dp_audit_log_actor_role_valid',
      'dp_audit_log_event_length',
      'dp_audit_log_event_nonempty',
      'dp_audit_log_event_type_valid',
      'dp_audit_log_payload_must_be_object'
    )
)
SELECT CASE WHEN n = 5 THEN 'ok' ELSE 'FALHOU: ' || n || ' de 5 CHECKs de dp_audit_log' END FROM c;

-- 5. PK composta (id, created_at) — particionamento por RANGE exige a chave de
--    partição na PK, então isto é estrutural, não estilo.
WITH k AS (
  SELECT count(*) AS n
  FROM pg_constraint
  WHERE conrelid = 'public.dp_audit_log'::regclass
    AND contype = 'p'
    AND conname = 'dp_audit_log_pkey'
    AND (
      SELECT array_agg(a.attname::text ORDER BY a.attname)
      FROM unnest(conkey) AS u(attnum)
      JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = u.attnum
    ) = ARRAY['created_at', 'id']
)
SELECT CASE WHEN n = 1 THEN 'ok' ELSE 'FALHOU: PK de dp_audit_log nao e (id, created_at)' END FROM k;

-- 6. Os 7 índices do log, por nome.
WITH i AS (
  SELECT count(*) AS n
  FROM pg_class c
  JOIN pg_index x ON x.indexrelid = c.oid
  WHERE x.indrelid = 'public.dp_audit_log'::regclass
    AND c.relname IN (
      'dp_audit_log_created_at_idx', 'dp_audit_log_event_idx', 'dp_audit_log_event_type_idx',
      'dp_audit_log_actor_idx', 'dp_audit_log_ip_idx', 'dp_audit_log_request_idx',
      'dp_audit_log_payload_gin'
    )
)
SELECT CASE WHEN n = 7 THEN 'ok' ELSE 'FALHOU: ' || n || ' de 7 indices de dp_audit_log' END FROM i;

-- 7. RLS ligada nas duas tabelas.
WITH r AS (
  SELECT
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.dp_audit_log'::regclass) AS log,
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.dp_retention_policy'::regclass) AS ret
)
SELECT CASE WHEN log AND ret THEN 'ok' ELSE 'FALHOU: RLS — dp_audit_log=' || log::text || ' dp_retention_policy=' || ret::text END FROM r;

-- 7b. RLS em CADA partição, não só no pai. Consulta direta a uma filha usa a
--     RLS da filha; no canônico as 9 relações têm RLS ligada.
WITH f AS (
  SELECT
    count(*) AS total,
    count(*) FILTER (WHERE c.relrowsecurity) AS com_rls
  FROM pg_inherits i
  JOIN pg_class c ON c.oid = i.inhrelid
  WHERE i.inhparent = 'public.dp_audit_log'::regclass
)
SELECT CASE
         WHEN total > 0 AND total = com_rls THEN 'ok'
         ELSE 'FALHOU: ' || (total - com_rls) || ' de ' || total || ' particao(oes) sem RLS'
       END
FROM f;

-- 7c. As 3 policies do canônico. RLS ligada SEM policy significa que ninguém
--     lê — e a 20261115000000:5,8 declara preservar a leitura do próprio
--     evento. Esta asserção impede versionar RLS sem o canal de leitura.
WITH pol AS (
  SELECT
    count(*) FILTER (WHERE policyname = 'auth_own_events' AND cmd = 'SELECT') AS proprio,
    count(*) FILTER (WHERE policyname = 'service_role_insert_only' AND cmd = 'INSERT') AS ins,
    count(*) FILTER (WHERE policyname = 'service_role_select' AND cmd = 'SELECT') AS sel
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'dp_audit_log'
)
SELECT CASE
         WHEN proprio = 1 AND ins = 1 AND sel = 1 THEN 'ok'
         ELSE 'FALHOU: policies — auth_own_events=' || proprio || ' insert_only=' || ins || ' select=' || sel
       END
FROM pol;

-- 7d. A policy do próprio evento filtra por auth.uid(), não é aberta.
WITH q AS (
  SELECT count(*) AS n
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'dp_audit_log'
    AND policyname = 'auth_own_events'
    AND qual LIKE '%actor_user_id%' AND qual LIKE '%uid()%'
)
SELECT CASE WHEN n = 1 THEN 'ok' ELSE 'FALHOU: auth_own_events nao filtra por actor_user_id = auth.uid()' END FROM q;

-- 7e. authenticated tem SELECT e NAO tem INSERT/UPDATE/DELETE: a
--     20261115000000 revoga DML de authenticated e preserva a leitura. Se esta
--     migration tivesse concedido DML, teria desfeito aquela.
WITH g AS (
  SELECT
    has_table_privilege('authenticated', 'public.dp_audit_log', 'SELECT') AS le,
    (has_table_privilege('authenticated', 'public.dp_audit_log', 'INSERT')
     OR has_table_privilege('authenticated', 'public.dp_audit_log', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.dp_audit_log', 'DELETE')) AS escreve
)
SELECT CASE
         WHEN le AND NOT escreve THEN 'ok'
         ELSE 'FALHOU: privilegio de authenticated — select=' || le::text || ' escrita=' || escreve::text
       END
FROM g;

-- 8. O papel que 20261020120000 exige, e a herança do usuário de login.
WITH p AS (
  SELECT
    (SELECT count(*) FROM pg_roles WHERE rolname = 'dp_mcp_role') AS papel,
    (SELECT count(*) FROM pg_roles WHERE rolname = 'dp_mcp_user') AS usuario,
    (SELECT count(*) FROM pg_auth_members m
       JOIN pg_roles h ON h.oid = m.roleid JOIN pg_roles mb ON mb.oid = m.member
       WHERE h.rolname = 'dp_mcp_role' AND mb.rolname = 'dp_mcp_user') AS heranca
)
SELECT CASE
         WHEN papel = 1 AND usuario = 1 AND heranca = 1 THEN 'ok'
         ELSE 'FALHOU: papeis — dp_mcp_role=' || papel || ' dp_mcp_user=' || usuario || ' heranca=' || heranca
       END
FROM p;

-- 9. `dp_mcp_user` NÃO tem senha definida nesta migration. Um papel com LOGIN
--    e sem senha não autentica, então o arquivo versionado não cria caminho de
--    acesso. Se alguém puser senha por migration no futuro, esta asserção cai.
--    (No canônico de hoje o papel JÁ tinha senha, posta fora de migration —
--    por isso a asserção aceita os dois casos e só proíbe senha vinda daqui.)
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dp_mcp_user') THEN 'ok'
         ELSE 'FALHOU: dp_mcp_user ausente'
       END;

-- 10. dp_retention_policy: unique key que impede política duplicada, e o
--     índice de `enabled`. Sem a unique, o `SELECT id ... LIMIT 1` dos cron
--     jobs de 20261014120000:335-336 escolheria arbitrariamente.
WITH r AS (
  SELECT
    (SELECT count(*) FROM pg_constraint
      WHERE conrelid = 'public.dp_retention_policy'::regclass
        AND conname = 'dp_retention_policy_table_name_retention_days_action_key') AS uk,
    (SELECT count(*) FROM pg_class c JOIN pg_index x ON x.indexrelid = c.oid
      WHERE x.indrelid = 'public.dp_retention_policy'::regclass
        AND c.relname = 'dp_retention_policy_enabled_idx') AS idx,
    (SELECT count(*) FROM pg_constraint
      WHERE conrelid = 'public.dp_retention_policy'::regclass AND contype = 'c'
        AND conname IN ('dp_ret_action', 'dp_ret_days')) AS checks
)
SELECT CASE
         WHEN uk = 1 AND idx = 1 AND checks = 2 THEN 'ok'
         ELSE 'FALHOU: dp_retention_policy — unique=' || uk || ' idx=' || idx || ' checks=' || checks
       END
FROM r;

-- 11. Esta migration NÃO semeia política de retenção. Ligar retenção é regra
--     de negócio do dono. A asserção não exige contagem (o canônico tem 2
--     linhas pré-existentes); exige que nada aqui tenha ligado uma política:
--     nenhuma linha pode estar `enabled` e fora de `dry_run` sem decisão
--     registrada. Se o dono ligar depois, troca esta asserção no mesmo PR.
WITH r AS (
  SELECT count(*) AS n FROM public.dp_retention_policy WHERE enabled AND NOT dry_run
)
SELECT CASE
         WHEN n = 0 THEN 'ok'
         ELSE 'FALHOU: ' || n || ' politica(s) de retencao ligada(s) sem decisao do dono'
       END
FROM r;
