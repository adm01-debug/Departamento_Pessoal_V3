-- ok = planos_saude.updated_at existe (timestamptz, NOT NULL, DEFAULT now()) e o
-- trigger update_planos_saude_updated_at continua presente. Saída vazia reprova o verify.
SELECT 'ok'
WHERE EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = to_regclass('public.planos_saude')
      AND a.attname = 'updated_at'
      AND NOT a.attisdropped
      AND a.attnotnull
      AND a.atttypid = 'timestamptz'::regtype
      AND pg_get_expr(d.adbin, d.adrelid) = 'now()'
  )
  AND EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = to_regclass('public.planos_saude')
      AND t.tgname = 'update_planos_saude_updated_at'
      AND NOT t.tgisinternal
  );
