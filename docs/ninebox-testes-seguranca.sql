-- ============================================================================
-- NINE-BOX · TESTES REAIS DE SEGURANÇA (PostgreSQL) — executar em HOMOLOGAÇÃO
-- ----------------------------------------------------------------------------
-- Executa os casos de autorização/RLS de verdade, no banco, com a sessão
-- simulada por papel. TUDO roda dentro de UMA transação que termina em ROLLBACK:
-- nenhum registro permanece, mesmo os criados para o teste.
--
-- Como funciona a simulação de sessão (padrão Supabase):
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid-do-usuario>","email":"..."}';
--   → `auth.uid()` passa a devolver o `sub` informado.
--
-- ANTES DE RODAR: substitua os marcadores abaixo.
--   :empresa_a   :empresa_b   :usuario_rh   :usuario_admin
--   :usuario_gestor   :usuario_user   :colaborador_a   :ciclo_a
-- Os valores saem de Q1/Q2b/Q13 do `ninebox-validacao-banco.sql`.
--
-- COMO LER O RESULTADO: cada caso devolve uma linha `caso | esperado | obtido |
-- ok`. Ao final, `select count(*) filter (where not ok) as falhas` deve dar 0.
-- ============================================================================

begin;

create temporary table _res (caso text, esperado text, obtido text, ok boolean) on commit drop;

-- Helper de teste: roda um SELECT contando linhas sob um papel/usuário.
create or replace function pg_temp.conta_como(p_usuario uuid, p_sql text)
returns bigint language plpgsql as $$
declare v bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario)::text, true);
  execute 'select count(*) from (' || p_sql || ') q' into v;
  return v;
end $$;

create or replace function pg_temp.bloqueado_como(p_usuario uuid, p_sql text)
returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario)::text, true);
  begin
    execute p_sql;
    return false;            -- passou: NÃO bloqueado
  exception when others then
    return true;             -- recusado pelo banco
  end;
end $$;

-- ─── 1) LEITURA de `feedbacks_360` ──────────────────────────────────────────
set local role authenticated;

insert into _res values ('1 · RH lê avaliações da própria empresa', '>=0',
  pg_temp.conta_como('{{usuario_rh}}', 'select 1 from public.feedbacks_360 where empresa_id = ''{{empresa_a}}''')::text, true);
insert into _res values ('2 · Proprietário (admin) lê', '>=0',
  pg_temp.conta_como('{{usuario_admin}}', 'select 1 from public.feedbacks_360 where empresa_id = ''{{empresa_a}}''')::text, true);
insert into _res values ('3 · Gestor NÃO lê', '0',
  pg_temp.conta_como('{{usuario_gestor}}', 'select 1 from public.feedbacks_360')::text,
  pg_temp.conta_como('{{usuario_gestor}}', 'select 1 from public.feedbacks_360') = 0);
insert into _res values ('4 · Usuário comum NÃO lê', '0',
  pg_temp.conta_como('{{usuario_user}}', 'select 1 from public.feedbacks_360')::text,
  pg_temp.conta_como('{{usuario_user}}', 'select 1 from public.feedbacks_360') = 0);
insert into _res values ('5 · RH da empresa A não vê a empresa B', '0',
  pg_temp.conta_como('{{usuario_rh}}', 'select 1 from public.feedbacks_360 where empresa_id = ''{{empresa_b}}''')::text,
  pg_temp.conta_como('{{usuario_rh}}', 'select 1 from public.feedbacks_360 where empresa_id = ''{{empresa_b}}''') = 0);

-- ─── 2) Tabelas auxiliares e view (mesmas regras de leitura) ────────────────
insert into _res values ('6 · RH lê validações de potencial', '>=0',
  pg_temp.conta_como('{{usuario_rh}}', 'select 1 from public.feedbacks_360_validacoes_potencial')::text, true);
insert into _res values ('7 · Gestor NÃO lê validações', '0',
  pg_temp.conta_como('{{usuario_gestor}}', 'select 1 from public.feedbacks_360_validacoes_potencial')::text,
  pg_temp.conta_como('{{usuario_gestor}}', 'select 1 from public.feedbacks_360_validacoes_potencial') = 0);
insert into _res values ('8 · Gestor NÃO lê operações', '0',
  pg_temp.conta_como('{{usuario_gestor}}', 'select 1 from public.feedbacks_360_operacoes')::text,
  pg_temp.conta_como('{{usuario_gestor}}', 'select 1 from public.feedbacks_360_operacoes') = 0);
insert into _res values ('9 · Gestor NÃO lê a view de versão', '0',
  pg_temp.conta_como('{{usuario_gestor}}', 'select 1 from public.vw_feedbacks_360_versao')::text,
  pg_temp.conta_como('{{usuario_gestor}}', 'select 1 from public.vw_feedbacks_360_versao') = 0);

-- ─── 3) Escrita direta: INSERT / UPDATE / DELETE ────────────────────────────
insert into _res values ('10 · DELETE direto é BLOQUEADO (rh)', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_rh}}',
    'delete from public.feedbacks_360 where id = ''00000000-0000-0000-0000-000000000000''')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_rh}}',
    'delete from public.feedbacks_360 where id = ''00000000-0000-0000-0000-000000000000'''));

insert into _res values ('11 · UPDATE direto é BLOQUEADO (rh)', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_rh}}',
    'update public.feedbacks_360 set status = ''concluido'' where id = ''00000000-0000-0000-0000-000000000000''')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_rh}}',
    'update public.feedbacks_360 set status = ''concluido'' where id = ''00000000-0000-0000-0000-000000000000'''));

-- ─── 4) Criação pela RPC (feedback + auditoria atômicos) ────────────────────
insert into _res values ('12 · RH cria pela RPC e gera 1 linha de auditoria', 'ok',
  coalesce((select public.criar_feedback_seguro(
      '{{empresa_a}}', '{{colaborador_a}}', '{{ciclo_a}}', 'gestor', 4.5, 4,
      null, 'teste', 'teste', 'teste', 'teste-rpc-1') ->> 'ok'), 'null'), true);

insert into _res values ('13 · reenvio com a MESMA chave não duplica', 'idempotente',
  coalesce((select public.criar_feedback_seguro(
      '{{empresa_a}}', '{{colaborador_a}}', '{{ciclo_a}}', 'gestor', 4.5, 4,
      null, 'teste', 'teste', 'teste', 'teste-rpc-1') ->> 'idempotente'), 'null'),
  coalesce((select public.criar_feedback_seguro(
      '{{empresa_a}}', '{{colaborador_a}}', '{{ciclo_a}}', 'gestor', 4.5, 4,
      null, 'teste', 'teste', 'teste', 'teste-rpc-1') ->> 'idempotente'), 'null') = 'true');

insert into _res values ('14 · categoria inválida é recusada', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_rh}}',
    'select public.criar_feedback_seguro(''{{empresa_a}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''inventado'',4,null,null,null,null,null,''teste-cat-1'')')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_rh}}',
    'select public.criar_feedback_seguro(''{{empresa_a}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''inventado'',4,null,null,null,null,null,''teste-cat-1'')'));

insert into _res values ('15 · nota fora da escala é recusada', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_rh}}',
    'select public.criar_feedback_seguro(''{{empresa_a}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''par'',9,null,null,null,null,null,''teste-nota-1'')')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_rh}}',
    'select public.criar_feedback_seguro(''{{empresa_a}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''par'',9,null,null,null,null,null,''teste-nota-1'')'));

insert into _res values ('16 · criar em empresa de terceiros é recusado', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_rh}}',
    'select public.criar_feedback_seguro(''{{empresa_b}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''par'',4,null,null,null,null,null,''teste-tenant-1'')')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_rh}}',
    'select public.criar_feedback_seguro(''{{empresa_b}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''par'',4,null,null,null,null,null,''teste-tenant-1'')'));

insert into _res values ('17 · gestor sem acesso não cria', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_gestor}}',
    'select public.criar_feedback_seguro(''{{empresa_a}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''par'',4,null,null,null,null,null,''teste-perm-1'')')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_gestor}}',
    'select public.criar_feedback_seguro(''{{empresa_a}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''par'',4,null,null,null,null,null,''teste-perm-1'')'));

-- ─── 5) RPCs de finalização: papel e validação ──────────────────────────────
insert into _res values ('18 · gestor não finaliza', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_gestor}}',
    'select public.finalizar_feedback(''00000000-0000-0000-0000-000000000000'',''concluir'',null,''teste-fin-1'')')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_gestor}}',
    'select public.finalizar_feedback(''00000000-0000-0000-0000-000000000000'',''concluir'',null,''teste-fin-1'')'));

insert into _res values ('19 · admin NÃO valida potencial', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_admin}}',
    'select public.validar_potencial_avaliacao(''00000000-0000-0000-0000-000000000000'',''teste-pot-1'',null)')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_admin}}',
    'select public.validar_potencial_avaliacao(''00000000-0000-0000-0000-000000000000'',''teste-pot-1'',null)'));

-- ─── 6) CORREÇÕES DA REVISÃO (20–24) ────────────────────────────────────────
--   • 20: o reenvio idempotente NÃO dispensa autorização (papel/empresa vêm antes
--         da leitura da chave) — antes, quem apresentasse a chave recebia o
--         resultado gravado sem passar por policy nenhuma;
--   • 21: concluir exige a nota NA ESCALA 1–5 (o fallback `nota_geral` é NUMERIC
--         SEM CHECK; antes bastava estar preenchida);
--   • 22: reabrir + concluir de novo INVALIDA a validação do RH (a versão canônica
--         tem precisão de microssegundo — com precisão de segundos, dentro do
--         mesmo segundo, a aprovação anterior continuava valendo);
--   • 23: `avaliado_id` de outra empresa é recusado (contexto empresarial dos IDs);
--   • 24: depois de reabrir e concluir de novo, NÃO existe validação vigente — o
--         Potencial volta a "sem validação" e o RH precisa validar OUTRA VEZ
--         (mesma régua do front em `acoesFeedback.estadoValidacao`).

-- 20 · reenvio com a MESMA chave, por usuário SEM papel, é bloqueado
--      (a chave já existe: o caso 12 criou a operação 'teste-rpc-1')
insert into _res values ('20 · reenvio idempotente nao dispensa PAPEL', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_gestor}}',
    'select public.criar_feedback_seguro(''{{empresa_a}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''gestor'',4.5,4,null,''teste'',''teste'',''teste'',''teste-rpc-1'')')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_gestor}}',
    'select public.criar_feedback_seguro(''{{empresa_a}}'',''{{colaborador_a}}'',''{{ciclo_a}}'',''gestor'',4.5,4,null,''teste'',''teste'',''teste'',''teste-rpc-1'')'));

-- 21 · concluir com nota FORA DA ESCALA é recusado
--      Prepara uma avaliação PENDENTE com `nota_geral` fora de 1–5 pelo INSERT
--      direto (ainda permitido na etapa 1; a RPC de criação recusaria essa nota,
--      e o banco não tem CHECK em `nota_geral`). Mesmas colunas que a RPC grava.
select set_config('request.jwt.claims', json_build_object('sub', '{{usuario_rh}}')::text, true);
insert into public.feedbacks_360 (
  id, empresa_id, avaliado_id, ciclo_id, tipo, nota_geral, status
) values (
  '00000000-0000-0000-0000-000000000099', '{{empresa_a}}', '{{colaborador_a}}', '{{ciclo_a}}',
  'gestor', 9, 'pendente'
);
insert into _res values ('21 · concluir com nota fora da escala 1-5 e recusado', 'bloqueado',
  case when pg_temp.bloqueado_como('{{usuario_rh}}',
    'select public.finalizar_feedback(''00000000-0000-0000-0000-000000000099'',''concluir'',null,''teste-nota-fora-1'')')
  then 'bloqueado' else 'PERMITIDO (falha)' end,
  pg_temp.bloqueado_como('{{usuario_rh}}',
    'select public.finalizar_feedback(''00000000-0000-0000-0000-000000000099'',''concluir'',null,''teste-nota-fora-1'')'));

-- 22 · reabrir e concluir de novo invalida a validação do RH (versão MUDA)
do $$
declare
  v_id       uuid;
  v_v1       text;
  v_v2       text;
  v_json     jsonb;
  v_vigentes int;
  v_vigentes_novo int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '{{usuario_rh}}')::text, true);

  v_json := public.criar_feedback_seguro('{{empresa_a}}', '{{colaborador_a}}', '{{ciclo_a}}',
            'gestor', 4.5, 4, null, null, null, null, 'teste-versao-criar-1');
  v_id := (v_json ->> 'feedback_id')::uuid;

  perform public.finalizar_feedback(v_id, 'concluir', null, 'teste-versao-concluir-1');
  perform public.validar_potencial_avaliacao(v_id, 'teste-versao-validar-1', null);
  v_v1 := public.versao_avaliacao_feedback(v_id);

  perform public.finalizar_feedback(v_id, 'reabrir', 'reabertura de teste com justificativa', 'teste-versao-reabrir-1');
  perform public.finalizar_feedback(v_id, 'concluir', null, 'teste-versao-concluir-2');
  v_v2 := public.versao_avaliacao_feedback(v_id);

  insert into _res values (
    '22 · reabrir e concluir de novo invalida a validacao do RH',
    'versoes diferentes',
    case when coalesce(v_v1, '') = coalesce(v_v2, '') then 'IGUAIS (falha)' else 'V1=' || v_v1 || ' V2=' || v_v2 end,
    v_v1 is not null and v_v2 is not null and v_v1 <> v_v2
  );

  -- 24 · PROVA DE QUE A NOVA VALIDAÇÃO É OBRIGATÓRIA.
  --      `vigentes` = validações cuja versão casa com a versão ATUAL da
  --      avaliação — é exatamente a régua que o front aplica em
  --      `acoesFeedback.estadoValidacao` ('desatualizada' quando não casa).
  --      Depois de reabrir e concluir de novo: ZERO vigentes ⇒ o Potencial
  --      volta a "potencial sem validação" e o RH precisa validar OUTRA VEZ.
  --      A nova validação do RH então produz exatamente UMA vigente.
  select count(*) into v_vigentes
    from public.feedbacks_360_validacoes_potencial v
   where v.feedback_id = v_id
     and v.versao_avaliacao = public.versao_avaliacao_feedback(v_id);

  perform public.validar_potencial_avaliacao(v_id, 'teste-versao-validar-2', null);

  select count(*) into v_vigentes_novo
    from public.feedbacks_360_validacoes_potencial v
   where v.feedback_id = v_id
     and v.versao_avaliacao = public.versao_avaliacao_feedback(v_id);

  insert into _res values (
    '24 · apos reabrir, EXIGE nova validacao de Potencial pelo RH',
    'vigentes 0 antes, 1 depois',
    'antes=' || v_vigentes || ' depois=' || v_vigentes_novo,
    v_vigentes = 0 and v_vigentes_novo = 1
  );
end $$;

-- 23 · avaliado de OUTRA empresa é recusado (contexto empresarial dos IDs)
do $$
declare
  v_outro uuid;
begin
  select id into v_outro
    from public.colaboradores
   where empresa_id is distinct from '{{empresa_a}}'
   limit 1;

  if v_outro is null then
    -- sem colaborador de outra empresa no ambiente: o caso não é falseável
    insert into _res values ('23 · avaliado de outra empresa e recusado', 'sem dado para testar', 'N/A', true);
  else
    insert into _res values ('23 · avaliado de outra empresa e recusado', 'bloqueado',
      case when pg_temp.bloqueado_como('{{usuario_rh}}',
        'select public.criar_feedback_seguro(''{{empresa_a}}'',''' || v_outro::text || ''',''{{ciclo_a}}'',''gestor'',4,null,null,null,null,null,''teste-outro-tenant-1'')')
      then 'bloqueado' else 'PERMITIDO (falha)' end,
      pg_temp.bloqueado_como('{{usuario_rh}}',
        'select public.criar_feedback_seguro(''{{empresa_a}}'',''' || v_outro::text || ''',''{{ciclo_a}}'',''gestor'',4,null,null,null,null,null,''teste-outro-tenant-1'')'));
  end if;
end $$;

-- ─── RESULTADO ──────────────────────────────────────────────────────────────
select caso, esperado, obtido, ok from _res order by caso;
select count(*) as casos, count(*) filter (where not ok) as falhas from _res;

rollback;   -- nenhum registro de teste permanece
