CREATE OR REPLACE FUNCTION public.editar_feedback_seguro(p_feedback_id uuid, p_avaliado_id uuid, p_avaliador_id uuid, p_ciclo_id uuid, p_tipo text, p_nota numeric, p_potencial numeric DEFAULT NULL::numeric, p_pontos_fortes text DEFAULT NULL::text, p_pontos_melhoria text DEFAULT NULL::text, p_comentarios text DEFAULT NULL::text, p_idempotencia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  v_status_atual text;
  v_status_novo  text;
  v_resultado jsonb;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;

  -- EDIÇÃO por registro: RH/admin OU gestor responsável/exceção do colaborador.
  if not public.pode_editar_feedback(p_feedback_id) then
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

  -- Gestor não pode “mover” um feedback para colaborador fora de sua
  -- responsabilidade. RH/admin continuam com escopo de empresa.
  if not public.pode_gerir_avaliacoes()
     and not public.pode_editar_colaborador(p_avaliado_id) then
    raise exception 'avaliado_fora_da_responsabilidade';
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

  v_reabriu := false;
  v_status_atual := lower(btrim(coalesce(v_antes.status, '')));

  -- MÁQUINA DE ESTADOS EXPLÍCITA: editar NUNCA reativa cancelamento.
  -- Cancelado só volta por `finalizar_feedback(..., 'reabrir', motivo, ...)`,
  -- operação administrativa auditada e com justificativa.
  if v_status_atual = 'pendente' then
    v_status_novo := 'pendente';
  elsif v_status_atual in ('concluido', 'concluida') then
    v_status_novo := 'pendente';
    v_reabriu := true;
  elsif v_status_atual = 'cancelado' then
    raise exception 'feedback_cancelado_nao_editavel';
  else
    raise exception 'status_desconhecido';
  end if;

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
         status          = v_status_novo,
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
$function$
