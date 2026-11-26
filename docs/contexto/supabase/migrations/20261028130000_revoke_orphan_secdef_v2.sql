-- Follow-up de 20261027000000_revoke_orphan_secdef: o apply anterior não fechou
-- o invariante `orphan_secdef_revoked`. A causa mais provável é assinatura com
-- argumentos: `to_regprocedure('public.nome()')` só resolve a versão sem
-- argumentos — se a função órfã real tem parâmetros, o IF pulava e nada era
-- revogado. Agora iteramos TODAS as funções com esses pronames, qualquer que
-- seja a assinatura, e revogamos EXECUTE de PUBLIC/anon/authenticated.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid, n.nspname AS schema, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('versao_consolidada_avaliacao', 'training_images_track_outcomes')
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.schema, fn.proname, fn.args
    );
  END LOOP;
END $$;
