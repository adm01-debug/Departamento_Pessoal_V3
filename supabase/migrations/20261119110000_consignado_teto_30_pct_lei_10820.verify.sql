-- Sidecar de 20261119110000_consignado_teto_30_pct_lei_10820.sql
-- Só leitura. Prova que o teto em vigor é o de 30% (faixa do empréstimo da Lei
-- 10.820 art. 1º §1º), que o antigo de 35% não voltou, e que a função e o
-- trigger continuam no contrato de segurança: SECURITY DEFINER, search_path
-- fixo em public, sem EXECUTE para anon/authenticated/PUBLIC, e o trigger
-- BEFORE INSERT OR UPDATE FOR EACH ROW apontando para essa mesma função.
SELECT 'ok'
WHERE EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'fn_consignado_valida_margem'
    AND p.prosecdef
    AND pg_get_functiondef(p.oid) LIKE '%v_salario * 0.30%'
    AND pg_get_functiondef(p.oid) NOT LIKE '%v_salario * 0.35%'
    AND EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, '{}'::text[])) AS cfg
      WHERE cfg LIKE 'search_path=%'
        AND ARRAY['public'] <@ (
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
    AND EXISTS (
      SELECT 1 FROM pg_trigger t
      WHERE t.tgrelid = 'public.emprestimos_consignados'::regclass
        AND t.tgname = 'trg_consignado_valida_margem'
        AND NOT t.tgisinternal
        AND t.tgfoid = p.oid
        AND (t.tgtype & 1) = 1
        AND (t.tgtype & 2) = 2
        AND (t.tgtype & 4) = 4
        AND (t.tgtype & 16) = 16
        AND (t.tgtype & 64) = 0
    )
);
