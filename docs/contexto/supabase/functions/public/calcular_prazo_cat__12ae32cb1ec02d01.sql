CREATE OR REPLACE FUNCTION public.calcular_prazo_cat()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Numero sequencial por empresa
  IF NEW.numero_cat IS NULL THEN
    NEW.numero_cat := 'CAT-' || TO_CHAR(now(), 'YYYY') || '-' ||
      LPAD((COALESCE((SELECT COUNT(*) FROM public.sst_cat WHERE empresa_id = NEW.empresa_id AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())), 0) + 1)::TEXT, 6, '0');
  END IF;

  -- Prazo legal: 24h se óbito, 1 dia útil caso contrário
  IF NEW.prazo_limite_envio IS NULL THEN
    IF NEW.houve_obito THEN
      NEW.prazo_limite_envio := NEW.data_acidente + INTERVAL '24 hours';
    ELSE
      NEW.prazo_limite_envio := NEW.data_acidente + INTERVAL '1 day';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
