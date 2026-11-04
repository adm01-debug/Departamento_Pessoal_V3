CREATE OR REPLACE FUNCTION public._admissao_token_row(_token text)
 RETURNS admissao_tokens
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.*
  FROM public.admissao_tokens t
  WHERE t.token = _token
    AND _token IS NOT NULL
    AND length(_token) >= 16
    AND (t.data_expiracao IS NULL OR t.data_expiracao > now())
  LIMIT 1;
$function$
