\set ON_ERROR_STOP on
-- Usuário gestor responsável por COLAB e TARGET.
select set_config('app.uid','44444444-4444-4444-8444-444444444444',false);
insert into feedbacks_360_aprovacoes_gestor (empresa_id,ciclo_id,colaborador_id)
values ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','66666666-6666-4666-8666-666666666666');
select editar_feedback_seguro(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '77777777-7777-4777-8777-777777777777',
  '44444444-4444-4444-8444-444444444444',
  'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa',
  'gestor',5,4,'Fortes transferidos','Melhoria transferida','Comentário transferido','pg-transfer-1'
) as transferencia;

do $$
declare
  v_antiga record;
  v_calls int;
  v_novo record;
begin
  select * into v_antiga from feedbacks_360_consolidacoes
   where colaborador_id='66666666-6666-4666-8666-666666666666'
     and ciclo_id='22222222-2222-4222-8222-222222222222';
  if v_antiga.desempenho_aprovado is not null or v_antiga.snapshot_aprovado is not null then
    raise exception 'grupo antigo manteve snapshot/aprovação após transferência';
  end if;
  select count(*) into v_calls from sync_calls;
  if v_calls < 2 then raise exception 'trigger não sincronizou os grupos antigo e novo'; end if;
  if not exists (select 1 from sync_calls where grupo_colaborador='66666666-6666-4666-8666-666666666666' and grupo_ciclo='22222222-2222-4222-8222-222222222222') then
    raise exception 'grupo antigo não foi sincronizado';
  end if;
  if not exists (select 1 from sync_calls where grupo_colaborador='77777777-7777-4777-8777-777777777777' and grupo_ciclo='aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa') then
    raise exception 'grupo novo não foi sincronizado';
  end if;
  select * into v_novo from feedbacks_360 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if v_novo.avaliado_id <> '77777777-7777-4777-8777-777777777777'::uuid or v_novo.ciclo_id <> 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa'::uuid then
    raise exception 'transferência não foi persistida';
  end if;
end $$;

-- Aprovação histórica permanece registrada, mas deixa de estar vigente pelo snapshot limpo.
do $$
begin
  if not exists (select 1 from feedbacks_360_aprovacoes_gestor where colaborador_id='66666666-6666-4666-8666-666666666666') then
    raise exception 'histórico de aprovação foi apagado';
  end if;
end $$;

-- Rollback SQL (o frontend antigo deve ser restaurado antes/em conjunto).
-- Este teste aplica o rollback e confirma remoção das RPCs novas.
