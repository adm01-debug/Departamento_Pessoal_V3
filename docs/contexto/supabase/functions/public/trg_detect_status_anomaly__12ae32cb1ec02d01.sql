CREATE OR REPLACE FUNCTION public.trg_detect_status_anomaly()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count integer;
  _threshold constant integer := 50;
  _window constant interval := interval '5 minutes';
BEGIN
  IF NEW.acao <> 'STATUS_CHANGE' OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO _count
  FROM public.audit_log
  WHERE user_id = NEW.user_id
    AND tabela  = NEW.tabela
    AND acao    = 'STATUS_CHANGE'
    AND created_at >= now() - _window;

  IF _count >= _threshold THEN
    -- Dedup: só um alerta aberto por (user,tabela) na janela
    IF NOT EXISTS (
      SELECT 1 FROM public.security_alerts
      WHERE type = 'status_change_burst'
        AND user_id = NEW.user_id
        AND details->>'tabela' = NEW.tabela
        AND COALESCE(resolved,false) = false
        AND created_at >= now() - _window
    ) THEN
      INSERT INTO public.security_alerts (type, severity, user_id, details)
      VALUES (
        'status_change_burst', 'high', NEW.user_id,
        jsonb_build_object('tabela', NEW.tabela, 'count', _count,
                           'window_minutes', 5, 'threshold', _threshold,
                           'detected_at', now())
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $function$
