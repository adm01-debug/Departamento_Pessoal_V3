-- ============================================================================
-- NINE-BOX · FINALIZAÇÃO DE FEEDBACKS + VALIDAÇÃO DE POTENCIAL PELO RH
-- ----------------------------------------------------------------------------
-- ⚠️  MIGRATION PREPARADA, **NÃO EXECUTADA**. Requer aprovação explícita antes
--     de qualquer aplicação (produção ou homologação). Ver o plano em
--     `docs/ninebox-plano-finalizacao.md` (§12–§13) e o rollback em
--     `20261015090001_ninebox_finalizacao_e_potencial_rollback.sql`.
--
-- PAPÉIS REAIS (enum `public.app_role` confirmado no schema gerado):
--     'admin' | 'gestor' | 'rh' | 'user'
--   • Proprietário da empresa = `admin`
--   • RH                       = `rh`
--   • Concluir/cancelar/reabrir: admin e rh.
--   • VALIDAR POTENCIAL: somente `rh` (o `admin` NÃO substitui essa validação).
--   • `gestor`/`user` não são autorizados em nenhuma RPC deste módulo.
--
-- O QUE ESTA MIGRATION FAZ
--   1. `versao_avaliacao_feedback(uuid)` → VERSÃO CANÔNICA, calculada no SERVIDOR
--      (fonte única; o app nunca a recalcula).
--   2. `pode_gerir_avaliacoes()` / `pode_validar_potencial()` → helpers de papel
--      usados pelas POLICIES e pelas RPCs (fonte única de autorização).
--   3. `feedbacks_360_operacoes`            → idempotência POR OPERAÇÃO.
--   4. `feedbacks_360_validacoes_potencial` → validação do Potencial pelo RH,
--      vinculada à versão canônica da avaliação do gestor (histórico preservado).
--   5. RPC `finalizar_feedback`             → concluir/cancelar/reabrir,
--      com UPDATE + auditoria + idempotência na MESMA transação.
--   6. RPC `validar_potencial_avaliacao`    → validação verificável no servidor.
--   7. `vw_feedbacks_360_versao`            → leitura da versão vigente pelo app.
--   8. ENDURECIMENTO DE SEGURANÇA (correções R2/R3):
--      • INSERT passa a exigir PAPEL (`admin`/`rh`) **e** EMPRESA (WITH CHECK);
--      • DELETE físico BLOQUEADO (privilégio revogado + policy removida) — a
--        regra oficial é CANCELAR, preservando o registro e auditando;
--      • TRUNCATE REVOGADO de PUBLIC, `anon` e `authenticated` (§3b): esvaziar a
--        tabela inteira é destruição em MASSA, não escrita de registro — fica
--        fora de qualquer caminho autorizado do app (inventário em §3b);
--      • UPDATE direto revogado: só a RPC altera status.
--
-- NÃO altera dados existentes, não cria/remove views (exceto a nova view de
-- versão), não toca em RLS de outras tabelas e não modifica avaliações históricas.
--
-- ── TRANSAÇÃO ÚNICA (ATOMICIDADE INTEGRAL) ──────────────────────────────────
-- Este arquivo é envolvido por UM `begin; … commit;` (o `begin;` está logo abaixo
-- e o `commit;` no fim do arquivo). Se QUALQUER passo falhar, o PostgreSQL aborta
-- a transação e NADA fica aplicado: nem função criada, nem policy trocada, nem
-- privilégio revogado.
--
-- Requisitos verificados — NENHUMA instrução deste arquivo é incompatível com
-- execução transacional:
--   • não há `CREATE INDEX CONCURRENTLY` (o índice criado é comum, transacional);
--   • não há `ALTER TYPE … ADD VALUE`, `VACUUM`, `REINDEX`,
--     `CREATE/DROP DATABASE`, `ALTER SYSTEM`, `CREATE TABLESPACE` nem
--     `REFRESH MATERIALIZED VIEW CONCURRENTLY`;
--   • não há `SET` de sessão, `SAVEPOINT` nem `COMMIT`/`ROLLBACK` internos;
--   • todo o resto é DDL/DCL transacional: `create or replace function`,
--     `create view`/`drop view`, `create table if not exists`,
--     `create index if not exists`, `alter table … enable row level security`,
--     `create policy`/`drop policy`, `revoke`, `grant` e `do $$ … $$`;
--   • ZERO DML **executado**: nenhum `insert`/`update`/`delete`/`truncate` de
--     dados roda ao aplicar. Os `insert`/`update` que existem no arquivo estão
--     dentro de CORPO DE FUNÇÃO (`$$ … $$`, nas RPCs) e só executam quando a RPC
--     for chamada — nunca durante a migration. Logo, a migration não toca uma
--     única linha de avaliação existente.
--
-- Compatibilidade com a CLI (`supabase db push`): a CLI também transaciona cada
-- migration; neste arquivo o `begin;` vira um WARNING ("there is already a
-- transaction in progress") e o `commit;` fecha essa MESMA transação — o efeito
-- é o mesmo e nada fica fora do envelope. No SQL Editor o envelope é o que
-- garante a atomicidade, porque sem ele cada instrução confirmaria sozinha.
--
-- ⚠️  LOCK ESPERADO: `drop policy`/`create policy`/`revoke` em `feedbacks_360`
--     exigem ACCESS EXCLUSIVE nessa tabela. A transação mantém o lock até o
--     `commit;` — por isso aplique em janela de baixo uso. São operações de
--     catálogo (rápidas), mas a duração do lock é a da transação inteira.
-- ============================================================================

begin;

-- 0) VERSÃO CANÔNICA DA AVALIAÇÃO — fonte única (o app apenas LÊ este valor).
--    Formato: id | updated_at (YYYY-MM-DD"T"HH24:MI:SS.US, UTC) | potencial | status
--    Mudou nota, status ou updated_at ⇒ a versão muda ⇒ validação antiga expira.
--
--    PRECISÃO SUBSECUNDO (`SS.US` = MICROSSEGUNDOS) — obrigatória, não estética:
--    a validação do RH guarda a versão EXATA que analisou e a compara por
--    IGUALDADE. Com precisão de SEGUNDOS, o ciclo
--        concluído → reaberto → concluído de novo dentro do MESMO segundo
--    produzia `id` + `updated_at`(mesmo segundo) + `potencial` + `status`
--    ('concluido') idênticos ⇒ a versão NÃO mudava ⇒ a aprovação ANTERIOR do RH
--    continuava valendo para uma avaliação que foi reaberta e refeita. Com
--    microsssegundos, cada transição de status grava um `updated_at` distinto
--    (`now()` tem resolução de microssegundo e cada RPC é a sua própria
--    transação), então reabrir e concluir de novo invalida a aprovação anterior
--    por construção — sem apagar histórico (as validações são imutáveis).
--    O espelho no front é só de DOCUMENTAÇÃO (`CONTRATO_VERSAO_AVALIACAO` em
--    `motorAvaliacao360.ts`): ele apenas COMPARA a string vinda do banco.
create or replace function public.versao_avaliacao_feedback(p_feedback_id uuid)
returns text
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select f.id::text
       || '|' || to_char(f.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')
       || '|' || coalesce(f.potencial::text, '')
       || '|' || coalesce(lower(btrim(f.status)), '')
  from public.feedbacks_360 f
  where f.id = p_feedback_id;
$$;

revoke all on function public.versao_avaliacao_feedback(uuid) from public, anon;
grant execute on function public.versao_avaliacao_feedback(uuid) to authenticated, service_role;

-- 0b) View de leitura da versão vigente (o front consulta, nunca calcula).
--     `security_invoker` ⇒ RLS de `feedbacks_360` continua valendo.
drop view if exists public.vw_feedbacks_360_versao;
create view public.vw_feedbacks_360_versao
  with (security_invoker = true) as
select
  f.id              as feedback_id,
  f.empresa_id,
  f.ciclo_id,
  f.avaliado_id,
  f.avaliador_id,
  f.tipo,
  f.status,
  f.potencial,
  f.updated_at,
  public.versao_avaliacao_feedback(f.id) as versao_avaliacao
from public.feedbacks_360 f;

revoke all on public.vw_feedbacks_360_versao from public, anon;
grant select on public.vw_feedbacks_360_versao to authenticated, service_role;

-- 0c) AUTORIZAÇÃO POR PAPEL — helpers usados pelas POLICIES e pelas RPCs.
--     `SECURITY DEFINER` porque `user_roles` tem RLS própria: a policy precisa
--     ler os papéis do usuário sem depender de o usuário poder ler essa tabela.
--     Regra do módulo: RH = `rh` · Proprietário = `admin` (conferir em Q1/Q3/Q13).
create or replace function public.pode_gerir_avaliacoes()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid()
       and ur.role::text in ('admin','rh')
  );
$$;

create or replace function public.pode_validar_potencial()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid()
       and ur.role::text = 'rh'
  );
$$;

revoke all on function public.pode_gerir_avaliacoes() from public, anon;
revoke all on function public.pode_validar_potencial() from public, anon;
grant execute on function public.pode_gerir_avaliacoes() to authenticated, service_role;
grant execute on function public.pode_validar_potencial() to authenticated, service_role;

-- 0d) CREATE restrito a RH/proprietário (§1): a policy de INSERT passa a exigir
--     PAPEL **e** EMPRESA. Preserva `avaliacaoService.criarFeedback`
--     (INSERT direto via PostgREST), apenas com o gate correto.
--     A trilha da criação continua sendo a tabela de auditoria por trigger/RPC —
--     ver §0e; nada é prometido como atômico no frontend.
drop policy if exists "feedbacks_360_insert" on public.feedbacks_360;
create policy "feedbacks_360_insert" on public.feedbacks_360
  for insert to authenticated
  with check (
    public.pode_gerir_avaliacoes()
    and empresa_id is not null
    and empresa_id in (select public.get_user_empresas(auth.uid()))
  );

-- 0e) DELETE físico BLOQUEADO (§9.2): a regra oficial é CANCELAR, preservando o
--     registro e produzindo auditoria. Sem privilégio e sem policy de DELETE, o
--     PostgREST recusa a exclusão mesmo para quem tem papel autorizado.
--     A destruição em MASSA (`TRUNCATE`, que ignora o RLS) é tratada em §3b.
revoke delete on public.feedbacks_360 from authenticated;
revoke delete on public.feedbacks_360 from anon;
drop policy if exists "feedbacks_360_delete" on public.feedbacks_360;

-- 0f) LEITURA restrita a RH/proprietário (§1): a policy de SELECT deixa de
--     aceitar apenas vínculo de empresa — passa a exigir também o PAPEL.
--
--     RECURSÃO: `pode_gerir_avaliacoes()` é `SECURITY DEFINER` e lê `user_roles`
--     como PROPRIETÁRIO (sem RLS do chamador). Como `user_roles` não referencia
--     `feedbacks_360` em nenhuma policy, não existe ciclo policy → helper → policy.
--
--     NOTA DE ORDEM: as policies das tabelas AUXILIARES (`fbo_select` e
--     `fvp_select`) NÃO ficam aqui. Elas exigem `create table` antes — e as
--     tabelas só nascem em §1/§2. Elas são definidas lá, uma única vez cada,
--     imediatamente após o `create table` + `enable row level security`, com a
--     MESMA régua (papel + empresa). Não existe definição duplicada em lugar
--     nenhum do arquivo.
drop policy if exists "feedbacks_360_select" on public.feedbacks_360;
create policy "feedbacks_360_select" on public.feedbacks_360
  for select to authenticated
  using (
    public.pode_gerir_avaliacoes()
    and empresa_id in (select public.get_user_empresas(auth.uid()))
  );

-- A view `vw_feedbacks_360_versao` é `security_invoker = true`, portanto NÃO tem
-- privilégio próprio: quem consulta paga as policies de `feedbacks_360` (agora
-- com papel + empresa). `gestor`/`user` autenticados recebem **zero linhas**.

-- 1) Operações (idempotência por operação; chave + parâmetros + resultado)
create table if not exists public.feedbacks_360_operacoes (
  idempotency_key text primary key,
  feedback_id     uuid not null references public.feedbacks_360(id) on delete cascade,
  empresa_id      uuid not null,
  operacao        text not null check (operacao in ('concluir','cancelar','reabrir','validar_potencial','criar')),
  hash_parametros text not null,
  resultado       jsonb not null,
  criada_em       timestamptz not null default now()
);

alter table public.feedbacks_360_operacoes enable row level security;

-- Policy DEFINIDA UMA ÚNICA VEZ, depois da tabela existir (a ordem anterior
-- tentava criá-la em §0f, ANTES do `create table` ⇒ "relation does not exist").
-- Mesma régua da tabela principal: PAPEL (`pode_gerir_avaliacoes()`) **e**
-- EMPRESA. Sem o papel, esta tabela viraria uma janela de leitura indireta do
-- histórico de idempotência (que carrega chave, parâmetros e resultado).
drop policy if exists fbo_select on public.feedbacks_360_operacoes;
create policy fbo_select on public.feedbacks_360_operacoes
  for select to authenticated
  using (
    public.pode_gerir_avaliacoes()
    and empresa_id in (select public.get_user_empresas(auth.uid()))
  );

revoke all on public.feedbacks_360_operacoes from anon;

-- 2) Validações de Potencial pelo RH (imutáveis; a vigente é a mais recente cuja
--    versão casa com a avaliação atual do gestor)
create table if not exists public.feedbacks_360_validacoes_potencial (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null,
  ciclo_id         uuid,
  colaborador_id   uuid not null,
  feedback_id      uuid not null references public.feedbacks_360(id) on delete cascade,
  versao_avaliacao text not null,
  potencial_validado numeric(4,2) not null check (potencial_validado between 1 and 5),
  validado_por     uuid not null,
  validado_em      timestamptz not null default now(),
  observacao       text
);

create index if not exists idx_fb360_validacoes_potencial
  on public.feedbacks_360_validacoes_potencial (feedback_id, validado_em desc);

alter table public.feedbacks_360_validacoes_potencial enable row level security;

-- Policy DEFINIDA UMA ÚNICA VEZ, depois da tabela existir (mesma correção de
-- ordem de §1: antes era criada em §0f, antes do `create table`). PAPEL **e**
-- EMPRESA: a validação de Potencial é dado sensível de RH; sem o papel, a
-- tabela viraria leitura indireta de quem só tem vínculo de empresa.
drop policy if exists fvp_select on public.feedbacks_360_validacoes_potencial;
create policy fvp_select on public.feedbacks_360_validacoes_potencial
  for select to authenticated
  using (
    public.pode_gerir_avaliacoes()
    and empresa_id in (select public.get_user_empresas(auth.uid()))
  );

revoke all on public.feedbacks_360_validacoes_potencial from anon;

-- 3) RPC de finalização: identidade → PAPEL → linha+trava → EMPRESA →
--    IDEMPOTÊNCIA → transição → nota (escala 1–5) → UPDATE + auditoria +
--    operação, tudo em UMA transação. A ordem importa: o reenvio idempotente é
--    um caminho de LEITURA e só pode responder DEPOIS da autorização.
create or replace function public.finalizar_feedback(
  p_feedback_id  uuid,
  p_acao         text,
  p_motivo       text default null,
  p_idempotencia text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_email        text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_hash         text;
  v_chave        text;
  v_linha        public.feedbacks_360%rowtype;
  v_novo         text;
  v_auditoria_id uuid;
  v_resultado    jsonb;
  v_confere      text;
  v_anterior     jsonb;
  v_nota         numeric;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if p_acao not in ('concluir','cancelar','reabrir') then
    raise exception 'acao_invalida';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;

  -- ── AUTORIZAÇÃO PRIMEIRO; IDEMPOTÊNCIA DEPOIS ──────────────────────────────
  -- O REENVIO É UM CAMINHO DE LEITURA: ele devolve `status_anterior`,
  -- `auditoria_id` e o resultado gravado daquela operação. Responder ao reenvio
  -- antes de checar papel e empresa transformava a idempotência numa PORTA
  -- LATERAL — a função é `SECURITY DEFINER`, então quem apresentasse a chave
  -- receberia o resultado de OUTRO tenant sem passar por policy nenhuma.
  -- Ordem obrigatória (e é a mesma nas três RPCs):
  --   1. autenticação .................................... (acima)
  --   2. PAPEL REAL do banco (`pode_gerir_avaliacoes()`);
  --   3. linha carregada COM TRAVA (`for update`) — serializa concorrentes;
  --   4. EMPRESA (tenant) da própria linha;
  --   5. SÓ ENTÃO a chave de idempotência.
  -- Papel REAL do banco (helper único, ver §0c): concluir/cancelar/reabrir são de
  -- `admin` (proprietário) e `rh`. `gestor` e `user` NÃO têm acesso.
  if not public.pode_gerir_avaliacoes() then
    raise exception 'perfil_nao_autorizado';
  end if;

  v_chave := p_acao || ':' || p_feedback_id::text || ':' || p_idempotencia;
  v_hash  := md5(p_feedback_id::text || '|' || p_acao || '|' || coalesce(p_motivo, ''));

  -- Concorrência: trava a linha antes de decidir.
  select * into v_linha from public.feedbacks_360 where id = p_feedback_id for update;
  if not found then
    raise exception 'registro_inexistente';
  end if;

  -- Tenant DENTRO da função (SECURITY DEFINER não passa por RLS).
  if v_linha.empresa_id is null
     or v_linha.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  -- Idempotência: mesma chave + mesmos parâmetros devolve o resultado anterior.
  -- `empresa_id` e `feedback_id` repetidos aqui de propósito: mesmo que a chave
  -- fosse adivinhada/forjada, ela só casa com a operação da PRÓPRIA empresa e do
  -- PRÓPRIO feedback já autorizados acima (defesa em profundidade).
  select resultado, hash_parametros into v_anterior, v_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = v_chave
     and empresa_id = v_linha.empresa_id
     and feedback_id = p_feedback_id;
  if found then
    if v_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  -- Máquina de estados (§9): concluido→cancelado exige reabrir antes.
  v_novo := case
    when coalesce(lower(btrim(v_linha.status)), '') = 'pendente' and p_acao = 'concluir' then 'concluido'
    when coalesce(lower(btrim(v_linha.status)), '') = 'pendente' and p_acao = 'cancelar' then 'cancelado'
    when coalesce(lower(btrim(v_linha.status)), '') in ('concluido','cancelado')
         and p_acao = 'reabrir' then 'pendente'
    else null
  end;
  if v_novo is null then
    raise exception 'transicao_invalida';
  end if;

  -- Reabrir é recurso de RH/proprietário (e exige justificativa, §9.3).
  if p_acao = 'reabrir' and (p_motivo is null or length(btrim(p_motivo)) < 10) then
    raise exception 'justificativa_obrigatoria';
  end if;
  if p_acao = 'cancelar' and (p_motivo is null or length(btrim(p_motivo)) < 3) then
    raise exception 'motivo_obrigatorio';
  end if;
  -- Concluir exige a nota de desempenho NA ESCALA 1–5 (potencial é aviso, não
  -- bloqueio — §6.1). "Preenchida" não basta: `performance` é `INTEGER CHECK
  -- (1..5)` no banco, mas **`nota_geral` é `NUMERIC` SEM CHECK** — e a regra usa
  -- `coalesce(performance, nota_geral)`. Sem o teste de faixa, o fallback deixava
  -- CONCLUIR com nota 0, 7 ou -3 (uma avaliação fora da escala virava oficial).
  if p_acao = 'concluir' then
    v_nota := coalesce(v_linha.performance, v_linha.nota_geral);
    if v_nota is null then
      raise exception 'dados_incompletos';
    end if;
    if v_nota < 1 or v_nota > 5 then
      raise exception 'nota_desempenho_fora_da_escala';
    end if;
  end if;

  update public.feedbacks_360
     set status = v_novo, updated_at = now()
   where id = p_feedback_id;

  insert into public.audit_log (
    tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    'feedbacks_360', p_feedback_id, 'UPDATE',
    jsonb_build_object('status', v_linha.status),
    jsonb_build_object('status', v_novo),
    array['status'], v_uid, v_email
  ) returning id into v_auditoria_id;

  v_resultado := jsonb_build_object(
    'ok', true,
    'status_anterior', v_linha.status,
    'status_novo', v_novo,
    'auditoria_id', v_auditoria_id,
    'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, p_feedback_id, v_linha.empresa_id, p_acao, v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$$;

revoke all on function public.finalizar_feedback(uuid, text, text, text) from public, anon;
grant execute on function public.finalizar_feedback(uuid, text, text, text) to authenticated;

-- O único caminho de escrita de status passa a ser a RPC.
revoke update on public.feedbacks_360 from authenticated;
drop policy if exists "feedbacks_360_update" on public.feedbacks_360;

-- ----------------------------------------------------------------------------
-- 3b) DESTRUIÇÃO TOTAL BLOQUEADA (TRUNCATE) — mesmo rigor do DELETE/UPDATE
-- ----------------------------------------------------------------------------
-- `TRUNCATE` NÃO é "escrita de registro": é o esvaziamento da tabela INTEIRA,
-- numa única instrução, sem WHERE, **sem RLS** (o RLS não filtra TRUNCATE) e sem
-- trilha por linha. Numa tabela de avaliação de colaboradores isso é
-- incompatível com o nível de segurança exigido — e não existe caminho
-- autorizado que precise desse privilégio.
--
-- INVENTÁRIO (por que revogar não quebra nada):
--   • `src/**` ................ nenhum `TRUNCATE`; os `truncate` existentes são a
--     função de string de `lib/utils.ts` e a classe utilitária do Tailwind;
--   • `supabase/functions/**` . `TRUNCATE` aparece só em
--     `external-db-bridge/validation.ts` como TOKEN PROIBIDO (bloqueio, não
--     uso); `exportacao/index.ts` devolve apenas a flag booleana `truncated`;
--   • `supabase/migrations/**`  nenhum `TRUNCATE` executado — nas migrations
--     antigas a palavra aparece apenas dentro de cláusulas `revoke … truncate`;
--   • RPCs do módulo .......... `finalizar_feedback`, `validar_potencial_avaliacao`
--     e `criar_feedback_seguro` fazem apenas INSERT/UPDATE + auditoria;
--   • criação (RH/proprietário) é INSERT (RPC `criar_feedback_seguro` ou
--     PostgREST) — TRUNCATE não participa;
--   • leitura (RH/proprietário) é SELECT sob a policy `feedbacks_360_select`.
--
-- POR QUE REVOGAR DE `PUBLIC` **E** DOS PAPÉIS: um grant a `PUBLIC` já dá o
-- privilégio a TODOS os papéis, e aí `revoke … from anon` não fecha nada —
-- `has_table_privilege('anon', …)` continua `true`. As três revogações juntas
-- fecham os dois caminhos (grant a PUBLIC e grant direto a cada papel).
--
-- `service_role` NÃO é tocado: é o papel administrativo/servidor (BYPASSRLS),
-- usado por manutenção fora do app — não é um papel que o navegador assume.
revoke truncate on table public.feedbacks_360 from public;
revoke truncate on table public.feedbacks_360 from anon;
revoke truncate on table public.feedbacks_360 from authenticated;

-- Confirmação: TRUNCATE não pode mais ser EFETIVO por `anon` nem por
-- `authenticated`. `has_table_privilege` cobre os TRÊS caminhos de uma vez —
-- grant direto, grant a `PUBLIC` e herança de outro papel —, então é ele quem
-- prova o fechamento. O ACL é conferido em separado porque o `grantee` de
-- PUBLIC é `0` (vazio) e não existe papel `public` para consultar no
-- `has_table_privilege`. Se algo escapou, a migration falha e a transação
-- inteira é desfeita.
do $$
declare
  v_anon       boolean;
  v_auth       boolean;
  v_acl_public integer;
begin
  v_anon := has_table_privilege('anon', 'public.feedbacks_360', 'TRUNCATE');
  v_auth := has_table_privilege('authenticated', 'public.feedbacks_360', 'TRUNCATE');

  select count(*) into v_acl_public
    from aclexplode(
           (select c.relacl
              from pg_class c
              join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = 'feedbacks_360')
         ) a
   where a.grantee = 0          -- 0 = PUBLIC (pseudo-papel)
     and a.privilege_type = 'TRUNCATE';

  if v_anon or v_auth or v_acl_public > 0 then
    raise exception
      'TRUNCATE ainda efetivo em feedbacks_360 (anon=%, authenticated=%, grants a PUBLIC=%). Investigue heranca de papel (pg_auth_members) e grants a PUBLIC antes de reaplicar.',
      v_anon, v_auth, v_acl_public;
  end if;
end $$;

-- 4) RPC de VALIDAÇÃO DO POTENCIAL pelo RH.
--    • Exclusiva de RH (o proprietário não substitui esta validação — §8).
--    • Só vale para a avaliação do GESTOR, concluída e com potencial na escala.
--    • A validação é gravada com a VERSÃO exata analisada. Se a avaliação for
--      reaberta ou o potencial mudar, a versão deixa de casar e a aprovação
--      anterior perde efeito — sem apagar o histórico.
--    FORMATO DA VERSÃO (deve espelhar `motorAvaliacao360.versaoDaAvaliacao`):
--      id | updated_at (to_char YYYY-MM-DD"T"HH24:MI:SS) | potencial | status
create or replace function public.validar_potencial_avaliacao(
  p_feedback_id  uuid,
  p_idempotencia text default null,
  p_observacao   text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_chave     text;
  v_hash      text;
  v_confere   text;
  v_anterior  jsonb;
  v_linha     public.feedbacks_360%rowtype;
  v_versao    text;
  v_id        uuid;
  v_resultado jsonb;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;

  -- Papel REAL do banco (helper único, ver §0c): validação de potencial é ato
  -- EXCLUSIVO do RH (`rh`). O proprietário (`admin`) NÃO substitui esta validação.
  if not public.pode_validar_potencial() then
    raise exception 'perfil_nao_autorizado';
  end if;

  v_chave := 'validar_potencial:' || p_feedback_id::text || ':' || p_idempotencia;
  v_hash  := md5(p_feedback_id::text || '|validar_potencial|' || coalesce(p_observacao, ''));

  -- Mesma ordem da §3 (autorização ANTES do reenvio): sem isso, o reenvio
  -- devolveria o resultado gravado — que carrega o potencial validado — sem
  -- conferir a EMPRESA do registro. O papel já foi conferido acima; a empresa
  -- vem agora, antes de qualquer leitura de idempotência.
  select * into v_linha from public.feedbacks_360 where id = p_feedback_id for update;
  if not found then
    raise exception 'registro_inexistente';
  end if;

  if v_linha.empresa_id is null
     or v_linha.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  select resultado, hash_parametros into v_anterior, v_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = v_chave
     and empresa_id = v_linha.empresa_id
     and feedback_id = p_feedback_id;
  if found then
    if v_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  if coalesce(lower(btrim(v_linha.tipo)), '') <> 'gestor' then
    raise exception 'nao_e_avaliacao_do_gestor';
  end if;
  if v_linha.avaliado_id is null then
    raise exception 'avaliacao_sem_colaborador';
  end if;
  if coalesce(lower(btrim(v_linha.status)), '') <> 'concluido' then
    raise exception 'avaliacao_nao_concluida';
  end if;
  if v_linha.potencial is null or v_linha.potencial < 1 or v_linha.potencial > 5 then
    raise exception 'potencial_ausente_ou_invalido';
  end if;

  v_versao := public.versao_avaliacao_feedback(v_linha.id);
  if v_versao is null or v_versao = '' then
    raise exception 'versao_indisponivel';
  end if;

  insert into public.feedbacks_360_validacoes_potencial (
    empresa_id, ciclo_id, colaborador_id, feedback_id, versao_avaliacao,
    potencial_validado, validado_por, observacao
  ) values (
    v_linha.empresa_id, v_linha.ciclo_id, v_linha.avaliado_id, v_linha.id, v_versao,
    v_linha.potencial, v_uid, nullif(btrim(coalesce(p_observacao, '')), '')
  ) returning id into v_id;

  insert into public.audit_log (
    tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    'feedbacks_360_validacoes_potencial', v_id, 'INSERT', null,
    jsonb_build_object(
      'feedback_id', v_linha.id,
      'colaborador_id', v_linha.avaliado_id,
      'ciclo_id', v_linha.ciclo_id,
      'versao_avaliacao', v_versao,
      'potencial_validado', v_linha.potencial
    ),
    array['validado_por', 'versao_avaliacao'], v_uid, v_email
  );

  v_resultado := jsonb_build_object(
    'ok', true,
    'validacao_id', v_id,
    'versao_avaliacao', v_versao,
    'potencial_validado', v_linha.potencial,
    'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, p_feedback_id, v_linha.empresa_id, 'validar_potencial', v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$$;

revoke all on function public.validar_potencial_avaliacao(uuid, text, text) from public, anon;
grant execute on function public.validar_potencial_avaliacao(uuid, text, text) to authenticated;

-- 4b) RPC de CRIAÇÃO — feedback + auditoria na MESMA transação.
--
--   • identidade: `auth.uid()` (nunca parâmetro);
--   • papel: `pode_gerir_avaliacoes()` (admin/rh);
--   • empresa: a informada precisa estar em `get_user_empresas(auth.uid())`;
--   • CONTEXTO: `avaliado_id`, `avaliador_id` (quando informado) e `ciclo_id`
--     precisam pertencer à MESMA empresa autorizada — cada um conferido na sua
--     tabela de origem, senão a avaliação cruzaria tenants (§7);
--   • categoria: apenas as quatro do 360° (`gestor|par|auto|subordinado`);
--   • notas: desempenho obrigatório na escala 1–5; potencial opcional na escala;
--   • origem: `tipo` (categoria) + `avaliador_id` quando informado; quem cadastrou
--     vai para a trilha (`user_id`/`user_email`);
--   • idempotência: `pg_advisory_xact_lock` na chave + registro em
--     `feedbacks_360_operacoes` (operacao='criar') ⇒ reenvio não duplica. O HASH
--     cobre TODOS os parâmetros relevantes (inclusive textos) e o reenvio é
--     restrito à mesma empresa: chave igual com conteúdo diferente é CONFLITO,
--     não "mesma operação" (§6);
--   • se a auditoria falhar, o INSERT reverte (mesma transação).
create or replace function public.criar_feedback_seguro(
  p_empresa_id      uuid,
  p_avaliado_id     uuid,
  p_ciclo_id        uuid,
  p_tipo            text,
  p_nota_geral      numeric,
  p_potencial       numeric  default null,
  p_avaliador_id    uuid     default null,
  p_pontos_fortes   text     default null,
  p_pontos_melhoria text     default null,
  p_comentarios     text     default null,
  p_idempotencia    text     default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_email      text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_chave      text;
  v_hash       text;
  v_confere    text;
  v_anterior   jsonb;
  v_tipo       text := lower(btrim(coalesce(p_tipo, '')));
  -- Textos NORMALIZADOS uma única vez: alimentam o hash de idempotência E o
  -- INSERT, garantindo que o hash represente exatamente o que foi gravado.
  v_fortes     text := nullif(btrim(coalesce(p_pontos_fortes, '')), '');
  v_melhoria   text := nullif(btrim(coalesce(p_pontos_melhoria, '')), '');
  v_comentario text := nullif(btrim(coalesce(p_comentarios, '')), '');
  v_novo       public.feedbacks_360%rowtype;
  v_auditoria  uuid;
  v_resultado  jsonb;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if not public.pode_gerir_avaliacoes() then
    raise exception 'perfil_nao_autorizado';
  end if;
  if p_empresa_id is null or p_empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;
  if p_avaliado_id is null then
    raise exception 'avaliado_obrigatorio';
  end if;
  if p_ciclo_id is null then
    raise exception 'ciclo_obrigatorio';
  end if;
  if v_tipo not in ('gestor','par','auto','subordinado') then
    raise exception 'categoria_invalida';
  end if;
  if p_nota_geral is null or p_nota_geral < 1 or p_nota_geral > 5 then
    raise exception 'nota_desempenho_invalida';
  end if;
  if p_potencial is not null and (p_potencial < 1 or p_potencial > 5) then
    raise exception 'potencial_invalido';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;

  -- ── CONTEXTO EMPRESARIAL DOS IDs (§7) ──────────────────────────────────────
  -- Autorizar a EMPRESA não basta: `avaliado_id`, `avaliador_id` e `ciclo_id`
  -- vêm do chamador. Sem conferir cada um contra `p_empresa_id`, um RH
  -- autorizado na empresa A poderia gravar uma avaliação DA EMPRESA A apontando
  -- para colaborador/ciclo da EMPRESA B — avaliação cruzando tenants, invisível
  -- para o dono do dado. As três tabelas de origem são filtradas por
  -- `empresa_id` na própria UI (`listarCiclos`/`colaboradorService`), então a
  -- régua estrita aqui é a mesma que a tela já aplica.
  if not exists (
    select 1 from public.colaboradores c
     where c.id = p_avaliado_id and c.empresa_id = p_empresa_id
  ) then
    raise exception 'avaliado_fora_da_empresa';
  end if;

  if p_avaliador_id is not null and not exists (
    select 1 from public.colaboradores c
     where c.id = p_avaliador_id and c.empresa_id = p_empresa_id
  ) then
    raise exception 'avaliador_fora_da_empresa';
  end if;

  if not exists (
    select 1 from public.ciclos_avaliacao ci
     where ci.id = p_ciclo_id and ci.empresa_id = p_empresa_id
  ) then
    raise exception 'ciclo_fora_da_empresa';
  end if;

  v_chave := 'criar:' || p_empresa_id::text || ':' || p_idempotencia;
  -- O hash precisa cobrir TODOS os parâmetros relevantes da operação. Antes ele
  -- ignorava `pontos_fortes`/`pontos_melhoria`/`comentarios`: reenviar a MESMA
  -- chave com texto diferente era aceito como "mesma operação" e devolvia o
  -- registro antigo, escondendo a divergência. Agora qualquer parâmetro que
  -- entra no registro entra no hash.
  v_hash  := md5(
    coalesce(p_avaliado_id::text,'') || '|' || coalesce(p_ciclo_id::text,'') || '|' || v_tipo || '|' ||
    coalesce(p_nota_geral::text,'') || '|' || coalesce(p_potencial::text,'') || '|' ||
    coalesce(p_avaliador_id::text,'') || '|' || coalesce(v_fortes,'') || '|' ||
    coalesce(v_melhoria,'') || '|' || coalesce(v_comentario,'')
  );

  -- Serializa o MESMO identificador de operação (evita criação duplicada).
  perform pg_advisory_xact_lock(hashtextextended(v_chave, 0));

  -- Reenvio restrito à MESMA empresa (a chave já a contém; repetido aqui como
  -- defesa em profundidade, igual às outras duas RPCs).
  select resultado, hash_parametros into v_anterior, v_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = v_chave
     and empresa_id = p_empresa_id;
  if found then
    if v_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  insert into public.feedbacks_360 (
    empresa_id, avaliado_id, avaliador_id, ciclo_id, tipo,
    nota_geral, potencial, pontos_fortes, pontos_melhoria, comentarios, status
  ) values (
    p_empresa_id, p_avaliado_id, p_avaliador_id, p_ciclo_id, v_tipo,
    p_nota_geral, p_potencial, v_fortes,
    v_melhoria, v_comentario,
    'pendente'
  ) returning * into v_novo;

  insert into public.audit_log (
    tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    'feedbacks_360', v_novo.id, 'INSERT', null,
    jsonb_build_object(
      'empresa_id', v_novo.empresa_id, 'avaliado_id', v_novo.avaliado_id,
      'avaliador_id', v_novo.avaliador_id, 'ciclo_id', v_novo.ciclo_id,
      'tipo', v_novo.tipo, 'nota_geral', v_novo.nota_geral,
      'potencial', v_novo.potencial, 'status', v_novo.status
    ),
    array['empresa_id','avaliado_id','avaliador_id','ciclo_id','tipo','nota_geral','potencial','status'],
    v_uid, v_email
  ) returning id into v_auditoria;

  v_resultado := jsonb_build_object(
    'ok', true, 'feedback_id', v_novo.id, 'status', v_novo.status,
    'auditoria_id', v_auditoria, 'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, v_novo.id, v_novo.empresa_id, 'criar', v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$$;

revoke all on function public.criar_feedback_seguro(uuid, uuid, uuid, text, numeric, numeric, uuid, text, text, text, text)
  from public, anon;
grant execute on function public.criar_feedback_seguro(uuid, uuid, uuid, text, numeric, numeric, uuid, text, text, text, text)
  to authenticated;

-- 4c) REVOGAR O INSERT DIRETO — PASSO 1 FEITO, PASSO 2 EM ARQUIVO PRÓPRIO
-- ----------------------------------------------------------------------------
-- Hoje a criação vem de `avaliacaoService.criarFeedback` (INSERT direto), que a
-- policy `feedbacks_360_insert` continua autorizando (papel + empresa). Para que
-- NENHUMA escrita contorne a auditoria, a sequência é:
--
--   PASSO 1 (FEITO no código, atrás do modo real): `AvaliacaoPage` chama
--           `avaliacaoService.criarFeedbackSeguro` (RPC `criar_feedback_seguro`)
--           quando `NINEBOX_MODO_REAL_ATIVO = true`, com chave de idempotência
--           por operação e erros reais na tela.
--   PASSO 2 (migration PRÓPRIA — NÃO está aqui de propósito):
--           `supabase/migrations/20261016090000_ninebox_revoga_insert_direto.sql`
--             revoke insert on public.feedbacks_360 from authenticated;
--             drop policy if exists "feedbacks_360_insert" on public.feedbacks_360;
--
-- Enquanto o modo real não estiver ligado e homologado, o INSERT direto
-- PERMANECE (para não quebrar o formulário existente). O endurecimento fica
-- preparado, não ativado.

-- 5) Grants de leitura das tabelas de apoio (a RLS já limita por empresa; sem o
--    GRANT, `authenticated` não conseguiria sequer ler).
grant select on public.feedbacks_360_operacoes to authenticated;
grant select on public.feedbacks_360_validacoes_potencial to authenticated;

-- ============================================================================
-- NOTA OPERACIONAL (verificar ao aplicar)
--   • As funções são `security definer`: o PROPRIETÁRIO deve ser um papel
--     administrativo SEM superusuário e com privilégios mínimos (apenas as
--     tabelas citadas). Se o ambiente exigir, rode como service role dedicado.
--   • Todas as referências no corpo são qualificadas (`public.*`) e o
--     `search_path` está fixado — dupla proteção.
--   • `feedbacks_360`: permanecem as policies de SELECT/INSERT e o privilégio
--     de INSERT; DELETE **e** TRUNCATE ficam revogados (§0e e §3b) e o UPDATE
--     direto também (§3). O app NÃO tem nenhuma rotina de UPDATE, DELETE nem
--     TRUNCATE nessa tabela (inventário em `docs/ninebox-plano-finalizacao.md`
--     §9 e §3b deste arquivo), então as revogações não quebram `criarFeedback`
--     nem `excluirFeedback` — esta última já falha explicitamente, orientando o
--     cancelamento auditado.
-- ============================================================================

-- ============================================================================
-- FIM DA MIGRATION — fecha a transação única aberta no topo.
-- A partir daqui, ou TUDO acima está aplicado, ou nada está.
-- Se qualquer instrução acima falhou, executar `rollback;` (ver
-- `docs/ninebox-implantacao-minima.md` §5) libera os locks do ACCESS EXCLUSIVE
-- em `feedbacks_360` sem aplicar nada.
-- ============================================================================
commit;
