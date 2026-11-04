CREATE OR REPLACE FUNCTION public._purge_audit_log_internal(_dias integer DEFAULT 365)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _deleted integer;
BEGIN
  IF _dias < 30 THEN
    RAISE EXCEPTION 'Retenção mínima de 30 dias';
  END IF;

  -- Bypass restrito: só esta sessão, só esta transação (is_local = true).
  PERFORM set_config('app.audit_log_purge', 'on', true);

  WITH del AS (
    DELETE FROM public.audit_log
    WHERE created_at < now() - (_dias || ' days')::interval
    RETURNING 1
  )
  SELECT count(*) INTO _deleted FROM del;

  -- Registra a execução no próprio audit_log para observabilidade
  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('audit_log', gen_random_uuid(), 'AUTO_PURGE', NULL,
          jsonb_build_object('deleted', _deleted, 'retention_days', _dias, 'at', now()));

  RETURN _deleted;
END;
$function$
