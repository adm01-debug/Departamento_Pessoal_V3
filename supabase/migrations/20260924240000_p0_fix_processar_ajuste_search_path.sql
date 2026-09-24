-- P0: corrige regressão introduzida pela migration 20260924220000.
--
-- Ao reescrever processar_ajuste_aprovado(uuid) para adicionar o guard de
-- autorização (pode_gerir_rh), o SET search_path da função foi recriado
-- como apenas 'public', perdendo o schema 'extensions' que o corpo original
-- já usava (digest() é da extensão pgcrypto, instalada em 'extensions').
-- Gate audit-db-search-path.mjs confirmou em produção: a função quebraria
-- em runtime na primeira chamada que exercesse o digest().
--
-- Ajuste cirúrgico via ALTER FUNCTION -- não recria o corpo, só corrige o
-- search_path.

ALTER FUNCTION public.processar_ajuste_aprovado(uuid)
  SET search_path TO 'public', 'extensions';
