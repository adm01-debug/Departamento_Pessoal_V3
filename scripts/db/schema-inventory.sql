\set ON_ERROR_STOP on
\set QUIET 1
\pset tuples_only on
\pset format unaligned
SET search_path = '';
\set QUIET 0

-- Inventário determinístico do schema de aplicação. Uma linha por objeto,
-- sem dados de negócio. O hash detecta mudanças de definição sem despejar
-- corpos de funções/policies em logs de CI.
WITH inventory AS (
  SELECT format(
    'EXTENSION|%s|%s|%s',
    e.extname,
    e.extversion,
    n.nspname
  ) AS item
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace

  UNION ALL

  SELECT format(
    'RELATION|public.%s|%s|%s|%s',
    c.relname,
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity
  )
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'S')

  UNION ALL

  SELECT format(
    'COLUMN|public.%s.%s|%s|%s|%s|%s',
    c.relname,
    a.attname,
    format_type(a.atttypid, a.atttypmod),
    a.attnotnull,
    a.attidentity,
    md5(coalesce(pg_get_expr(d.adbin, d.adrelid), ''))
  )
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm')
    AND a.attnum > 0
    AND NOT a.attisdropped

  UNION ALL

  SELECT format(
    'CONSTRAINT|public.%s.%s|%s|%s|%s',
    c.relname,
    con.conname,
    con.contype,
    con.convalidated,
    md5(pg_get_constraintdef(con.oid, true))
  )
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'

  UNION ALL

  SELECT format(
    'INDEX|public.%s|%s',
    c.relname,
    md5(pg_get_indexdef(c.oid))
  )
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'i'

  UNION ALL

  SELECT format(
    'FUNCTION|public.%s(%s)|%s|%s|%s|%s|%s',
    p.proname,
    pg_get_function_identity_arguments(p.oid),
    p.prokind,
    p.prosecdef,
    p.provolatile,
    coalesce(array_to_string(p.proconfig, ','), ''),
    md5(pg_get_functiondef(p.oid))
  )
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'

  UNION ALL

  SELECT format(
    'POLICY|public.%s.%s|%s|%s|%s|%s',
    p.tablename,
    p.policyname,
    p.permissive,
    p.cmd,
    md5(coalesce(p.qual, '')),
    md5(coalesce(p.with_check, ''))
  )
  FROM pg_policies p
  WHERE p.schemaname = 'public'

  UNION ALL

  SELECT format(
    'TRIGGER|public.%s.%s|%s|%s',
    c.relname,
    t.tgname,
    t.tgenabled,
    md5(pg_get_triggerdef(t.oid, true))
  )
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal

  UNION ALL

  SELECT format(
    'TYPE|public.%s|%s|%s',
    t.typname,
    t.typtype,
    md5(coalesce((
      SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
      FROM pg_enum e
      WHERE e.enumtypid = t.oid
    ), ''))
  )
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
    AND t.typtype IN ('e', 'd')

  UNION ALL

  SELECT format(
    'ACL|public.%s|%s',
    c.relname,
    md5(coalesce(c.relacl::text, ''))
  )
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
)
SELECT item
FROM inventory
ORDER BY item;
