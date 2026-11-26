-- P0 — restore the deterministic search_path required by integrity seal triggers.
--
-- The hash trigger bodies call digest(), supplied by pgcrypto in the `extensions`
-- schema.  PostgreSQL only resolves that function at trigger execution time.  A
-- function configured with `search_path = public` therefore deploys cleanly but
-- fails on the first business write.  Do not replace this with an unqualified
-- `SET search_path = public`: it would recreate the production failure.
--
-- This migration is deliberately fail-closed.  A partial deployment (missing
-- pgcrypto, a moved extension, or a missing seal trigger function) is drift that
-- must be investigated rather than silently accepted.

DO $$
DECLARE
  required_functions constant text[] := ARRAY[
    'enforce_afastamento_hash',
    'enforce_aso_hash',
    'enforce_batida_ponto_hash',
    'enforce_cat_hash',
    'enforce_cnab_remessa_hash',
    'enforce_desligamento_hash',
    'enforce_documento_assinatura_hash',
    'enforce_epi_entrega_hash',
    'enforce_esocial_evento_hash',
    'enforce_ferias_hash',
    'enforce_folha_pagamento_hash',
    'enforce_holerite_signed_hash',
    'enforce_medida_disciplinar_hash'
  ];
  missing_functions text[];
  target_function regprocedure;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_extension AS extension
    JOIN pg_namespace AS extension_schema ON extension_schema.oid = extension.extnamespace
    WHERE extension.extname = 'pgcrypto'
      AND extension_schema.nspname = 'extensions'
  ) THEN
    RAISE EXCEPTION
      'P0 hash-trigger hardening requires pgcrypto installed in schema extensions';
  END IF;

  SELECT array_agg(required.name ORDER BY required.name)
  INTO missing_functions
  FROM unnest(required_functions) AS required(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc AS routine
    JOIN pg_namespace AS routine_schema ON routine_schema.oid = routine.pronamespace
    WHERE routine_schema.nspname = 'public'
      AND routine.proname = required.name
      AND routine.pronargs = 0
      AND routine.prorettype = 'trigger'::regtype
  );

  IF missing_functions IS NOT NULL THEN
    RAISE EXCEPTION
      'P0 hash-trigger hardening expected 13 public trigger functions; missing: %',
      array_to_string(missing_functions, ', ');
  END IF;

  FOR target_function IN
    SELECT routine.oid::regprocedure
    FROM pg_proc AS routine
    JOIN pg_namespace AS routine_schema ON routine_schema.oid = routine.pronamespace
    WHERE routine_schema.nspname = 'public'
      AND routine.proname = ANY (required_functions)
      AND routine.pronargs = 0
      AND routine.prorettype = 'trigger'::regtype
    ORDER BY routine.oid
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path TO public, extensions, pg_catalog',
      target_function
    );
  END LOOP;
END
$$;
