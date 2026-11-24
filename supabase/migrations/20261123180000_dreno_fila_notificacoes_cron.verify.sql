-- ok so quando o agendamento estiver consistente: http_post acessivel e, ou o
-- job existe apontando para os dois segredos do Vault, ou os segredos ainda nao
-- existem (migration inerte, nada a cobrar). Job sem segredo, segredo sem job
-- ou job apontando para outro nome de secret sao estados quebrados.
WITH estado AS (
  SELECT
    (SELECT format('%I.%I', n.nspname, p.proname)
     FROM pg_catalog.pg_proc p
     JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE p.oid::regprocedure::text LIKE '%.http_post(text,jsonb,jsonb,jsonb,integer)'
     ORDER BY (n.nspname = 'net') DESC, (n.nspname = 'extensions') DESC, n.nspname
     LIMIT 1) AS proc_http_post,
    (SELECT count(*) FROM vault.decrypted_secrets
      WHERE name IN ('agendamentos_dispatch_url', 'agendamentos_dispatch_secret')) AS total_segredos,
    (SELECT count(*) FROM cron.job WHERE jobname = 'drenar-fila-notificacoes') AS total_jobs,
    (SELECT command FROM cron.job WHERE jobname = 'drenar-fila-notificacoes') AS comando,
    (SELECT schedule FROM cron.job WHERE jobname = 'drenar-fila-notificacoes') AS periodicidade
)
SELECT CASE
  WHEN proc_http_post IS NULL
    THEN 'FALHOU: pg_net sem http_post(text,jsonb,jsonb,jsonb,integer) -- o cron nao teria como chamar a funcao'
  WHEN total_jobs > 1
    THEN 'FALHOU: job drenar-fila-notificacoes duplicado'
  WHEN total_segredos = 1
    THEN 'FALHOU: so um dos dois segredos do dreno existe no Vault'
  WHEN total_segredos = 0 AND total_jobs = 1
    THEN 'FALHOU: job do dreno existe sem segredos no Vault'
  WHEN total_segredos = 0
    THEN 'ok (dreno inerte: segredos ausentes no Vault; rodar select public.agendar_dreno_fila_notificacoes() depois de cria-los)'
  WHEN total_jobs = 0
    THEN 'FALHOU: segredos existem mas o job do dreno nao foi criado'
  WHEN comando NOT LIKE '%agendamentos_dispatch_secret%'
    THEN 'FALHOU: job do dreno nao le o segredo do Vault (segredo exposto no comando)'
  WHEN comando NOT LIKE '%http_post%'
    THEN 'FALHOU: job do dreno nao chama http_post'
  WHEN periodicidade <> '*/5 * * * *'
    THEN 'FALHOU: job do dreno com periodicidade diferente de 5 minutos'
  ELSE 'ok'
END AS resultado
FROM estado;