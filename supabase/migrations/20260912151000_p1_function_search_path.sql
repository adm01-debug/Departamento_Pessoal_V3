-- P1: eliminate the remaining mutable search_path findings for ordinary
-- trigger/helper functions.  This does not grant privileges or change the
-- function bodies; it fixes name resolution at execution time.
--
-- Reutiliza public.dp_mig_set_search_path (definida em 20260912150000).

DO $migration$
DECLARE
  routine_signature text;
  routines text[] := ARRAY[
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
  IF to_regprocedure('public.dp_mig_set_search_path(text,boolean,boolean)') IS NULL THEN
    RAISE EXCEPTION 'requires routine public.dp_mig_set_search_path (aplique 20260912150000 antes)';
  END IF;

  FOREACH routine_signature IN ARRAY routines LOOP
    PERFORM public.dp_mig_set_search_path(routine_signature, false, true);
  END LOOP;
END
$migration$;
