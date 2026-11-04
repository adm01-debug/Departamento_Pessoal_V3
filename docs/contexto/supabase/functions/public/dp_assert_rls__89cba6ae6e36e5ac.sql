CREATE OR REPLACE FUNCTION public.dp_assert_rls(p_table text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = p_table AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'dp_assert_rls: RLS NAO HABILITADO em public.%', p_table;
  END IF;
END;
$function$
