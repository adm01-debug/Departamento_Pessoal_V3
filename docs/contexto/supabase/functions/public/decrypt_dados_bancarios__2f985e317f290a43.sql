CREATE OR REPLACE FUNCTION public.decrypt_dados_bancarios(ciphertext text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  secret_key text;
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL; END IF;

  BEGIN
    SELECT ds.decrypted_secret INTO secret_key
      FROM vault.decrypted_secrets ds
     WHERE ds.name = 'dados_bancarios_key'
     LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_function OR object_not_in_prerequisite_state THEN
    secret_key := NULL;
  END;

  IF secret_key IS NULL OR secret_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured. Configure vault secret "dados_bancarios_key".';
  END IF;

  RETURN pgp_sym_decrypt(ciphertext::bytea, secret_key)::text;
END;
$function$
