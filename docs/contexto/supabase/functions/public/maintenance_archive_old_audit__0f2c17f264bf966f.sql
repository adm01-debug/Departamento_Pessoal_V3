CREATE OR REPLACE FUNCTION public.maintenance_archive_old_audit(_days integer DEFAULT 180, _batch integer DEFAULT 5000)
 RETURNS TABLE(archived bigint, purged bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff TIMESTAMPTZ := now() - make_interval(days => _days);
  v_archived BIGINT := 0;
  v_purged BIGINT := 0;
  v_ids UUID[];
BEGIN
  LOOP
    SELECT array_agg(id) INTO v_ids
    FROM (
      SELECT id FROM public.audit_log_unified
      WHERE occurred_at < v_cutoff
      ORDER BY occurred_at ASC
      LIMIT _batch
    ) s;

    EXIT WHEN v_ids IS NULL OR array_length(v_ids, 1) = 0;

    -- Arquiva (ignora conflitos, idempotente)
    WITH moved AS (
      INSERT INTO public.audit_log_unified_archive
      SELECT * FROM public.audit_log_unified WHERE id = ANY(v_ids)
      ON CONFLICT (id) DO NOTHING
      RETURNING 1
    )
    SELECT count(*) INTO v_archived FROM moved;

    -- Purga da tabela quente (bypass do trigger append-only via SECURITY DEFINER + session_replication_role)
    PERFORM set_config('session_replication_role', 'replica', true);
    DELETE FROM public.audit_log_unified WHERE id = ANY(v_ids);
    GET DIAGNOSTICS v_purged = ROW_COUNT;
    PERFORM set_config('session_replication_role', 'origin', true);

    -- Commit implícito por iteração via COMMIT não é possível em plpgsql aqui;
    -- lote pequeno mantém transação curta.
  END LOOP;

  RETURN QUERY SELECT v_archived, v_purged;
END;
$function$
