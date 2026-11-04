CREATE OR REPLACE FUNCTION public.validar_potencial_avaliacao(p_feedback_id uuid, p_idempotencia text DEFAULT NULL::text, p_observacao text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- Exclusivo do RH (`rh`). Admin NÃO valida (mesma regra da versão anterior).
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

  /* GATE DO FLUXO: somente com a aprovação do GESTOR vigente. Se o conjunto
     mudou depois da aprovação, `situacao_aprovacao` já devolve
     `aguardando_gestor` e a validação é recusada até nova decisão. */
  if public.situacao_aprovacao(v_linha.avaliado_id, v_linha.ciclo_id) <> 'aprovada_gestor' then
    raise exception 'aprovacao_do_gestor_ausente';
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
$function$
