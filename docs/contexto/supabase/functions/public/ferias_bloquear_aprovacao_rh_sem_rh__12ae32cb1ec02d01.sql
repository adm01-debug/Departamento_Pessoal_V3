CREATE OR REPLACE FUNCTION public.ferias_bloquear_aprovacao_rh_sem_rh()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  -- service_role (edges), migrations e RPC SECURITY DEFINER passam direto.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.pode_gerir_rh(NEW.empresa_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.aprovado_rh IS DISTINCT FROM OLD.aprovado_rh
     OR NEW.aprovado_rh_em IS DISTINCT FROM OLD.aprovado_rh_em
     OR NEW.aprovado_rh_por IS DISTINCT FROM OLD.aprovado_rh_por
     OR NEW.status_aprovacao_rh IS DISTINCT FROM OLD.status_aprovacao_rh
     OR NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em
     OR NEW.aprovado_por IS DISTINCT FROM OLD.aprovado_por THEN
    RAISE EXCEPTION 'Somente RH ou admin pode registrar a aprovacao do RH nas ferias'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.aviso_assinatura_em IS DISTINCT FROM OLD.aviso_assinatura_em
     OR NEW.aviso_assinatura_hash IS DISTINCT FROM OLD.aviso_assinatura_hash
     OR NEW.aviso_assinatura_ip IS DISTINCT FROM OLD.aviso_assinatura_ip
     OR NEW.aviso_assinatura_por IS DISTINCT FROM OLD.aviso_assinatura_por
     OR NEW.aviso_assinatura_user_agent IS DISTINCT FROM OLD.aviso_assinatura_user_agent THEN
    RAISE EXCEPTION 'Assinatura do aviso de ferias so pode ser gravada pelo fluxo de assinatura'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$
