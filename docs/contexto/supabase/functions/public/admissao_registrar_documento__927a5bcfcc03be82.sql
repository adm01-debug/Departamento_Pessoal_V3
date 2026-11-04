CREATE OR REPLACE FUNCTION public.admissao_registrar_documento(_token text, _tipo text, _nome_arquivo text, _url text, _tamanho_bytes bigint DEFAULT NULL::bigint)
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
  -- O path precisa pertencer à admissão do próprio token — sem isso um token
  -- válido poderia registrar (e depois vincular) path de outra admissão.
  IF _url IS NULL OR _url NOT LIKE 'admissao_' || v_token.admissao_id::text || '/%' THEN
    RAISE EXCEPTION 'path de documento fora do escopo da admissao' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.documentos_admissao (admissao_id, tipo, nome_arquivo, url, tamanho_bytes, validado)
  VALUES (v_token.admissao_id, _tipo, _nome_arquivo, _url, _tamanho_bytes, false);
END;
$function$
