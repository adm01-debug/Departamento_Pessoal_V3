-- ok so se as 2 tabelas existem com RLS ligada, cada uma tem exatamente a policy
-- de leitura de admin/RH por empresa, as chaves unicas alvo dos upserts existem
-- (uma tabela preexistente sem elas passaria pelo CREATE TABLE IF NOT EXISTS), o
-- navegador nao escreve e o lote passou a contar feriados e horarios.
SELECT CASE
  WHEN (
    SELECT count(*) FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND c.relrowsecurity
      AND c.relname IN ('ponto_rep_feriados', 'ponto_rep_horarios')
  ) <> 2 THEN 'FALHOU: faltam ponto_rep_feriados/ponto_rep_horarios com RLS ligada'
  WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ponto_rep_lotes' AND column_name = 'total_feriados'
      AND data_type = 'integer' AND is_nullable = 'NO'
  ) THEN 'FALHOU: ponto_rep_lotes sem total_feriados'
  WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ponto_rep_lotes' AND column_name = 'total_horarios'
      AND data_type = 'integer' AND is_nullable = 'NO'
  ) THEN 'FALHOU: ponto_rep_lotes sem total_horarios'
  WHEN (
    SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename IN ('ponto_rep_feriados', 'ponto_rep_horarios')
      AND p.policyname = p.tablename || '_select_rh' AND p.cmd = 'SELECT'
      AND p.roles = '{authenticated}'
      AND p.qual LIKE '%pertence_a_empresa%' AND p.qual LIKE '%has_role%'
  ) <> 2 THEN 'FALHOU: policy de leitura admin/RH ausente ou diferente'
  WHEN (
    SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename IN ('ponto_rep_feriados', 'ponto_rep_horarios')
  ) <> 2 THEN 'FALHOU: ha policy alem da leitura em ponto_rep_feriados/horarios'
  WHEN EXISTS (
    SELECT 1
    FROM unnest(ARRAY['ponto_rep_feriados', 'ponto_rep_horarios']) AS t(nome),
         unnest(ARRAY['anon', 'authenticated']) AS r(papel),
         unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS p(priv)
    WHERE has_table_privilege(r.papel, format('public.%I', t.nome), p.priv)
  ) THEN 'FALHOU: navegador tem escrita em ponto_rep_feriados/horarios'
  WHEN NOT has_table_privilege('authenticated', 'public.ponto_rep_horarios', 'SELECT')
    THEN 'FALHOU: authenticated nao le ponto_rep_horarios'
  WHEN has_table_privilege('anon', 'public.ponto_rep_feriados', 'SELECT')
    THEN 'FALHOU: anon le ponto_rep_feriados'
  WHEN NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = 'ponto_rep_horarios_dia_semana_check' AND c.contype = 'c'
  ) THEN 'FALHOU: dia_semana sem check de 1 a 7'
  -- As chaves unicas sao o alvo dos upserts da Edge: uma tabela preexistente
  -- sem elas faz o onConflict falhar em producao, e CREATE TABLE IF NOT EXISTS
  -- nao recria nada.
  WHEN NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = 'ponto_rep_feriados_dispositivo_codigo_key' AND c.contype = 'u'
      AND c.conrelid = 'public.ponto_rep_feriados'::regclass AND c.condeferrable = false
      AND c.conkey = ARRAY[
        (SELECT a.attnum FROM pg_attribute a
         WHERE a.attrelid = c.conrelid AND a.attname = 'dispositivo_id'),
        (SELECT a.attnum FROM pg_attribute a
         WHERE a.attrelid = c.conrelid AND a.attname = 'codigo')
      ]::smallint[]
  ) THEN 'FALHOU: ponto_rep_feriados sem unique (dispositivo_id, codigo)'
  WHEN NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = 'ponto_rep_horarios_dispositivo_codigo_dia_key' AND c.contype = 'u'
      AND c.conrelid = 'public.ponto_rep_horarios'::regclass AND c.condeferrable = false
      AND c.conkey = ARRAY[
        (SELECT a.attnum FROM pg_attribute a
         WHERE a.attrelid = c.conrelid AND a.attname = 'dispositivo_id'),
        (SELECT a.attnum FROM pg_attribute a
         WHERE a.attrelid = c.conrelid AND a.attname = 'codigo'),
        (SELECT a.attnum FROM pg_attribute a
         WHERE a.attrelid = c.conrelid AND a.attname = 'dia_semana')
      ]::smallint[]
  ) THEN 'FALHOU: ponto_rep_horarios sem unique (dispositivo_id, codigo, dia_semana)'
  ELSE 'ok'
END;
