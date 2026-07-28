-- Revoga todo poder de escrita direta do papel anônimo em todas as tabelas públicas
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.%I FROM anon',
      r.relname
    );
  END LOOP;
END $$;

-- Impede que novas tabelas voltem a conceder escrita ao papel anônimo
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON TABLES FROM anon;