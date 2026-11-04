CREATE OR REPLACE FUNCTION public.decrypt_dados_bancarios_tenant(p_ciphertext text, p_empresa_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF p_ciphertext IS NULL THEN RETURN NULL; END IF;
  IF NOT (public.is_admin(auth.uid()) OR public.pode_gerir_rh(p_empresa_id)) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.contas_bancarias cb
     WHERE cb.empresa_id = p_empresa_id
       AND (cb.agencia_encrypted = p_ciphertext OR cb.conta_encrypted = p_ciphertext
            OR cb.digito_encrypted = p_ciphertext OR cb.pix_chave_encrypted = p_ciphertext)
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  RETURN public.decrypt_dados_bancarios(p_ciphertext);
END;
$function$
