CREATE OR REPLACE FUNCTION public.sincronizar_consolidacao_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid, p_por uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    select u.user_id into v_gestor_uid from public.colaboradores u where u.id = v_gestor and u.empresa_id = v_empresa;
  end if;

  v_versao := public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id);

  if v_versao is null then
    -- Não apagar o cabeçalho: o histórico referencia a consolidação com FK RESTRICT.
    update public.feedbacks_360_consolidacoes c
       set status = 'em_preparacao', versao_consolidada = null,
           desempenho_proposto = null, potencial_proposto = null,
           desempenho_aprovado = null, potencial_aprovado = null,
           aprovado_por = null, aprovado_em = null,
           aprovacao_id = null, snapshot_aprovado = null,
           atualizado_em = now(), atualizado_por = p_por
     where c.empresa_id = v_empresa and c.ciclo_id = p_ciclo_id
       and c.colaborador_id = p_colaborador_id;
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

  v_status := case when v_gestor is null or v_gestor_uid is null
    or not exists (select 1 from public.user_roles ur
                   where ur.user_id = v_gestor_uid and ur.role::text = 'gestor')
    then 'sem_gestor' else 'aguardando_gestor' end;


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
$function$
