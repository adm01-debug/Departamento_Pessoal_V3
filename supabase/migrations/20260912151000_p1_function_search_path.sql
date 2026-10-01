-- P1: eliminate the remaining mutable search_path findings for ordinary
-- trigger/helper functions.  This does not grant privileges or change the
-- function bodies; it fixes name resolution at execution time.
--
-- Reutiliza public.dp_mig_set_search_path (definida em 20260912150000).

DO $migration$
DECLARE
  routine_signature text;
BEGIN
  IF to_regprocedure('public.dp_mig_set_search_path(text,boolean)') IS NULL THEN
    RAISE WARNING 'P1 search_path: helper dp_mig_set_search_path ausente (20260912150000 não aplicada?) — série pulada';
    RETURN;
  END IF;

  FOREACH routine_signature IN ARRAY ARRAY[
    'public.dp_assert_rls(text)',
    'public.dp_set_updated_at()',
    'public.dp_soft_delete_trigger()',
    'public.dp_table_template(text)',
    'public.fill_recrutamento_child_empresa()',
    'public.fill_treinamento_certificados_empresa()',
    'public.fill_treinamento_instancias_empresa()',
    'public.gerar_hash_ponto()',
    'public.get_personnel_cost_projection(uuid,integer)'
  ] LOOP
    PERFORM public.dp_mig_set_search_path(routine_signature);
  END LOOP;
END
$migration$;
