CREATE OR REPLACE FUNCTION public.limpar_govbr_states_expirados()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.govbr_auth_state WHERE expires_at < now();
END;
$function$
