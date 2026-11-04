CREATE OR REPLACE FUNCTION public.fn_fila_dlq_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ao falhar, incrementa tentativa e agenda backoff exponencial (2^n minutos, cap 60min)
  IF NEW.status = 'failed' AND OLD.status <> 'failed' THEN
    NEW.tentativas := COALESCE(OLD.tentativas, 0) + 1;
    NEW.ultimo_erro := COALESCE(NEW.erro_log, OLD.erro_log);

    IF NEW.tentativas >= NEW.max_tentativas THEN
      NEW.dlq := true;
      NEW.dlq_movido_em := now();
    ELSE
      -- Backoff exponencial: 2, 4, 8, 16, 32 minutos (cap 60)
      NEW.proxima_tentativa_em := now() + make_interval(mins => LEAST(power(2, NEW.tentativas)::int, 60));
      NEW.status := 'pending'; -- volta pra fila
    END IF;
  END IF;
  RETURN NEW;
END $function$
