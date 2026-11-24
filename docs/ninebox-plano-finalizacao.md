# Nine-Box — Plano de ativação segura da finalização de feedbacks

> Documento de **aprovação**. Nada aqui foi executado: nenhuma migration, RPC,
> alteração de RLS, escrita de dados, mudança de KPI ou de interface.

## 0. Estado atual (verificado por leitura de código e migrations)

| Fato                              | Evidência                                                                                                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Único ponto de escrita no app     | `src/services/avaliacaoService.ts` — `criarFeedback` (INSERT) e `excluirFeedback` (DELETE). **Não existe `update` em `feedbacks_360`.**                                                                                                                      |
| `excluirFeedback` nunca é chamado | grep em `src/**`: só a definição no serviço                                                                                                                                                                                                                  |
| RLS                               | 4 policies (`select`/`insert`/`update`/`delete`) `TO authenticated USING empresa_id IN get_user_empresas(auth.uid())`                                                                                                                                        |
| Escala no banco                   | `potencial` e `performance` são `INTEGER CHECK (1..5)` (migration `20260509124932`). **`nota_geral` é `NUMERIC` sem CHECK.**                                                                                                                                 |
| Auditoria                         | `public.audit_log` existe e é **append-only** (trigger); **não há trigger** de auditoria em `feedbacks_360`                                                                                                                                                  |
| `vw_matriz_nine_box`              | Redefinida em `20260802000000`: lê de **`public.avaliacoes`** (`performance_score`/`potencial_score`) com **4 quadrantes e corte em 4** — fonte **divergente** da tela. `avaliacoes`/`performance_score`/`potencial_score` **não constam nos tipos gerados** |
| Filtro de status                  | `STATUS_QUE_NAO_CONSOLIDAM = []`; o app grava sempre `pendente`; não há fluxo de finalização → ligar hoje esvaziaria a matriz (`mock-fb-11` prova: ciclo-3 cairia de 25 → 24)                                                                                |

## 1. ETAPA 1 — validar a consolidação ✅ CONCLUÍDA (código interno + testes)

O pipeline agora tem **quatro etapas isoladas**, cada uma com função pura própria:

| #   | Responsabilidade          | Função / campo                                                 | Garantia                                                                                                     |
| --- | ------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Identificação de suspeita | `marcarSuspeitas()` → `possivelDuplicata`                      | Primeira ocorrência **nunca** é sinalizada; não muta entrada                                                 |
| 2   | Rastreabilidade           | `registrosSinalizados[]`, `motivoSinalizacao`, `chaveSuspeita` | Toda cópia permanece listada para revisão humana                                                             |
| 3   | Elegibilidade             | `avaliacaoElegivel()` → `elegivel`                             | Depende **só** de escala 1–5, identidade e status autorizado. **Sinalização NÃO afeta.**                     |
| 4   | Seleção para consolidação | `selecionarRepresentante()` → `selecionadoId`                  | **Mais recente primeiro (regra aprovada)**; empate total → o não sinalizado; depois o mais antigo; depois id |

**Resposta direta à Etapa 1:** a regra de possíveis duplicatas **não descarta** nada e **não** rebaixa avaliação legítima. Prova em `NineBoxElegibilidade.test.tsx` (20 testes): cópia sinalizada continua `elegivel: true` e é contada em `quantidadeAvaliacoesValidas`; **duas avaliações legítimas do mesmo avaliador, com notas iguais e em momentos diferentes → a MAIS RECENTE representa** (a sinalização só decide em empate absoluto de tempo); se o original for inelegível, a cópia elegível assume (não se perde avaliação).

**Números:** 169/169 testes no escopo (8 arquivos) · `tsc` 0 erro em `avaliacao` · `eslint` limpo.

## 2. ETAPA 2 — fluxo de finalização (especificação; UI intacta)

| Ação         | De → Para                                       | Quem executa (proposta)                                               | Pré-condições                                                               |
| ------------ | ----------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Concluir** | `pendente → concluido`                          | `admin_rh`, `gestor` (dono do ciclo), `avaliador` (autor do registro) | identidade, ciclo e **desempenho 1–5**; potencial é **aviso**, não bloqueio |
| **Cancelar** | `pendente → cancelado`                          | `admin_rh`, `gestor`                                                  | motivo com ≥ 3 caracteres; registro **não** é apagado                       |
| **Reabrir**  | `concluido → pendente` / `cancelado → pendente` | **apenas `admin_rh`**                                                 | justificativa (proposta: obrigatória, ≥ 10 caracteres)                      |
| _(proibida)_ | `concluido → cancelado`                         | —                                                                     | exige reabrir antes, para não invalidar nota já aprovada                    |

Já implementado em `statusFeedback.ts` (`TRANSICOES`, `validarTransicao`, `validarConclusao`, `validarCancelamento`, `montarOperacao`).
**Interface real: NÃO alterada.** Quando aprovado, a UI consumirá `validarTransicao(...).permitido` e `ROTULO_ACAO`.

## 3. ETAPA 3 — especificação da RPC `finalizar_feedback`

```sql
create or replace function public.finalizar_feedback(
  p_feedback_id  uuid,
  p_acao         text,          -- 'concluir' | 'cancelar' | 'reabrir'
  p_motivo       text default null,
  p_idempotencia text           -- chave POR OPERAÇÃO (não hash de conteúdo)
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$ ... $$;
```

**Checklist dos 9 requisitos:**

1. **Identidade no servidor** — usar `auth.uid()` (nunca parâmetro do cliente); se `null` → `raise exception 'nao_autenticado'`.
2. **Empresa e permissão reais** — conferir `empresa_id in (select public.get_user_empresas(auth.uid()))`; papel lido do banco (`user_roles`/`permissions`), não do frontend.
3. **Transição válida** — mesma tabela de `TRANSICOES` replicada em SQL (`case`), recusando `concluido→cancelado` e ação sobre status desconhecido.
4. **Concorrência** — `select ... from feedbacks_360 where id = p_feedback_id for update;`. A segunda chamada espera, relê o status já alterado e cai no passo 3 (idempotente por estado); nunca há "last write wins" silencioso.
5. **Transação única** — `update feedbacks_360 set status = ..., updated_at = now()` **e** `insert into audit_log (...)` na mesma função (falha de um ⇒ rollback de ambos).
6. **Idempotência por operação** — tabela `feedbacks_360_operacoes (idempotency_key text primary key, feedback_id uuid, operacao text, hash_parametros text, resultado jsonb, criada_em timestamptz)`. A chave entra no mesmo commit; repetição legítima devolve o `resultado` anterior sem reaplicar.
7. **Reuso da chave com parâmetros diferentes** — `hash_parametros = md5(p_feedback_id::text || p_acao || coalesce(p_motivo,''))`. Mesma chave + hash diferente ⇒ `raise exception 'idempotencia_conflito'`.
8. **`SECURITY DEFINER` seguro** — `set search_path = public, pg_temp`; corpo sem SQL dinâmico; acesso só às tabelas necessárias; função de propriedade de um papel administrativo.
9. **Ninguém chama direto** — `revoke all on function public.finalizar_feedback(uuid,text,text,text) from public, anon;` + `grant execute to authenticated;` **e** a validação de papel dentro da função; mais a revogação de `update` direto (Etapa 4).

**Escrita pelo app:** nenhuma. `montarOperacao()` monta o payload (`chaveIdempotencia`, `de/para`, `auditoria`) e o app faria **uma** chamada `rpc('finalizar_feedback', ...)`.
`MONITOR` — a RPC também recusa `p_acao` fora de `('concluir','cancelar','reabrir')` e `p_idempotencia` vazio.

## 4. ETAPA 4 — impacto nas políticas RLS (inventário antes de revogar)

| Consumidor                                                                         | Operação                      | Impacto de revogar `UPDATE` direto                                      |
| ---------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `avaliacaoService.listarFeedbacks`                                                 | SELECT                        | **nenhum**                                                              |
| `avaliacaoService.criarFeedback`                                                   | INSERT                        | nenhum (policy de INSERT mantida)                                       |
| `avaliacaoService.excluirFeedback`                                                 | DELETE                        | nenhum (policy mantida; função não é chamada por nenhum componente)     |
| `useDesenvolvimentoColaborador`, `useHistoricoColaborador`, `useRealtimeDashboard` | SELECT                        | nenhum                                                                  |
| `vw_matriz_nine_box`                                                               | SELECT/**`security_invoker`** | nenhum — e hoje ela **não lê `feedbacks_360`** (lê `public.avaliacoes`) |
| Nenhum outro módulo/edge function escreve em `feedbacks_360`                       | —                             | nenhum (grep: só o serviço acima)                                       |

**Proposta de migration (NÃO executada)** — `2026XXXX_finalizacao_feedbacks.sql`:

```sql
-- 1) tabela de operações (idempotência por operação)
create table if not exists public.feedbacks_360_operacoes (
  idempotency_key text primary key,
  feedback_id     uuid not null references public.feedbacks_360(id) on delete cascade,
  empresa_id      uuid not null,
  operacao        text not null check (operacao in ('concluir','cancelar','reabrir')),
  hash_parametros text not null,
  resultado       jsonb not null,
  criada_em       timestamptz not null default now()
);
alter table public.feedbacks_360_operacoes enable row level security;
-- somente leitura pela empresa; escrita apenas pela RPC (security definer)
create policy fbo_select on public.feedbacks_360_operacoes for select to authenticated
  using (empresa_id in (select public.get_user_empresas(auth.uid())));

-- 2) a RPC (corpo conforme Etapa 3)
-- 3) revogar UPDATE direto: o único caminho passa a ser a RPC
revoke update on public.feedbacks_360 from authenticated;
drop policy if exists "feedbacks_360_update" on public.feedbacks_360;
```

**Rollback** (script `2026XXXX_rollback_finalizacao_feedbacks.sql`, para uso imediato se algo falhar):

```sql
create policy "feedbacks_360_update" on public.feedbacks_360 for update to authenticated
  using (empresa_id in (select public.get_user_empresas(auth.uid())));
grant update on public.feedbacks_360 to authenticated;
drop function if exists public.finalizar_feedback(uuid,text,text,text);
-- a tabela de operações fica (histórico de idempotência); remover só se necessário:
-- drop table if exists public.feedbacks_360_operacoes;
```

**Testes de autorização (executar em homologação, com 2 empresas e 3 papéis):**

1. `authenticated` de outra empresa → `nao_autorizado` (e o registro não muda).
2. `authenticated` da empresa, papel comum → `perfil_nao_autorizado` em `reabrir`.
3. `admin_rh` da empresa → conclui com sucesso e gera **1** linha em `audit_log`.
4. `update` direto em `feedbacks_360` via PostgREST → **negado** após a migration.
5. Mesma `p_idempotencia` + mesmos parâmetros → resposta idêntica, **sem** segunda linha de auditoria.
6. Mesma `p_idempotencia` + `p_acao` diferente → `idempotencia_conflito`.
7. Duas chamadas simultâneas de `concluir` → 1 sucesso + 1 recusa por transição inválida (status já `concluido`).
8. `anon` chamando a RPC → negado (sem `grant execute`).

## 5. ETAPA 5 — integração com o Nine-Box (sem ativar nada agora)

**Como fica quando aprovado:** a etapa 3 do pipeline (`avaliacaoElegivel`) já aceita a lista de status por parâmetro — ligar a integração é **uma linha**: `STATUS_QUE_NAO_CONSOLIDAM = ['pendente','cancelado']` (ou o subconjunto aprovado). Nada mais muda: a matriz, os KPIs e os destaques continuam lendo a mesma base consolidada.

**Regras de ativação propostas (ordem segura):**

1. Fluxo de finalização em uso real e com auditoria validada.
2. Relatório (somente leitura) de "cobertura de status" por ciclo: quantos `pendente`, `concluido`, `cancelado`, `null/desconhecido`.
3. Ligar **`cancelado`** primeiro (hoje não existe em produção ⇒ impacto zero).
4. Ligar **`pendente`** só quando a cobertura de `concluido` estiver alta; caso contrário, a matriz encolhe de forma abrupta.

**Compatibilidade com históricos:** registros antigos podem ter `status` NULL ou texto legado. Três opções para decisão (nenhuma aplicada automaticamente):

- **(a)** tratar `status` desconhecido/NULL como **elegível** (preserva o passado; risco: avaliação não finalizada entra na matriz);
- **(b)** "período de graça" por data de corte — anterior ao corte = elegível; posterior = exige `concluido`;
- **(c)** tratar como **inelegível** (rigor máximo; exige migração/regularização dos históricos antes).

**Não faremos:** alteração automática de registros históricos · pesos 360° · mudança de KPI/layout.

## 6. ETAPA 6 — testes previstos (matriz)

| #   | Caso exigido                           | Onde será provado                                                                                  |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Usuário sem permissão                  | unit (`validarTransicao` + `montarOperacao`) ✅ já existe · integração: RPC (teste 1-2 da Etapa 4) |
| 2   | Avaliação incompleta                   | unit ✅ (`validarConclusao`: impedimentos vs. avisos)                                              |
| 3   | Finalização válida                     | unit ✅ (`montarOperacao` → `para: 'concluido'` + auditoria) · integração: RPC                     |
| 4   | Cancelamento com motivo                | unit ✅ · integração: RPC grava motivo no destino aprovado                                         |
| 5   | Reabertura                             | unit ✅ (só `admin_rh`)                                                                            |
| 6   | Concorrência entre atualizações        | integração: 2 chamadas simultâneas → 1 sucesso (lock `for update`)                                 |
| 7   | Idempotência                           | unit ✅ (chave por operação) · integração: mesma chave não duplica auditoria                       |
| 8   | Falha na auditoria                     | integração: `audit_log` bloqueado → transação inteira reverte (status não muda)                    |
| 9   | Isolamento por empresa                 | unit ✅ (`empresaId` filtra) · integração: RPC recusa outra empresa                                |
| 10  | Compatibilidade com avaliações antigas | unit ✅ (`nota_geral` sem `performance`; status legado)                                            |

## 7. Decisões que dependem de aprovação

| #   | Decisão                                                                                        | Impacto se não decidida                                        |
| --- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| D1  | Papéis que podem **concluir** (incluir o próprio avaliador?)                                   | `TRANSICOES` fica com a proposta atual                         |
| D2  | Reabertura exige justificativa? mínimo de caracteres?                                          | aceita só `admin_rh` com motivo opcional                       |
| D3  | Texto do motivo do cancelamento: `comentarios` ou `dados_novos` da auditoria?                  | a RPC não saberá onde gravar                                   |
| D4  | Histórico: opção (a), (b) ou (c) da Etapa 5                                                    | filtro de status não pode ser ligado                           |
| D5  | Verificação de `public.avaliacoes` / `vw_matriz_nine_box` no banco alvo (existem? são usadas?) | risco de a view estar quebrada ou duplicar a fonte do Nine-Box |
| D6  | Auditoria da finalização via app (INSERT em `audit_log`) ou trigger de banco?                  | hoje não há trigger; proposta é gravar na RPC                  |
| D7  | Autorização da mudança de UI (ação de finalizar no Feedbacks/dossiê)                           | sem ela, o fluxo não chega ao usuário                          |
| D8  | Método de ponderação 360° (pesos de potencial)                                                 | `PESOS_POTENCIAL` permanece `null`                             |

## 9. Revisão de segurança da RPC (Prioridade 3) — achados e correções à proposta

| #   | Requisito                                | Veredito             | Achado / correção proposta                                                                                                                                                                                                                                                                      |
| --- | ---------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Autorização no banco                     | ✅ viável            | Identidade só de `auth.uid()`; **nunca** de `p_*`. Papel lido de `user_roles`/`permissions`.                                                                                                                                                                                                    |
| 2   | Isolamento por empresa                   | ✅ viável            | Conferir `empresa_id in (select public.get_user_empresas(auth.uid()))` — **o mesmo helper das policies** de `feedbacks_360` (consistência).                                                                                                                                                     |
| 3   | Privilégios `SECURITY DEFINER`           | ⚠️ corrigir proposta | A função roda como o **proprietário**; o owner **não pode ser superusuário** e o corpo deve acessar só o necessário. `revoke all ... from public, anon` + `grant execute to authenticated`.                                                                                                     |
| 4   | `search_path` + referências qualificadas | ⚠️ reforçar          | `set search_path = public, pg_temp` **e** qualificar tudo (`public.feedbacks_360`, `public.audit_log`, `public.feedbacks_360_operacoes`) — dupla proteção.                                                                                                                                      |
| 5   | Concorrência                             | ✅ viável            | `select ... for update` + tratar "linha inexistente". Duas chamadas simultâneas: a perdedora cai na validação de transição (status já mudou) e é recusada — sem _last write wins_.                                                                                                              |
| 6   | Idempotência                             | ⚠️ corrigir proposta | **Falta o tratamento de `unique_violation`**: com `idempotency_key` como PK, duas execuções concorrentes com a MESMA chave disparam erro de unicidade. Corrigir com `insert ... on conflict (idempotency_key) do nothing` + re-`select` do `resultado` (devolve a resposta anterior, não erro). |
| 7   | Auditoria transacional                   | ⚠️ detalhe           | `audit_log.acao` tem CHECK `('INSERT','UPDATE','DELETE')` → usar `'UPDATE'`; `registro_id uuid NOT NULL`; `campos_alterados` é `text[]`; preencher `user_id = auth.uid()` e `user_email` da sessão.                                                                                             |
| 8   | Rollback                                 | ✅ viável            | Falha de qualquer passo reverte tudo (função = uma transação). O _script_ de rollback restaura `policy` + `grant update`; a tabela de operações **não** deve ser removida (histórico de idempotência).                                                                                          |
| 9   | Compatibilidade com RLS                  | ⚠️ **crítico**       | Uma função `SECURITY DEFINER` **não passa por RLS** (executa como proprietário). Portanto **a checagem de tenant é obrigatória dentro da função** — não é redundante com a policy. Sem isso, a RPC viraria uma brecha entre empresas.                                                           |
| 10  | Impacto da revogação de UPDATE           | ✅ verificado        | Zero consumidores de UPDATE (inventário na Etapa 4). `SELECT`/`INSERT`/`DELETE` continuam com policy; `vw_matriz_nine_box` não depende de `feedbacks_360`.                                                                                                                                      |

**Adições ao desenho da RPC (propostas):**

- `p_acao` validado contra lista fixa; `p_idempotencia` obrigatória e não vazia.
- `raise` com códigos estáveis (`nao_autenticado`, `nao_autorizado`, `perfil_nao_autorizado`, `transicao_invalida`, `idempotencia_conflito`, `dados_incompletos`) — sem vazar detalhe de linha/coluna.
- Retorno `jsonb` com `{ ok, status_anterior, status_novo, auditoria_id, idempotente }`.
- **Nada de `p_usuario`/`p_empresa` como parâmetro de confiança.**
- Testes de autorização em homologação com **2 empresas × 3 papéis** (lista da Etapa 4).

## 10. Correção aplicada nesta rodada (Prioridade 2)

A seleção do representante **violava a regra aprovada**: o sinalizador de suspeita era o primeiro critério, então uma reavaliação legítima mais recente podia ser preterida. Ordem corrigida:

1. **mais recente** (`atualizadoEm`) — regra aprovada, prevalece;
2. empate total de tempo → o não sinalizado;
3. o mais antigo (`criadoEm`);
4. `id` (determinístico).

Testes novos (`NineBoxElegibilidade.test.tsx`, total **20**): duas avaliações legítimas do mesmo avaliador, notas iguais, momentos diferentes → **a mais recente representa**, a antiga permanece rastreável em `registrosSinalizados`, e `quantidadeAvaliacoesValidas = 2` (nada descartado). **A estratégia ativa não foi alterada** (`mais_recente`) — o que mudou foi a seleção passar a obedecê-la.

## 12. VERSÃO FINAL — RPC, permissões e fluxo de finalização

> Ainda **não implantada**. Artefatos a criar somente após sua autorização.
> Correções da revisão já incorporadas: **checagem de tenant DENTRO da função**
> (SECURITY DEFINER não passa por RLS) e **tratamento de `unique_violation`**.

### 12.1 Função (corpo completo, pronto para a migration)

```sql
create or replace function public.finalizar_feedback(
  p_feedback_id  uuid,
  p_acao         text,
  p_motivo       text default null,
  p_idempotencia text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_email        text := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
  v_hash         text;
  v_linha        public.feedbacks_360%rowtype;
  v_novo         text;
  v_auditoria_id uuid;
  v_anterior     jsonb;
begin
  -- (1) identidade vem do servidor
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;

  -- (9) parâmetros mínimos
  if p_acao not in ('concluir','cancelar','reabrir') then
    raise exception 'acao_invalida';
  end if;
  if coalesce(btrim(p_idempotencia), '') = '' then
    raise exception 'idempotencia_ausente';
  end if;

  -- (6/7) idempotência: mesma chave + mesmos parâmetros devolve o resultado anterior
  v_hash := md5(p_feedback_id::text || '|' || p_acao || '|' || coalesce(p_motivo, ''));
  select resultado, hash_parametros into v_anterior, v_hash_confere
    from public.feedbacks_360_operacoes
   where idempotency_key = p_idempotencia;
  if found then
    if v_hash_confere <> v_hash then
      raise exception 'idempotencia_conflito';
    end if;
    return v_anterior || jsonb_build_object('idempotente', true);
  end if;

  -- (4) trava a linha ANTES de decidir (concorrência)
  select * into v_linha from public.feedbacks_360 where id = p_feedback_id for update;
  if not found then
    raise exception 'registro_inexistente';
  end if;

  -- (2) isolamento de empresa DENTRO da função (RLS não se aplica a SECURITY DEFINER)
  if v_linha.empresa_id is null
     or v_linha.empresa_id not in (select public.get_user_empresas(v_uid)) then
    raise exception 'nao_autorizado';
  end if;

  -- (3) transição válida (mesma tabela do app: TRANSICOES)
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

  -- (3b) reabrir é exclusivo de RH/admin
  if p_acao = 'reabrir' and not exists (
    select 1 from public.user_roles ur
     where ur.user_id = v_uid and ur.role::text in ('admin','hr','rh','admin_rh','gestor_rh')
  ) then
    raise exception 'perfil_nao_autorizado';
  end if;

  -- (3c) concluir exige o mínimo (potencial é aviso, não bloqueio)
  if p_acao = 'concluir' and coalesce(v_linha.performance, v_linha.nota_geral) is null then
    raise exception 'dados_incompletos';
  end if;
  if p_acao = 'cancelar' and coalesce(btrim(p_motivo), '') = '' then
    raise exception 'motivo_obrigatorio';
  end if;

  -- (5) atualização + auditoria na MESMA transação
  update public.feedbacks_360 set status = v_novo, updated_at = now() where id = p_feedback_id;

  insert into public.audit_log (
    tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email
  ) values (
    'feedbacks_360', p_feedback_id, 'UPDATE',
    jsonb_build_object('status', v_linha.status),
    jsonb_build_object('status', v_novo),
    array['status'], v_uid, v_email
  ) returning id into v_auditoria_id;

  v_anterior := jsonb_build_object(
    'ok', true, 'status_anterior', v_linha.status, 'status_novo', v_novo,
    'auditoria_id', v_auditoria_id, 'idempotente', false
  );

  -- (6) registra a operação (PK + ON CONFLICT: reenvio concorrente não duplica nem erra)
  insert into public.feedbacks_360_operacoes
    (idempotency_key, feedback_id, empresa_id, operacao, hash_parametros, resultado)
  values
    (p_idempotencia, p_feedback_id, v_linha.empresa_id, p_acao, v_hash, v_anterior)
  on conflict (idempotency_key) do nothing;

  return v_anterior;
end;
$$;
```

_(Na migration, `v_hash_confere` entra como segunda variável `text` no `declare`.)_

### 12.2 Permissões

```sql
revoke all on function public.finalizar_feedback(uuid, text, text, text) from public, anon;
grant execute on function public.finalizar_feedback(uuid, text, text, text) to authenticated;

-- o único caminho de escrita de status passa a ser a RPC
revoke update on public.feedbacks_360 from authenticated;
drop policy if exists "feedbacks_360_update" on public.feedbacks_360;

-- tabela de operações: leitura pela empresa; escrita só pelo owner da função
alter table public.feedbacks_360_operacoes enable row level security;
create policy fbo_select on public.feedbacks_360_operacoes for select to authenticated
  using (empresa_id in (select public.get_user_empresas(auth.uid())));
```

### 12.3 Fluxo de finalização (ponta a ponta)

```
UI (autorizada) → validarTransicao(status, ação, perfil)   [só UX; não autoriza]
                → montarOperacao(...)                      [idOperacao NOVO por operação]
                → rpc('finalizar_feedback', { p_feedback_id, p_acao, p_motivo, p_idempotencia })
                     └─ servidor: identidade → empresa → transição → papel
                        → UPDATE + audit_log + operação  (UMA transação)
                → retorno { ok, status_anterior, status_novo, auditoria_id, idempotente }
                → invalidar ['feedbacks_360'] (o Nine-Box se recompõe sozinho)
```

**Regra de ouro:** o app nunca atualiza `status` diretamente — só chama a RPC.

### 12.4 Ativação do filtro de status (depois do fluxo em produção)

1. Rodar `docs/ninebox-auditoria-banco.sql` e conferir a distribuição real de `status`.
2. Ligar primeiro `cancelado` (não existe em produção ⇒ impacto zero).
3. Ligar `pendente` quando a cobertura de `concluido` justificar — aplicando a decisão D4 (histórico).
4. Pesos 360° somente após aprovação da metodologia (D8).

### 12.5 Rollback (uma transação, ordem inversa)

```sql
create policy "feedbacks_360_update" on public.feedbacks_360 for update to authenticated
  using (empresa_id in (select public.get_user_empresas(auth.uid())));
grant update on public.feedbacks_360 to authenticated;
drop function if exists public.finalizar_feedback(uuid, text, text, text);
-- tabela de operações permanece (histórico de idempotência) — remover só se decidido
```

## 13. PROGRESSO DA IMPLEMENTAÇÃO OPERACIONAL (rodada atual)
| Fase  | Escopo                                                                                                                 | Estado                                                                                                                                   | Arquivos                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **A** | Baseline                                                                                                               | ✅ **210 testes** passando antes e depois (o relatório antigo citava 171 — o número real de hoje é 210)                                  | —                                                                                            |
| **B** | Motor 360° (pesos 60/25/10/5, redistribuição, gestor obrigatório, potencial do gestor + validação do RH, 9 quadrantes) | ✅ **implementado + 25 testes**                                                                                                          | `motorAvaliacao360.ts`, `__tests__/Motor360.test.tsx`                                        |
| **C** | Fluxo: reabertura com **justificativa obrigatória**, cancelamento com motivo, operação com auditoria + idempotência    | ✅ **implementado + 3 testes novos**                                                                                                     | `statusFeedback.ts`, `__tests__/StatusFeedback.test.tsx`                                     |
| **D** | Migrations, RPCs, idempotência, auditoria transacional, rollback                                                       | ✅ **preparadas, NÃO executadas**                                                                                                        | `supabase/migrations/20261101090000_ninebox_finalizacao_e_potencial.sql`, `..._rollback.sql` |
| **E** | Integração de interface (ações de feedback, validação de potencial, consolidação oficial na tela)                      | ⏸️ **bloqueada** — depende da migration aplicada + `supabase.rpc` disponível; exige mecanismo de ativação controlada (padrão desativado) | a definir                                                                                    |
| **F** | Homologação completa                                                                                                   | ⏸️ **bloqueada** — depende de E e de ambiente autorizado                                                                                 | —                                                                                            |

### O que a migration preparada entrega

1. `feedbacks_360_operacoes` — idempotência **por operação** (`on conflict do nothing` + rejeição de reuso com parâmetros diferentes via `hash_parametros`).
2. `feedbacks_360_validacoes_potencial` — validação do Potencial pelo RH, **imutável**, vinculada à **versão exata** da avaliação do gestor (formato: `id|updated_at|potencial|status`). Reabertura/edição do potencial invalidam automaticamente a aprovação anterior sem apagar histórico.
3. RPC `finalizar_feedback(uuid, text, text, text)` — concluir/cancelar/reabrir com: identidade do servidor, **checagem de tenant dentro da função** (SECURITY DEFINER não passa por RLS), transição validada em SQL, justificativa obrigatória na reabertura (≥10), motivo no cancelamento (≥3), `for update` (concorrência), UPDATE + `audit_log` + operação **na mesma transação**.
4. RPC `validar_potencial_avaliacao(uuid, text, text)` — **exclusiva de RH** (`user_roles`), só para avaliação do gestor concluída com potencial na escala; grava a versão + auditoria + idempotência.
5. `revoke update on feedbacks_360 from authenticated` + remoção da policy de UPDATE: o único caminho de escrita de status passa a ser a RPC.

### Pendências de banco/ativação (bloqueios reais)

- **Formato da versão da avaliação**: hoje o TS (`versaoDaAvaliacao`) monta `id|updatedAt|potencial|status` com o `updated_at` vindo do PostgREST; o SQL monta o mesmo formato com `to_char(...)`. Para não haver deriva de formato, o endurecimento proposto é uma **função/view que exponha a versão calculada no servidor** (nova migration → aprovação).
- **Papéis**: a RPC usa `public.user_roles.role in ('admin','hr','rh','admin_rh','gestor_rh')`. Precisa ser conferido contra o enum real de `app_role` no banco-alvo antes de aplicar.
- **Nomes de coluna**: a migration assume `feedbacks_360.performance`, `.nota_geral`, `.potencial`, `.tipo`, `.status`, `.updated_at` (confirmados no schema gerado) e as tabelas `audit_log`, `user_roles`, `get_user_empresas(uuid)` (todas já em uso pelas policies atuais).
- **Aplicação**: nenhuma migration foi executada; nenhuma RLS remota foi alterada; nenhum dado foi gravado.

**Já prontos (inertes):** `statusFeedback.ts`, `auditoriaFeedback.ts`, `nineBoxConsolidacao.ts` (pipeline 4 etapas), `nineBoxComum.ts`, testes do escopo.
**A criar na ativação:** `supabase/migrations/2026XXXX_finalizacao_feedbacks.sql` (+ rollback), `src/services/avaliacaoService.ts` (`finalizarFeedback` chamando a RPC), UI de finalização no Feedbacks/dossiê (com autorização), eventual trigger/`GRANT`.

---

## 14. RODADA ATUAL — BLOQUEIOS RESOLVIDOS + FASE E PREPARADA

### 14.1 Versão da avaliação: o BANCO é a autoridade ✅
- `public.versao_avaliacao_feedback(uuid)` (SQL, `STABLE`, `security invoker`) — **única** implementação do formato `id|updated_at(UTC)|potencial|status`.
- `public.vw_feedbacks_360_versao` (`security_invoker`) expõe `versao_avaliacao` para leitura pelo app.
- A RPC de validação **chama a função** (não recalcula) e grava a versão; `versao_indisponivel` se vazia.
- No TS, `versaoDaAvaliacao` (cálculo local) foi **removido**; ficou `CONTRATO_VERSAO_AVALIACAO` + `validacaoAplicavel` (só comparação). Testes cobrem mudança de nota, `updated_at`, **reabertura**, cancelamento, versão vazia e reaprovação idempotente.

### 14.2 Perfis confirmados (enum real `app_role`) ✅
`admin` (proprietário) · `gestor` · `rh` · `user` — fonte: `src/integrations/supabase/types.ts`.
- **Corrigido**: papéis inventados (`hr`, `admin_rh`, `gestor_rh`) foram removidos.
- Concluir/cancelar/reabrir: `admin` e `rh`. **Validar Potencial: apenas `rh`** (o `admin` não substitui).

### 14.3 Migrations revisadas ✅
| Item | Estado |
|---|---|
| Convenção de nome/data | renomeadas para `20261015090000…` / `…090001…` (após `20261005020000`, a última do repo) |
| Schema real | colunas de `feedbacks_360`, `audit_log`, `user_roles`, `get_user_empresas` confirmadas no schema gerado |
| `SECURITY DEFINER` | `search_path = public, pg_temp` + referências qualificadas + nota sobre o proprietário (não-superusuário) |
| Isolamento por empresa | checagem **dentro** de cada função (SECURITY DEFINER não passa por RLS) |
| Identidade | `auth.uid()`, nunca parâmetro |
| Permissões de execução | `revoke all … from public, anon` + `grant execute … to authenticated` **+ `grant select` nas duas tabelas de apoio** (faltava) |
| Concorrência | `select … for update` |
| Idempotência | chave por operação + `on conflict do nothing` + `hash_parametros` (conflito ⇒ erro) |
| Auditoria | `audit_log` na MESMA transação |
| Reversibilidade | rollback completo (policy + grant + drop das 2 RPCs, view e função) |
| Compatibilidade | INSERT/DELETE de `feedbacks_360` intactos; o app não tinha rotina de UPDATE |

### 14.4 Fase E — integração local preparada (DESLIGADA por padrão) ✅
- `nineBoxModo.ts` — `NINEBOX_MODO_REAL_ATIVO = false`; `exigirModoReal()` **lança** em vez de simular.
- `nineBox360.ts` — `consolidarNineBox360()` (feedbacks → categorias → motor) e `pontos360()` (adaptador para a forma que matriz/KPIs já consomem).
- `avaliacaoService` — `finalizarFeedback`, `validarPotencialAvaliacao`, `listarValidacoesPotencial`, `listarVersoesAvaliacao` (todas atrás do portão).
- **Elegibilidade por categoria corrigida**: Pares/Auto/Subordinados não exigem Potencial (§6.1) — bug encontrado pelos testes.
- **UI intocada**: nenhum componente visual alterado; a troca de fonte seria uma linha em `NineBoxTab` (§16) e **exige aprovação**.

## 16. CORREÇÕES DE SEGURANÇA R2/R3 — IMPLEMENTADAS (local, não aplicadas)

### 16.1 Matriz de autorização oficial (a que o banco passa a impor)

| Operação | RH (`rh`) | Proprietário (`admin`) | Demais (`gestor`, `user`) |
|---|---|---|---|
| Consultar avaliações | ✅ | ✅ | ❌ |
| **Criar** avaliações | ✅ (pode INSERT) | ✅ (pode INSERT) | ❌ (policy recusa) |
| Concluir / Cancelar / Reabrir | ✅ (via RPC) | ✅ (via RPC) | ❌ (RPC recusa) |
| **Validar Potencial** | ✅ | ❌ (não substitui o RH) | ❌ |
| **Excluir fisicamente** | ❌ | ❌ | ❌ (privilégio revogado) |
| **Esvaziar a tabela (`TRUNCATE`)** | ❌ | ❌ | ❌ (privilégio revogado de PUBLIC/`anon`/`authenticated` — §3b) |
| Alterar status direto (PATCH) | ❌ | ❌ | ❌ (só a RPC) |

### 16.2 O que a migration passou a fazer

1. **Helpers de papel** (`§0c`): `pode_gerir_avaliacoes()` (admin+rh) e `pode_validar_potencial()` (só rh), `SECURITY DEFINER` + `search_path` fixo — porque `user_roles` tem RLS própria. **Fonte única**: policies **e** RPCs usam os mesmos helpers.
2. **INSERT restrito (R3)**: `with check (pode_gerir_avaliacoes() and empresa_id is not null and empresa_id in (select get_user_empresas(auth.uid())))` — preserva `avaliacaoService.criarFeedback` (INSERT direto), agora com papel **e** empresa.
3. **DELETE bloqueado (R2)**: `revoke delete … from authenticated, anon` + `drop policy feedbacks_360_delete` → a exclusão física não pode mais substituir o cancelamento auditado.
4. **UPDATE direto revogado** (já existia): status só muda pela RPC.
5. **TRUNCATE revogado (§3b)**: `revoke truncate … from public, anon, authenticated` + verificação na própria migration (`has_table_privilege` para `anon`/`authenticated` e ACL cru para PUBLIC), que **falha** se o privilégio continuar efetivo por grant a PUBLIC ou por herança de papel. `TRUNCATE` não é escrita de registro: esvazia a tabela inteira, **sem RLS** e sem trilha — e nenhuma rotina do app (frontend, RPCs ou Edge Functions) trunca. `service_role` é mantido de propósito. Verificação pós-migration: `docs/ninebox-verificacao-truncate.sql` (`falhas = 0`).
6. **Trilha da criação**: continua sendo a tabela de auditoria (trigger/RPC). **Não** se promete atomicidade no frontend — se a criação precisar de trilha atômica, o caminho é uma RPC própria (não implementada, por decisão de escopo).

### 16.3 `avaliacaoService.excluirFeedback`

Sem consumidores na interface (verificado). Foi **mantido na assinatura** (para não quebrar imports) e passou a **falhar explicitamente** com `EXCLUSAO_FISICA_DESATIVADA`, orientando o cancelamento auditado. Teste atualizado em `src/services/__tests__/avaliacaoService.test.ts` (garante que o DELETE **não** é mais chamado).

### 16.4 Rollback separado (fora de `supabase/migrations/`)

| Arquivo | Reverte | Mantém |
|---|---|---|
| `…rollback-operacional.sql` | RPCs, view, função de versão | **Todo** o endurecimento (INSERT por papel, DELETE e UPDATE bloqueados, **TRUNCATE revogado**) |
| `…rollback-seguranca.sql` | O endurecimento (restaura permissões amplas) | **Nada** — · **desaconselhado**, exige decisão registrada. ⚠️ Exceção deliberada: **não** re-concede `TRUNCATE` (bloco final do arquivo). Mesmo restaurando INSERT/UPDATE/DELETE, o privilégio de esvaziar a tabela inteira permanece fechado — nenhum caminho autorizado depende dele e restaurá-lo só reabre o risco |

### 16.6 REVISÃO PRÉ-IMPLANTAÇÃO — CORREÇÕES APLICADAS (itens 1–7 da revisão)

Revisão direta do arquivo, com **verificador estrutural automatizado**
(`scripts/_tmp-migration-ninebox-check.mjs`, 43 verificações, 0 falhas):

| # | Defeito encontrado | Correção |
|---|---|---|
| 1 | `create policy fbo_select` / `fvp_select` era executado em **§0f, ANTES do `create table`** das tabelas auxiliares (§1/§2) ⇒ erro `relation does not exist` e a migration não aplicava | policies movidas para **imediatamente depois** do `create table` + `enable row level security` de cada tabela; ordem verificada por script |
| 2 | as mesmas duas policies eram **recriadas depois** com `empresa_id` apenas, **apagando o requisito de PAPEL** | uma única definição de cada policy, com **PAPEL (`pode_gerir_avaliacoes()`) + EMPRESA**; verificação de duplicidade por nome+tabela |
| 3 | `finalizar_feedback` lia e **retornava o resultado idempotente ANTES** de conferir papel e empresa (a função é `SECURITY DEFINER`) ⇒ reenvio com a chave devolvia `status_anterior`/`auditoria_id` de outro tenant | ordem corrigida nas **três RPCs**: autenticação → PAPEL → linha+trava → EMPRESA → idempotência; o reenvio passa a ser restrito por `empresa_id` **e** `feedback_id` |
| 4 | concluir só verificava que a nota **não estava vazia** (`coalesce(performance, nota_geral) is null`), e `nota_geral` é `NUMERIC` **sem CHECK** ⇒ concluía com nota 0/7/−3 | valida a nota de desempenho **na escala 1–5** (`nota_desempenho_fora_da_escala`) |
| 5 | versão canônica com precisão de **segundos**: `concluído → reaberto → concluído` no mesmo segundo produzia a MESMA versão ⇒ a validação anterior do RH continuava valendo | `to_char(..., 'YYYY-MM-DD"T"HH24:MI:SS.US')` (**microssegundos**); espelho documental em `CONTRATO_VERSAO_AVALIACAO` atualizado |
| 6 | hash de idempotência da criação **ignorava** `pontos_fortes`, `pontos_melhoria` e `comentarios` ⇒ reenvio com conteúdo diferente era aceito como "mesma operação" | hash cobre **todos** os parâmetros relevantes (textos normalizados uma vez e usados também no INSERT) |
| 7 | `avaliado_id`, `avaliador_id` e `ciclo_id` **não eram conferidos** contra a empresa autorizada ⇒ dava para gravar avaliação da empresa A apontando para colaborador/ciclo da empresa B | cada ID é conferido na tabela de origem (`colaboradores`, `ciclos_avaliacao`) contra `p_empresa_id`: `avaliado_fora_da_empresa`, `avaliador_fora_da_empresa`, `ciclo_fora_da_empresa` |

**Testes novos** em `docs/ninebox-testes-seguranca.sql`: casos **20–28** (reenvio
idempotente sem papel; nota fora da escala; reabertura invalidando a validação do
RH; **exigência de NOVA validação de Potencial após a reabertura**; `avaliado_id`
de outra empresa). Total do roteiro: **28 casos**.

### 16.7 REVISÃO FINAL DA MIGRATION — CORREÇÕES (4 pontos)

Revisão direta da versão de 863 linhas, com o verificador estrutural
(`scripts/_tmp-migration-ninebox-check.mjs`, **99 verificações, 0 falhas**):

| # | Defeito encontrado | Correção |
|---|---|---|
| 1 | As 3 RPCs gravavam em `audit_log` **sem vínculo explícito com a empresa**. Verificado o banco: a forma canônica de `audit_log` (a dos tipos gerados) **não tem coluna `empresa_id`** — a versão que a adiciona vem de um `CREATE TABLE IF NOT EXISTS` e é **inerte** se a tabela já existia. A leitura por empresa depende de `listar_auditoria(p_empresa_id)` | `empresa_id` EXPLÍCITO em `dados_novos` das 3 trilhas (§3/§4), à prova de esquema. Gate: **B10** (as 8 colunas que as RPCs gravam) e **A4** (tem `empresa_id`?) |
| 2 | `finalizar_feedback` conferia apenas a faixa da nota — **não** aplicava as condições obrigatórias por categoria, e o front **não** bloqueia "Concluir" por falta de nota (só por status/papel) | §3/§6.1: categoria ∈ 4 do 360° (`categoria_invalida`); nota 1–5 em **todas**; **Potencial 1–5 só para `gestor`** (`potencial_obrigatorio_para_gestor`). Pares/Auto/Subordinados seguem concluindo sem Potencial. Gate: **A5/A6** |
| 3 | A versão canônica dependia de `updated_at`. Como `now()` é **constante dentro da transação**, `concluir → reabrir → concluir` na MESMA transação repetia o timestamp (e a precisão de segundos colidia entre transações) ⇒ a aprovação anterior do RH **continuava valendo** | §0: coluna `feedbacks_360.revisao` (contador **monotônico**), incrementada a cada transição pela RPC e incluída na versão. Independe de relógio. Teste **27** prova com `updated_at` repetido |
| 4 | As FKs de `feedbacks_360_operacoes` e `feedbacks_360_validacoes_potencial` nasciam `ON DELETE CASCADE`: uma exclusão privilegiada apagaria **em cascata** o histórico de operações e as aprovações do RH | §1/§2: FK **recriada explicitamente** (`drop constraint if exists` + `add constraint`) com `ON DELETE RESTRICT` — a exclusão **falha** em vez de destruir prova. Rollbacks NÃO reabrem o CASCADE. Gate: **A7** |

**Testes novos** (roteiro de segurança, agora **28 casos**): **25** trilha com
`empresa_id`; **26** Potencial só para o gestor; **27** revisão invalidando dentro
da mesma transação; **28** exclusão bloqueada pela FK (probe como dono).

### 16.8 SEGUNDA REVISÃO — CORREÇÕES (4 pontos) · versão canônica revisada

Revisão da versão entregue, com o **verificador estrutural** (`scripts/_tmp-migration-ninebox-check.mjs`, agora **111 verificações, 0 falhas**) e o
roteiro de segurança atualizado. As quatro correções, em ordem:

| # | Defeito remanescente | Correção aplicada |
|---|---|---|
| 1 | As 3 RPCs gravavam a empresa **só** em `dados_novos.empresa_id`. A premissa de que `audit_log` **não tem** coluna `empresa_id` era **falsa**: `20260712214644` faz `ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS empresa_id` (não é `CREATE TABLE IF NOT EXISTS` inerte), e é essa coluna que a policy `audit_log_tenant_select` e a RPC `listar_auditoria` usam. Resultado: com a coluna NULA, o evento ficava **invisível** na Trilha da própria empresa (`rls_tenant_or_admin(NULL) = false`) | §0g: a migration **garante** a coluna (`ADD COLUMN IF NOT EXISTS`, aditiva) e as 3 RPCs passam a gravar **na COLUNA** (`v_linha.empresa_id` / `v_novo.empresa_id`), **mantendo** `dados_novos.empresa_id` como defesa em profundidade. Gate: **A4** (informativo) e **B10** (as 8 colunas pré-existentes; a 9ª é criada pela migration). Teste **25** confere a coluna **e** o JSON |
| 2 | `finalizar_feedback` aplicava as condições por categoria, mas não validava a **escala do Potencial** quando ele era informado por uma categoria que **não** o exige | §3: a escala 1–5 do Potencial passa a ser conferida **para qualquer categoria** quando o valor existe; a **obrigatoriedade** continua **exclusiva do `gestor`** (`potencial_obrigatorio_para_gestor`). Pares/Auto/Subordinados seguem concluindo sem Potencial. Teste **26** (gestor bloqueado, par permitido) |
| 3 | A revisão era incrementada **à mão** pela RPC — cobria a transição de status, mas **não** uma ALTERAÇÃO da avaliação por outro caminho (correção privilegiada de nota/potencial), que poderia não mudar a versão dentro da mesma transação | §0.1: **trigger** `trg_feedbacks_360_revisao` (`before update`) incrementa `revisao` a **cada UPDATE** — a RPC **não** incrementa mais (evita contagem dobrada) e apenas lê o valor via `returning`. A invalidação da validação do RH deixa de depender do **caminho** da escrita e do **relógio**. Teste **27** (duas transições ⇒ `revisao + 2`, `updated_at` repetido, versões distintas) |
| 4 | As FKs de `feedbacks_360_operacoes` e `feedbacks_360_validacoes_potencial` **nasciam** `ON DELETE CASCADE` e só depois eram trocadas para `RESTRICT` | §1/§2: as tabelas passam a nascer **JÁ** em `ON DELETE RESTRICT`; a recriação explícita (`drop constraint` + `add constraint`) permanece para o caso de a tabela **já existir** com o `CASCADE` antigo (`create table if not exists` é inerte). Uma exclusão privilegiada **falha** em vez de apagar histórico. Teste **28** (probe como dono) |

Rollbacks (`…rollback-operacional.sql` / `…rollback-seguranca.sql`) atualizados
com a nota de que o **trigger da revisão** e a **coluna `audit_log.empresa_id`**
permanecem (aditivos, sem privilégio novo) — revertê-los não faz parte de nenhum
rollback e reabriria o furo que a revisão fechou.

### 16.9 AJUSTE PONTUAL — mínimo de identificação/rastreabilidade na conclusão

Divergência **comprovada** entre o servidor e a regra existente:
`statusFeedback.validarConclusao` (fonte única já testada) bloqueia a conclusão
com `avaliado_ausente`, `avaliador_ausente` e `ciclo_ausente`, e o contrato do
formulário exige avaliado **e** avaliador (`podeSalvar = Boolean(avaliadoId &&
avaliadorId)`) — mas `finalizar_feedback` **não** checava esses vínculos.

Correção (§3, bloco **b**), sem criar regra nova: ao concluir, o servidor passa a
exigir `avaliado_id`, `avaliador_id` e `ciclo_id` presentes, com os **mesmos
códigos** de impedimento da camada pura (`avaliado_ausente`, `avaliador_ausente`,
`ciclo_ausente`). A ordem de checagem é categoria → identificação → nota →
potencial. Vale para a criação segura e para o INSERT direto temporário; a
existência dos vínculos continua garantida pelas FKs (por isso não se checa
"ciclo existente" além da presença). Teste **29** cobre os três impedimentos.



### 16.5 Pendências para aplicar em homologação

1. Responder **Q1–Q16** (novos: Q15/Q15b auto-leitura de `user_roles`, Q16 helpers inexistentes) e confirmar que `admin` = proprietário e `rh` = RH no banco real.
2. Aplicar a migration em ambiente isolado e executar o roteiro `docs/ninebox-homologacao.md` (§2 e **§2b**, 11 casos de escrita direta).
3. Decidir se a criação de avaliação passa a ter **trilha atômica via RPC** (hoje: trigger/RPC externa; nenhuma promessa de atomicidade no frontend).
4. Só então avaliar produção.


## 15. CONTROLES VISUAIS NECESSÁRIOS (PARA APROVAÇÃO — NADA IMPLEMENTADO)

O layout do Nine-Box permanece **congelado**: nenhum componente visual foi tocado.
Abaixo está **somente o mínimo indispensável** para operar as funcionalidades já
preparadas. Nada aqui foi implementado — depende da sua aprovação.

| # | Operação | Onde entra (componente existente) | Controle proposto | Mudança de layout? |
|---|---|---|---|---|
| 1 | **Concluir avaliação** | `FeedbacksTab` → item da lista / `FeedbackDetalheDialog` (já existe o botão "Ver detalhes") | Botão `Concluir` no rodapé do diálogo de detalhes, ao lado das ações atuais | **Não** — é uma linha de ações no rodapé do diálogo existente |
| 2 | **Cancelar com justificativa** | idem | Botão `Cancelar` + campo de motivo no mesmo diálogo (obrigatório, ≥3 caracteres) | **Não** (mesmo diálogo; campo reaproveita o padrão de formulário já usado) |
| 3 | **Reabrir com justificativa** | idem | Botão `Reabrir` (visível para `rh`/`admin`) + justificativa (≥10) | **Não** |
| 4 | **Validar Potencial (RH)** | idem (avaliação do **gestor**) + badge de estado | Botão `Validar potencial` (somente papel `rh`) | **Não** |
| 5 | **Estado real da avaliação** | `FeedbacksTab` (lista) e `FeedbackCard` | Selo de status já existente no módulo (`Pendente`/`Concluída`/`Cancelada`) + selo `Potencial validado` | **Não** — reaproveita o componente de badge já aplicado aos status |
| 6 | **Matriz a partir de `pontos360`** | `NineBoxTab` (ponto único de derivação) | Troca da fonte de `pontos` (hoje `derivarPontos`) por `pontos360(consolidarNineBox360(...))` **quando o modo real estiver ligado** | **Não** — mesma forma de dados; zero alteração visual |
| 7 | **KPIs e Insights** | `NineBoxTab` → `NineBoxKpis` / `NineBoxLateral` | Nada novo: continuam lendo a MESMA lista `pontos`, que passa a vir da consolidação oficial | **Não** |

**Regras que os controles devem respeitar quando aprovados:**
- sem modo real ligado (`NINEBOX_MODO_REAL_ATIVO = false`), os botões **não aparecem** (ou aparecem desabilitados com o motivo) — nunca simulam sucesso;
- ações já existentes (`Ver detalhes`, filtros, dossiê) são **reutilizadas**, sem duplicar lógica;
- nenhum card, cor, espaçamento ou animação do Nine-Box é alterado;
- o modo demonstração continua exatamente como está.

**Pendência de aprovação:** autorizar (a) a linha de ações no `FeedbackDetalheDialog` (itens 1–4), (b) os selos de estado (item 5) e (c) a troca de fonte no `NineBoxTab` (itens 6–7, invisível quando o modo real estiver desligado).

### 14.5 Procedimento de ativação (após aprovação)

1. Revisar e **aplicar** `20261015090000_ninebox_finalizacao_e_potencial.sql` em homologação.
2. Rodar os testes de autorização 1–8 (§12.3) e conferir 1 linha em `audit_log` por operação.
3. Ligar `NINEBOX_MODO_REAL_ATIVO = true` **apenas em homologação** e validar as telas.
4. Só então avaliar produção (com o rollback `…090001…` à mão).
