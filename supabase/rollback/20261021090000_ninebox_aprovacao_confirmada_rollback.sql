-- ROLLBACK da migration 20261021090000 (aprovacao do gestor como decisao final).
-- Restaura as funcoes historicas e remove as colunas aditivas. Nao executado.
-- Execute em janela de manutencao; o historico de decisoes nao e apagado.
begin;
create or replace function public.sincronizar_consolidacao_avaliacao(
  p_colaborador_id uuid,
  p_ciclo_id       uuid,
  p_por            uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_empresa    uuid;
  v_gestor     uuid;
  v_gestor_uid uuid;
  v_versao     text;
  v_status     text;
  v_linha      public.feedbacks_360_consolidacoes%rowtype;
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

  -- Nenhuma avaliação válida (ex.: tudo cancelado): não há o que aprovar.
  if v_versao is null then
    delete from public.feedbacks_360_consolidacoes c
     where c.empresa_id = v_empresa and c.ciclo_id = p_ciclo_id and c.colaborador_id = p_colaborador_id;
    return jsonb_build_object('ok', true, 'status', 'em_preparacao');
  end if;

  v_status := case when v_gestor is null then 'sem_gestor' else 'aguardando_gestor' end;

  insert into public.feedbacks_360_consolidacoes as c
    (empresa_id, ciclo_id, colaborador_id, status, versao_consolidada,
     gestor_responsavel_colaborador_id, gestor_responsavel_user_id,
     enviado_por, enviado_em, revisao, atualizado_em, atualizado_por)
  values (v_empresa, p_ciclo_id, p_colaborador_id, v_status, v_versao,
          v_gestor, v_gestor_uid, p_por, now(), 1, now(), p_por)
  on conflict (empresa_id, ciclo_id, colaborador_id) do update
    set versao_consolidada = excluded.versao_consolidada,
        /* CONJUNTO MUDOU ⇒ a decisão anterior deixa de valer e a linha volta a
           aguardar o gestor (reencaminhamento automático). Sem mudança, o
           andamento é preservado (aprovada/devolvida/validada). */
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
        atualizado_em = now(),
        atualizado_por = coalesce(excluded.atualizado_por, c.atualizado_por)
  returning * into v_linha;

  -- Auditoria (mesmo padrão do restante do fluxo: nada é apagado).
  insert into public.audit_log (empresa_id, tabela, registro_id, acao, dados_novos, user_id, user_email)
  values (v_empresa, 'feedbacks_360_consolidacoes', p_colaborador_id, 'UPDATE',
          jsonb_build_object('empresa_id', v_empresa, 'ciclo_id', p_ciclo_id,
                             'colaborador_id', p_colaborador_id, 'status', v_linha.status,
                             'versao_consolidada', v_linha.versao_consolidada,
                             'gestor_responsavel_user_id', v_linha.gestor_responsavel_user_id,
                             'revisao', v_linha.revisao),
          p_por, null);

  return jsonb_build_object('ok', true, 'status', v_linha.status, 'versao', v_linha.versao_consolidada,
                            'revisao', v_linha.revisao);
end;
$$;

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
  v_versao    text;
  v_consol    uuid;
  v_revisao_consolidacao integer;
  v_status    text;
  v_id        uuid;
  v_resultado jsonb;
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

  -- PERMISSÃO PRIMEIRO (mesma ordem da §3/§4 da migration 1).
  if not public.pode_aprovar_colaborador(p_colaborador_id) then
    raise exception 'perfil_nao_autorizado';
  end if;

  /**
   * AVALIAÇÃO OBRIGATÓRIA DO GESTOR — a aprovação final NÃO existe sem ela.
   * O registro de referência é SEMPRE `tipo='gestor'` do colaborador no ciclo.
   * Sem registro ⇒ `avaliacao_do_gestor_ausente`; com registro não concluído ⇒
   * `avaliacao_nao_concluida`. PAR/AUTO/SUBORDINADO não substituem essa etapa.
   */
  select * into v_linha
    from public.feedbacks_360 f
   where f.ciclo_id = p_ciclo_id
     and f.avaliado_id = p_colaborador_id
     and lower(btrim(coalesce(f.tipo, ''))) = 'gestor'
     and lower(btrim(coalesce(f.status, ''))) <> 'cancelado'
   order by f.updated_at desc nulls last
   limit 1
   for update;
  if not found then
    raise exception 'avaliacao_do_gestor_ausente';
  end if;
  if v_linha.empresa_id is null
     or v_linha.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;
  if coalesce(lower(btrim(v_linha.status)), '') <> 'concluido' then
    raise exception 'avaliacao_nao_concluida';
  end if;

  v_chave := 'decidir_aprovacao:' || p_colaborador_id::text || ':' || p_ciclo_id::text || ':' || p_idempotencia;
  v_hash  := md5(p_colaborador_id::text || '|' || p_ciclo_id::text || '|' || v_decisao || '|' || coalesce(v_just, ''));

  select resultado, hash_parametros into v_anterior, v_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = v_chave and empresa_id = v_linha.empresa_id;
  if found then
    if v_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  -- VERSÃO CONSOLIDADA (a MESMA que `situacao_aprovacao` compara): a decisão vale
  -- para o CONJUNTO colaborador × ciclo, não para um registro isolado.
  insert into public.feedbacks_360_consolidacoes
    (empresa_id, ciclo_id, colaborador_id, status, versao_consolidada, atualizado_em)
  values (v_linha.empresa_id, p_ciclo_id, p_colaborador_id, 'aguardando_gestor',
          public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id), now())
  on conflict (empresa_id, ciclo_id, colaborador_id) do nothing;

  select c.id,
         coalesce(c.versao_consolidada,
                  public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id)),
         c.revisao
    into v_consol, v_versao, v_revisao_consolidacao
    from public.feedbacks_360_consolidacoes c
   where c.empresa_id = v_linha.empresa_id and c.ciclo_id = p_ciclo_id
     and c.colaborador_id = p_colaborador_id;

  if v_versao is null or v_versao = '' then
    raise exception 'versao_indisponivel';
  end if;

  -- Só se decide o que está PENDENTE (`aguardando_gestor` ou `sem_gestor` —
  -- este último é aviso de atribuição, não bloqueio). Aprovada, devolvida ou já
  -- validada NÃO aceitam nova decisão (idempotência pela versão).
  if public.situacao_aprovacao(p_colaborador_id, p_ciclo_id) not in ('aguardando_gestor', 'sem_gestor') then
    raise exception 'pendencia_nao_aguarda_decisao';
  end if;

  v_status := case when v_decisao = 'aprovado' then 'aprovada_gestor' else 'devolvida' end;

  insert into public.feedbacks_360_aprovacoes_gestor (
    consolidacao_id, feedback_id, empresa_id, ciclo_id, colaborador_id,
    decisao, justificativa, versao_avaliacao, revisao,
    decidido_por, idempotency_key, hash_parametros
  ) values (
    v_consol, v_linha.id, v_linha.empresa_id, p_ciclo_id, p_colaborador_id,
    v_decisao, v_just, v_versao, coalesce(v_revisao_consolidacao, v_linha.revisao),
    v_uid, 'aprov:' || v_chave, v_hash
  ) returning id into v_id;

  update public.feedbacks_360_consolidacoes
     set status = v_status, atualizado_em = now()
   where id = v_consol;

  insert into public.audit_log (
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_linha.empresa_id,
    'feedbacks_360_aprovacoes_gestor', v_id, 'INSERT', null,
    jsonb_build_object(
      'empresa_id', v_linha.empresa_id,
      'ciclo_id', p_ciclo_id,
      'colaborador_id', p_colaborador_id,
      'decisao', v_decisao,
      'versao_avaliacao', v_versao,
      'revisao_avaliada', v_linha.revisao
    ),
    array['decisao', 'versao_avaliacao'], v_uid, v_email
  );

  v_resultado := jsonb_build_object(
    'ok', true,
    'aprovacao_id', v_id,
    'decisao', v_decisao,
    'status', v_status,
    'versao_avaliacao', v_versao,
    'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, v_linha.id, v_linha.empresa_id, 'decidir_aprovacao_gestor', v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$$;
alter table public.feedbacks_360_consolidacoes
  drop constraint if exists fbc_desempenho_proposto_escala,
  drop constraint if exists fbc_potencial_proposto_escala,
  drop constraint if exists fbc_desempenho_aprovado_escala,
  drop constraint if exists fbc_potencial_aprovado_escala;

alter table public.feedbacks_360_consolidacoes
  drop column if exists desempenho_proposto,
  drop column if exists potencial_proposto,
  drop column if exists desempenho_aprovado,
  drop column if exists potencial_aprovado,
  drop column if exists aprovado_por,
  drop column if exists aprovado_em,
  drop column if exists aprovacao_id,
  drop column if exists snapshot_aprovado;

commit;
