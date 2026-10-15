-- ============================================================================
-- NINE-BOX · GATE DE PRÉ-APLICAÇÃO — **ANTES** de aplicar a etapa 1
-- (`supabase/migrations/20261015090000_ninebox_finalizacao_e_potencial.sql`)
-- ----------------------------------------------------------------------------
-- Responde a UMA pergunta: **pode aplicar agora?**
-- Cada linha traz a situação (`OK` / `BLOQUEIO` / `AVISO`), o código, o que foi
-- checado e o detalhe. As três últimas colunas repetem o consolidado:
--     • `bloqueios`    — quantos BLOQUEIOS existem (tem de ser 0);
--     • `avisos`       — quantos AVISOS (não impedem, exigem decisão);
--     • `pode_aplicar` — TRUE somente quando `bloqueios = 0`.
--
-- COMO RODAR: cole no SQL Editor e leia a saída. Devolva TODAS as linhas.
--
-- SEGURANÇA: SOMENTE LEITURA — `SET TRANSACTION READ ONLY` + `ROLLBACK`; não
-- cria tabelas temporárias e não toca em tabela nenhuma.
--
-- ESCOPO: este gate cobre o que os outros scripts NÃO cobrem (bloqueios
-- consolidados, dono da tabela, papéis do banco, locks concorrentes) e mede o
-- estado ATUAL do privilégio de TRUNCATE. A conferência estrutural profunda
-- continua nos scripts já existentes:
--     • `docs/ninebox-validacao-banco.sql`          (Q1…Q16)
--     • `docs/ninebox-divergencias-migrations.sql`  (D1…D6, inclui as colunas)
--     • `docs/ninebox-verificacao-truncate.sql`     (T1…T9 + ACEITE — ANTES/POSTERIOR)
-- Devolver, como evidência: este gate + Q1/Q5b/Q7/Q13/Q16 + D1/D2/D4/D5/D6 +
-- `docs/ninebox-verificacao-truncate.sql` (T1, T2, T3 e a linha `ACEITE`).
--
-- ⚠️  B6 consulta `public.user_roles`: se esse script FALHAR em B6 com "relation
--     does not exist", a ausência da tabela já é, por si, um bloqueio absoluto
--     (todo o módulo depende dela) — trate como BLOQUEIO e escale.
-- ============================================================================

begin;
set transaction read only;

-- ─────────────────────────────────────────────────────────────────────────────
-- G · GATE CONSOLIDADO
--   B1  a tabela alvo existe (sem ela nada faz sentido);
--   B2  a etapa 1 ainda NÃO foi aplicada — os 3 objetos dela precisam estar
--       AUSENTES. Se algum existir, PARE e escale: é reaplicação, não
--       implantação (ver `docs/ninebox-divergencias-migrations.sql`);
--   B3  os papéis que a migration referencia existem no banco;
--   B4  `get_user_empresas(uuid)` existe (base do isolamento por empresa);
--   B5  `audit_log` existe (a migration grava nela);
--   B6  existe ao menos um usuário com papel `admin` ou `rh` (risco R1: sem
--       esse vínculo a CRIAÇÃO passaria a falhar para todo mundo);
--   B7  o DONO de `feedbacks_360` NÃO é papel de aplicação — o dono tem
--       TRUNCATE implícito, então a invariante §3b nunca passaria;
--   B8  toda empresa que JÁ TEM feedback tem colaborador E ciclo com o MESMO
--       `empresa_id` — é o que a validação §7 da RPC de criação passa a exigir.
--       Se faltar um dos dois, a CRIAÇÃO fica impossível para essa empresa;
--   A1  AVISO: nenhuma outra sessão segurando lock na tabela (o
--       DROP/CREATE POLICY + REVOKE exigem ACCESS EXCLUSIVE durante toda a
--       transação);
--   A2  AVISO: RLS ligada na tabela;
--   A3  AVISO: funções `SECURITY DEFINER` truncando FORA de `public`
--       (informação; a superfície deste módulo é `public`).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- D · DIAGNÓSTICO DE CONTEXTO EMPRESARIAL (AGREGADO, SEM DADOS PESSOAIS)
--   D1  colaboradores com `empresa_id` nulo — a RPC exige empresa, então um
--       colaborador sem empresa NUNCA poderá ser avaliado;
--   D2  ciclos com `empresa_id` nulo — idem: nunca poderão ser usados;
--   D3  referências de empresa INCONSISTENTES no histórico: feedback cuja
--       empresa difere da do colaborador avaliado ou da do ciclo;
--   D4  compatibilidade: para cada empresa que já tem feedback, existe
--       colaborador E ciclo da MESMA empresa (o que a nova validação pede)?
--   Todas as saídas são CONTAGENS/PERCENTUAIS. Nenhum nome, e-mail, documento
--   ou id de pessoa é projetado. Nada é corrigido ou preenchido por este script.
-- ─────────────────────────────────────────────────────────────────────────────

with checagens as (
  select * from (values
    ('B1', true,  'tabela public.feedbacks_360 existe',
      to_regclass('public.feedbacks_360') is not null,
      coalesce(to_regclass('public.feedbacks_360')::text, 'AUSENTE — pare e escale')),

    ('B2', true,  'etapa 1 ainda NAO aplicada (3 objetos ausentes)',
      to_regclass('public.feedbacks_360_operacoes') is null
      and to_regclass('public.feedbacks_360_validacoes_potencial') is null
      and to_regclass('public.vw_feedbacks_360_versao') is null,
      coalesce(concat_ws(' | ',
        case when to_regclass('public.feedbacks_360_operacoes') is not null then 'feedbacks_360_operacoes JA EXISTE' end,
        case when to_regclass('public.feedbacks_360_validacoes_potencial') is not null then 'feedbacks_360_validacoes_potencial JA EXISTE' end,
        case when to_regclass('public.vw_feedbacks_360_versao') is not null then 'vw_feedbacks_360_versao JA EXISTE' end),
        'nenhum objeto da etapa 1 existe')),

    ('B3', true,  'papeis anon/authenticated existem',
      to_regrole('anon') is not null and to_regrole('authenticated') is not null,
      coalesce(concat_ws(' | ',
        case when to_regrole('anon') is null then 'anon AUSENTE' end,
        case when to_regrole('authenticated') is null then 'authenticated AUSENTE' end),
        'anon e authenticated presentes')),

    ('B4', true,  'funcao get_user_empresas(uuid) existe',
      to_regprocedure('public.get_user_empresas(uuid)') is not null,
      coalesce(to_regprocedure('public.get_user_empresas(uuid)')::text, 'AUSENTE — isolamento por empresa nao funciona')),

    ('B5', true,  'tabela audit_log existe',
      to_regclass('public.audit_log') is not null,
      coalesce(to_regclass('public.audit_log')::text, 'AUSENTE — as RPCs gravam nela')),

    ('B6', true,  'existe usuario com papel admin/rh (risco R1)',
      exists (select 1 from public.user_roles where role::text in ('admin', 'rh')),
      (select 'vinculos admin/rh: ' || count(*) from public.user_roles where role::text in ('admin', 'rh'))),

    ('B7', true,  'dono de feedbacks_360 nao e papel de aplicacao',
      not exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'feedbacks_360'
          and pg_get_userbyid(c.relowner) in ('anon', 'authenticated', 'authenticator', 'service_role')),
      coalesce((select pg_get_userbyid(c.relowner) from pg_class c
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relname = 'feedbacks_360'), 'tabela ausente')),

    ('B8', true,  'toda empresa COM feedback tem colaborador e ciclo da mesma empresa',
      not exists (
        select 1
          from (select distinct empresa_id
                  from public.feedbacks_360
                 where empresa_id is not null) f
         where not exists (select 1 from public.colaboradores c where c.empresa_id = f.empresa_id)
            or not exists (select 1 from public.ciclos_avaliacao ci where ci.empresa_id = f.empresa_id)),
      (select concat('empresas com feedback: ', count(*),
                     ' | sem colaborador valido: ', count(*) filter (where not tem_colab),
                     ' | sem ciclo valido: ', count(*) filter (where not tem_ciclo))
         from (select f.empresa_id,
                      exists (select 1 from public.colaboradores c where c.empresa_id = f.empresa_id) as tem_colab,
                      exists (select 1 from public.ciclos_avaliacao ci where ci.empresa_id = f.empresa_id) as tem_ciclo
                 from (select distinct empresa_id
                         from public.feedbacks_360
                        where empresa_id is not null) f) z)),

    ('A1', false, 'nenhuma outra sessao com lock em feedbacks_360',
      not exists (
        select 1 from pg_locks l
        join pg_class c on c.oid = l.relation
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'feedbacks_360'
          and l.pid <> pg_backend_pid()),
      coalesce((select 'sessoes com lock: ' || count(distinct l.pid) from pg_locks l
                join pg_class c on c.oid = l.relation
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relname = 'feedbacks_360'
                  and l.pid <> pg_backend_pid()), 'sem lock concorrente')),

    ('A2', false, 'RLS ligada em feedbacks_360',
      coalesce((select c.relrowsecurity from pg_class c
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relname = 'feedbacks_360'), false),
      'relforcerowsecurity: ' || coalesce((select c.relforcerowsecurity::text from pg_class c
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relname = 'feedbacks_360'), 'n/a')),

    ('A3', false, 'nenhuma funcao SECURITY DEFINER truncando fora de public',
      not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
          and n.nspname <> 'public'
          and p.prosecdef
          and p.prosrc ilike '%truncate%'),
      coalesce((select string_agg(distinct n.nspname || '.' || p.proname, ', ') from pg_proc p
                join pg_namespace n on n.oid = p.pronamespace
                where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
                  and n.nspname <> 'public' and p.prosecdef and p.prosrc ilike '%truncate%'),
               'nenhuma'))
  ) as t(codigo, bloqueia, descricao, ok, detalhe)
)
select
  case when bloqueia and not ok then 'BLOQUEIO'
       when not ok then 'AVISO'
       else 'OK' end as situacao,
  codigo, descricao, detalhe,
  count(*) filter (where bloqueia and not ok) over () as bloqueios,
  count(*) filter (where not bloqueia and not ok) over () as avisos,
  count(*) filter (where bloqueia and not ok) over () = 0 as pode_aplicar
from checagens
order by 1, 2;

-- ─────────────────────────────────────────────────────────────────────────────
-- D · DIAGNÓSTICO DE CONTEXTO EMPRESARIAL — tudo AGREGADO (contagens e
--     percentuais). Nenhum nome, e-mail, documento, foto ou id de pessoa é
--     projetado; nenhum registro é criado, alterado ou preenchido.
--     Por que importa: a validação §7 da RPC `criar_feedback_seguro` passou a
--     exigir que `avaliado_id`, `avaliador_id` e `ciclo_id` pertençam à MESMA
--     empresa autorizada. Um colaborador ou ciclo com `empresa_id` NULO não
--     casa com nenhuma empresa e fica inutilizável para criação.
-- ─────────────────────────────────────────────────────────────────────────────

-- D1 · COLABORADORES: quantos estão SEM empresa
select 'D1' as bloco,
       count(*)                                                  as colaboradores_total,
       count(*) filter (where empresa_id is null)                as sem_empresa,
       count(*) filter (where empresa_id is not null)            as com_empresa,
       round(100.0 * count(*) filter (where empresa_id is null) / greatest(count(*), 1), 1) as pct_sem_empresa,
       count(distinct empresa_id)                                as empresas_distintas
from public.colaboradores;

-- D2 · CICLOS DE AVALIAÇÃO: quantos estão SEM empresa
select 'D2' as bloco,
       count(*)                                                  as ciclos_total,
       count(*) filter (where empresa_id is null)                as sem_empresa,
       count(*) filter (where empresa_id is not null)            as com_empresa,
       round(100.0 * count(*) filter (where empresa_id is null) / greatest(count(*), 1), 1) as pct_sem_empresa,
       count(distinct empresa_id)                                as empresas_distintas
from public.ciclos_avaliacao;

-- D3 · INCONSISTÊNCIAS DE EMPRESA no histórico já gravado.
--      `colaborador_de_outra_empresa` / `ciclo_de_outra_empresa` contam feedbacks
--      cuja empresa difere da do colaborador avaliado / do ciclo. Isso NÃO
--      impede criação nova (são registros antigos, preservados como estão e
--      nunca reescritos por este script), mas mostra se a régua que a RPC passa
--      a exigir já é a régua dos dados existentes. `avaliado_sem_cadastro` e
--      `ciclo_sem_cadastro` apontariam referência órfã (não deveria ocorrer: há
--      FK para `colaboradores`).
select 'D3' as bloco,
       count(*)                                                                as feedbacks_total,
       count(*) filter (where f.empresa_id is null)                            as feedback_sem_empresa,
       count(*) filter (where c.id is null)                                    as avaliado_sem_cadastro,
       count(*) filter (where c.empresa_id is distinct from f.empresa_id)      as colaborador_de_outra_empresa,
       count(*) filter (where ci.id is null)                                   as ciclo_sem_cadastro,
       count(*) filter (where ci.empresa_id is distinct from f.empresa_id)     as ciclo_de_outra_empresa
from public.feedbacks_360 f
left join public.colaboradores c      on c.id  = f.avaliado_id
left join public.ciclos_avaliacao ci  on ci.id = f.ciclo_id;

-- D4 · COMPATIBILIDADE dos colaboradores/ciclos disponíveis com a nova
--      validação, calculada sobre as empresas que o módulo REALMENTE usa (as
--      que já têm feedback). `prontas_para_criar` = a empresa tem, ao mesmo
--      tempo, ao menos um colaborador E ao menos um ciclo com o MESMO
--      `empresa_id`. `pares_colaborador_ciclo_validos` é o total de
--      colaboradores (com empresa) que têm pelo menos um ciclo da mesma empresa
--      — a medida direta de quantas duplas a criação consegue montar.
select 'D4' as bloco,
       count(*)                                                                 as empresas_com_feedbacks,
       count(*) filter (where tem_colaborador and tem_ciclo)                    as prontas_para_criar,
       count(*) filter (where not tem_colaborador)                              as empresas_sem_colaborador_valido,
       count(*) filter (where not tem_ciclo)                                    as empresas_sem_ciclo_valido,
       (select count(*)
          from public.colaboradores c
         where c.empresa_id is not null
           and exists (select 1 from public.ciclos_avaliacao ci where ci.empresa_id = c.empresa_id))
                                                                                as pares_colaborador_ciclo_validos,
       -- expressão puramente AGREGADA (mesma régua do B8): todas as empresas com
       -- feedback conseguem montar uma criação?
       count(*) filter (where tem_colaborador and tem_ciclo) = count(*)
                                                                                as compativel_com_as_novas_validacoes
from (
  select f.empresa_id,
         exists (select 1 from public.colaboradores c where c.empresa_id = f.empresa_id)      as tem_colaborador,
         exists (select 1 from public.ciclos_avaliacao ci where ci.empresa_id = f.empresa_id) as tem_ciclo
    from (select distinct empresa_id from public.feedbacks_360 where empresa_id is not null) f
) z;


-- ─────────────────────────────────────────────────────────────────────────────
-- BASE · ESTADO ATUAL DO PRIVILÉGIO DE TRUNCATE — a prova do "antes".
--      Esperado AGORA: `anon` e `authenticated` com `pode_truncate = true`, e
--      entradas de TRUNCATE no ACL. `service_role` aparece como referência
--      (é mantido de propósito pela correção). Guarde esta saída: ela forma o
--      par com a linha `ACEITE … falhas = 0` do script de verificação.
--      O `case` evita erro se a tabela não existir (aí B1 já bloqueou).
-- ─────────────────────────────────────────────────────────────────────────────
select 'BASE' as bloco, r.rolname as papel,
       case when to_regclass('public.feedbacks_360') is null then null
            else has_table_privilege(r.rolname, 'public.feedbacks_360', 'TRUNCATE') end as pode_truncate,
       case when to_regclass('public.feedbacks_360') is null then null
            else has_table_privilege(r.rolname, 'public.feedbacks_360', 'TRUNCATE WITH GRANT OPTION') end as pode_conceder
from pg_roles r
where r.rolname in ('anon', 'authenticated', 'service_role')
order by 2;

select 'BASE-ACL' as bloco,
       case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as papel,
       a.privilege_type as privilegio,
       a.is_grantable as com_grant_option,
       pg_get_userbyid(a.grantor) as concedido_por
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(c.relacl) a
where n.nspname = 'public' and c.relname = 'feedbacks_360'
order by 2, 3;

-- TRAVA FINAL: encerra a transação somente leitura (nada persiste).
rollback;

