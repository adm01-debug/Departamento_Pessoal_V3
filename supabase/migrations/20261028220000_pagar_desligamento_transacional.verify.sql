-- Sidecar de 20261028220000_pagar_desligamento_transacional.sql
-- Só leitura. Prova que a RPC de pagamento de rescisão continua no contrato de
-- 3 parâmetros, SECURITY DEFINER com search_path fixo, executável só por
-- service_role (efeito financeiro: passa pela edge pagar-desligamento, com
-- CSRF, rate limit e auditoria) e que o overload antigo de 2 parâmetros não
-- voltou.
SELECT 'ok'
WHERE EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'pagar_desligamento'
    AND p.pronargs = 3
    AND p.proargtypes[0] = 'uuid'::regtype
    AND p.proargtypes[1] = 'text'::regtype
    AND p.proargtypes[2] = 'uuid'::regtype
    AND p.prosecdef
    AND EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, '{}'::text[])) AS cfg
      WHERE cfg LIKE 'search_path=%'
        -- Nome de schema, não substring: `LIKE '%public%'` aprovava um
        -- search_path com `public_old` (mesmo achado da review na PR #720).
        AND ARRAY['pg_catalog', 'public', 'pg_temp'] <@ (
          SELECT array_agg(btrim(btrim(item), '"'))
          FROM unnest(string_to_array(substr(cfg, length('search_path=') + 1), ',')) AS item
        )
    )
    AND EXISTS (
      SELECT 1 FROM aclexplode(p.proacl) AS a
      WHERE a.privilege_type = 'EXECUTE'
        AND a.grantee = (SELECT r.oid FROM pg_roles r WHERE r.rolname = 'service_role')
    )
    AND NOT EXISTS (
      SELECT 1 FROM aclexplode(p.proacl) AS a
      WHERE a.privilege_type = 'EXECUTE'
        AND (
          a.grantee = 0
          OR a.grantee IN (SELECT r.oid FROM pg_roles r WHERE r.rolname IN ('anon', 'authenticated'))
        )
    )
)
AND NOT EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'pagar_desligamento'
    AND p.pronargs = 2
    AND p.proargtypes[0] = 'uuid'::regtype
    AND p.proargtypes[1] = 'text'::regtype
);
