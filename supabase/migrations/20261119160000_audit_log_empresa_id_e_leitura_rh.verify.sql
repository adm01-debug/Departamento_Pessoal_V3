-- Verify da 20261119160000. Contrato: cada linha não-vazia da saída = 'ok'.
--
-- Cada asserção é um CASE, não um WHERE: assim ela SEMPRE devolve uma linha.
-- Um `SELECT 'ok' WHERE <falso>` devolve ZERO linhas, e o gate — que só exige
-- "saída não-vazia e toda linha igual a 'ok'" — aceitaria em silêncio um
-- sidecar cujas asserções não rodaram. Com CASE, falha vira linha 'FALHOU: n'
-- e reprova o lote.

-- 1. a função genérica grava empresa_id nos TRÊS ramos (DELETE/UPDATE/INSERT)
SELECT CASE
  WHEN (
    SELECT count(*)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL (
      SELECT count(*) AS inserts_com_tenant
      FROM regexp_matches(pg_get_functiondef(p.oid), 'INSERT INTO public\.audit_log[^;]*empresa_id', 'g')
    ) m
    WHERE n.nspname = 'public' AND p.proname = 'log_audit_change' AND m.inserts_com_tenant = 3
  ) = 1 THEN 'ok'
  ELSE 'FALHOU: 1 log_audit_change nao grava empresa_id nos 3 ramos'
END;

-- 2. segue SECURITY DEFINER e com search_path fixado, comparando NOMES
--    (`proconfig` guarda "search_path=a, b, c" numa única string: tem de ser
--     quebrada por vírgula, senão a comparação de array nunca casa)
SELECT CASE
  WHEN EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'log_audit_change'
      AND p.prosecdef
      AND ARRAY['pg_catalog', 'public', 'pg_temp'] <@ (
        SELECT array_agg(btrim(elem))
        FROM unnest(p.proconfig) AS cfg
        CROSS JOIN LATERAL unnest(string_to_array(split_part(cfg, '=', 2), ',')) AS elem
        WHERE cfg LIKE 'search_path=%'
      )
  ) THEN 'ok'
  ELSE 'FALHOU: 2 log_audit_change sem SECURITY DEFINER ou sem search_path fixado'
END;

-- 3. policy nova: SELECT, authenticated, exige tenant e passa por
--    pode_gerir_rh — e NAO por pode_gerir_pessoas, que incluiria gestor
SELECT CASE
  WHEN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_log'
      AND policyname = 'audit_log_rh_read_empresa'
      AND cmd = 'SELECT'
      AND roles::text LIKE '%authenticated%'
      AND qual LIKE '%pode_gerir_rh%'
      AND qual LIKE '%IS NOT NULL%'
      AND qual NOT LIKE '%pode_gerir_pessoas%'
  ) THEN 'ok'
  ELSE 'FALHOU: 3 policy audit_log_rh_read_empresa ausente ou com escopo errado'
END;

-- 4. as 3 policies anteriores seguem existindo: nada de acesso foi removido
SELECT CASE
  WHEN (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log'
      AND policyname IN ('Admins podem ver todo audit_log', 'audit_log_self_read', 'audit_log_self_insert')
  ) = 3 THEN 'ok'
  ELSE 'FALHOU: 4 alguma das 3 policies anteriores de audit_log desapareceu'
END;

-- 5. RLS continua ligada em audit_log
SELECT CASE
  WHEN EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'audit_log' AND c.relrowsecurity
  ) THEN 'ok'
  ELSE 'FALHOU: 5 RLS desligada em audit_log'
END;

-- 6. nenhuma policy de audit_log passou a usar pode_gerir_pessoas (gestor):
--    a trilha carrega dados_anteriores/dados_novos com a linha inteira da
--    tabela auditada, PII incluída
SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log'
      AND (COALESCE(qual, '') LIKE '%pode_gerir_pessoas%' OR COALESCE(with_check, '') LIKE '%pode_gerir_pessoas%')
  ) THEN 'ok'
  ELSE 'FALHOU: 6 audit_log ganhou policy com pode_gerir_pessoas (inclui gestor)'
END;
