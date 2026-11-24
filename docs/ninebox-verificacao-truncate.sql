-- ============================================================================
-- NINE-BOX · VERIFICAÇÃO PÓS-MIGRATION — PRIVILÉGIO `TRUNCATE` EM `feedbacks_360`
-- ----------------------------------------------------------------------------
-- Prova que a revogação de `TRUNCATE` (migration `20261015090000`, §3b) está
-- EFETIVA, e que os caminhos autorizados de RH/proprietário continuam de pé.
--
-- COMO RODAR: cole no SQL Editor do banco AUTORIZADO, depois de aplicar a
-- migration. Devolva os blocos T1…T7 e a linha `RESULTADO`.
--
-- SEGURANÇA DO PRÓPRIO SCRIPT: é SOMENTE LEITURA — roda dentro de uma transação
-- com `SET TRANSACTION READ ONLY` e termina em `ROLLBACK`. Qualquer escrita
-- acidental falharia na hora. Não cria tabelas temporárias (por isso os
-- invariantes finais são um único SELECT com funções de janela).
--
-- POR QUE `has_table_privilege` É A PROVA (e não o ACL sozinho):
--   `has_table_privilege(papel, tabela, 'TRUNCATE')` responde pela EFETIVIDADE e
--   cobre os TRÊS caminhos de concessão de uma só vez:
--     1. `GRANT TRUNCATE … TO <papel>`            (grant direto);
--     2. `GRANT TRUNCATE … TO PUBLIC`             (grant ao pseudo-papel PUBLIC);
--     3. herança — `<papel>` é membro de outro papel que tem o privilégio.
--   É exatamente por isso que revogar só de `anon`/`authenticated` pode não
--   bastar: um grant a PUBLIC mantém os dois `true`.
--   Limitação conhecida: não existe papel `public` em `pg_roles`, então o caso
--   (2) é conferido no ACL cru (T2/T3), onde o `grantee` de PUBLIC é `0`.
--
-- BLOCOS: T1 efetividade por papel · T2 ACL cru (quem tem o quê) · T3 herança
-- que ainda concederia TRUNCATE (o furo silencioso) · T4 dono da tabela e RLS ·
-- T5 default privileges que recriariam o grant · T6 outras tabelas de `public`
-- ainda expostas (contexto, fora do escopo desta correção) · T7 caminhos de RH
-- e proprietário preservados · **T8/T8b `WITH GRANT OPTION`** (quem poderia
-- re-conceder sozinho) · **T9 funções `SECURITY DEFINER` que truncam** (caminho
-- indireto) · **ACEITE** (invariantes, `falhas` deve ser 0).
--
-- QUANDO RODAR — o mesmo arquivo serve aos dois momentos:
--   • **ANTES** (registro do estado atual): espera-se T1 com `anon` e
--     `authenticated` em `pode_truncate = true`, T2 mostrando a entrada de
--     TRUNCATE e a linha `ACEITE … falhas > 0`. Guarde a saída: é a prova do
--     "antes". É aqui que T2/T3 revelam a ORIGEM do privilégio (grant a PUBLIC
--     ou herança de papel).
--   • **POSTERIOR** (aceite): `ACEITE … falhas = 0`, T3 e T8b VAZIOS.
-- O gate que decide se pode aplicar é `docs/ninebox-pre-aplicacao.sql`.
-- ============================================================================

begin;
set transaction read only;

-- ─────────────────────────────────────────────────────────────────────────────
-- T1 · EFETIVIDADE: quem consegue truncar `feedbacks_360` hoje
--      Esperado: FALSE para `anon` e `authenticated`.
--      `service_role` é mantido de propósito (papel administrativo/servidor,
--      nunca assumido pelo navegador) — ver o comentário §3b da migration.
-- ─────────────────────────────────────────────────────────────────────────────
select 'T1' as bloco, r.rolname as papel,
       has_table_privilege(r.rolname, 'public.feedbacks_360', 'TRUNCATE') as pode_truncate,
       case
         when r.rolname in ('anon', 'authenticated') then 'deve ser FALSE'
         when r.rolname = 'service_role'             then 'mantido (administrativo)'
         else 'informativo'
       end as expectativa
from pg_roles r
where r.rolname in ('anon', 'authenticated', 'service_role', 'authenticator', 'postgres', 'supabase_admin')
order by 2;

-- ─────────────────────────────────────────────────────────────────────────────
-- T2 · ACL CRU de `feedbacks_360`: toda concessão explícita, papel por papel.
--      `PUBLIC` aparece como `grantee = 0` (é o pseudo-papel, não uma role).
--      Esperado: NENHUMA linha com `privilege_type = 'TRUNCATE'` para anon,
--      authenticated ou PUBLIC. (ACL nulo devolve zero linhas — nenhuma
--      concessão explícita.)
-- ─────────────────────────────────────────────────────────────────────────────
select 'T2' as bloco,
       case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as papel,
       a.privilege_type as privilegio,
       pg_get_userbyid(a.grantor) as concedido_por
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(c.relacl) a
where n.nspname = 'public' and c.relname = 'feedbacks_360'
order by 2, 3;

-- ─────────────────────────────────────────────────────────────────────────────
-- T3 · HERANÇA: papéis cujos privilégios `anon`/`authenticated` herdam E que
--      ainda têm TRUNCATE na tabela. É o "furo silencioso" que a revogação
--      direta não fecha — se este bloco voltar VAZIO, não há herança concedendo.
--      `pg_has_role(papel_base, r.oid, 'USAGE')` = "papel_base herda os
--      privilégios de r".
-- ─────────────────────────────────────────────────────────────────────────────
select 'T3' as bloco, base.papel_base, r.rolname as herda_de,
       has_table_privilege(r.rolname, 'public.feedbacks_360', 'TRUNCATE') as papel_herdado_tem_truncate
from (values ('anon'), ('authenticated')) as base(papel_base)
cross join pg_roles r
where pg_has_role(base.papel_base, r.oid, 'USAGE')
  and has_table_privilege(r.rolname, 'public.feedbacks_360', 'TRUNCATE')
order by 2, 3;

-- ─────────────────────────────────────────────────────────────────────────────
-- T4 · DONO da tabela e estado do RLS.
--      O DONO tem TRUNCATE IMPLÍCITO (o ACL não o limita), então ele precisa ser
--      um papel INTERNO do banco — nunca `anon`/`authenticated`/`authenticator`/
--      `service_role`. Se `proprietario_de_aplicacao` vier TRUE, a revogação é
--      apenas cosmética e o caso precisa de decisão separada (ALTER TABLE …
--      OWNER TO), fora do escopo desta migration.
-- ─────────────────────────────────────────────────────────────────────────────
select 'T4' as bloco, pg_get_userbyid(c.relowner) as proprietario,
       pg_get_userbyid(c.relowner) in ('anon', 'authenticated', 'authenticator', 'service_role') as proprietario_de_aplicacao,
       c.relrowsecurity as rls_ligada,
       c.relforcerowsecurity as rls_forcada_para_dono
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'feedbacks_360';

-- ─────────────────────────────────────────────────────────────────────────────
-- T5 · DEFAULT PRIVILEGES que poderiam RECRIAR o grant em tabelas futuras.
--      Esperado: VAZIO (nenhuma regra concedendo TRUNCATE a PUBLIC/anon/
--      authenticated). Não afeta a tabela atual, mas explica um retorno futuro
--      do problema em objetos novos.
-- ─────────────────────────────────────────────────────────────────────────────
select 'T5' as bloco,
       d.defaclrole::regrole as dono_dos_objetos,
       d.defaclnamespace::regnamespace as schema,
       d.defaclobjtype as tipo_objeto,
       a.privilege_type as privilegio,
       case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as concedido_a
from pg_default_acl d
cross join lateral aclexplode(d.defaclacl) a
where a.privilege_type = 'TRUNCATE'
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
order by 2, 3, 5, 6;

-- ─────────────────────────────────────────────────────────────────────────────
-- T6 · CONTEXTO (fora do escopo desta correção): outras tabelas de `public`
--      onde `anon` ou `authenticated` ainda têm TRUNCATE efetivo. Nenhuma ação
--      é tomada aqui — serve para medir o alcance do problema e embasar uma
--      autorização separada, tabela por tabela.
-- ─────────────────────────────────────────────────────────────────────────────
select 'T6' as bloco, c.relname as tabela,
       has_table_privilege('anon', c.oid, 'TRUNCATE') as anon_truncate,
       has_table_privilege('authenticated', c.oid, 'TRUNCATE') as authenticated_truncate
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and (
    has_table_privilege('anon', c.oid, 'TRUNCATE')
    or has_table_privilege('authenticated', c.oid, 'TRUNCATE')
  )
order by 2;

-- ─────────────────────────────────────────────────────────────────────────────
-- T7 · CAMINHOS AUTORIZADOS PRESERVADOS (RH e proprietário).
--      A revogação de TRUNCATE não participa de nenhum deles:
--        • CRIAR  → RPC `criar_feedback_seguro` (SECURITY DEFINER), EXECUTE para
--                   `authenticated`; o papel exigido é validado DENTRO da RPC
--                   (`pode_gerir_avaliacoes()` = admin/rh);
--        • LER    → SELECT na tabela sob a policy `feedbacks_360_select`;
--        • STATUS → RPCs `finalizar_feedback` / `validar_potencial_avaliacao`.
--      Esperado: `authenticated_executa = true` nas três RPCs e
--      `authenticated_select = true`.
-- ─────────────────────────────────────────────────────────────────────────────
select 'T7' as bloco, p.proname as funcao,
       p.prosecdef as security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_executa,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_executa
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('criar_feedback_seguro', 'finalizar_feedback', 'validar_potencial_avaliacao')
order by 2;

select 'T7b' as bloco,
       has_table_privilege('authenticated', 'public.feedbacks_360', 'SELECT') as authenticated_select,
       (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'feedbacks_360' and cmd = 'SELECT') as policies_select
;

-- ─────────────────────────────────────────────────────────────────────────────
-- T8 · OUTROS MECANISMOS (1/2): `WITH GRANT OPTION`.
--      Quem pode CONCEDER o privilégio pode devolvê-lo a si mesmo e a outros —
--      a revogação seria revertida sem passar por migration. Esperado: FALSE
--      para `anon`/`authenticated` no teste de EFETIVIDADE; T8b deve voltar
--      VAZIO (nenhuma entrada de ACL concedível a PUBLIC/papéis de aplicação).
--      `TRUNCATE WITH GRANT OPTION` também é aceito por `has_table_privilege`,
--      que resolve grant direto + PUBLIC + herança de uma vez.
-- ─────────────────────────────────────────────────────────────────────────────
select 'T8' as bloco, r.rolname as papel,
       has_table_privilege(r.rolname, 'public.feedbacks_360', 'TRUNCATE WITH GRANT OPTION') as pode_conceder_truncate
from pg_roles r
where r.rolname in ('anon', 'authenticated')
order by 2;

select 'T8b' as bloco,
       case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as papel,
       a.privilege_type as privilegio,
       a.is_grantable as com_grant_option,
       pg_get_userbyid(a.grantor) as concedido_por
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(c.relacl) a
where n.nspname = 'public' and c.relname = 'feedbacks_360'
  and a.is_grantable
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
order by 2, 3;

-- ─────────────────────────────────────────────────────────────────────────────
-- T9 · OUTROS MECANISMOS (2/2): funções `SECURITY DEFINER` cujo corpo contém
--      `TRUNCATE`. É o caminho INDIRETO: uma função definer executa com os
--      privilégios do DONO, então ela poderia truncar mesmo que o chamador não
--      tenha o privilégio — e a revogação do ACL não a alcançaria.
--      Varredura nos schemas de aplicação (`public` e demais não-sistema),
--      incluindo funções de trigger. Esperado: VAZIO em `public` — e é isso que
--      o ACEITE cobra; ocorrências em OUTROS schemas saem aqui apenas como
--      informação (podem ser de extensão, fora da superfície deste módulo).
--      Observação: RLS NÃO bloqueia TRUNCATE — nenhuma policy impede o
--      esvaziamento da tabela; a única barreira é o privilégio.
-- ─────────────────────────────────────────────────────────────────────────────
select 'T9' as bloco, n.nspname as schema, p.proname as funcao,
       pg_get_userbyid(p.proowner) as proprietario,
       p.prosecdef as security_definer,
       (select count(*) from pg_trigger t where t.tgfoid = p.oid) as usada_em_triggers
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
  and p.prosecdef
  and p.prosrc ilike '%truncate%'
order by 2, 3;

-- ─────────────────────────────────────────────────────────────────────────────
-- ACEITE (executar como POSTERIOR) · todos os invariantes numa linha.
-- `falhas` deve ser 0.
--   • `anon`/`authenticated` sem TRUNCATE  → revogação efetiva (grant direto);
--   • PUBLIC sem TRUNCATE                  → fechado o caminho do pseudo-papel;
--   • nenhum papel herdado concedendo      → fechado o caminho da herança;
--   • dono não é papel de aplicação        → o ACL não é contornado pelo dono;
--   • nenhum default privilege recriando   → não volta em objetos futuros;
--   • sem `WITH GRANT OPTION`              → ninguém pode re-conceder sozinho;
--   • nenhuma função definer truncando     → fechado o caminho indireto;
--   • leitura e RPCs de RH/proprietário    → caminhos autorizados intactos.
-- ─────────────────────────────────────────────────────────────────────────────
select 'ACEITE' as bloco, invariante, ok,
       count(*) over () as invariantes,
       count(*) filter (where not ok) over () as falhas
from (values
  ('anon sem TRUNCATE em feedbacks_360',
    not has_table_privilege('anon', 'public.feedbacks_360', 'TRUNCATE')),

  ('authenticated sem TRUNCATE em feedbacks_360',
    not has_table_privilege('authenticated', 'public.feedbacks_360', 'TRUNCATE')),

  ('PUBLIC sem TRUNCATE em feedbacks_360',
    not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(c.relacl) a
      where n.nspname = 'public' and c.relname = 'feedbacks_360'
        and a.grantee = 0 and a.privilege_type = 'TRUNCATE')),

  ('nenhum papel herdado por anon/authenticated concede TRUNCATE',
    not exists (
      select 1
      from (values ('anon'), ('authenticated')) as base(papel_base)
      cross join pg_roles r
      where pg_has_role(base.papel_base, r.oid, 'USAGE')
        and has_table_privilege(r.rolname, 'public.feedbacks_360', 'TRUNCATE'))),

  ('dono da tabela nao e papel de aplicacao (ACL nao e contornado)',
    not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'feedbacks_360'
        and pg_get_userbyid(c.relowner) in ('anon', 'authenticated', 'authenticator', 'service_role'))),

  ('nenhum default privilege recria o grant de TRUNCATE',
    not exists (
      select 1
      from pg_default_acl d
      cross join lateral aclexplode(d.defaclacl) a
      where a.privilege_type = 'TRUNCATE'
        and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated')))),

  ('anon/authenticated nao podem CONCEDER TRUNCATE (sem grant option)',
    not has_table_privilege('anon', 'public.feedbacks_360', 'TRUNCATE WITH GRANT OPTION')
    and not has_table_privilege('authenticated', 'public.feedbacks_360', 'TRUNCATE WITH GRANT OPTION')),

  ('nenhuma funcao SECURITY DEFINER de public trunca (caminho indireto)',
    not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and p.prosrc ilike '%truncate%')),

  ('RH/proprietario ainda LEEM (privilegio SELECT + policy de SELECT)',
    has_table_privilege('authenticated', 'public.feedbacks_360', 'SELECT')
    and exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'feedbacks_360' and cmd = 'SELECT')),

  ('RH ainda CRIA pela RPC autorizada (SECURITY DEFINER + EXECUTE)',
    exists (select 1
              from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'criar_feedback_seguro'
               and p.prosecdef
               and has_function_privilege('authenticated', p.oid, 'EXECUTE'))),

  ('RH ainda CONCLUI/CANCELA/REABRE pela RPC autorizada',
    exists (select 1
              from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'finalizar_feedback'
               and has_function_privilege('authenticated', p.oid, 'EXECUTE'))),

  ('RH ainda VALIDA POTENCIAL pela RPC autorizada',
    exists (select 1
              from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'validar_potencial_avaliacao'
               and has_function_privilege('authenticated', p.oid, 'EXECUTE')))
) as t(invariante, ok);

-- TRAVA FINAL: encerra a transação somente leitura (nada persiste).
rollback;

