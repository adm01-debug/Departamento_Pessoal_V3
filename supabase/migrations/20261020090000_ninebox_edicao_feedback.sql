-- ============================================================================
-- NINE-BOX · EDIÇÃO SEGURA DE FEEDBACK (migration ADITIVA)
-- ----------------------------------------------------------------------------
-- ⚠️  NÃO EXECUTADA. Requer autorização (como as migrations 20261017/18).
--
-- POR QUE EXISTE: os filtros normais de Feedbacks passam a ter UMA ação
-- principal — "Editar feedback". O formulário reutilizado salva pela RPC
-- `editar_feedback_seguro`, que:
--   1. exige RH/admin (`pode_gerir_avaliacoes()`), revalidado no servidor;
--   2. confere EMPRESA do registro e de TODOS os ids do payload (avaliado,
--      avaliador, ciclo) — nenhum vínculo cruza tenant;
--   3. valida tipo (4 categorias), nota (1–5) e potencial opcional (1–5);
--   4. registra idempotência em `feedbacks_360_operacoes` (operacao nova
--      `editar_feedback`);
--   5. REABRE avaliação concluída de forma EXPLÍCITA (`status = 'pendente'`);
--      `revisao` é incrementada pelo trigger existente e a versão consolidada
--      muda ⇒ aprovações/validações anteriores deixam de valer;
--   6. audita ANTES/DEPOIS em `audit_log` com `empresa_id`;
--   7. o trigger de consolidação (migration 20261017090000) atualiza a fila do
--      gestor sozinho, inclusive quando o avaliado/ciclo mudam.
--
-- DEPENDE (para o fluxo completo): `20261017090000_ninebox_aprovacao_gestor.sql`.
-- A RPC em si funciona sem ela; a invalidação da fila depende do trigger da §7
-- daquela migration (ou da versão calculada na hora por `situacao_aprovacao`).
-- ============================================================================

begin;

-- ── §1 · RÓTULO DE IDEMPOTÊNCIA ────────────────────────────────────────────
-- A tabela `feedbacks_360_operacoes` (já aplicada) tem CHECK fechado. Ampliá-lo
-- é ADITIVO e idempotente: nenhuma linha é alterada, apenas o conjunto aceito
-- cresce com os rótulos das migrations de aprovação/edição.
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
  check (operacao in ('concluir','cancelar','reabrir','validar_potencial','criar',
                      'decidir_aprovacao_gestor','enviar_avaliacao_ao_gestor',
                      'editar_feedback'));

-- ── §2 · RPC DE EDIÇÃO ─────────────────────────────────────────────────────
create or replace function public.editar_feedback_seguro(
  p_feedback_id     uuid,
  p_avaliado_id     uuid,
  p_avaliador_id    uuid,
  p_ciclo_id        uuid,
  p_tipo            text,
  p_nota            numeric,
  p_potencial       numeric default null,
  p_pontos_fortes   text default null,
  p_pontos_melhoria text default null,
  p_comentarios     text default null,
  p_idempotencia    text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_email    text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_tipo     text := lower(btrim(coalesce(p_tipo, '')));
  v_antes    public.feedbacks_360%rowtype;
  v_depois   public.feedbacks_360%rowtype;
  v_chave    text;
  v_hash     text;
  v_confere  text;
  v_anterior jsonb;
  v_reabriu  boolean;
  v_resultado jsonb;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;

  -- EDIÇÃO é ato de quem GERENCIA avaliações (admin/rh), como o cadastro.
  if not public.pode_gerir_avaliacoes() then
    raise exception 'perfil_nao_autorizado';
  end if;

  select * into v_antes from public.feedbacks_360 where id = p_feedback_id for update;
  if not found then
    raise exception 'registro_inexistente';
  end if;
  if v_antes.empresa_id is null
     or v_antes.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  if v_tipo not in ('gestor', 'par', 'auto', 'subordinado') then
    raise exception 'tipo_invalido';
  end if;
  if p_nota is null or p_nota < 1 or p_nota > 5 then
    raise exception 'nota_invalida';
  end if;
  if p_potencial is not null and (p_potencial < 1 or p_potencial > 5) then
    raise exception 'potencial_invalido';
  end if;

  -- CONTEXTO NA MESMA EMPRESA (nenhum id de outro tenant entra no registro).
  if p_avaliado_id is null
     or not exists (select 1 from public.colaboradores c
                     where c.id = p_avaliado_id and c.empresa_id = v_antes.empresa_id) then
    raise exception 'avaliado_invalido';
  end if;
  if p_avaliador_id is null
     or not exists (select 1 from public.colaboradores c
                     where c.id = p_avaliador_id and c.empresa_id = v_antes.empresa_id) then
    raise exception 'avaliador_invalido';
  end if;
  if p_ciclo_id is not null
     and not exists (select 1 from public.ciclos_avaliacao c
                      where c.id = p_ciclo_id and c.empresa_id = v_antes.empresa_id) then
    raise exception 'ciclo_invalido';
  end if;

  v_chave := 'editar_feedback:' || p_feedback_id::text || ':' || p_idempotencia;
  v_hash  := md5(
    p_feedback_id::text || '|' || p_avaliado_id::text || '|' || p_avaliador_id::text || '|' ||
    coalesce(p_ciclo_id::text, '') || '|' || v_tipo || '|' || coalesce(p_nota::text, '') || '|' ||
    coalesce(p_potencial::text, '') || '|' || coalesce(p_pontos_fortes, '') || '|' ||
    coalesce(p_pontos_melhoria, '') || '|' || coalesce(p_comentarios, '')
  );

  select resultado, hash_parametros into v_anterior, v_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = v_chave and empresa_id = v_antes.empresa_id;
  if found then
    if v_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  v_reabriu := coalesce(lower(btrim(v_antes.status)), '') in ('concluido', 'concluida');


  update public.feedbacks_360
     set avaliado_id     = p_avaliado_id,
         avaliador_id    = p_avaliador_id,
         ciclo_id        = p_ciclo_id,
         tipo            = v_tipo,
         nota_geral      = p_nota,
         potencial       = p_potencial,
         pontos_fortes   = nullif(btrim(coalesce(p_pontos_fortes, '')), ''),
         pontos_melhoria = nullif(btrim(coalesce(p_pontos_melhoria, '')), ''),
         comentarios     = nullif(btrim(coalesce(p_comentarios, '')), ''),
         status          = 'pendente',
         updated_at      = now()
   where id = p_feedback_id
  returning * into v_depois;

  insert into public.audit_log (
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_antes.empresa_id,
    'feedbacks_360', p_feedback_id, 'UPDATE',
    jsonb_build_object(
      'avaliado_id', v_antes.avaliado_id,
      'avaliador_id', v_antes.avaliador_id,
      'ciclo_id', v_antes.ciclo_id,
      'tipo', v_antes.tipo,
      'nota_geral', v_antes.nota_geral,
      'potencial', v_antes.potencial,
      'status', v_antes.status,
      'revisao', v_antes.revisao
    ),
    jsonb_build_object(
      'empresa_id', v_depois.empresa_id,
      'avaliado_id', v_depois.avaliado_id,
      'avaliador_id', v_depois.avaliador_id,
      'ciclo_id', v_depois.ciclo_id,
      'tipo', v_depois.tipo,
      'nota_geral', v_depois.nota_geral,
      'potencial', v_depois.potencial,
      'status', v_depois.status,
      'revisao', v_depois.revisao,
      'reaberta', v_reabriu,
      'motivo', 'edicao_feedback'
    ),
    array['avaliado_id','avaliador_id','ciclo_id','tipo','nota_geral','potencial',
          'pontos_fortes','pontos_melhoria','comentarios','status'],
    v_uid, v_email
  );

  v_resultado := jsonb_build_object(
    'ok', true,
    'feedback_id', p_feedback_id,
    'status', v_depois.status,
    'revisao', v_depois.revisao,
    'reaberta', v_reabriu,
    'versao_avaliacao', public.versao_avaliacao_feedback(p_feedback_id),
    'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, p_feedback_id, v_antes.empresa_id, 'editar_feedback', v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$$;

comment on function public.editar_feedback_seguro(uuid, uuid, uuid, uuid, text, numeric, numeric, text, text, text, text) is
  'Edicao de feedback por RH/admin: valida tenant/contexto/notas, reabre registro concluido, audita antes/depois e invalida aprovacoes pela nova versao. Idempotente.';

revoke all on function public.editar_feedback_seguro(uuid, uuid, uuid, uuid, text, numeric, numeric, text, text, text, text)
  from public, anon;
grant execute on function public.editar_feedback_seguro(uuid, uuid, uuid, uuid, text, numeric, numeric, text, text, text, text)
  to authenticated;

commit;

