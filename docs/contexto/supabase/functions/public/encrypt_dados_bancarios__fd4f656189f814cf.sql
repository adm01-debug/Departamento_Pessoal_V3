CREATE OR REPLACE FUNCTION public.encrypt_dados_bancarios(plaintext text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  secret_key text;
BEGIN
  IF plaintext IS NULL THEN RETURN NULL; END IF;

  BEGIN
    SELECT ds.decrypted_secret INTO secret_key
      FROM vault.decrypted_secrets ds
     WHERE ds.name = 'dados_bancarios_key'
     LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_function OR object_not_in_prerequisite_state THEN
    secret_key := NULL;
  END;

  -- Sem fallback por GUC configurável pela sessão (SEC_0001): a chave só
  -- pode vir do Vault — um GUC controlado pelo cliente permitiria escolher
  -- a chave de cifragem dos dados bancários.
  IF secret_key IS NULL OR length(secret_key) < 32 THEN
    RAISE EXCEPTION 'Encryption key not configured or too weak (>=32 chars). Configure vault secret "dados_bancarios_key".';
  END IF;

  RETURN pgp_sym_encrypt(plaintext::text, secret_key, 'cipher-algo=aes256')::text;
END;
$function$
