CREATE OR REPLACE FUNCTION public.validate_status_transition(_table text, _old text, _new text, _allowed jsonb)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _old IS NULL OR _new IS NULL OR _old = _new THEN RETURN; END IF;
  IF _allowed ? _old AND (_allowed -> _old) ? _new THEN RETURN; END IF;
  RAISE EXCEPTION 'Transição de status inválida em %: % → % (permitidas: %)',
    _table, _old, _new, COALESCE(_allowed -> _old, '[]'::jsonb)
    USING ERRCODE = 'check_violation';
END;
$function$
