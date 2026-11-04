CREATE OR REPLACE FUNCTION public.protect_esocial_transport_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF current_user = 'authenticated' AND (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.protocolo IS DISTINCT FROM OLD.protocolo
    OR NEW.recibo IS DISTINCT FROM OLD.recibo
    OR NEW.id_recibo IS DISTINCT FROM OLD.id_recibo
    OR NEW.data_envio IS DISTINCT FROM OLD.data_envio
    OR NEW.transmission_claim_token IS DISTINCT FROM OLD.transmission_claim_token
    OR NEW.transmission_claimed_at IS DISTINCT FROM OLD.transmission_claimed_at
  ) THEN
    RAISE EXCEPTION 'eSocial transport fields are service-owned' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$
