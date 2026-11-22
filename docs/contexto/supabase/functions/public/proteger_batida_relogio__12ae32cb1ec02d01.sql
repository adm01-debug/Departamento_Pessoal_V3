CREATE OR REPLACE FUNCTION public.proteger_batida_relogio()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text;
BEGIN
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.origem = 'relogio' THEN
      RAISE EXCEPTION 'Batida de origem relógio só pode ser gravada pela integração do relógio.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.origem = 'relogio' THEN
    RAISE EXCEPTION 'Batida do relógio não pode ser %: corrija no Ponto AtecSoft.',
      CASE WHEN TG_OP = 'DELETE' THEN 'excluída' ELSE 'alterada' END
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.origem IS NOT DISTINCT FROM 'relogio' THEN
    RAISE EXCEPTION 'A origem relógio só pode ser atribuída pela integração do relógio.'
      USING ERRCODE = '42501';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$
