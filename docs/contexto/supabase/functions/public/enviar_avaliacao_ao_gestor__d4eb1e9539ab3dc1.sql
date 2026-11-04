CREATE OR REPLACE FUNCTION public.enviar_avaliacao_ao_gestor(p_colaborador_id uuid, p_ciclo_id uuid, p_idempotencia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid        uuid := auth.uid();
  v_email      text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_empresa    uuid;
  v_gestor     uuid;
  v_supervisor uuid;
  v_supervisor_uid uuid;
  v_chave      text;
  v_result     jsonb;
begin
  if v_uid is null then raise exception 'nao_autenticado' using errcode = '28000'; end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then raise exception 'idempotencia_ausente'; end if;
  if not public.pode_gerir_avaliacoes() then raise exception 'perfil_nao_autorizado'; end if;

  select c.empresa_id, c.supervisor_id
    into v_empresa, v_supervisor
    from public.colaboradores c where c.id = p_colaborador_id;
  if v_empresa is null then raise exception 'colaborador_inexistente'; end if;
  if v_empresa not in (select public.get_user_empresas(v_uid)) then raise exception 'nao_autorizado'; end if;

  -- SEM GESTOR NÃO SE "ENVIA": a pendência é de ATRIBUIÇÃO (o trigger já grava
  -- `sem_gestor`). Inventar destinatário aqui faria o RH acreditar no envio.
  if v_supervisor is null then raise exception 'gestor_nao_atribuido'; end if;
  select u.user_id into v_supervisor_uid from public.colaboradores u
   where u.id = v_supervisor and u.empresa_id = v_empresa;
  if v_supervisor_uid is null or not exists (
    select 1 from public.user_roles ur
     where ur.user_id = v_supervisor_uid and ur.role::text = 'gestor'
  ) then raise exception 'gestor_sem_conta_ou_papel'; end if;

  -- A avaliação do GESTOR é obrigatória e precisa estar concluída.
  select f.id into v_gestor
    from public.feedbacks_360 f
   where f.empresa_id = v_empresa and f.ciclo_id = p_ciclo_id
     and f.avaliado_id = p_colaborador_id
     and lower(btrim(coalesce(f.tipo,''))) = 'gestor'
     and lower(btrim(coalesce(f.status,''))) = 'concluido'
   order by f.updated_at desc nulls last
   limit 1;
  if v_gestor is null then raise exception 'avaliacao_do_gestor_ausente_ou_pendente'; end if;

  v_chave := 'enviar_gestor:' || p_colaborador_id::text || ':' || p_ciclo_id::text || ':' || p_idempotencia;

  if public.situacao_aprovacao(p_colaborador_id, p_ciclo_id)
     in ('aprovada_gestor','concluida_validada') then
    raise exception 'aprovacao_ja_registrada';
  end if;

  insert into public.feedbacks_360_consolidacoes
    (empresa_id, ciclo_id, colaborador_id, status, enviado_por, enviado_em,
     gestor_responsavel_colaborador_id, gestor_responsavel_user_id, atualizado_em, atualizado_por)
  values (v_empresa, p_ciclo_id, p_colaborador_id, 'aguardando_gestor', v_uid, now(),
          v_supervisor, v_supervisor_uid, now(), v_uid)
  on conflict (empresa_id, ciclo_id, colaborador_id) do update
    set status = 'aguardando_gestor',
        enviado_por = v_uid,
        enviado_em = now(),
        gestor_responsavel_colaborador_id = excluded.gestor_responsavel_colaborador_id,
        gestor_responsavel_user_id = excluded.gestor_responsavel_user_id,
        atualizado_em = now(),
        atualizado_por = v_uid;

  insert into public.audit_log (empresa_id, tabela, registro_id, acao, dados_novos, user_id, user_email)
  values (v_empresa, 'feedbacks_360_consolidacoes', p_colaborador_id, 'UPDATE',
          jsonb_build_object('empresa_id', v_empresa, 'ciclo_id', p_ciclo_id,
                             'colaborador_id', p_colaborador_id, 'status', 'aguardando_gestor'),
          v_uid, v_email);

  v_result := jsonb_build_object('ok', true, 'status', 'aguardando_gestor');

  -- Idempotência por OPERAÇÃO (mesma trilha do restante do fluxo): reenviar o
  -- MESMO envio não republica nada; a linha fica auditável com rótulo próprio.
  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, v_gestor, v_empresa, 'enviar_avaliacao_ao_gestor',
          md5(p_colaborador_id::text || '|' || p_ciclo_id::text), v_result)
  on conflict (idempotency_key) do nothing;

  return v_result;
end;
$function$
