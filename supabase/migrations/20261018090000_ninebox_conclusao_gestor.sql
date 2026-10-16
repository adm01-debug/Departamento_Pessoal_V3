-- ============================================================================
-- NINE-BOX · CONCLUSÃO DA AVALIAÇÃO = GESTOR RESPONSÁVEL (migration ADITIVA)
-- ----------------------------------------------------------------------------
-- ⚠️  PREPARADA, NÃO EXECUTADA. Nenhuma alteração remota foi feita.
--     Depende de (aplicar NESTA ordem):
--       1. `20261015090000_ninebox_finalizacao_e_potencial.sql` → helpers
--          `pode_gerir_avaliacoes()` / `pode_validar_potencial()` e a RPC
--          `finalizar_feedback` (esta migration a SUBSTITUI, mesma assinatura);
--       2. `20261017090000_ninebox_aprovacao_gestor.sql` → helper
--          `pode_aprovar_colaborador(uuid)` (papel `gestor` + vínculo).
--
-- POR QUE ELA EXISTE
--   A RPC `finalizar_feedback` nasceu autorizando `admin`/`rh`
--   (`pode_gerir_avaliacoes()`). Regra pedida em 16/10/2026: a ação
--   **"Concluir avaliação" é ato EXCLUSIVO do gestor RESPONSÁVEL** pela
--   avaliação — esconder o botão no front não basta (a API é pública para
--   `authenticated`), então a autorização passa a ser conferida no servidor.
--
-- O QUE MUDA (e só isso)
--   • `p_acao = 'concluir'` passa a exigir `pode_aprovar_colaborador(avaliado_id)`:
--     papel REAL `gestor` (user_roles) E vínculo na MESMA empresa
--     (`supervisor_id` = colaborador do usuário autenticado, ou ele próprio).
--     `admin`/`rh` SEM papel `gestor` → `perfil_nao_autorizado` (item 4.4);
--     gestor de OUTRA empresa/OUTRO responsável → `perfil_nao_autorizado`
--     (itens 4.1–4.3). O `tipo` do feedback NÃO entra na decisão: tipo é a
--     ORIGEM da avaliação (o front é explícito nisso).
--   • `cancelar` e `reabrir` continuam ADMINISTRATIVOS (`pode_gerir_avaliacoes()`);
--     `reabrir` segue exigindo justificativa ≥ 10 (§9.3).
--   • A trilha passa a registrar também a VERSÃO canônica concluída
--     (`versao_avaliacao_feedback`), além de identidade (`user_id`,
--     `user_email`), data (`created_at` da auditoria) e `revisao` (item 4.5).
--   • IDEMPOTÊNCIA, máquina de estados, validações por categoria, trigger de
--     revisão, trava `for update` e leitura da chave DEPOIS da autorização +
--     tenant permanecem IDÊNTICAS.
--
-- O QUE **NÃO** MUDA (itens 4.6–4.8)
--   • A aprovação formal do gestor (`decidir_aprovacao_gestor`) continua
--     obrigatória e exclusiva dele — esta migration não a toca;
--   • `validar_potencial_avaliacao` continua EXCLUSIVA do RH;
--   • o Nine-Box só classifica depois das duas validações (a validação do
--     Potencial exige a aprovação do gestor na MESMA versão) — inalterado;
--   • NENHUM `UPDATE`/`SELECT` irrestrito é concedido a `gestor`: o acesso
--     continua pela RPC (`SECURITY DEFINER`), com `revoke update` mantido em
--     `feedbacks_360` desde a migration anterior.
-- ============================================================================

begin;

-- ── Guarda de dependências: falha alto em vez de autorizar errado ───────────
do $$
begin
  if to_regprocedure('public.pode_gerir_avaliacoes()') is null then
    raise exception
      'pode_gerir_avaliacoes() ausente: aplique 20261015090000_ninebox_finalizacao_e_potencial.sql antes desta migration.';
  end if;
  if to_regprocedure('public.pode_aprovar_colaborador(uuid)') is null then
    raise exception
      'pode_aprovar_colaborador(uuid) ausente: aplique 20261017090000_ninebox_aprovacao_gestor.sql antes desta migration.';
  end if;
end $$;

-- ── RPC reescrita (mesma assinatura/retorno da versão anterior) ─────────────
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
  v_versao       text;
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

  -- ── AUTORIZAÇÃO POR AÇÃO (antes da chave de idempotência) ─────────────────
  -- O REENVIO É UM CAMINHO DE LEITURA (devolve o resultado gravado), então a
  -- chave só pode ser consultada DEPOIS de papel/vínculo e tenant — senão a
  -- idempotência vira porta lateral entre tenants.
  if p_acao = 'concluir' then
    -- CONCLUSÃO = GESTOR RESPONSÁVEL: papel REAL `gestor` (user_roles) E vínculo
    -- na MESMA empresa (`supervisor_id` ou o próprio avaliado). Cobre os itens
    -- 4.1–4.4: sem papel gestor, de outra empresa ou de outro responsável, a
    -- resposta é a mesma recusa.
    if not public.pode_aprovar_colaborador(v_linha.avaliado_id) then
      raise exception 'perfil_nao_autorizado';
    end if;
  else
    -- Cancelar/reabrir seguem administrativos (admin/rh) — a conclusão NÃO.
    if not public.pode_gerir_avaliacoes() then
      raise exception 'perfil_nao_autorizado';
    end if;
  end if;

  -- ── IDEMPOTÊNCIA (somente depois da autorização e do tenant) ──────────────
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

  -- ── MÁQUINA DE ESTADOS (§9) — inalterada ─────────────────────────────────
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

  -- ── CONCLUIR: as MESMAS condições obrigatórias por categoria (§6.1) ──────
  if p_acao = 'concluir' then
    if coalesce(lower(btrim(v_linha.tipo)), '') not in ('gestor','par','auto','subordinado') then
      raise exception 'categoria_invalida';
    end if;
    if v_linha.avaliado_id is null then
      raise exception 'avaliado_ausente';
    end if;
    if v_linha.avaliador_id is null then
      raise exception 'avaliador_ausente';
    end if;
    if v_linha.ciclo_id is null then
      raise exception 'ciclo_ausente';
    end if;

    v_nota := coalesce(v_linha.performance, v_linha.nota_geral);
    if v_nota is null then
      raise exception 'dados_incompletos';
    end if;
    if v_nota < 1 or v_nota > 5 then
      raise exception 'nota_desempenho_fora_da_escala';
    end if;

    if v_linha.potencial is not null and (v_linha.potencial < 1 or v_linha.potencial > 5) then
      raise exception 'potencial_fora_da_escala';
    end if;

    -- Potencial é campo da avaliação do GESTOR (100% do eixo do Nine-Box).
    if lower(btrim(v_linha.tipo)) = 'gestor' and v_linha.potencial is null then
      raise exception 'potencial_obrigatorio_para_gestor';
    end if;
  end if;

  -- A REVISÃO é incrementada pelo trigger `trg_feedbacks_360_revisao` — a RPC
  -- NÃO a incrementa à mão. O `returning` devolve o número novo já gravado.
  update public.feedbacks_360
     set status = v_novo,
         updated_at = now()
   where id = p_feedback_id
  returning revisao into v_revisao;

  -- VERSÃO canônica do registro JÁ concluído (`id|revisao|updated_at|potencial|status`).
  -- Vai para a trilha e para o resultado: é a MESMA string que a validação do
  -- Potencial e a aprovação do gestor usam para invalidar-se quando algo muda.
  v_versao := public.versao_avaliacao_feedback(p_feedback_id);

  -- ── AUDITORIA: identidade + data + versão (item 4.5) ─────────────────────
  insert into public.audit_log (
    empresa_id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    v_linha.empresa_id,
    'feedbacks_360', p_feedback_id, 'UPDATE',
    jsonb_build_object('status', v_linha.status, 'revisao', v_linha.revisao),
    jsonb_build_object(
      'empresa_id', v_linha.empresa_id,
      'status', v_novo,
      'revisao', v_revisao,
      'versao_avaliacao', v_versao,
      'acao', p_acao,
      'via', case when p_acao = 'concluir' then 'gestor_responsavel' else 'admin_rh' end
    ),
    array['status', 'revisao', 'versao_avaliacao'], v_uid, v_email
  ) returning id into v_auditoria_id;

  v_resultado := jsonb_build_object(
    'ok', true,
    'status_anterior', v_linha.status,
    'status_novo', v_novo,
    'revisao_nova', v_revisao,
    'versao_avaliacao', v_versao,
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

-- Mesma exposição de antes: `authenticated` chama, `anon`/`public` não.
-- A autoridade do QUE cada papel pode fazer está DENTRO da função (por ação).
revoke all on function public.finalizar_feedback(uuid, text, text, text) from public, anon;
grant execute on function public.finalizar_feedback(uuid, text, text, text) to authenticated;

-- NADA de UPDATE/SELECT irrestrito para `gestor`: o caminho continua sendo a RPC
-- (SECURITY DEFINER). As revogações da migration anterior seguem valendo; estas
-- linhas apenas reafirmam a intenção caso alguém tente reintroduzir o privilégio.
revoke update on public.feedbacks_360 from authenticated;
revoke update on public.feedbacks_360 from anon;
revoke insert on public.feedbacks_360 from anon;
revoke delete on public.feedbacks_360 from authenticated, anon;

commit;
