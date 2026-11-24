-- ============================================================================
-- NINE-BOX · VALIDAÇÃO PRÉ-IMPLANTAÇÃO — SCRIPT **SOMENTE LEITURA**
-- ----------------------------------------------------------------------------
-- Confere, no banco AUTORIZADO, tudo que a migration de finalização assume.
-- Nenhuma escrita: roda dentro de uma transação que TERMINA EM ROLLBACK e usa
-- `SET TRANSACTION READ ONLY` (qualquer escrita acidental falharia).
--
-- Os TIPOS GERADOS (`src/integrations/supabase/types.ts`) NÃO são prova de como
-- o banco está: este script é a verificação real.
--
-- Uso: cole no SQL Editor e rode; devolva os blocos Q1…Q16.
--
-- BLOCOS: Q1–Q3 papéis e tenant · Q4 auditoria · Q5 colunas/grants/policies de
-- `feedbacks_360` · Q6 dependências · Q7 objetos da migration · Q8 contexto ·
-- Q9–Q11 matriz de privilégios e contornos ao cancelamento auditado ·
-- Q12 policies sem filtro de empresa · Q13 papéis em uso · Q14 quem mais
-- escreve em `feedbacks_360` (funções e triggers) · Q15/Q15b auto-leitura de
-- `user_roles` (justifica os helpers SECURITY DEFINER) · Q16 helpers da
-- migration ainda inexistentes.
-- ============================================================================

begin;
set transaction read only;

-- Q1 · Valores REAIS do enum `app_role`
select 'Q1' as bloco, e.enumlabel as papel, e.enumsortorder as ordem
from pg_enum e
join pg_type t on t.oid = e.enumtypid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typname = 'app_role'
order by e.enumsortorder;

-- Q2 · Estrutura de `user_roles` (colunas, tipos e nulabilidade)
select 'Q2' as bloco, ordinal_position, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'user_roles'
order by ordinal_position;

-- Q2b · Quantos vínculos por papel existem hoje (sem expor usuários)
select 'Q2b' as bloco, role::text as papel, count(*) as vinculos
from public.user_roles
group by 1, 2
order by 3 desc;

-- Q3 · Quem é "proprietário": como a empresa autoriza o usuário?
--      (mostra as funções auxiliares usadas pelas policies)
select 'Q3' as bloco, p.proname as funcao, pg_get_function_arguments(p.oid) as argumentos,
       pg_get_function_result(p.oid) as retorno, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_user_empresas', 'get_auth_empresa_id', 'is_admin', 'has_role', 'get_user_roles')
order by 1, 2;

-- Q3b · Vínculo empresa ↔ usuário (origem do isolamento por tenant)
select 'Q3b' as bloco, table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('empresas_usuarios', 'usuario_empresas', 'empresa_membros', 'perfis')
order by 1, 2;

-- Q4 · Estrutura de `audit_log` (a migration grava nela)
select 'Q4' as bloco, ordinal_position, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'audit_log'
order by ordinal_position;

-- Q4b · Checks aplicados em `audit_log.acao` (a RPC usa 'UPDATE' e 'INSERT')
select 'Q4b' as bloco, con.conname as constraint, pg_get_constraintdef(con.oid) as definicao
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'audit_log'
order by 1, 2;

-- Q4c · `audit_log` é append-only? (trigger que bloqueia UPDATE/DELETE)
select 'Q4c' as bloco, t.tgname as trigger, p.proname as funcao
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'audit_log' and not t.tgisinternal
order by 1, 2;

-- Q5 · Permissões ATUAIS de `feedbacks_360` (o que a migration vai revogar)
select 'Q5' as bloco, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'feedbacks_360'
order by grantee, privilege_type;

-- Q5b · Policies de `feedbacks_360` (nome, comando, papéis, expressão)
select 'Q5b' as bloco, pol.polname as policy, pol.cmd as comando,
       coalesce(array_to_string(pol.polroles::regrole[], ', '), 'PUBLIC') as papeis,
       pg_get_expr(pol.polqual, pol.polrelid) as usando,
       pg_get_expr(pol.polwithcheck, pol.polrelid) as com_check
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'feedbacks_360'
order by 1, 2;

-- Q5c · Colunas reais de `feedbacks_360` (a migration usa estas)
select 'Q5c' as bloco, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'feedbacks_360'
order by ordinal_position;

-- Q6 · Quem depende das policies/objetos que a migration altera
--      (views que leem feedbacks_360, triggers na tabela e grants a anon)
select 'Q6' as bloco, dependent.relname as objeto_dependente, dependent.relkind as tipo
from pg_depend d
join pg_rewrite r on r.oid = d.objid
join pg_class dependent on dependent.oid = r.ev_class
join pg_class source on source.oid = d.refobjid
join pg_namespace n on n.oid = source.relnamespace
where n.nspname = 'public' and source.relname = 'feedbacks_360'
  and dependent.relname <> 'feedbacks_360'
order by 1, 2;

-- Q7 · Objetos da migration ainda NÃO existem? (confirma que ela não foi aplicada)
select 'Q7' as bloco, objeto, to_regclass('public.' || objeto) is not null as existe
from (values
  ('feedbacks_360_operacoes'),
  ('feedbacks_360_validacoes_potencial'),
  ('vw_feedbacks_360_versao')
) as t(objeto);

-- Q8 · Contexto: em qual projeto este script está rodando
select 'Q8' as bloco, current_database() as banco, current_user as papel_da_sessao,
       left(version(), 60) as versao_postgres;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q9 · MATRIZ DE PRIVILÉGIOS de `feedbacks_360`: quem pode INSERT/UPDATE/DELETE
-- ─────────────────────────────────────────────────────────────────────────────
select 'Q9' as bloco, grantee as papel,
       bool_or(privilege_type = 'SELECT') as pode_select,
       bool_or(privilege_type = 'INSERT') as pode_insert,
       bool_or(privilege_type = 'UPDATE') as pode_update,
       bool_or(privilege_type = 'DELETE') as pode_delete
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'feedbacks_360'
group by grantee
order by grantee;

-- Q9b · Dono da tabela e estado do RLS
select 'Q9b' as bloco, c.relname as tabela,
       c.relrowsecurity      as rls_ligada,
       c.relforcerowsecurity as rls_forcada_para_dono,
       pg_get_userbyid(c.relowner) as proprietario
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'feedbacks_360';

-- ─────────────────────────────────────────────────────────────────────────────
-- Q10 · QUAL POLICY CONTROLA CADA OPERAÇÃO (e se fecha por empresa)
-- ─────────────────────────────────────────────────────────────────────────────
select 'Q10' as bloco, pol.polname as policy,
       case pol.cmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                    when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'TODAS' end as comando,
       coalesce(array_to_string(pol.polroles::regrole[], ', '), 'PUBLIC') as papeis,
       (coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || ' ' ||
        coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')) ilike '%get_user_empresas%' as fecha_por_empresa,
       pg_get_expr(pol.polqual, pol.polrelid)      as usando,
       pg_get_expr(pol.polwithcheck, pol.polrelid) as com_check
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'feedbacks_360'
order by comando, policy;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q11 · CAMINHOS QUE CONTORNAM O CANCELAMENTO AUDITADO
--       (DELETE físico aberto a `authenticated`/`anon` dispensa motivo e trilha)
-- ─────────────────────────────────────────────────────────────────────────────
select 'Q11' as bloco,
  exists (select 1 from information_schema.role_table_grants
           where table_schema = 'public' and table_name = 'feedbacks_360'
             and privilege_type = 'DELETE' and grantee in ('authenticated','anon','public')) as delete_aberto,
  exists (select 1 from pg_policy pol
            join pg_class c on c.oid = pol.polrelid
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'feedbacks_360' and pol.cmd = 'd')      as policy_delete_existe,
  exists (select 1 from information_schema.role_table_grants
           where table_schema = 'public' and table_name = 'feedbacks_360'
             and privilege_type = 'INSERT' and grantee in ('authenticated','anon','public')) as insert_aberto,
  exists (select 1 from information_schema.role_table_grants
           where table_schema = 'public' and table_name = 'feedbacks_360'
             and privilege_type = 'UPDATE' and grantee in ('authenticated','anon','public')) as update_aberto,
  exists (select 1 from information_schema.role_table_grants
           where table_schema = 'public' and table_name = 'feedbacks_360'
             and grantee = 'anon')                                                            as anon_tem_privilegio;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q12 · POLICIES SEM FILTRO DE EMPRESA nas tabelas do módulo (risco de vazamento)
-- ─────────────────────────────────────────────────────────────────────────────
select 'Q12' as bloco, c.relname as tabela, pol.polname as policy,
       case pol.cmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                    when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'TODAS' end as comando,
       coalesce(pg_get_expr(pol.polqual, pol.polrelid), '(sem USING)') as usando
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('feedbacks_360','ciclos_avaliacao','pdis','metas_okrs','colaboradores','audit_log')
  and coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') not ilike '%empresa%'
order by tabela, comando, policy;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q13 · PAPÉIS EM USO (a checagem das RPCs precisa casar com a realidade)
-- ─────────────────────────────────────────────────────────────────────────────
select 'Q13' as bloco,
       count(*) filter (where role::text = 'rh')    as vinculos_rh,
       count(*) filter (where role::text = 'admin') as vinculos_admin,
       count(*) filter (where role::text in ('gestor','user')) as vinculos_sem_acesso_ao_modulo,
       count(distinct user_id) as usuarios_com_papel
from public.user_roles;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q14 · QUEM MAIS ESCREVE em `feedbacks_360` (funções e triggers)
-- ─────────────────────────────────────────────────────────────────────────────
select 'Q14' as bloco, p.proname as funcao, p.prosecdef as security_definer,
       (pg_get_functiondef(p.oid) ilike '%insert into public.feedbacks_360%') as insere,
       (pg_get_functiondef(p.oid) ilike '%update public.feedbacks_360%')      as atualiza,
       (pg_get_functiondef(p.oid) ilike '%delete from public.feedbacks_360%') as exclui
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and pg_get_functiondef(p.oid) ilike '%feedbacks_360%'
order by 1, 2;

-- Q14b · Triggers ativos em `feedbacks_360` (ex.: auditoria automática)
select 'Q14b' as bloco, t.tgname as trigger, p.proname as funcao,
       case when (t.tgtype & 4) = 4 then 'INSERT'
            when (t.tgtype & 8) = 8 then 'UPDATE'
            when (t.tgtype & 16) = 16 then 'DELETE' else 'outro' end as evento
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'feedbacks_360' and not t.tgisinternal;

-- ─────────────────────────────────────────────────────────────────────────────
-- Q15 · O usuário consegue ler os PRÓPRIOS papéis? (decide se os helpers de
--       autorização precisam ser SECURITY DEFINER — a migration cria os dois)
-- ─────────────────────────────────────────────────────────────────────────────
select 'Q15' as bloco, grantee as papel, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'user_roles'
order by grantee, privilege_type;

-- Q15b · Policies de `user_roles` (se não permitirem auto-leitura, o helper é obrigatório)
select 'Q15b' as bloco, pol.polname as policy,
       case pol.cmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                    when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'TODAS' end as comando,
       coalesce(array_to_string(pol.polroles::regrole[], ', '), 'PUBLIC') as papeis,
       pg_get_expr(pol.polqual, pol.polrelid) as usando
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'user_roles'
order by comando, policy;

-- Q16 · Helpers de autorização da migration já existem? (devem vir `false`)
select 'Q16' as bloco, funcao, to_regprocedure('public.' || funcao) is not null as existe
from (values
  ('pode_gerir_avaliacoes()'),
  ('pode_validar_potencial()'),
  ('versao_avaliacao_feedback(uuid)')
) as t(funcao);

-- TRAVA FINAL: encerra a transação somente leitura (nada persiste).
rollback;
