CREATE OR REPLACE FUNCTION public.get_admissao_por_token(_token text)
 RETURNS TABLE(token_row admissao_tokens, admissao jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT t, to_jsonb(a)
  FROM public._admissao_token_row(_token) AS t
  JOIN public.admissoes AS a ON a.id = t.admissao_id
  WHERE _token IS NOT NULL
    AND length(_token) >= 16;
$function$
