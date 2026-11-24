-- ROLLBACK da migration 20261022090000 (conclusao por avaliador designado).
-- Restaura a funcao historica e remove o helper. Nao executado.
begin;
create or replace function public.finalizar_feedback(
  p_feedback_id  uuid,
  p_acao         text,
  p_motivo       text default null,
  p_idempotencia text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  -- LATERAL — a função é `SECURITY DEFINER`, então quem apresentasse a chave
  -- receberia o resultado de OUTRO tenant sem passar por policy nenhuma.
  -- Ordem obrigatória (e é a mesma nas três RPCs):
  --   1. autenticação .................................... (acima)
  --   2. PAPEL REAL do banco (`pode_gerir_avaliacoes()`);
  --   3. linha carregada COM TRAVA (`for update`) — serializa concorrentes;
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

  -- Máquina de estados (§9): concluido→cancelado exige reabrir antes.
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
  -- (ele só não oferece controle que o status/papel recusa — ver
  -- `FeedbackAcoesRodape`), então estas checagens são a única barreira real.
  if p_acao = 'concluir' then
    -- (a) A CATEGORIA precisa ser uma das quatro do 360°. Sem isso não existe
    --     regra aprovada de elegibilidade, e a avaliação nunca classificaria.
    if coalesce(lower(btrim(v_linha.tipo)), '') not in ('gestor','par','auto','subordinado') then
      raise exception 'categoria_invalida';
    end if;

    -- (b) IDENTIFICAÇÃO E RASTREABILIDADE DA ORIGEM — espelho de
    --     `statusFeedback.validarConclusao` (os mesmos impedimentos
    --     `avaliado_ausente`, `avaliador_ausente` e `ciclo_ausente`). O contrato
    --     do formulário já exige avaliado E avaliador (`podeSalvar =
    --     Boolean(avaliadoId && avaliadorId)`) e a avaliação só existe dentro de
    --     um ciclo: sem esses três vínculos não há a quem atribuir a avaliação
    --     nem de onde rastrear sua origem. A checagem vale tanto para os
    --     registros da criação segura quanto para os do INSERT direto
    --     temporário — o registro pode ter nascido com a coluna nula, e é AQUI
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

    -- (c) TODAS as categorias: nota de desempenho NA ESCALA 1–5. "Preenchida"
    --     não basta: `performance` é `INTEGER CHECK (1..5)`, mas **`nota_geral`
    --     é `NUMERIC` SEM CHECK** e a regra usa `coalesce(performance,
    --     nota_geral)` — sem o teste de faixa, concluía com 0, 7 ou −3.
    v_nota := coalesce(v_linha.performance, v_linha.nota_geral);
    if v_nota is null then
      raise exception 'dados_incompletos';
    end if;
    if v_nota < 1 or v_nota > 5 then
      raise exception 'nota_desempenho_fora_da_escala';
    end if;

    -- (d) Potencial, QUANDO informado, tem de estar na escala 1–5 — para
    --     QUALQUER categoria. O `CHECK (1..5)` da coluna já barra no INSERT, mas
    --     o servidor confere aqui também (defesa em profundidade: a coluna é
    --     `integer` e pode ter sido tocada por via privilegiada). Não altera a
    --     regra de obrigatoriedade — só garante a escala.
    if v_linha.potencial is not null and (v_linha.potencial < 1 or v_linha.potencial > 5) then
      raise exception 'potencial_fora_da_escala';
    end if;

    -- (e) OBRIGATÓRIO apenas para o GESTOR: o Potencial é campo da avaliação do
    --     gestor — é 100% do eixo horizontal do Nine-Box (`gestor_sem_potencial`
    --     no motor). Pares/Auto/Subordinados **NÃO** fornecem Potencial (§6.1) e
    --     continuam concluindo sem ele: exigi-lo seria bloquear avaliação
    --     legítima. A régua do servidor é a mesma que o front aplica — e o front
    --     não é a barreira.
    if lower(btrim(v_linha.tipo)) = 'gestor' and v_linha.potencial is null then
      raise exception 'potencial_obrigatorio_para_gestor';
    end if;
  end if;

  -- A REVISÃO (§0.1) é incrementada pelo TRIGGER `trg_feedbacks_360_revisao` a
  -- cada UPDATE — inclusive neste. A RPC NÃO a incrementa à mão (seria contagem
  -- DOBRADA). O `returning` devolve o número NOVO já gravado pelo trigger, para
  -- o resultado e para a trilha.
  update public.feedbacks_360
     set status = v_novo,
         updated_at = now()
   where id = p_feedback_id
  returning revisao into v_revisao;

  -- AUDITORIA VINCULADA À EMPRESA (§0g). A `audit_log` canônica TEM a coluna
  -- `empresa_id` — é ela que a policy `audit_log_tenant_select` e a RPC
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
$$;

revoke all on function public.finalizar_feedback(uuid, text, text, text) from public, anon;
grant execute on function public.finalizar_feedback(uuid, text, text, text) to authenticated;

-- O único caminho de escrita de status passa a ser a RPC.
revoke update on public.feedbacks_360 from authenticated;
drop policy if exists "feedbacks_360_update" on public.feedbacks_360;

-- ----------------------------------------------------------------------------
-- 3b) DESTRUIÇÃO TOTAL BLOQUEADA (TRUNCATE) — mesmo rigor do DELETE/UPDATE
-- ----------------------------------------------------------------------------
-- `TRUNCATE` NÃO é "escrita de registro": é o esvaziamento da tabela INTEIRA,
-- numa única instrução, sem WHERE, **sem RLS** (o RLS não filtra TRUNCATE) e sem
-- trilha por linha. Numa tabela de avaliação de colaboradores isso é
-- incompatível com o nível de segurança exigido — e não existe caminho
-- autorizado que precise desse privilégio.
--
-- INVENTÁRIO (por que revogar não quebra nada):
--   • `src/**` ................ nenhum `TRUNCATE`; os `truncate` existentes são a
--     função de string de `lib/utils.ts` e a classe utilitária do Tailwind;
--   • `supabase/functions/**` . `TRUNCATE` aparece só em
--     `external-db-bridge/validation.ts` como TOKEN PROIBIDO (bloqueio, não
--     uso); `exportacao/index.ts` devolve apenas a flag booleana `truncated`;
--   • `supabase/migrations/**`  nenhum `TRUNCATE` executado — nas migrations
--     antigas a palavra aparece apenas dentro de cláusulas `revoke … truncate`;
--   • RPCs do módulo .......... `finalizar_feedback`, `validar_potencial_avaliacao`
--     e `criar_feedback_seguro` fazem apenas INSERT/UPDATE + auditoria;
--   • criação (RH/proprietário) é INSERT (RPC `criar_feedback_seguro` ou
--     PostgREST) — TRUNCATE não participa;
--   • leitura (RH/proprietário) é SELECT sob a policy `feedbacks_360_select`.
--
-- POR QUE REVOGAR DE `PUBLIC` **E** DOS PAPÉIS: um grant a `PUBLIC` já dá o
-- privilégio a TODOS os papéis, e aí `revoke … from anon` não fecha nada —
-- `has_table_privilege('anon', …)` continua `true`. As três revogações juntas
-- fecham os dois caminhos (grant a PUBLIC e grant direto a cada papel).
--
-- `service_role` NÃO é tocado: é o papel administrativo/servidor (BYPASSRLS),
-- usado por manutenção fora do app — não é um papel que o navegador assume.
revoke truncate on table public.feedbacks_360 from public;
revoke truncate on table public.feedbacks_360 from anon;
revoke truncate on table public.feedbacks_360 from authenticated;

-- Confirmação: TRUNCATE não pode mais ser EFETIVO por `anon` nem por
-- `authenticated`. `has_table_privilege` cobre os TRÊS caminhos de uma vez —
-- grant direto, grant a `PUBLIC` e herança de outro papel —, então é ele quem
-- prova o fechamento. O ACL é conferido em separado porque o `grantee` de
-- PUBLIC é `0` (vazio) e não existe papel `public` para consultar no
-- `has_table_privilege`. Se algo escapou, a migration falha e a transação
-- inteira é desfeita.
do $$
declare
  v_anon       boolean;
  v_auth       boolean;
  v_acl_public integer;
begin
  v_anon := has_table_privilege('anon', 'public.feedbacks_360', 'TRUNCATE');
  v_auth := has_table_privilege('authenticated', 'public.feedbacks_360', 'TRUNCATE');

  select count(*) into v_acl_public
    from aclexplode(
           (select c.relacl
              from pg_class c
              join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = 'feedbacks_360')
         ) a
   where a.grantee = 0          -- 0 = PUBLIC (pseudo-papel)
     and a.privilege_type = 'TRUNCATE';

  if v_anon or v_auth or v_acl_public > 0 then
    raise exception
      'TRUNCATE ainda efetivo em feedbacks_360 (anon=%, authenticated=%, grants a PUBLIC=%). Investigue heranca de papel (pg_auth_members) e grants a PUBLIC antes de reaplicar.',
      v_anon, v_auth, v_acl_public;
  end if;
end $$;

-- 4) RPC de VALIDAÇÃO DO POTENCIAL pelo RH.
--    • Exclusiva de RH (o proprietário não substitui esta validação — §8).
--    • Só vale para a avaliação do GESTOR, concluída e com potencial na escala.
--    • A validação é gravada com a VERSÃO exata analisada. Se a avaliação for
--      reaberta ou o potencial mudar, a versão deixa de casar e a aprovação
--      anterior perde efeito — sem apagar o histórico.
--    FORMATO DA VERSÃO (fonte única: `public.versao_avaliacao_feedback`; o
--    espelho documental é `motorAvaliacao360.CONTRATO_VERSAO_AVALIACAO`):
--      id | revisao | updated_at (to_char YYYY-MM-DD"T"HH24:MI:SS.US) | potencial | status
revoke all on function public.finalizar_feedback(uuid, text, text, text) from public, anon;
grant execute on function public.finalizar_feedback(uuid, text, text, text) to authenticated;

drop function if exists public.pode_finalizar_feedback(uuid);

commit;
