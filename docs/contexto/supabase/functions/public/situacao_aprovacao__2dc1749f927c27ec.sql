CREATE OR REPLACE FUNCTION public.situacao_aprovacao(p_colaborador_id uuid, p_ciclo_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid           uuid := auth.uid();
  v_empresa       uuid;
  v_versao_gestor text;
  v_status_consolidacao text;
  v_decisao       text;
  v_decisao_versao text;
  v_decidido_por uuid;
  v_gestor_feedback uuid;
  v_validacao     boolean := false;
begin
  /* ISOLAMENTO DE EMPRESA: o status é derivado, mas ainda é dado do tenant.
     Fora das empresas do usuário autenticado a função não responde. */
  select c.empresa_id into v_empresa from public.colaboradores c where c.id = p_colaborador_id;
  if v_empresa is null
     or v_empresa not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  /* FONTE DA VERDADE: a linha de CONSOLIDAÇÃO (mantida pelo trigger da §7).
     `sem_gestor` = existe avaliação, mas o colaborador não tem gestor definido:
     é AVISO de atribuição (visível ao RH), NÃO um bloqueio da decisão — por
     isso a decisão vigente é lida antes e prevalece sobre esse status. */
  select c.versao_consolidada, c.status
    into v_versao_gestor, v_status_consolidacao
    from public.feedbacks_360_consolidacoes c
   where c.colaborador_id = p_colaborador_id and c.ciclo_id = p_ciclo_id;

  /* Sem linha (migration recém-aplicada / dados legados): calcula na hora. */
  -- Fonte de verdade: versao calculada, mesmo que a consolidacao esteja desatualizada.
  v_versao_gestor := public.versao_consolidada_avaliacao(p_colaborador_id, p_ciclo_id);

  select a.decisao, a.versao_avaliacao, a.decidido_por
    into v_decisao, v_decisao_versao, v_decidido_por
    from public.feedbacks_360_aprovacoes_gestor a
   where a.ciclo_id = p_ciclo_id and a.colaborador_id = p_colaborador_id
   order by a.decidido_em desc limit 1;

  /* INVALIDAÇÃO: decisão de OUTRA versão não é aplicada — a consolidação volta a
     aguardar o gestor (é o reencaminhamento automático quando o conjunto muda). */
  if v_decisao is not null
     and (v_versao_gestor is null or v_decisao_versao is distinct from v_versao_gestor) then
    v_decisao := null;
    v_decisao_versao := null;
  end if;

  /* VALIDAÇÃO DO RH: a âncora de `feedbacks_360_validacoes_potencial` é a versão
     CANÔNICA DO FEEDBACK DO GESTOR (`versao_avaliacao_feedback`) — a MESMA usada
     por `validar_potencial_avaliacao` e pelo motor do Nine-Box. Comparar com a
     versão do CONJUNTO (usada pela decisão) nunca casaria e o fluxo ficaria
     eternamente em `aprovada_gestor`. */
  select f.id into v_gestor_feedback
    from public.feedbacks_360 f
   where f.avaliado_id = p_colaborador_id
     and f.ciclo_id = p_ciclo_id
     and lower(btrim(coalesce(f.tipo, ''))) = 'gestor'
     and lower(btrim(coalesce(f.status, ''))) = 'concluido'
   order by f.updated_at desc nulls last
   limit 1;

  if v_gestor_feedback is not null then
    select exists (
      select 1 from public.feedbacks_360_validacoes_potencial v
       where v.ciclo_id = p_ciclo_id
         and v.colaborador_id = p_colaborador_id
         and v.feedback_id = v_gestor_feedback
         and v.versao_avaliacao = public.versao_avaliacao_feedback(v_gestor_feedback)
    ) into v_validacao;
  end if;

  /* A DECISÃO VIGENTE TEM PRIORIDADE sobre a ausência de vínculo: `sem_gestor` é
     pendência de ATRIBUIÇÃO, não um estado terminal. Com a regra estrita atual,
     a decisão só é criada pelo gestor vinculado; a leitura mantém compatibilidade
     com decisões históricas já gravadas. */
  if v_versao_gestor is null then return 'em_preparacao'; end if;
  if not exists (
    select 1 from public.colaboradores alvo
      join public.colaboradores gestor on gestor.id = alvo.supervisor_id
      join public.user_roles ur on ur.user_id = gestor.user_id and ur.role::text = 'gestor'
     where alvo.id = p_colaborador_id and alvo.empresa_id = gestor.empresa_id
  ) then return 'sem_gestor'; end if;
  -- Troca de gestor invalida aprovacoes anteriores, mesmo com notas iguais.
  if v_decidido_por is not null and not exists (
    select 1 from public.colaboradores alvo
      join public.colaboradores gestor on gestor.id = alvo.supervisor_id
     where alvo.id = p_colaborador_id and gestor.user_id = v_decidido_por
       and gestor.empresa_id = alvo.empresa_id
  ) then v_decisao := null; end if;
  if v_decisao is not null then
    if v_decisao = 'devolvido' then return 'devolvida'; end if;
    if v_decisao = 'aprovado' and v_validacao then return 'concluida_validada'; end if;
    if v_decisao = 'aprovado' then return 'aprovada_gestor'; end if;
  end if;
  return 'aguardando_gestor';
end;
$function$
