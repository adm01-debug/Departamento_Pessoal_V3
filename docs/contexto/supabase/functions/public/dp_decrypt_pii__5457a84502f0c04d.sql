CREATE OR REPLACE FUNCTION public.dp_decrypt_pii(p_ciphertext text, p_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin') AND
     current_setting('request.jwt.claim.role', true) NOT IN ('service_role') THEN
    RAISE EXCEPTION 'dp_decrypt_pii: Unauthorized. Requires service_role.';
  END IF;
  RETURN pgp_sym_decrypt(decode(p_ciphertext,'base64'), p_key);
END;
$function$
