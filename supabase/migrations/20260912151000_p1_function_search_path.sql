-- P1: eliminate the remaining mutable search_path findings for ordinary
-- trigger/helper functions.  This does not grant privileges or change the
-- function bodies; it fixes name resolution at execution time.
DO $migration$
DECLARE
  routine_signature text;
  routine_oid oid;
  routine_schema text;
  routine_name text;
  identity_arguments text;
  expected_routines constant text[] := ARRAY[
    'public.dp_assert_rls(text)',
    'public.dp_set_updated_at()',
    'public.dp_soft_delete_trigger()',
    'public.dp_table_template(text)',
    'public.fill_recrutamento_child_empresa()',
    'public.fill_treinamento_certificados_empresa()',
    'public.fill_treinamento_instancias_empresa()',
    'public.gerar_hash_ponto()',
    'public.get_personnel_cost_projection(uuid,integer)'
  ];
BEGIN
  FOREACH routine_signature IN ARRAY expected_routines LOOP
    routine_oid := to_regprocedure(routine_signature);
    IF routine_oid IS NULL THEN
      RAISE EXCEPTION 'P1 function search_path remediation requires routine %', routine_signature;
    END IF;
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
      INTO routine_schema, routine_name, identity_arguments
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.oid = routine_oid;
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public, extensions',
      routine_schema,
      routine_name,
      identity_arguments
    );
  END LOOP;
END
$migration$;
