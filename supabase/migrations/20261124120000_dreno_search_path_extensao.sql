-- O gate de integridade do banco canônico (scripts/audit-db-search-path.mjs,
-- job "Integridade do banco canônico (live)") reprovou a função criada em
-- 20261123180000: o corpo dela cita `http_post(` na mensagem de exceção e o
-- search_path fixado era só `pg_catalog, public`, sem o schema onde o pg_net
-- registra a extensão. A chamada real já é qualificada (format('%I.%I') →
-- net.http_post), então não havia quebra em runtime — mas uma função
-- SECURITY DEFINER não deve depender disso: fixar o schema da extensão fecha
-- a resolução de nomes em vez de confiar na qualificação.
--
-- Efeito: nenhum, além de fixar o search_path. Não toca dados, não agenda job,
-- não altera a lógica da função.
ALTER FUNCTION public.agendar_dreno_fila_notificacoes()
  SET search_path = pg_catalog, public, extensions, net;