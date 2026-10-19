-- ============================================================================
-- ROLLBACK OPERACIONAL — `20261017090000_ninebox_aprovacao_gestor.sql`
-- ----------------------------------------------------------------------------
-- ⚠️  NÃO EXECUTADO. Desfaz EXATAMENTE o que a migration aditiva criou e nada
--     além disso. A migration `20261015090000` (já aplicada em produção) NÃO é
--     tocada — nem as tabelas dela, nem as RPCs de conclusão/validação.
--
-- QUANDO USAR: só depois de a migration ter sido aplicada e se for necessário
-- reverter a aprovação formal do gestor (ex.: bloqueio em homologação).
--
-- O QUE ESTE ARQUIVO FAZ (na ordem obrigatória)
--   1. APAGA as tabelas novas (`feedbacks_360_aprovacoes_gestor` primeiro, por
--      causa da FOREIGN KEY `consolidacao_id` → `feedbacks_360_consolidacoes`);
--   2. DROPA o TRIGGER e as funções novas da automação (§7) e as da aprovação;
--   3. RESTAURA o CHECK original de `feedbacks_360_operacoes.operacao`
--      (o conjunto da migration 20261015090000), removendo os dois rótulos
--      desta migration. Nenhuma linha é alterada — o rollback falharia se
--      existissem linhas com os rótulos novos, o que é o comportamento
--      DESEJADO (não apagar trilha de auditoria em silêncio).
--   4. RESTAURA `validar_potencial_avaliacao` na versão da migration
--      20261015090000 (SEM o gate da aprovação). Obrigatório: a versão nova
--      chama `situacao_aprovacao`, que deixa de existir neste rollback.
--
-- PERDA DE DADOS: as duas tabelas novas guardam APENAS o fluxo de aprovação
-- (quem enviou, quem decidiu, quando, justificativa). O histórico de
-- `audit_log` de cada decisão PERMANECE (é append-only e não é tocado), então a
-- rastreabilidade da homologação não se perde.
-- ============================================================================

begin;

-- 1) Tabelas novas (ordem inversa das FKs)
drop table if exists public.feedbacks_360_aprovacoes_gestor;
drop table if exists public.feedbacks_360_consolidacoes;

-- 2) Trigger + funções novas
drop trigger if exists trg_feedbacks_360_consolidacao on public.feedbacks_360;
drop function if exists public.trg_feedbacks_360_consolidacao();
drop function if exists public.sincronizar_consolidacao_avaliacao(uuid, uuid, uuid);
drop function if exists public.versao_consolidada_avaliacao(uuid, uuid);
drop function if exists public.decidir_aprovacao_gestor(uuid, uuid, text, text, text);
drop function if exists public.enviar_avaliacao_ao_gestor(uuid, uuid, text);
drop function if exists public.situacao_aprovacao(uuid, uuid);
drop function if exists public.pode_aprovar_colaborador(uuid);
drop function if exists public.colaborador_id_do_usuario(uuid);

-- 3) CHECK original de `feedbacks_360_operacoes.operacao` (20261015090000)
do $$
declare
  v_nome text;
begin
  for v_nome in
    select conname
      from pg_constraint
     where conrelid = 'public.feedbacks_360_operacoes'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%operacao%'
  loop
    execute format('alter table public.feedbacks_360_operacoes drop constraint %I', v_nome);
  end loop;
end $$;

alter table public.feedbacks_360_operacoes
  add constraint feedbacks_360_operacoes_operacao_check
  check (operacao in ('concluir','cancelar','reabrir','validar_potencial','criar'));

-- 4) RESTAURA `validar_potencial_avaliacao` SEM o gate (versão 20261015090000).
--    Necessário porque a versão nova chama `situacao_aprovacao`, que este
--    rollback remove — sem esta restauração o RH não conseguiria mais validar.
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

  if not public.pode_validar_potencial() then
    raise exception 'perfil_nao_autorizado';
  end if;

  v_chave := 'validar_potencial:' || p_feedback_id::text || ':' || p_idempotencia;
  v_hash  := md5(p_feedback_id::text || '|validar_potencial|' || coalesce(p_observacao, ''));

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
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_linha.empresa_id,
    'feedbacks_360_validacoes_potencial', v_id, 'INSERT', null,
    jsonb_build_object(
      'empresa_id', v_linha.empresa_id,
      'feedback_id', v_linha.id,
      'colaborador_id', v_linha.avaliado_id,
      'ciclo_id', v_linha.ciclo_id,
      'versao_avaliacao', v_versao,
      'revisao_avaliada', v_linha.revisao,
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

commit;

-- ============================================================================
-- PROVA PÓS-ROLLBACK (executar e conferir)
--   select count(*) from information_schema.tables
--    where table_schema = 'public'
--      and table_name in ('feedbacks_360_consolidacoes','feedbacks_360_aprovacoes_gestor');
--   -- esperado: 0
--   select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('decidir_aprovacao_gestor','enviar_avaliacao_ao_gestor',
--                        'situacao_aprovacao','pode_aprovar_colaborador',
--                        'colaborador_id_do_usuario');
--   -- esperado: 0
-- ============================================================================
