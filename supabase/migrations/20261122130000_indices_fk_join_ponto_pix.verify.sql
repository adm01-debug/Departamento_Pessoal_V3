-- ok só se os três índices de FK existem (o apply não é prova: CREATE INDEX
-- IF NOT EXISTS silenciosamente não faz nada se o nome já existir com outra
-- definição, e o baseline nunca teve nenhum destes).
SELECT CASE
  WHEN count(*) = 3 THEN 'ok'
  ELSE 'FALHOU: esperados 3 indices de FK de join, encontrados ' || count(*)::text
END
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename, indexname) IN (
    ('ponto_rep_lotes', 'idx_ponto_rep_lotes_empresa_id'),
    ('ponto_rep_dias',  'idx_ponto_rep_dias_lote_id'),
    ('pix_lotes',       'idx_pix_lotes_folha_id')
  );
