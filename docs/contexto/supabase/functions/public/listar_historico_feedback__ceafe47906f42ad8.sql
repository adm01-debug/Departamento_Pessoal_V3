CREATE OR REPLACE FUNCTION public.listar_historico_feedback(p_feedback_id uuid)
 RETURNS TABLE(id uuid, tipo text, ocorrido_em timestamp with time zone, responsavel_id uuid, responsavel_email text, responsavel_nome text, justificativa text, status_anterior text, status_posterior text, detalhes jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_fb  public.feedbacks_360%rowtype;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;

  select * into v_fb
    from public.feedbacks_360 f
   where f.id = p_feedback_id;

  if not found then
    raise exception 'registro_inexistente';
  end if;
  if v_fb.empresa_id is null
     or v_fb.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  -- RH/admin; gestor responsável/exceção (mesma prova da aprovação); ou o
  -- avaliador designado do próprio registro. Nenhum outro usuário lê a trilha.
  if not (
    public.pode_gerir_avaliacoes()
    or public.pode_aprovar_colaborador(v_fb.avaliado_id)
    or exists (
      select 1
        from public.colaboradores c
       where c.id = v_fb.avaliador_id
         and c.empresa_id = v_fb.empresa_id
         and c.user_id = v_uid
    )
  ) then
    raise exception 'perfil_nao_autorizado';
  end if;

  return query
  with feedback_eventos as (
    select
      a.id,
      a.created_at as ocorrido_em,
      a.user_id as responsavel_id,
      a.user_email as responsavel_email,
      coalesce(a.justificativa, nullif(a.dados_novos ->> 'justificativa', '')) as justificativa,
      coalesce(a.status_anterior, a.dados_anteriores ->> 'status') as status_anterior,
      coalesce(a.status_posterior, a.dados_novos ->> 'status') as status_posterior,
      a.dados_novos as detalhes,
      case
        when a.acao = 'INSERT' then 'criado'
        when lower(coalesce(a.dados_novos ->> 'motivo', '')) = 'edicao_feedback' then 'editado'
        when lower(coalesce(a.status_posterior, a.dados_novos ->> 'status', '')) = 'cancelado'
          then 'cancelado'
        when lower(coalesce(a.status_posterior, a.dados_novos ->> 'status', '')) = 'concluido'
          then 'concluido'
        when lower(coalesce(a.status_posterior, a.dados_novos ->> 'status', '')) = 'pendente'
         and lower(coalesce(a.status_anterior, a.dados_anteriores ->> 'status', ''))
             in ('concluido', 'cancelado')
          then 'reaberto'
        else 'editado'
      end as tipo
    from public.audit_log a
    where a.empresa_id = v_fb.empresa_id
      and a.tabela = 'feedbacks_360'
      and a.registro_id = p_feedback_id
      and a.acao in ('INSERT', 'UPDATE')
  ),
  eventos as (
    select * from feedback_eventos

    union all

    -- Consolidação: a fonte é a PRÓPRIA linha, identificada por
    -- (empresa_id, ciclo_id, colaborador_id). Nada é inferido de JSON.
    select
      c.id,
      c.enviado_em,
      c.enviado_por,
      null::text,
      null::text,
      null::text,
      'aguardando_gestor',
      jsonb_build_object('status', 'aguardando_gestor'),
      'encaminhado'
    from public.feedbacks_360_consolidacoes c
    where c.empresa_id = v_fb.empresa_id
      and c.ciclo_id = v_fb.ciclo_id
      and c.colaborador_id = v_fb.avaliado_id
      and c.enviado_em is not null

    union all

    -- Aprovação/devolução: a fonte é a linha append-only da aprovação,
    -- ligada pela chave real do conjunto (empresa + ciclo + colaborador).
    select
      ap.id,
      ap.decidido_em,
      ap.decidido_por,
      null::text,
      ap.justificativa,
      null::text,
      case lower(coalesce(ap.decisao, ''))
        when 'aprovado' then 'aprovada_gestor'
        when 'devolvido' then 'devolvida'
        else null
      end,
      jsonb_build_object('decisao', ap.decisao),
      case lower(coalesce(ap.decisao, ''))
        when 'aprovado' then 'aprovado'
        when 'devolvido' then 'devolvido'
        else null
      end
    from public.feedbacks_360_aprovacoes_gestor ap
    where ap.empresa_id = v_fb.empresa_id
      and ap.ciclo_id = v_fb.ciclo_id
      and ap.colaborador_id = v_fb.avaliado_id
  )
  select
    e.id,
    e.tipo,
    e.ocorrido_em,
    e.responsavel_id,
    e.responsavel_email,
    resp.nome_completo as responsavel_nome,
    e.justificativa,
    e.status_anterior,
    e.status_posterior,
    e.detalhes
  from eventos e
  left join lateral (
    select col.nome_completo
      from public.colaboradores col
     where col.user_id = e.responsavel_id
       and col.empresa_id = v_fb.empresa_id
     limit 1
  ) resp on true
  where e.tipo is not null
  order by e.ocorrido_em asc, e.id asc;
end;
$function$
