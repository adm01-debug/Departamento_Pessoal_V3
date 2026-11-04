CREATE OR REPLACE FUNCTION public.admissao_marcar_documentos(_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token public.admissao_tokens;
BEGIN
  v_token := public._admissao_token_row(_token);
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'token invalido ou expirado' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.admissao_tokens
  SET documentos_enviados = true, updated_at = now()
  WHERE id = v_token.id;
END;
$function$
