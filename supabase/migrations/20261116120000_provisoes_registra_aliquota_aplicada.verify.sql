-- Sidecar de 20261116120000. Somente leitura: catalogo do Postgres.
-- Formato obrigatorio: CASE WHEN (...) THEN 'ok' ELSE 'FALHOU' END.

-- 1. As 3 colunas existem, com os tipos declarados.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_attribute a
   WHERE a.attrelid = 'public.provisoes_mensais'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
     -- atttypid::regtype qualificado, nao format_type: o nome do enum sai sem
     -- schema quando search_path cobre public e COM schema quando nao, o que
     -- faria a asserção falhar por configuracao de sessao, nao por defeito.
     AND ((a.attname = 'encargos_aliquota_bps' AND a.atttypid = 'integer'::regtype)
       OR (a.attname = 'regime_tributario'     AND a.atttypid = 'public.regime_tributario'::regtype)
       OR (a.attname = 'simples_anexo'         AND a.atttypid = 'text'::regtype))
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

-- 1d. A validacao de argumentos recusa NULL SQL: p_rows nulo nao pode passar
--     pela porta e apagar a competencia. Exige IS DISTINCT FROM no corpo.
SELECT CASE WHEN (
  SELECT bool_and(p.prosrc LIKE '%jsonb_typeof(p_rows) IS DISTINCT FROM%'
              AND p.prosrc LIKE '%p_competencia IS NULL%')
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

-- 7. A tabela do contrato tributario existe com as colunas e tipos
--    declarados, PK composta por (empresa_id, competencia) e o CHECK da faixa
--    validado. Ela e o que sobrevive a substituicao com lote vazio.
SELECT CASE WHEN (
  SELECT count(*) = 7
    FROM pg_attribute a
   WHERE a.attrelid = 'public.provisoes_competencia_tributaria'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
     AND (a.attname, a.atttypid) IN (
       ('empresa_id', 'uuid'::regtype),
       ('competencia', 'date'::regtype),
       ('encargos_aliquota_bps', 'integer'::regtype),
       ('regime_tributario', 'public.regime_tributario'::regtype),
       ('simples_anexo', 'text'::regtype),
       ('registrado_em', 'timestamptz'::regtype),
       ('registrado_por', 'uuid'::regtype)
     )
) THEN 'ok' ELSE 'FALHOU' END;

-- 7b. encargos_aliquota_bps e NOT NULL na tabela do contrato, e a PK cobre
--     exatamente (empresa_id, competencia) -- uma aliquota por empresa/mes.
SELECT CASE WHEN (
  SELECT bool_and(a.attnotnull)
    FROM pg_attribute a
   WHERE a.attrelid = 'public.provisoes_competencia_tributaria'::regclass
     AND a.attname IN ('empresa_id', 'competencia', 'encargos_aliquota_bps', 'registrado_em')
) AND EXISTS (
  SELECT 1 FROM pg_constraint c
   WHERE c.conrelid = 'public.provisoes_competencia_tributaria'::regclass
     AND c.contype = 'p'
     AND c.conkey = (
       SELECT array_agg(a.attnum ORDER BY a.attnum)
         FROM pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attname IN ('empresa_id', 'competencia')
     )
) THEN 'ok' ELSE 'FALHOU' END;

-- 7c. CHECK da faixa 0..1000 presente e VALIDADO na tabela do contrato.
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM pg_constraint
   WHERE conrelid = 'public.provisoes_competencia_tributaria'::regclass
     AND conname = 'provisoes_competencia_tributaria_bps_faixa'
     AND contype = 'c'
     AND convalidated
) THEN 'ok' ELSE 'FALHOU' END;

-- 7d. RLS ligada, policy de leitura por empresa presente, e NENHUMA policy de
--     escrita -- a tabela e escrita so pela RPC SECURITY DEFINER.
SELECT CASE WHEN (
  SELECT c.relrowsecurity FROM pg_class c
   WHERE c.oid = 'public.provisoes_competencia_tributaria'::regclass
) AND EXISTS (
  SELECT 1 FROM pg_policy
   WHERE polrelid = 'public.provisoes_competencia_tributaria'::regclass
     AND polname = 'provisoes_competencia_tributaria_tenant_select'
     AND polcmd = 'r'
) AND NOT EXISTS (
  SELECT 1 FROM pg_policy
   WHERE polrelid = 'public.provisoes_competencia_tributaria'::regclass
     AND polcmd IN ('a', 'w', 'd', '*')
) THEN 'ok' ELSE 'FALHOU' END;

-- 7e. Grants: authenticated so le; nenhuma escrita para authenticated e nada
--     para anon. Fecha a brecha que o audit_log tem (INSERT aberto).
SELECT CASE WHEN (
      has_table_privilege('authenticated', 'public.provisoes_competencia_tributaria', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.provisoes_competencia_tributaria', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.provisoes_competencia_tributaria', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.provisoes_competencia_tributaria', 'DELETE')
  AND NOT has_table_privilege('anon', 'public.provisoes_competencia_tributaria', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.provisoes_competencia_tributaria', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.provisoes_competencia_tributaria', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.provisoes_competencia_tributaria', 'DELETE')
) THEN 'ok' ELSE 'FALHOU' END;

-- 7f. O corpo da RPC le o contrato sob o lock e o grava com ON CONFLICT DO
--     NOTHING -- nao reescreve o registro original de uma competencia.
SELECT CASE WHEN (
  SELECT bool_and(
           replace(p.prosrc, chr(13), '') LIKE '%provisoes_competencia_tributaria%'
       AND replace(p.prosrc, chr(13), '') LIKE '%ON CONFLICT (empresa_id, competencia) DO NOTHING%'
       AND replace(p.prosrc, chr(13), '') LIKE '%changed under lock%'
         )
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'replace_monthly_provisions'
) THEN 'ok' ELSE 'FALHOU' END;

-- 7g. Nenhuma linha de contrato fora da faixa, e nenhum anexo gravado fora do
--     Simples.
SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM public.provisoes_competencia_tributaria
   WHERE encargos_aliquota_bps < 0 OR encargos_aliquota_bps > 1000
      OR (simples_anexo IS NOT NULL
          AND (regime_tributario IS NULL OR regime_tributario <> 'simples_nacional'))
) THEN 'ok' ELSE 'FALHOU' END;

-- 7h. Toda competencia com linha em provisoes_mensais tem contrato registrado,
--     e com a MESMA aliquota. Se divergir, a prova historica esta inconsistente.
SELECT CASE WHEN NOT EXISTS (
  SELECT 1
    FROM public.provisoes_mensais pm
    LEFT JOIN public.provisoes_competencia_tributaria t
      ON t.empresa_id = pm.empresa_id AND t.competencia = pm.competencia
   WHERE t.empresa_id IS NULL
      OR t.encargos_aliquota_bps IS DISTINCT FROM pm.encargos_aliquota_bps
) THEN 'ok' ELSE 'FALHOU' END;
