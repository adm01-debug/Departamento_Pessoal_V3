CREATE OR REPLACE FUNCTION public.get_admissao_por_token(_token text)
 RETURNS TABLE(token_row admissao_tokens, admissao jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t, to_jsonb(a.*)
  FROM public.admissao_tokens t
  JOIN public.admissoes a ON a.id = t.admissao_id
  WHERE t.token = _token;
$function$
