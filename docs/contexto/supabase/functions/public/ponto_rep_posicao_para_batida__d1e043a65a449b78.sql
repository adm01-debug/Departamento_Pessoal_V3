CREATE OR REPLACE FUNCTION public.ponto_rep_posicao_para_batida(_pos text)
 RETURNS TABLE(tipo text, ordem integer)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT m.tipo, m.ordem
  FROM (VALUES
    ('E1', 'entrada', 1), ('S1', 'saida', 2),
    ('E2', 'entrada', 3), ('S2', 'saida', 4),
    ('E3', 'entrada', 5), ('S3', 'saida', 6),
    ('E4', 'entrada', 7), ('S4', 'saida', 8),
    ('E5', 'entrada', 9), ('S5', 'saida', 10),
    ('E6', 'entrada', 11), ('S6', 'saida', 12)
  ) AS m(pos, tipo, ordem)
  WHERE m.pos = upper(_pos);
$function$
