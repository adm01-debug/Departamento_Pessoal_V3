-- ============================================================================
-- NINE-BOX · APROVAÇÃO DO GESTOR COMO DECISÃO FINAL
-- ----------------------------------------------------------------------------
-- REGRA DE NEGÓCIO (2026-10-20):
--   RH cria/preenche/envia → gestor aprova ou devolve → Nine-Box classifica.
--   NÃO existe validação posterior do Potencial pelo RH.
--
-- Esta migration é ADITIVA e NÃO foi executada. Ela:
--   1. adiciona o snapshot aprovado à consolidação (Desempenho + Potencial);
--   2. remove a exigência de um feedback separado `tipo='gestor'` na decisão;
--   3. valida escala 1–5 e versão vigente;
--   4. grava a decisão, o snapshot e a auditoria na MESMA transação;
--   5. preserva o histórico legado de validações do RH (nada é apagado).
--
-- Rollback: supabase/rollback/20261021090000_ninebox_aprovacao_confirmada_rollback.sql
-- Teste: harness PostgreSQL/PGlite registrado em docs/NINEBOX-OPERACAO-DEFINITIVA.md
-- ============================================================================

-- ── §1 · SNAPSHOT DA PROPOSTA/APROVAÇÃO ────────────────────────────────────
alter table public.feedbacks_360_consolidacoes
  add column if not exists desempenho_proposto numeric(4,3),
  add column if not exists potencial_proposto  numeric(4,3),
  add column if not exists desempenho_aprovado numeric(4,3),
  add column if not exists potencial_aprovado  numeric(4,3),
  add column if not exists aprovado_por        uuid,
  add column if not exists aprovado_em         timestamptz,
  add column if not exists aprovacao_id        uuid,
  add column if not exists snapshot_aprovado   jsonb;

alter table public.feedbacks_360_consolidacoes
  drop constraint if exists fbc_desempenho_proposto_escala,
  drop constraint if exists fbc_potencial_proposto_escala,
  drop constraint if exists fbc_desempenho_aprovado_escala,
  drop constraint if exists fbc_potencial_aprovado_escala;

alter table public.feedbacks_360_consolidacoes
  add constraint fbc_desempenho_proposto_escala
    check (desempenho_proposto is null or (desempenho_proposto >= 1 and desempenho_proposto <= 5)),
  add constraint fbc_potencial_proposto_escala
    check (potencial_proposto is null or (potencial_proposto >= 1 and potencial_proposto <= 5)),
  add constraint fbc_desempenho_aprovado_escala
    check (desempenho_aprovado is null or (desempenho_aprovado >= 1 and desempenho_aprovado <= 5)),
  add constraint fbc_potencial_aprovado_escala
    check (potencial_aprovado is null or (potencial_aprovado >= 1 and potencial_aprovado <= 5));

comment on column public.feedbacks_360_consolidacoes.desempenho_proposto is
  'Desempenho proposto pelo RH na avaliação consolidada (1–5).';
comment on column public.feedbacks_360_consolidacoes.potencial_proposto is
  'Potencial proposto pelo RH na avaliação consolidada (1–5).';
comment on column public.feedbacks_360_consolidacoes.desempenho_aprovado is
  'Snapshot do Desempenho confirmado pelo gestor na aprovação vigente.';
comment on column public.feedbacks_360_consolidacoes.potencial_aprovado is
  'Snapshot do Potencial confirmado pelo gestor na aprovação vigente.';
comment on column public.feedbacks_360_consolidacoes.aprovacao_id is
  'Linha de feedbacks_360_aprovacoes_gestor que produziu o snapshot vigente.';
comment on column public.feedbacks_360_consolidacoes.snapshot_aprovado is
  'Cópia imutável dos valores/categorias confirmados na aprovação.';

-- ── §2 · SINCRONIZAÇÃO: PROPOSTA + LIMPEZA DO SNAPSHOT AO MUDAR A VERSÃO ───
create or replace function public.sincronizar_consolidacao_avaliacao(
  p_colaborador_id uuid,
  p_ciclo_id       uuid,
  p_por            uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_empresa     uuid;
  v_gestor      uuid;
  v_gestor_uid  uuid;
  v_versao      text;
  v_status      text;
  v_prop_desem  numeric;
  v_prop_pot    numeric;
  v_linha       public.feedbacks_360_consolidacoes%rowtype;
begin
  if p_colaborador_id is null or p_ciclo_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'chave_incompleta');
  end if;

  select c.empresa_id, c.supervisor_id into v_empresa, v_gestor
    from public.colaboradores c where c.id = p_colaborador_id;
  if v_empresa is null then
    return jsonb_build_object('ok', false, 'motivo', 'colaborador_inexistente');
  end if;

  if v_gestor is not null then
    select u.user_id into v_gestor_uid from public.colaboradores u where u.id = v_gestor;
  end if;

  v_versao := public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id);

  if v_versao is null then
    delete from public.feedbacks_360_consolidacoes c
     where c.empresa_id = v_empresa and c.ciclo_id = p_ciclo_id and c.colaborador_id = p_colaborador_id;
    return jsonb_build_object('ok', true, 'status', 'em_preparacao');
  end if;

  /*
   * PROPOSTA: o RH prepara a avaliação consolidada. Se houver uma avaliação
   * do GESTOR concluída com os dois valores, ela é a referência; caso contrário,
   * usa-se a avaliação concluída mais recente que tenha Desempenho E Potencial.
   * Isso evita exigir um segundo feedback só para a aprovação.
   */
  select f.nota_geral, f.potencial
    into v_prop_desem, v_prop_pot
    from public.feedbacks_360 f
   where f.avaliado_id = p_colaborador_id
     and f.ciclo_id = p_ciclo_id
     and lower(btrim(coalesce(f.status, ''))) = 'concluido'
     and f.nota_geral between 1 and 5
     and f.potencial between 1 and 5
   order by (lower(btrim(coalesce(f.tipo, ''))) = 'gestor') desc,
            f.updated_at desc nulls last
   limit 1;

  v_status := case when v_gestor is null then 'sem_gestor' else 'aguardando_gestor' end;


  insert into public.feedbacks_360_consolidacoes as c
    (empresa_id, ciclo_id, colaborador_id, status, versao_consolidada,
     gestor_responsavel_colaborador_id, gestor_responsavel_user_id,
     enviado_por, enviado_em, revisao, atualizado_em, atualizado_por,
     desempenho_proposto, potencial_proposto)
  values (v_empresa, p_ciclo_id, p_colaborador_id, v_status, v_versao,
          v_gestor, v_gestor_uid, p_por, now(), 1, now(), p_por,
          v_prop_desem, v_prop_pot)
  on conflict (empresa_id, ciclo_id, colaborador_id) do update
    set versao_consolidada = excluded.versao_consolidada,
        status = case
                   when c.versao_consolidada is distinct from excluded.versao_consolidada then excluded.status
                   when c.status = 'sem_gestor' and excluded.status = 'aguardando_gestor' then excluded.status
                   else c.status
                 end,
        gestor_responsavel_colaborador_id = excluded.gestor_responsavel_colaborador_id,
        gestor_responsavel_user_id = excluded.gestor_responsavel_user_id,
        revisao = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                       then c.revisao + 1 else c.revisao end,
        enviado_em = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                          then now() else c.enviado_em end,
        enviado_por = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                           then coalesce(excluded.enviado_por, c.enviado_por) else c.enviado_por end,
        /* CONJUNTO MUDOU ⇒ a aprovação anterior deixa de valer. */
        desempenho_aprovado = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                                   then null else c.desempenho_aprovado end,
        potencial_aprovado = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                                  then null else c.potencial_aprovado end,
        aprovado_por = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                            then null else c.aprovado_por end,
        aprovado_em = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                           then null else c.aprovado_em end,
        aprovacao_id = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                            then null else c.aprovacao_id end,
        snapshot_aprovado = case when c.versao_consolidada is distinct from excluded.versao_consolidada
                                 then null else c.snapshot_aprovado end,
        desempenho_proposto = excluded.desempenho_proposto,
        potencial_proposto = excluded.potencial_proposto,
        atualizado_em = now(),
        atualizado_por = coalesce(excluded.atualizado_por, c.atualizado_por)
  returning * into v_linha;

  insert into public.audit_log (empresa_id, tabela, registro_id, acao, dados_novos, user_id, user_email)
  values (v_empresa, 'feedbacks_360_consolidacoes', p_colaborador_id, 'UPDATE',
          jsonb_build_object('empresa_id', v_empresa, 'ciclo_id', p_ciclo_id,
                             'colaborador_id', p_colaborador_id, 'status', v_linha.status,
                             'versao_consolidada', v_linha.versao_consolidada,
                             'desempenho_proposto', v_linha.desempenho_proposto,
                             'potencial_proposto', v_linha.potencial_proposto,
                             'gestor_responsavel_user_id', v_linha.gestor_responsavel_user_id,
                             'revisao', v_linha.revisao),
          p_por, null);

  return jsonb_build_object('ok', true, 'status', v_linha.status, 'versao', v_linha.versao_consolidada,
                            'revisao', v_linha.revisao,
                            'desempenho_proposto', v_linha.desempenho_proposto,
                            'potencial_proposto', v_linha.potencial_proposto);
end;
$$;


-- ── §3 · DECISÃO DO GESTOR (sem exigir feedback separado de tipo Gestor) ───
create or replace function public.decidir_aprovacao_gestor(
  p_colaborador_id uuid,
  p_ciclo_id       uuid,
  p_decisao        text,
  p_justificativa  text default null,
  p_idempotencia   text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_decisao   text := lower(btrim(coalesce(p_decisao, '')));
  v_just      text := nullif(btrim(coalesce(p_justificativa, '')), '');
  v_chave     text;
  v_hash      text;
  v_confere   text;
  v_anterior  jsonb;
  v_linha     public.feedbacks_360%rowtype;
  v_cons      public.feedbacks_360_consolidacoes%rowtype;
  v_versao    text;
  v_versao_atual text;
  v_status    text;
  v_id        uuid;
  v_resultado jsonb;
  v_desempenho numeric;
  v_potencial  numeric;
  v_soma_pesos numeric := 0;
  v_soma_notas numeric := 0;
  v_peso       numeric;
  v_tem_gestor boolean := false;
  v_snapshot   jsonb;
  v_cat        record;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;
  if v_decisao not in ('aprovado','devolvido') then
    raise exception 'decisao_invalida';
  end if;
  if v_decisao = 'devolvido' and (v_just is null or length(v_just) < 10) then
    raise exception 'justificativa_obrigatoria';
  end if;

  -- PERMISSÃO: vínculo, autoaprovação permitida ou exceção de homologação.
  if not public.pode_aprovar_colaborador(p_colaborador_id) then
    raise exception 'perfil_nao_autorizado';
  end if;

  -- A consolidação é a chave ÚNICA (empresa + ciclo + colaborador) e o LOCK
  -- serializa duas aprovações concorrentes do mesmo conjunto.
  select * into v_cons
    from public.feedbacks_360_consolidacoes c
   where c.colaborador_id = p_colaborador_id
     and c.ciclo_id = p_ciclo_id
   for update;
  if not found then
    perform public.sincronizar_consolidacao_avaliacao(p_colaborador_id, p_ciclo_id, v_uid);
    select * into v_cons
      from public.feedbacks_360_consolidacoes c
     where c.colaborador_id = p_colaborador_id
       and c.ciclo_id = p_ciclo_id
     for update;
  end if;
  if not found then
    raise exception 'consolidacao_ausente';
  end if;
  if v_cons.empresa_id is null
     or v_cons.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  v_versao := coalesce(v_cons.versao_consolidada,
                       public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id));
  v_versao_atual := public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id);
  if v_versao is null then
    raise exception 'sem_avaliacao';
  end if;
  if v_versao_atual is distinct from v_versao then
    raise exception 'versao_desatualizada';
  end if;

  /**
   * REGISTRO DE REFERÊNCIA: prioriza `tipo='gestor'`, mas NÃO o exige. O RH
   * pode preparar o conjunto em qualquer categoria; o gestor aprova a proposta
   * consolidada. O registro precisa estar concluído e não cancelado.
   */
  select * into v_linha
    from public.feedbacks_360 f
   where f.avaliado_id = p_colaborador_id
     and f.ciclo_id = p_ciclo_id
     and lower(btrim(coalesce(f.status, ''))) = 'concluido'
     and lower(btrim(coalesce(f.tipo, ''))) <> 'cancelado'
   order by (lower(btrim(coalesce(f.tipo, ''))) = 'gestor') desc,
            f.updated_at desc nulls last
   limit 1;
  if not found then
    raise exception 'avaliacao_consolidada_ausente';
  end if;


  v_chave := 'decidir_aprovacao:' || p_colaborador_id::text || ':' || p_ciclo_id::text || ':' || p_idempotencia;
  v_hash  := md5(p_colaborador_id::text || '|' || p_ciclo_id::text || '|' || v_decisao || '|' || coalesce(v_just, ''));

  select resultado, hash_parametros into v_anterior, v_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = v_chave and empresa_id = v_cons.empresa_id;
  if found then
    if v_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  if public.situacao_aprovacao(p_colaborador_id, p_ciclo_id) not in ('aguardando_gestor', 'sem_gestor') then
    raise exception 'pendencia_nao_aguarda_decisao';
  end if;


  if v_decisao = 'aprovado' then
    /*
     * DESEMPENHO: mesma composição 360 do motor do front — última avaliação
     * elegível por categoria, pesos 60/25/10/5, renormalizados sobre as
     * categorias disponíveis. Se NÃO existe categoria Gestor, usa-se a
     * proposta consolidada do RH (nota + potencial do registro de referência).
     */
    for v_cat in
      select distinct on (lower(btrim(coalesce(f.tipo, ''))))
             lower(btrim(coalesce(f.tipo, ''))) as tipo,
             f.nota_geral,
             f.potencial
        from public.feedbacks_360 f
       where f.avaliado_id = p_colaborador_id
         and f.ciclo_id = p_ciclo_id
         and lower(btrim(coalesce(f.status, ''))) = 'concluido'
         and lower(btrim(coalesce(f.tipo, ''))) in ('gestor','par','auto','subordinado')
         and f.nota_geral between 1 and 5
       order by lower(btrim(coalesce(f.tipo, ''))), f.updated_at desc nulls last
    loop
      v_peso := case v_cat.tipo
                  when 'gestor' then 0.60
                  when 'par' then 0.25
                  when 'auto' then 0.10
                  when 'subordinado' then 0.05
                  else 0
                end;
      v_soma_pesos := v_soma_pesos + v_peso;
      v_soma_notas := v_soma_notas + (v_cat.nota_geral * v_peso);
      if v_cat.tipo = 'gestor' then
        v_tem_gestor := true;
        v_potencial := v_cat.potencial;
      end if;
    end loop;

    if v_tem_gestor then
      if v_potencial is null or v_potencial < 1 or v_potencial > 5 then
        raise exception 'avaliacao_sem_potencial';
      end if;
      if v_soma_pesos <= 0 then
        raise exception 'avaliacao_sem_desempenho';
      end if;
      v_desempenho := v_soma_notas / v_soma_pesos;
    else
      -- Proposta consolidada do RH: precisa dos DOIS valores no registro.
      if v_linha.nota_geral is null or v_linha.nota_geral < 1 or v_linha.nota_geral > 5 then
        raise exception 'avaliacao_sem_desempenho';
      end if;
      if v_linha.potencial is null or v_linha.potencial < 1 or v_linha.potencial > 5 then
        raise exception 'avaliacao_sem_potencial';
      end if;
      v_desempenho := v_linha.nota_geral;
      v_potencial := v_linha.potencial;
    end if;

    if v_desempenho is null or v_desempenho < 1 or v_desempenho > 5 then
      raise exception 'avaliacao_sem_desempenho';
    end if;

    v_snapshot := jsonb_build_object(
      'desempenho', v_desempenho,
      'potencial', v_potencial,
      'versao_consolidada', v_versao,
      'regra', case when v_tem_gestor then '360_gestor' else 'proposta_consolidada_rh' end,
      'fonte_feedback_id', v_linha.id,
      'fonte_tipo', lower(btrim(coalesce(v_linha.tipo, ''))),
      'aprovado_em', now()
    );
    v_status := 'aprovada_gestor';
  else
    v_status := 'devolvida';
    v_desempenho := null;
    v_potencial := null;
    v_snapshot := null;
  end if;

  insert into public.feedbacks_360_aprovacoes_gestor (
    consolidacao_id, feedback_id, empresa_id, ciclo_id, colaborador_id,
    decisao, justificativa, versao_avaliacao, revisao,
    decidido_por, idempotency_key, hash_parametros
  ) values (
    v_cons.id, v_linha.id, v_cons.empresa_id, p_ciclo_id, p_colaborador_id,
    v_decisao, v_just, v_versao, v_cons.revisao,
    v_uid, 'aprov:' || v_chave, v_hash
  ) returning id into v_id;

  update public.feedbacks_360_consolidacoes
     set status = v_status,
         desempenho_aprovado = v_desempenho,
         potencial_aprovado = v_potencial,
         aprovado_por = case when v_decisao = 'aprovado' then v_uid else null end,
         aprovado_em = case when v_decisao = 'aprovado' then now() else null end,
         aprovacao_id = case when v_decisao = 'aprovado' then v_id else null end,
         snapshot_aprovado = v_snapshot,
         atualizado_em = now()
   where id = v_cons.id;

  insert into public.audit_log (
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_cons.empresa_id,
    'feedbacks_360_aprovacoes_gestor', v_id, 'INSERT', null,
    jsonb_build_object(
      'empresa_id', v_cons.empresa_id,
      'ciclo_id', p_ciclo_id,
      'colaborador_id', p_colaborador_id,
      'decisao', v_decisao,
      'versao_avaliacao', v_versao,
      'revisao_avaliada', v_cons.revisao,
      'desempenho_aprovado', v_desempenho,
      'potencial_aprovado', v_potencial,
      'snapshot_aprovado', v_snapshot
    ),
    array['decisao', 'versao_avaliacao', 'desempenho_aprovado', 'potencial_aprovado'],
    v_uid, v_email
  );

  v_resultado := jsonb_build_object(
    'ok', true,
    'aprovacao_id', v_id,
    'decisao', v_decisao,
    'status', v_status,
    'versao_avaliacao', v_versao,
    'desempenho_aprovado', v_desempenho,
    'potencial_aprovado', v_potencial,
    'snapshot_aprovado', v_snapshot,
    'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, v_linha.id, v_cons.empresa_id, 'decidir_aprovacao_gestor', v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$$;

revoke all on function public.decidir_aprovacao_gestor(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.decidir_aprovacao_gestor(uuid, uuid, text, text, text) to authenticated;


