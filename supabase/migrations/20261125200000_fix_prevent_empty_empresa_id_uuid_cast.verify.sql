-- Exige 'ok': prevent_empty_empresa_id nao compara mais a coluna uuid com um
-- literal de texto sem cast -- era isso que levantava 22P02 em toda escrita.
WITH fn AS (
  SELECT p.prosrc
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'prevent_empty_empresa_id'
), avaliacao AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE prosrc LIKE '%empresa_id = ''%') AS comparacao_crua,
         count(*) FILTER (WHERE prosrc LIKE '%empresa_id::text%') AS comparacao_tipada
  FROM fn
)
SELECT CASE
  WHEN (SELECT total FROM avaliacao) = 1
   AND (SELECT comparacao_crua FROM avaliacao) = 0
   AND (SELECT comparacao_tipada FROM avaliacao) = 1 THEN 'ok'
  ELSE format(
    'FALHOU: total=%s comparacao_crua=%s comparacao_tipada=%s',
    (SELECT total FROM avaliacao),
    (SELECT comparacao_crua FROM avaliacao),
    (SELECT comparacao_tipada FROM avaliacao))
END AS resultado;
