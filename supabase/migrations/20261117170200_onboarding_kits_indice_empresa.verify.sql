-- Sidecar de 20261117170200. Somente leitura: catalogo do Postgres.

-- 1. O indice existe, na tabela certa, e e exatamente sobre empresa_id.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
   WHERE i.indrelid = 'public.onboarding_kits'::regclass
     AND ic.relname = 'idx_onboarding_kits_empresa_id'
     AND i.indnatts = 1
     AND (SELECT a.attname FROM pg_attribute a
           WHERE a.attrelid = i.indrelid AND a.attnum = i.indkey[0]) = 'empresa_id'
) = 1 THEN 'ok' ELSE 'FALHOU' END;

-- 2. O indice esta VALIDO e pronto para uso pelo planner (um CREATE INDEX que
--    falhou pela metade deixa indisvalid, e "existe" nao bastaria).
SELECT CASE WHEN (
  SELECT i.indisvalid AND i.indisready
    FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
   WHERE ic.relname = 'idx_onboarding_kits_empresa_id'
) THEN 'ok' ELSE 'FALHOU' END;

-- 3. GUARDA DE NAO-REGRESSAO: esta migration NAO deve ter alargado o escopo de
--    tenant. A unica policy da tabela segue sendo a por empresa ATIVA, e
--    nenhuma policy nova com get_user_empresas foi criada.
SELECT CASE WHEN (
  SELECT count(*) = 0 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'onboarding_kits'
     AND (qual LIKE '%get_user_empresas%' OR with_check LIKE '%get_user_empresas%')
) THEN 'ok' ELSE 'FALHOU' END;

-- 4. E a RLS continua ligada na tabela.
SELECT CASE WHEN (
  SELECT relrowsecurity FROM pg_class WHERE oid = 'public.onboarding_kits'::regclass
) THEN 'ok' ELSE 'FALHOU' END;
