-- ============================================================================
-- ROLLBACK DA RECONCILIAÇÃO INCREMENTAL DO NINE-BOX
-- ----------------------------------------------------------------------------
-- Reverte SOMENTE os objetos criados/substituídos por
-- 20261027090000_ninebox_reconciliacao_incremental.sql:
--   • remove editar_feedback_seguro e pode_editar_feedback/pode_editar_colaborador;
--   • restaura a definição EXATA de finalizar_feedback capturada do principal
--     antes da migration (não a versão histórica do repositório);
--   • remove pode_finalizar_feedback;
--   • remove o trigger/função de proteção de ciclos e restaura as policies
--     anteriores, sem ampliar privilégios.
--
-- NÃO altera: colunas de snapshot, sincronizar_consolidacao_avaliacao,
-- decidir_aprovacao_gestor, feedbacks_360_aprovacoes_gestor ou dados.
-- O rótulo editar_feedback é mantido no CHECK SOMENTE se já houver linhas de
-- idempotência com esse rótulo; isso preserva o histórico. Sem linhas, o CHECK
-- é restaurado exatamente à definição anterior.
-- ============================================================================

begin;

drop function if exists public.editar_feedback_seguro(uuid, uuid, uuid, uuid, text, numeric, numeric, text, text, text, text);
drop function if exists public.pode_editar_feedback(uuid);
drop function if exists public.pode_editar_colaborador(uuid);

do $$
declare
  v_nome text;
  v_tem_editar boolean;
begin
  select exists (
    select 1 from public.feedbacks_360_operacoes where operacao = 'editar_feedback'
  ) into v_tem_editar;

  for v_nome in
    select conname from pg_constraint
     where conrelid = 'public.feedbacks_360_operacoes'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%operacao%'
  loop
    execute format('alter table public.feedbacks_360_operacoes drop constraint %I', v_nome);
  end loop;

  if v_tem_editar then
    execute $sql$
      alter table public.feedbacks_360_operacoes
        add constraint feedbacks_360_operacoes_operacao_check
        check (operacao in ('concluir','cancelar','reabrir','validar_potencial','criar',
                            'decidir_aprovacao_gestor','enviar_avaliacao_ao_gestor',
                            'editar_feedback'))
    $sql$;
  else
    execute $sql$
      alter table public.feedbacks_360_operacoes
        add constraint feedbacks_360_operacoes_operacao_check
        check (operacao in ('concluir','cancelar','reabrir','validar_potencial','criar',
                            'decidir_aprovacao_gestor','enviar_avaliacao_ao_gestor'))
    $sql$;
  end if;
end $$;

-- Restauração EXATA do estado remoto anterior à migration.
CREATE OR REPLACE FUNCTION public.finalizar_feedback(p_feedback_id uuid, p_acao text, p_motivo text DEFAULT NULL::text, p_idempotencia text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid          uuid := auth.uid();
  v_email        text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_hash         text;
  v_chave        text;
  v_linha        public.feedbacks_360%rowtype;
  v_novo         text;
  v_auditoria_id uuid;
  v_resultado    jsonb;
  v_confere      text;
  v_anterior     jsonb;
  v_nota         numeric;
  v_revisao      integer;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;
  if p_acao not in ('concluir','cancelar','reabrir') then
    raise exception 'acao_invalida';
  end if;
  if p_idempotencia is null or btrim(p_idempotencia) = '' then
    raise exception 'idempotencia_ausente';
  end if;

  -- ── AUTORIZAÇÃO PRIMEIRO; IDEMPOTÊNCIA DEPOIS ──────────────────────────────
  -- O REENVIO É UM CAMINHO DE LEITURA: ele devolve `status_anterior`,
  -- `auditoria_id` e o resultado gravado daquela operação. Responder ao reenvio
  -- antes de checar papel e empresa transformava a idempotência numa PORTA
  -- LATERAL - a função é `SECURITY DEFINER`, então quem apresentasse a chave
  -- receberia o resultado de OUTRO tenant sem passar por policy nenhuma.
  -- Ordem obrigatória (e é a mesma nas três RPCs):
  --   1. autenticação .................................... (acima)
  --   2. PAPEL REAL do banco (`pode_gerir_avaliacoes()`);
  --   3. linha carregada COM TRAVA (`for update`) - serializa concorrentes;
  --   4. EMPRESA (tenant) da própria linha;
  --   5. SÓ ENTÃO a chave de idempotência.
  -- Papel REAL do banco (helper único, ver §0c): concluir/cancelar/reabrir são de
  -- `admin` (proprietário) e `rh`. `gestor` e `user` NÃO têm acesso.
  if not public.pode_gerir_avaliacoes() then
    raise exception 'perfil_nao_autorizado';
  end if;

  v_chave := p_acao || ':' || p_feedback_id::text || ':' || p_idempotencia;
  v_hash  := md5(p_feedback_id::text || '|' || p_acao || '|' || coalesce(p_motivo, ''));

  -- Concorrência: trava a linha antes de decidir.
  select * into v_linha from public.feedbacks_360 where id = p_feedback_id for update;
  if not found then
    raise exception 'registro_inexistente';
  end if;

  -- Tenant DENTRO da função (SECURITY DEFINER não passa por RLS).
  if v_linha.empresa_id is null
     or v_linha.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  -- Idempotência: mesma chave + mesmos parâmetros devolve o resultado anterior.
  -- `empresa_id` e `feedback_id` repetidos aqui de propósito: mesmo que a chave
  -- fosse adivinhada/forjada, ela só casa com a operação da PRÓPRIA empresa e do
  -- PRÓPRIO feedback já autorizados acima (defesa em profundidade).
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

  -- Máquina de estados (§9): concluidocancelado exige reabrir antes.
  v_novo := case
    when coalesce(lower(btrim(v_linha.status)), '') = 'pendente' and p_acao = 'concluir' then 'concluido'
    when coalesce(lower(btrim(v_linha.status)), '') = 'pendente' and p_acao = 'cancelar' then 'cancelado'
    when coalesce(lower(btrim(v_linha.status)), '') in ('concluido','cancelado')
         and p_acao = 'reabrir' then 'pendente'
    else null
  end;
  if v_novo is null then
    raise exception 'transicao_invalida';
  end if;

  -- Reabrir é recurso de RH/proprietário (e exige justificativa, §9.3).
  if p_acao = 'reabrir' and (p_motivo is null or length(btrim(p_motivo)) < 10) then
    raise exception 'justificativa_obrigatoria';
  end if;
  if p_acao = 'cancelar' and (p_motivo is null or length(btrim(p_motivo)) < 3) then
    raise exception 'motivo_obrigatorio';
  end if;
  -- ── CONCLUIR: TODAS as condições obrigatórias, POR CATEGORIA (§6.1) ────────
  -- O servidor é o guardião: o front NÃO bloqueia "Concluir" por falta de nota
  -- (ele só não oferece controle que o status/papel recusa - ver
  -- `FeedbackAcoesRodape`), então estas checagens são a única barreira real.
  if p_acao = 'concluir' then
    -- (a) A CATEGORIA precisa ser uma das quatro do 360°. Sem isso não existe
    --     regra aprovada de elegibilidade, e a avaliação nunca classificaria.
    if coalesce(lower(btrim(v_linha.tipo)), '') not in ('gestor','par','auto','subordinado') then
      raise exception 'categoria_invalida';
    end if;

    -- (b) IDENTIFICAÇÃO E RASTREABILIDADE DA ORIGEM - espelho de
    --     `statusFeedback.validarConclusao` (os mesmos impedimentos
    --     `avaliado_ausente`, `avaliador_ausente` e `ciclo_ausente`). O contrato
    --     do formulário já exige avaliado E avaliador (`podeSalvar =
    --     Boolean(avaliadoId && avaliadorId)`) e a avaliação só existe dentro de
    --     um ciclo: sem esses três vínculos não há a quem atribuir a avaliação
    --     nem de onde rastrear sua origem. A checagem vale tanto para os
    --     registros da criação segura quanto para os do INSERT direto
    --     temporário - o registro pode ter nascido com a coluna nula, e é AQUI
    --     que a conclusão inverte para recusa. Não exige mais que isso: a
    --     existência dos vínculos é garantida pelas FKs.
    if v_linha.avaliado_id is null then
      raise exception 'avaliado_ausente';
    end if;
    if v_linha.avaliador_id is null then
      raise exception 'avaliador_ausente';
    end if;
    if v_linha.ciclo_id is null then
      raise exception 'ciclo_ausente';
    end if;

    -- (c) TODAS as categorias: nota de desempenho NA ESCALA 1-5. "Preenchida"
    --     não basta: `performance` é `INTEGER CHECK (1..5)`, mas **`nota_geral`
    --     é `NUMERIC` SEM CHECK** e a regra usa `coalesce(performance,
    --     nota_geral)` - sem o teste de faixa, concluía com 0, 7 ou -3.
    v_nota := coalesce(v_linha.performance, v_linha.nota_geral);
    if v_nota is null then
      raise exception 'dados_incompletos';
    end if;
    if v_nota < 1 or v_nota > 5 then
      raise exception 'nota_desempenho_fora_da_escala';
    end if;

    -- (d) Potencial, QUANDO informado, tem de estar na escala 1-5 - para
    --     QUALQUER categoria. O `CHECK (1..5)` da coluna já barra no INSERT, mas
    --     o servidor confere aqui também (defesa em profundidade: a coluna é
    --     `integer` e pode ter sido tocada por via privilegiada). Não altera a
    --     regra de obrigatoriedade - só garante a escala.
    if v_linha.potencial is not null and (v_linha.potencial < 1 or v_linha.potencial > 5) then
      raise exception 'potencial_fora_da_escala';
    end if;

    -- (e) OBRIGATÓRIO apenas para o GESTOR: o Potencial é campo da avaliação do
    --     gestor - é 100% do eixo horizontal do Nine-Box (`gestor_sem_potencial`
    --     no motor). Pares/Auto/Subordinados **NÃO** fornecem Potencial (§6.1) e
    --     continuam concluindo sem ele: exigi-lo seria bloquear avaliação
    --     legítima. A régua do servidor é a mesma que o front aplica - e o front
    --     não é a barreira.
    if lower(btrim(v_linha.tipo)) = 'gestor' and v_linha.potencial is null then
      raise exception 'potencial_obrigatorio_para_gestor';
    end if;
  end if;

  -- A REVISÃO (§0.1) é incrementada pelo TRIGGER `trg_feedbacks_360_revisao` a
  -- cada UPDATE - inclusive neste. A RPC NÃO a incrementa à mão (seria contagem
  -- DOBRADA). O `returning` devolve o número NOVO já gravado pelo trigger, para
  -- o resultado e para a trilha.
  update public.feedbacks_360
     set status = v_novo,
         updated_at = now()
   where id = p_feedback_id
  returning revisao into v_revisao;

  -- AUDITORIA VINCULADA À EMPRESA (§0g). A `audit_log` canônica TEM a coluna
  -- `empresa_id` - é ela que a policy `audit_log_tenant_select` e a RPC
  -- `listar_auditoria` usam para recortar a Trilha por tenant. O vínculo vai,
  -- portanto, na COLUNA **e** é replicado em `dados_novos.empresa_id` (defesa
  -- em profundidade e leitura direta pela timeline) junto do `status` e da
  -- `revisao` resultantes. Sem a coluna preenchida o evento existiria, mas
  -- ficaria INVISÍVEL para a própria empresa.
  insert into public.audit_log (
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_linha.empresa_id,
    'feedbacks_360', p_feedback_id, 'UPDATE',
    jsonb_build_object('status', v_linha.status, 'revisao', v_linha.revisao),
    jsonb_build_object(
      'empresa_id', v_linha.empresa_id,
      'status', v_novo,
      'revisao', v_revisao
    ),
    array['status'], v_uid, v_email
  ) returning id into v_auditoria_id;

  v_resultado := jsonb_build_object(
    'ok', true,
    'status_anterior', v_linha.status,
    'status_novo', v_novo,
    'revisao_nova', v_revisao,
    'auditoria_id', v_auditoria_id,
    'idempotente', false
  );

  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values (v_chave, p_feedback_id, v_linha.empresa_id, p_acao, v_hash, v_resultado)
  on conflict (idempotency_key) do nothing;

  return v_resultado;
end;
$function$;
revoke all on function public.finalizar_feedback(uuid, text, text, text) from public, anon;
grant execute on function public.finalizar_feedback(uuid, text, text, text) to authenticated;

drop function if exists public.pode_finalizar_feedback(uuid);

drop trigger if exists ciclos_bloqueio_exclusao_com_dependencias on public.ciclos_avaliacao;
drop function if exists public.bloquear_exclusao_ciclo_com_dependencias();

drop policy if exists "ciclos_avaliacao_insert" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_insert" on public.ciclos_avaliacao
  for insert to authenticated
  with check (empresa_id in (select public.get_user_empresas(auth.uid())));

drop policy if exists "ciclos_avaliacao_delete" on public.ciclos_avaliacao;
create policy "ciclos_avaliacao_delete" on public.ciclos_avaliacao
  for delete to authenticated
  using (empresa_id in (select public.get_user_empresas(auth.uid())));

commit;

notify pgrst, 'reload schema';
