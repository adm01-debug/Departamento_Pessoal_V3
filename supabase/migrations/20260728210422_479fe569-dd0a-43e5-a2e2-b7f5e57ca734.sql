DO $$
DECLARE
  r record;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.prosrc ~ '\mdigest\M'
        OR p.prosrc ~ '\mgen_random_bytes\M'
        OR p.prosrc ~ '\mhmac\M'
        OR p.prosrc ~ '\mcrypt\M'
        OR p.prosrc ~ '\mencrypt\M'
        OR p.prosrc ~ '\mdecrypt\M')
      AND coalesce(array_to_string(p.proconfig, ','), '') !~ 'extensions'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', r.sig);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'search_path corrigido em % funcoes', v_count;
END $$;