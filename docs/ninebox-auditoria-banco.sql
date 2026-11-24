-- ============================================================================
-- NINE-BOX · AUDITORIA DE BANCO — SCRIPT **SOMENTE LEITURA** (v2, revisado)
-- ----------------------------------------------------------------------------
-- SEGURANÇA
--   • A transação abre com `SET TRANSACTION READ ONLY`: qualquer tentativa de
--     escrita falharia (e ainda assim o script termina em ROLLBACK).
--   • Apenas SELECT e leitura de catálogo (pg_catalog / information_schema).
--   • Nenhuma função com efeito colateral: as usadas são `to_regclass`,
--     `pg_get_viewdef`, `obj_description`, `pg_get_userbyid`, `current_database`,
--     `current_user`, `version` e agregados (`count`, `min`, `max`) — todas de
--     leitura/estáveis. Não há `auth.uid()`, `nextval`, `set_config`, `md5`,
--     `dblink`, FDW nem qualquer chamada a outro banco.
--   • ISOLAMENTO: sem `dblink`/`postgres_fdw`/conexões externas — o script só
--     olha o projeto onde ele é executado (confirme em Q0).
--   • PRIVACIDADE: nenhuma consulta retorna nome, CPF, e-mail, nota individual
--     ou id de pessoa. Tudo é metadado ou agregado.
--
-- COMO EXECUTAR
--   • BLOCO PRINCIPAL (Q0 → Q8b): rode inteiro, de uma vez. É seguro mesmo que a
--     view não exista — as checagens usam `to_regclass` e `case`.
--   • BLOCO OPCIONAL (OP1/OP2, no fim): só funciona se a view existir e abrir.
--     Rode SEPARADO; se falhar, o bloco principal já entregou os dados.
-- ============================================================================

begin;
set transaction read only;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q0 · Contexto — confirma que estamos no projeto autorizado (sem dado pessoal)
-- ─────────────────────────────────────────────────────────────────────────────
select
  'Q0'                     as bloco,
  current_database()        as banco,
  current_user              as papel_da_sessao,
  left(version(), 60)       as versao_postgres;

-- Q0b · Pré-requisitos: quais relações existem (nunca falha se faltar alguma)
select 'Q0b' as bloco, objeto, to_regclass('public.' || objeto) is not null as existe
from (values
  ('feedbacks_360'), ('ciclos_avaliacao'), ('colaboradores'),
  ('avaliacoes'), ('audit_log'), ('user_roles'),
  ('pdi_plano_desenvolvimento'), ('vw_matriz_nine_box')
) as t(objeto);

-- ─────────────────────────────────────────────────────────────────────────────
-- Q1 · Estado da view: inexistente · definição anterior · reescrita · desconhecida
-- ----------------------------------------------------------------------------
-- Distingue exatamente os cenários pedidos, SEM concluir nada sobre migrations:
-- a classificação sai do TEXTO da definição implantada.
-- ─────────────────────────────────────────────────────────────────────────────
select
  'Q1' as bloco,
  case
    when to_regclass('public.vw_matriz_nine_box') is null then 'INEXISTENTE'
    when pg_get_viewdef('public.vw_matriz_nine_box'::regclass, true) ilike '%feedbacks_360%'
      then 'EXISTENTE · definicao ANTERIOR (agrega feedbacks_360)'
    when pg_get_viewdef('public.vw_matriz_nine_box'::regclass, true) ilike '%avaliacoes%'
      then 'EXISTENTE · definicao REESCRITA (aponta para avaliacoes)'
    else 'EXISTENTE · definicao DESCONHECIDA'
  end as estado_da_view;

-- Q1b · Relatório de metadados da view (0 linhas = não existe; não é erro)
select
  'Q1b' as bloco,
  c.relname                        as objeto,
  c.relkind                        as tipo,           -- 'v' = view
  v.security_invoker,
  pg_get_userbyid(c.relowner)      as proprietario,
  obj_description(c.oid, 'pg_class') as comentario
from pg_class c
left join pg_views v
  on v.schemaname = 'public' and v.viewname = c.relname
where c.relnamespace = 'public'::regnamespace
  and c.relname = 'vw_matriz_nine_box';

-- Q1c · Sinais de aplicação das migrations que mexeram em views
--        (security_invoker = true veio da migration 20260619150049)
select
  'Q1c' as bloco,
  c.relname as view_relacionada,
  v.security_invoker
from pg_class c
left join pg_views v on v.schemaname = 'public' and v.viewname = c.relname
where c.relnamespace = 'public'::regnamespace
  and c.relname in (
    'vw_matriz_nine_box','vw_colaboradores_completo','vw_espelho_ponto_mensal',
    'vw_metricas_fila','vw_passivo_trabalhista_consolidado','excecoes_ponto','v_alertas_timeout'
  )
order by 2;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q2 · Definição SQL REALMENTE implantada (segura quando a view não existe)
-- ─────────────────────────────────────────────────────────────────────────────
select
  'Q2' as bloco,
  case
    when to_regclass('public.vw_matriz_nine_box') is null
      then '(view inexistente — nada a mostrar)'
    else pg_get_viewdef('public.vw_matriz_nine_box'::regclass, true)
  end as definicao_implantada;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q3 · `public.avaliacoes`: colunas reais × colunas exigidas pela view reescrita
-- ─────────────────────────────────────────────────────────────────────────────
select
  'Q3' as bloco, ordinal_position, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'avaliacoes'
order by ordinal_position;

-- Q3b · Quantas linhas a tabela tem hoje
select 'Q3b' as bloco, count(*) as linhas_em_avaliacoes
from public.avaliacoes;

-- Q3c · `performance_score` / `potencial_score` existem em alguma tabela?
--        (vazio ⇒ a definição reescrita aponta para colunas inexistentes)
select 'Q3c' as bloco, table_schema, table_name, column_name
from information_schema.columns
where column_name in ('performance_score', 'potencial_score')
order by 1, 2, 3;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q4 · Dependências internas da view e permissões (0 linhas = sem dependência)
-- ─────────────────────────────────────────────────────────────────────────────
-- Q4a · o que depende da view
select
  'Q4a' as bloco,
  dependent.relname                   as objeto_dependente,
  dependent.relkind                   as tipo,
  pg_get_userbyid(dependent.relowner) as proprietario
from pg_depend d
join pg_rewrite r       on r.oid = d.objid
join pg_class dependent on dependent.oid = r.ev_class
join pg_class source    on source.oid = d.refobjid
where source.relnamespace = 'public'::regnamespace
  and source.relname = 'vw_matriz_nine_box'
  and dependent.relname <> 'vw_matriz_nine_box';

-- Q4b · de que a view depende
select distinct
  'Q4b' as bloco,
  source.relname as objeto_de_origem,
  source.relkind as tipo_origem
from pg_depend d
join pg_rewrite r       on r.oid = d.objid
join pg_class dependent on dependent.oid = r.ev_class
join pg_class source    on source.oid = d.refobjid
where dependent.relnamespace = 'public'::regnamespace
  and dependent.relname = 'vw_matriz_nine_box';

-- Q4c · permissões concedidas na view
select 'Q4c' as bloco, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'vw_matriz_nine_box'
order by grantee, privilege_type;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q5 · Volume real: feedbacks × colaboradores únicos × avaliadores (por empresa/ciclo)
-- ─────────────────────────────────────────────────────────────────────────────
select
  'Q5' as bloco,
  f.empresa_id,
  f.ciclo_id,
  coalesce(c.nome, '(ciclo nulo)') as ciclo,
  count(*)                         as feedbacks,
  count(distinct f.avaliado_id)    as colaboradores_unicos,
  count(distinct f.avaliador_id)   as avaliadores_distintos,
  min(f.created_at)                as primeiro,
  max(f.created_at)                as ultimo
from public.feedbacks_360 f
left join public.ciclos_avaliacao c on c.id = f.ciclo_id
group by f.empresa_id, f.ciclo_id, c.nome
order by feedbacks desc;

-- Q5b · Integridade referencial (agregados — sem listar pessoas)
select
  'Q5b' as bloco,
  f.empresa_id,
  f.ciclo_id,
  count(*) filter (where f.avaliado_id is null)                          as sem_avaliado_id,
  count(*) filter (where f.avaliado_id is not null and col.id is null)   as avaliado_fora_do_cadastro,
  count(*) filter (where f.avaliador_id is not null and av.id is null)   as avaliador_fora_do_cadastro,
  count(*) filter (where f.ciclo_id is not null and ci.id is null)       as ciclo_inexistente
from public.feedbacks_360 f
left join public.colaboradores col on col.id = f.avaliado_id
left join public.colaboradores av  on av.id  = f.avaliador_id
left join public.ciclos_avaliacao ci on ci.id = f.ciclo_id
group by f.empresa_id, f.ciclo_id
order by 1, 2;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q6 · Status e tipos efetivamente cadastrados
-- ─────────────────────────────────────────────────────────────────────────────
select
  'Q6' as bloco,
  f.empresa_id,
  f.ciclo_id,
  coalesce(f.status, '(nulo)')  as status,
  coalesce(f.tipo, '(nulo)')    as tipo,
  count(*)                      as registros,
  count(distinct f.avaliado_id) as colaboradores_unicos
from public.feedbacks_360 f
group by 1, 2, 3, 4, 5
order by registros desc;

-- Q6b · Valores distintos de status e tipo (detecta texto legado/inesperado)
select 'Q6b' as bloco, 'status' as campo, coalesce(status,'(nulo)') as valor, count(*) as registros
from public.feedbacks_360 group by 1, 2, 3
union all
select 'Q6b', 'tipo', coalesce(tipo,'(nulo)'), count(*)
from public.feedbacks_360 group by 1, 2, 3
order by campo, registros desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q7 · Qualidade do dado: válidos, incompletos, fora da escala, divergências
-- ─────────────────────────────────────────────────────────────────────────────
select
  'Q7' as bloco,
  f.empresa_id,
  f.ciclo_id,
  count(*)                                                                       as total,
  count(*) filter (where coalesce(f.performance, f.nota_geral) between 1 and 5)  as desempenho_valido,
  count(*) filter (where f.potencial between 1 and 5)                            as potencial_valido,
  count(*) filter (where coalesce(f.performance, f.nota_geral) between 1 and 5
                     and f.potencial between 1 and 5)                            as ambos_validos,
  count(*) filter (where coalesce(f.performance, f.nota_geral) is null
                      or f.potencial is null)                                    as incompletos,
  count(*) filter (where coalesce(f.performance, f.nota_geral) is not null
                     and coalesce(f.performance, f.nota_geral) not between 1 and 5) as desempenho_fora_da_escala,
  count(*) filter (where f.potencial is not null
                     and f.potencial not between 1 and 5)                        as potencial_fora_da_escala,
  count(*) filter (where f.performance is not null and f.nota_geral is not null
                     and f.performance <> f.nota_geral)                          as performance_x_nota_geral_divergentes
from public.feedbacks_360 f
group by f.empresa_id, f.ciclo_id
order by 1, 2;

-- Q7b · Candidatos a SINALIZAÇÃO de duplicidade (mesma chave) — só agregados:
--        quantos grupos, quantos colaboradores afetados e quantos registros.
--        Nenhum id de pessoa é retornado.
select
  'Q7b' as bloco,
  grupo.empresa_id,
  grupo.ciclo_id,
  count(*)                          as grupos_com_mais_de_uma_copia,
  sum(grupo.copias)                 as registros_envolvidos,
  count(distinct grupo.avaliado_id) as colaboradores_afetados
from (
  select empresa_id, ciclo_id, avaliado_id, avaliador_id, tipo,
         coalesce(performance, nota_geral) as desempenho, potencial,
         count(*) as copias
  from public.feedbacks_360
  group by 1,2,3,4,5,6,7
  having count(*) > 1
) as grupo
group by grupo.empresa_id, grupo.ciclo_id
order by 4 desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q8 · Divergências relevantes + resumo executivo (somente agregados)
-- ─────────────────────────────────────────────────────────────────────────────
-- Q8a · Reclassificação oficial em SQL — MESMA regra do app: 1 colaborador por
--        ciclo, registro mais recente, faixas ≤1,5 / ≤3,5 / >3,5
with ultimo as (
  select distinct on (f.empresa_id, f.ciclo_id, f.avaliado_id)
    f.empresa_id, f.ciclo_id, f.avaliado_id,
    coalesce(f.performance, f.nota_geral)::numeric as desempenho,
    f.potencial::numeric                          as potencial
  from public.feedbacks_360 f
  where f.avaliado_id is not null
    and coalesce(f.performance, f.nota_geral) between 1 and 5
    and f.potencial between 1 and 5
  order by f.empresa_id, f.ciclo_id, f.avaliado_id,
           f.updated_at desc nulls last, f.created_at desc
),
faixas as (
  select u.*,
    case when desempenho <= 1.5 then 1 when desempenho <= 3.5 then 2 else 3 end as faixa_desempenho,
    case when potencial  <= 1.5 then 1 when potencial  <= 3.5 then 2 else 3 end as faixa_potencial
  from ultimo u
)
select 'Q8a' as bloco, empresa_id, ciclo_id, faixa_desempenho, faixa_potencial,
       count(*) as colaboradores
from faixas
group by 1,2,3,4,5
order by 1,2,3,4,5;

-- Q8b · Classificáveis × fora da matriz, por ciclo (para comparar com o KPI da tela)
with ultimo as (
  select distinct on (f.empresa_id, f.ciclo_id, f.avaliado_id)
    f.empresa_id, f.ciclo_id, f.avaliado_id, f.potencial,
    coalesce(f.performance, f.nota_geral) as desempenho
  from public.feedbacks_360 f
  where f.avaliado_id is not null
  order by f.empresa_id, f.ciclo_id, f.avaliado_id,
           f.updated_at desc nulls last, f.created_at desc
)
select 'Q8b' as bloco, empresa_id, ciclo_id,
  count(*)                                                                        as colaboradores_no_ciclo,
  count(*) filter (where desempenho between 1 and 5 and potencial between 1 and 5) as classificaveis,
  count(*) filter (where desempenho is null or potencial is null)                  as incompletos,
  count(*) filter (where (desempenho is not null and desempenho not between 1 and 5)
                     or (potencial  is not null and potencial  not between 1 and 5)) as fora_da_escala
from ultimo
group by 1,2,3
order by 1,2,3;

-- Q8c · Resumo executivo em uma linha (cole este retorno no relatório)
select
  'Q8c' as bloco,
  (select count(*) from public.feedbacks_360)                                   as feedbacks_total,
  (select count(distinct avaliado_id) from public.feedbacks_360)                as colaboradores_unicos_com_feedback,
  (select count(*) from public.colaboradores)                                   as colaboradores_cadastrados,
  (select count(*) from public.ciclos_avaliacao)                                as ciclos_cadastrados,
  (select count(*) from public.feedbacks_360 where status = 'concluido')         as status_concluido,
  (select count(*) from public.feedbacks_360 where status = 'pendente')          as status_pendente,
  (select count(*) from public.feedbacks_360 where status = 'cancelado')         as status_cancelado,
  (select count(*) from public.feedbacks_360
     where status is null or status not in ('concluido','pendente','cancelado')) as status_outros_ou_nulos,
  (select count(*) from public.feedbacks_360
     where coalesce(performance, nota_geral) is null or potencial is null)       as registros_incompletos;

-- TRAVA FINAL: encerra a transação SOMENTE LEITURA (nada persiste).
rollback;

-- ============================================================================
-- BLOCO OPCIONAL — rode SEPARADO, só se Q1/Q1b indicarem que a view EXISTE.
-- Se falhar por coluna inexistente, ISSO É o diagnóstico (view inválida).
-- Não faz parte da transação anterior; são SELECTs isolados.
-- ============================================================================
-- OP1 · a view abre?
-- select * from public.vw_matriz_nine_box limit 1;
--
-- OP2 · amostra agregada da view legada (sem dado pessoal)
-- select count(*) as linhas,
--        count(distinct colaborador_id) as colaboradores,
--        count(distinct quadrante)      as categorias
-- from public.vw_matriz_nine_box;

