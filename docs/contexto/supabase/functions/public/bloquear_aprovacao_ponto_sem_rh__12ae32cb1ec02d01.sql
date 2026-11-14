CREATE OR REPLACE FUNCTION public.bloquear_aprovacao_ponto_sem_rh()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.pode_gerir_pessoas(NEW.empresa_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.aprovado, false) OR NEW.aprovado_por IS NOT NULL OR NEW.aprovado_em IS NOT NULL THEN
      RAISE EXCEPTION 'Somente RH/admin pode aprovar registro de ponto'
        USING ERRCODE = '42501';
    END IF;
  ELSIF COALESCE(OLD.aprovado, false)
        AND (to_jsonb(NEW) - '{updated_at,version,hash_digital}'::text[])
            IS DISTINCT FROM (to_jsonb(OLD) - '{updated_at,version,hash_digital}'::text[]) THEN
    RAISE EXCEPTION 'registro aprovado: só RH/gestor altera'
      USING ERRCODE = '42501';
  ELSIF NEW.aprovado IS DISTINCT FROM OLD.aprovado
        OR NEW.aprovado_por IS DISTINCT FROM OLD.aprovado_por
        OR NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em THEN
    RAISE EXCEPTION 'Somente RH/admin pode aprovar registro de ponto'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$
