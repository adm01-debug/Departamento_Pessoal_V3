-- Contrato de saída: cada linha não-vazia tem de ser literalmente `ok`
-- (gate de canonical-migrations.yml, `grep -vx 'ok'`).
WITH fn AS (
  SELECT p.oid, array_to_string(p.proconfig, ',') AS cfg
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'agendar_dreno_fila_notificacoes'
)
SELECT CASE
  WHEN (SELECT count(*) FROM fn) = 0
    THEN 'FALHOU: funcao public.agendar_dreno_fila_notificacoes() nao existe'
  WHEN (SELECT cfg FROM fn) IS NULL
    THEN 'FALHOU: funcao sem search_path fixado'
  WHEN (SELECT cfg FROM fn) !~ '\mextensions\M'
    THEN 'FALHOU: search_path fixado sem o schema da extensao pg_net (extensions)'
  WHEN (SELECT cfg FROM fn) !~ '\mnet\M'
    THEN 'FALHOU: search_path fixado sem o schema net, onde http_post vive'
  ELSE 'ok'
END AS resultado;