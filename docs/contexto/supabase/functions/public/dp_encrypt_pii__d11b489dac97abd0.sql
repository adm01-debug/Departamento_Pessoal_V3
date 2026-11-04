CREATE OR REPLACE FUNCTION public.dp_encrypt_pii(p_plaintext text, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin') AND
     current_setting('request.jwt.claim.role', true) NOT IN ('service_role') THEN
    RAISE EXCEPTION 'dp_encrypt_pii: Unauthorized. Requires service_role.';
  END IF;
  RETURN encode(pgp_sym_encrypt(p_plaintext, p_key, 'compress-algo=0, cipher-algo=aes256'), 'base64');
END;
$function$
