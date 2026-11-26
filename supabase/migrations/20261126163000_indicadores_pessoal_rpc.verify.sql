-- Sidecar de verificacao da 20261126163000 (somente leitura).
-- Prova, no catalogo pos-apply, que os indicadores de pessoal so ficaram
-- acessiveis pelo RPC com guarda de tenant -- e que ninguem le as MVs direto.
WITH alvo AS (
  SELECT p.oid AS fn_oid, p.prosecdef, p.proconfig, p.prosrc
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'get_indicadores_pessoal'
),
mvs AS (
  SELECT c.oid
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'm'
     AND c.relname IN ('mv_headcount_daily', 'mv_turnover_rate', 'mv_ferias_balance', 'mv_afastamento_summary')
)
SELECT CASE
  WHEN (SELECT COUNT(*) FROM alvo) <> 1
    THEN 'FALHOU: RPC get_indicadores_pessoal ausente'
  WHEN NOT EXISTS (SELECT 1 FROM alvo WHERE prosecdef)
    THEN 'FALHOU: RPC sem SECURITY DEFINER'
  WHEN NOT EXISTS (
    SELECT 1 FROM alvo a
     WHERE EXISTS (SELECT 1 FROM unnest(a.proconfig) AS cfg WHERE cfg LIKE 'search_path=%')
  ) THEN 'FALHOU: RPC sem search_path fixo'
  WHEN NOT EXISTS (
    SELECT 1 FROM alvo a WHERE pg_catalog.has_function_privilege('authenticated', a.fn_oid, 'EXECUTE')
  ) THEN 'FALHOU: authenticated nao executa o RPC'
  WHEN EXISTS (
    SELECT 1 FROM alvo a WHERE pg_catalog.has_function_privilege('anon', a.fn_oid, 'EXECUTE')
  ) THEN 'FALHOU: anon executa o RPC'
  WHEN (SELECT COUNT(*) FROM mvs) <> 4
    THEN 'FALHOU: materialized views de KPI ausentes'
  WHEN EXISTS (
    SELECT 1 FROM mvs m WHERE pg_catalog.has_table_privilege('authenticated', m.oid, 'SELECT')
  ) THEN 'FALHOU: authenticated le MV de dashboard direto (vazamento entre empresas)'
  WHEN NOT EXISTS (
    SELECT 1 FROM alvo a
     WHERE a.prosrc LIKE '%user_belongs_to_empresa%'
       AND a.prosrc LIKE '%42501%'
  ) THEN 'FALHOU: RPC sem guarda de tenant (user_belongs_to_empresa/42501)'
  ELSE 'ok'
END;