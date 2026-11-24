\set ON_ERROR_STOP on

DO $verify$
DECLARE
  actual bigint;
BEGIN
  SELECT count(*) INTO actual
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p');
  IF actual <> 362 THEN
    RAISE EXCEPTION 'baseline: tabelas/partições public esperadas=362, obtidas=%', actual;
  END IF;

  SELECT count(*) INTO actual
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm');
  IF actual <> 44 THEN
    RAISE EXCEPTION 'baseline: views public esperadas=44, obtidas=%', actual;
  END IF;

  SELECT count(*) INTO actual
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public';
  IF actual <> 299 THEN
    RAISE EXCEPTION 'baseline: funções public esperadas=299, obtidas=%', actual;
  END IF;

  SELECT count(*) INTO actual
  FROM pg_policies
  WHERE schemaname = 'public';
  IF actual <> 598 THEN
    RAISE EXCEPTION 'baseline: policies public esperadas=598, obtidas=%', actual;
  END IF;

  SELECT count(*) INTO actual
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND NOT t.tgisinternal;
  IF actual <> 398 THEN
    RAISE EXCEPTION 'baseline: triggers public esperados=398, obtidos=%', actual;
  END IF;

  SELECT count(*) INTO actual
  FROM pg_constraint
  WHERE contype = 'f' AND NOT convalidated;
  IF actual <> 0 THEN
    RAISE EXCEPTION 'baseline: FKs não validadas=%', actual;
  END IF;

  -- O canônico contém 13 CHECK constraints NOT VALID (12 em public e uma
  -- gerenciada em realtime). Preservar a contagem torna o baseline fiel; o
  -- débito deve ser saneado por migration posterior, nunca ocultado no DR.
  SELECT count(*) INTO actual
  FROM pg_constraint
  WHERE contype = 'c' AND NOT convalidated;
  IF actual <> 13 THEN
    RAISE EXCEPTION 'baseline: CHECKs NOT VALID esperados=13, obtidos=%', actual;
  END IF;

  SELECT count(*) INTO actual FROM storage.buckets;
  IF actual <> 4 THEN
    RAISE EXCEPTION 'baseline: buckets esperados=4, obtidos=%', actual;
  END IF;

  SELECT count(*) INTO actual
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'tenant\_%';
  IF actual <> 10 THEN
    RAISE EXCEPTION 'baseline: policies tenant de Storage esperadas=10, obtidas=%', actual;
  END IF;

  SELECT count(*) INTO actual
  FROM pg_indexes
  WHERE schemaname = 'auth'
    AND indexname IN (
      'idx_users_created_at_desc',
      'idx_users_email',
      'idx_users_last_sign_in_at_desc',
      'idx_users_name'
    );
  IF actual <> 4 THEN
    RAISE EXCEPTION 'baseline: índices Auth adicionais esperados=4, obtidos=%', actual;
  END IF;

  SELECT count(*) INTO actual FROM cron.job;
  IF actual <> 0 THEN
    RAISE EXCEPTION 'baseline: cron jobs esperados=0, obtidos=%', actual;
  END IF;
END
$verify$;

SELECT 'baseline_structure_ok' AS result;
