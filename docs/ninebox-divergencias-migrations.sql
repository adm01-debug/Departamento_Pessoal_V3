-- ============================================================================
-- NINE-BOX · DIVERGÊNCIAS DE MIGRATIONS (ETAPA 2) — SOMENTE LEITURA.
--
-- Responde: o histórico aplicado no banco casa com os arquivos locais? E as
-- duas migrations do Nine-Box já foram aplicadas?
--
-- Uso: cole no SQL Editor do projeto ATUAL (não em outro projeto) e devolva a
-- saída. Nenhuma escrita: transação somente leitura encerrada em ROLLBACK.
--
-- O que importa para o Nine-Box (o resto é informativo):
--   D1  as versões 20261015090000 e 20261016090000 aparecem em schema_migrations?
--       → se SIM: a implantação já foi feita (não aplicar de novo).
--       → se NÃO: é exatamente UMA migration a aplicar agora (a 20261015090000).
--   D2  qual a ÚLTIMA versão aplicada? Comparar com a lista local
--       (`supabase/migrations`, 649 arquivos) mostra o que ficou para trás —
--       mas nada disso é pré-requisito do Nine-Box, desde que os objetos do
--       bloco Q (docs/ninebox-validacao-banco.sql) existam.
--   D3  existe algum arquivo local POSTERIOR a 20261015 que não seja do
--       Nine-Box? (no repositório: NÃO — só as duas do Nine-Box.)
-- ============================================================================

begin;
set transaction read only;

-- D1 · As migrations do Nine-Box já foram aplicadas?
select 'D1' as bloco, versao,
       exists (select 1 from supabase_migrations.schema_migrations m where m.version = t.versao) as aplicada
from (values ('20261015090000'), ('20261016090000')) as t(versao);

-- D2 · Últimas 15 migrations aplicadas (ordem cronológica inversa) + total
select 'D2' as bloco, version, name
from supabase_migrations.schema_migrations
order by version desc
limit 15;

select 'D2b' as bloco, count(*) as migrations_aplicadas,
       min(version) as primeira, max(version) as ultima
from supabase_migrations.schema_migrations;

-- D3 · Alguma migration aplicada é POSTERIOR ao Nine-Box?
select 'D3' as bloco, version, name
from supabase_migrations.schema_migrations
where version > '20261015090000'
order by version;

-- D4 · Pré-requisitos do Nine-Box existem AQUI (o que decide a compatibilidade)
select 'D4' as bloco, objeto, to_regclass('public.' || objeto) is not null as existe
from (values
  ('feedbacks_360'),
  ('ciclos_avaliacao'),
  ('colaboradores'),
  ('user_roles'),
  ('audit_log')
) as t(objeto);

select 'D4b' as bloco, funcao, to_regprocedure('public.' || funcao) is not null as existe
from (values
  ('get_user_empresas(uuid)'),
  ('get_user_empresa_id()')
) as t(funcao);

-- D5 · A policy que a implantação substitui tem o MESMO nome (substituição limpa)?
select 'D5' as bloco, pol.polname as policy, pol.cmd as comando
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'feedbacks_360'
order by pol.cmd, pol.polname;

-- D6 · Colunas que o Nine-Box grava/lê (se faltar alguma, PARE)
select 'D6' as bloco, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'feedbacks_360'
  and column_name in ('id','empresa_id','ciclo_id','avaliado_id','avaliador_id','tipo','nota_geral','potencial','status','pontos_fortes','pontos_melhoria','comentarios','created_at')
order by column_name;

-- TRAVA FINAL: nada persiste.
rollback;
