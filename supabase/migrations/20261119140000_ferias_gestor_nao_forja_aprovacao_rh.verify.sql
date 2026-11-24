-- Sidecar de 20261119140000_ferias_gestor_nao_forja_aprovacao_rh.sql
-- Só leitura. Uma linha 'ok' quando certo, zero linhas quando errado — o passo
-- "Executar sidecars de verificação" trata saída vazia como falha e exige que
-- toda linha não vazia seja literalmente `ok`.
--
-- Prova:
--   1. o trigger existe em public.ferias como BEFORE UPDATE FOR EACH ROW
--      (tgtype bits 1|2|16 ligados, 4=INSERT e 8=DELETE desligados) apontando
--      para a função da guarda;
--   2. a função tem search_path fixo e NÃO é executável por PUBLIC/anon/
--      authenticated;
--   3. o corpo cobre as seis colunas de aprovação e as cinco de assinatura —
--      se alguém reescrever a função deixando uma coluna de fora, reprova;
--   4. a policy `ferias_gestor_update` continua de pé: esta migration torna a
--      20261119130000 segura, não a desfaz;
--   5. as duas policies que já governavam `ferias` seguem intactas.
SELECT 'ok'
WHERE EXISTS (
  SELECT 1
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public'
    AND c.relname = 'ferias'
    AND t.tgname = 'trg_ferias_bloquear_aprovacao_rh_sem_rh'
    AND NOT t.tgisinternal
    AND p.proname = 'ferias_bloquear_aprovacao_rh_sem_rh'
    AND (t.tgtype & 1) = 1
    AND (t.tgtype & 2) = 2
    AND (t.tgtype & 16) = 16
    AND (t.tgtype & 4) = 0
    AND (t.tgtype & 8) = 0
)
AND EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'ferias_bloquear_aprovacao_rh_sem_rh'
    AND p.prorettype = 'trigger'::regtype
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
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(ARRAY[
        'aprovado_rh',
        'aprovado_rh_em',
        'aprovado_rh_por',
        'status_aprovacao_rh',
        'aprovado_em',
        'aprovado_por',
        'aviso_assinatura_em',
        'aviso_assinatura_hash',
        'aviso_assinatura_ip',
        'aviso_assinatura_por',
        'aviso_assinatura_user_agent'
      ]) AS col(nome)
      WHERE position('NEW.' || col.nome || ' IS DISTINCT FROM OLD.' || col.nome IN pg_get_functiondef(p.oid)) = 0
    )
)
AND EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ferias'
    AND policyname = 'ferias_gestor_update' AND cmd = 'UPDATE'
    AND qual LIKE '%pode_gerir_pessoas%'
)
AND EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ferias'
    AND policyname = 'ferias_rh_manage' AND cmd = 'ALL'
)
AND EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ferias'
    AND policyname = 'ferias_gestor_read' AND cmd = 'SELECT'
);
