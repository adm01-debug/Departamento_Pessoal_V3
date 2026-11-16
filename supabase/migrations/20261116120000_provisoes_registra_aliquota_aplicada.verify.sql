-- Sidecar de 20261116120000. Somente leitura: catalogo do Postgres.
-- Formato obrigatorio: CASE WHEN (...) THEN 'ok' ELSE 'FALHOU' END.

-- 1. As 3 colunas existem, com os tipos declarados.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_attribute a
   WHERE a.attrelid = 'public.provisoes_mensais'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
     AND ((a.attname = 'encargos_aliquota_bps' AND format_type(a.atttypid, a.atttypmod) = 'integer')
       OR (a.attname = 'regime_tributario'     AND format_type(a.atttypid, a.atttypmod) = 'regime_tributario')
       OR (a.attname = 'simples_anexo'         AND format_type(a.atttypid, a.atttypmod) = 'text'))
) = 3 THEN 'ok' ELSE 'FALHOU' END;

-- 1b. encargos_aliquota_bps e NOT NULL: a garantia no nivel do banco de que
--     nenhum lancamento nasce sem a prova da aliquota.
SELECT CASE WHEN (
  SELECT a.attnotnull FROM pg_attribute a
   WHERE a.attrelid = 'public.provisoes_mensais'::regclass
     AND a.attname = 'encargos_aliquota_bps'
) THEN 'ok' ELSE 'FALHOU' END;

-- 1c. A RPC revalida a aliquota DEPOIS do advisory lock (corrida entre dois
--     calculos concorrentes) e recusa lote com mais de uma aliquota.
SELECT CASE WHEN (
  SELECT bool_and(p.prosrc LIKE '%changed under lock%'
              AND p.prosrc LIKE '%distinct tax rates%'
              AND p.prosrc LIKE '%IS DISTINCT FROM%')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'replace_monthly_provisions'
) THEN 'ok' ELSE 'FALHOU' END;

-- 2. O CHECK da faixa existe e esta VALIDADO (um check NOT VALID nao protege
--    as linhas que ja estao la).
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM pg_constraint
   WHERE conrelid = 'public.provisoes_mensais'::regclass
     AND conname = 'provisoes_mensais_encargos_aliquota_bps_faixa'
     AND contype = 'c' AND convalidated
) THEN 'ok' ELSE 'FALHOU' END;

-- 3. A RPC segue SECURITY DEFINER, com search_path fixo, EXECUTE de
--    service_role e sem EXECUTE para anon/authenticated.
SELECT CASE WHEN (
  SELECT bool_and(p.prosecdef
              AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
              AND has_function_privilege('service_role', p.oid, 'EXECUTE')
              AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
              AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'replace_monthly_provisions'
) THEN 'ok' ELSE 'FALHOU' END;

-- 4. A RPC passou a exigir e a gravar a aliquota: o corpo cita a validacao
--    fail-closed e as 3 colunas no INSERT.
SELECT CASE WHEN (
  SELECT bool_and(p.prosrc LIKE '%invalid monthly provision tax contract%'
              AND p.prosrc LIKE '%encargos_aliquota_bps%'
              AND p.prosrc LIKE '%regime_tributario%'
              AND p.prosrc LIKE '%simples_anexo%')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'replace_monthly_provisions'
) THEN 'ok' ELSE 'FALHOU' END;

-- 5. Nenhuma linha de provisao com aliquota fora da faixa ou nao inteira.
SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM public.provisoes_mensais
   WHERE encargos_aliquota_bps IS NOT NULL
     AND (encargos_aliquota_bps < 0 OR encargos_aliquota_bps > 1000)
) THEN 'ok' ELSE 'FALHOU' END;

-- 6. Nenhuma linha com retrato de anexo sem estar no Simples (incoerencia de
--    cadastro no momento do calculo).
SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM public.provisoes_mensais
   WHERE simples_anexo IS NOT NULL
     AND (regime_tributario IS NULL OR regime_tributario <> 'simples_nacional')
) THEN 'ok' ELSE 'FALHOU' END;
