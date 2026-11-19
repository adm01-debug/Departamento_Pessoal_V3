-- Sidecar de 20261119150000_onboarding_auditoria_grava_trilha.sql
-- Só leitura. Uma linha 'ok' quando certo, zero linhas quando errado — o passo
-- "Executar sidecars de verificação" trata saída vazia como falha e exige que
-- toda linha não vazia seja literalmente `ok`.
--
-- Prova:
--   1. os DOIS triggers existem, AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW
--      (bits 1|4|8|16 ligados, 2=BEFORE desligado), apontando para a função;
--   2. a função é SECURITY DEFINER, com search_path fixo, e NÃO é executável
--      por PUBLIC/anon/authenticated;
--   3. o corpo grava `empresa_id` nos TRÊS ramos (INSERT, UPDATE, DELETE) — é a
--      razão de existir desta função em vez de reusar `log_audit_change`, que
--      não preenche tenant. Se alguém reescrever deixando um ramo sem
--      empresa_id, reprova;
--   4. `audit_log` segue com as 3 policies de antes: esta migration não muda
--      acesso de ninguém, só passa a gravar.
SELECT 'ok'
WHERE (
  SELECT count(*)
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND p.proname = 'onboarding_log_audit_change'
    AND (c.relname, t.tgname) IN (
      ('onboarding_colaborador', 'audit_onboarding_colaborador'),
      ('onboarding_tarefas', 'audit_onboarding_tarefas')
    )
    AND (t.tgtype & 1) = 1
    AND (t.tgtype & 4) = 4
    AND (t.tgtype & 8) = 8
    AND (t.tgtype & 16) = 16
    AND (t.tgtype & 2) = 0
) = 2
AND EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'onboarding_log_audit_change'
    AND p.prorettype = 'trigger'::regtype
    AND p.prosecdef
    AND EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, '{}'::text[])) AS cfg
      WHERE cfg LIKE 'search_path=%'
        AND ARRAY['pg_catalog', 'public', 'pg_temp'] <@ (
          SELECT array_agg(btrim(btrim(item), '"'))
          FROM unnest(string_to_array(substr(cfg, length('search_path=') + 1), ',')) AS item
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM aclexplode(p.proacl) AS a
      WHERE a.privilege_type = 'EXECUTE'
        AND (
          a.grantee = 0
          OR a.grantee IN (SELECT r.oid FROM pg_roles r WHERE r.rolname IN ('anon', 'authenticated'))
        )
    )
    -- os três ramos gravam tenant
    AND (
      SELECT count(*)
      FROM unnest(ARRAY[
        'acao, dados_anteriores, user_id, user_email, empresa_id',
        'acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email, empresa_id',
        'acao, dados_novos, user_id, user_email, empresa_id'
      ]) AS ramo(cols)
      WHERE position(ramo.cols IN pg_get_functiondef(p.oid)) > 0
    ) = 3
)
AND (
  SELECT count(*) FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'audit_log'
) = 3;
