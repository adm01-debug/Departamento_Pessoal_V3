CREATE OR REPLACE FUNCTION public.criar_feedback_seguro(p_empresa_id uuid, p_avaliado_id uuid, p_ciclo_id uuid, p_tipo text, p_nota_geral numeric, p_potencial numeric DEFAULT NULL::numeric, p_avaliador_id uuid DEFAULT NULL::uuid, p_pontos_fortes text DEFAULT NULL::text, p_pontos_melhoria text DEFAULT NULL::text, p_comentarios text DEFAULT NULL::text, p_idempotencia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- AUDITORIA VINCULADA À EMPRESA (§0g): `empresa_id` na COLUNA de `audit_log`
  -- **e** replicado em `dados_novos.empresa_id` (defesa em profundidade).
  insert into public.audit_log (
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_novo.empresa_id,
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
$function$
