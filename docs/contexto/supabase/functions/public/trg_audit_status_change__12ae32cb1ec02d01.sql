CREATE OR REPLACE FUNCTION public.trg_audit_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid;
  _empresa uuid;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  BEGIN _uid := auth.uid(); EXCEPTION WHEN OTHERS THEN _uid := NULL; END;

  -- Best-effort empresa_id (nem toda tabela tem)
  BEGIN
    EXECUTE format('SELECT ($1).empresa_id') INTO _empresa USING NEW;
  EXCEPTION WHEN OTHERS THEN
    _empresa := NULL;
  END;

  INSERT INTO public.audit_log (
    tabela, registro_id, acao, user_id,
    dados_anteriores, dados_novos
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id,
    'STATUS_CHANGE',
    _uid,
    jsonb_build_object('status', OLD.status, 'empresa_id', _empresa),
    jsonb_build_object('status', NEW.status, 'empresa_id', _empresa,
                       'changed_at', now())
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Auditoria nunca deve derrubar o UPDATE do domínio
  RETURN NEW;
END;
$function$
