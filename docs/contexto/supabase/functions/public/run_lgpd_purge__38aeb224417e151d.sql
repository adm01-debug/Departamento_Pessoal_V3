CREATE OR REPLACE FUNCTION public.run_lgpd_purge(p_dry_run boolean DEFAULT false)
 RETURNS TABLE(tabela text, deleted integer, batches integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  p            record;
  v_batch      constant integer := 5000;
  v_max_batch  constant integer := 40;
  v_deleted    integer;
  v_total      integer;
  v_batches    integer;
BEGIN
  IF NOT p_dry_run THEN
    PERFORM set_config('app.audit_log_purge', 'on', true);
  END IF;

  FOR p IN
    SELECT r.tabela AS t, r.coluna_data AS c, r.dias AS d
      FROM public.lgpd_retencao_logs r
     WHERE r.ativo
     ORDER BY r.tabela
  LOOP
    CONTINUE WHEN to_regclass('public.' || quote_ident(p.t)) IS NULL;
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = p.t AND column_name = p.c
    );

    v_total := 0;
    v_batches := 0;

    BEGIN
      IF p.t = 'audit_log'
         AND NOT p_dry_run
         AND to_regprocedure('public._purge_audit_log_internal(integer)') IS NOT NULL
      THEN
        v_total   := public._purge_audit_log_internal(GREATEST(p.d, 30));
        v_batches := 1;
      ELSIF p_dry_run THEN
        EXECUTE format(
          'SELECT count(*)::integer FROM public.%I WHERE %I < now() - ($1 || '' days'')::interval',
          p.t, p.c
        ) INTO v_total USING p.d;
      ELSE
        LOOP
          EXIT WHEN v_batches >= v_max_batch;
          EXECUTE format(
            'WITH vitimas AS (
               SELECT ctid FROM public.%I
                WHERE %I < now() - ($1 || '' days'')::interval
                LIMIT %s
             )
             DELETE FROM public.%I x USING vitimas v WHERE x.ctid = v.ctid',
            p.t, p.c, v_batch, p.t
          ) USING p.d;
          GET DIAGNOSTICS v_deleted = ROW_COUNT;
          v_total   := v_total + v_deleted;
          v_batches := v_batches + 1;
          EXIT WHEN v_deleted < v_batch;
        END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'run_lgpd_purge: tabela % falhou (%) — lote segue', p.t, SQLERRM;
      v_total := 0;
    END;

    tabela  := p.t;
    deleted := v_total;
    batches := v_batches;
    RETURN NEXT;
  END LOOP;

  -- O bypass do append-only não pode vazar para writes posteriores na mesma
  -- transação (SEC_0003). Em erro, a transação aborta e o GUC morre com ela.
  IF NOT p_dry_run THEN
    PERFORM set_config('app.audit_log_purge', 'off', true);
  END IF;
END;
$function$
