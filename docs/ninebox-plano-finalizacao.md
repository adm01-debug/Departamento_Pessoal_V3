# Nine-Box — Plano de ativação segura da finalização de feedbacks

> Documento de **aprovação**. Nada aqui foi executado: nenhuma migration, RPC,
> alteração de RLS, escrita de dados, mudança de KPI ou de interface.

## 0. Estado atual (verificado por leitura de código e migrations)

| Fato | Evidência |
|---|---|
| Único ponto de escrita no app | `src/services/avaliacaoService.ts` — `criarFeedback` (INSERT) e `excluirFeedback` (DELETE). **Não existe `update` em `feedbacks_360`.** |
| `excluirFeedback` nunca é chamado | grep em `src/**`: só a definição no serviço |
| RLS | 4 policies (`select`/`insert`/`update`/`delete`) `TO authenticated USING empresa_id IN get_user_empresas(auth.uid())` |
| Escala no banco | `potencial` e `performance` são `INTEGER CHECK (1..5)` (migration `20260509124932`). **`nota_geral` é `NUMERIC` sem CHECK.** |
| Auditoria | `public.audit_log` existe e é **append-only** (trigger); **não há trigger** de auditoria em `feedbacks_360` |
| `vw_matriz_nine_box` | Redefinida em `20260802000000`: lê de **`public.avaliacoes`** (`performance_score`/`potencial_score`) com **4 quadrantes e corte em 4** — fonte **divergente** da tela. `avaliacoes`/`performance_score`/`potencial_score` **não constam nos tipos gerados** |
| Filtro de status | `STATUS_QUE_NAO_CONSOLIDAM = []`; o app grava sempre `pendente`; não há fluxo de finalização → ligar hoje esvaziaria a matriz (`mock-fb-11` prova: ciclo-3 cairia de 25 → 24) |

## 1. ETAPA 1 — validar a consolidação ✅ CONCLUÍDA (código interno + testes)

O pipeline agora tem **quatro etapas isoladas**, cada uma com função pura própria:

| # | Responsabilidade | Função / campo | Garantia |
|---|---|---|---|
| 1 | Identificação de suspeita | `marcarSuspeitas()` → `possivelDuplicata` | Primeira ocorrência **nunca** é sinalizada; não muta entrada |
| 2 | Rastreabilidade | `registrosSinalizados[]`, `motivoSinalizacao`, `chaveSuspeita` | Toda cópia permanece listada para revisão humana |
| 3 | Elegibilidade | `avaliacaoElegivel()` → `elegivel` | Depende **só** de escala 1–5, identidade e status autorizado. **Sinalização NÃO afeta.** |
| 4 | Seleção para consolidação | `selecionarRepresentante()` → `selecionadoId` | **Mais recente primeiro (regra aprovada)**; empate total → o não sinalizado; depois o mais antigo; depois id |

**Resposta direta à Etapa 1:** a regra de possíveis duplicatas **não descarta** nada e **não** rebaixa avaliação legítima. Prova em `NineBoxElegibilidade.test.tsx` (20 testes): cópia sinalizada continua `elegivel: true` e é contada em `quantidadeAvaliacoesValidas`; **duas avaliações legítimas do mesmo avaliador, com notas iguais e em momentos diferentes → a MAIS RECENTE representa** (a sinalização só decide em empate absoluto de tempo); se o original for inelegível, a cópia elegível assume (não se perde avaliação).

**Números:** 169/169 testes no escopo (8 arquivos) · `tsc` 0 erro em `avaliacao` · `eslint` limpo.

## 2. ETAPA 2 — fluxo de finalização (especificação; UI intacta)

| Ação | De → Para | Quem executa (proposta) | Pré-condições |
|---|---|---|---|
| **Concluir** | `pendente → concluido` | `admin_rh`, `gestor` (dono do ciclo), `avaliador` (autor do registro) | identidade, ciclo e **desempenho 1–5**; potencial é **aviso**, não bloqueio |
| **Cancelar** | `pendente → cancelado` | `admin_rh`, `gestor` | motivo com ≥ 3 caracteres; registro **não** é apagado |
| **Reabrir** | `concluido → pendente` / `cancelado → pendente` | **apenas `admin_rh`** | justificativa (proposta: obrigatória, ≥ 10 caracteres) |
| *(proibida)* | `concluido → cancelado` | — | exige reabrir antes, para não invalidar nota já aprovada |

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

| Consumidor | Operação | Impacto de revogar `UPDATE` direto |
|---|---|---|
| `avaliacaoService.listarFeedbacks` | SELECT | **nenhum** |
| `avaliacaoService.criarFeedback` | INSERT | nenhum (policy de INSERT mantida) |
| `avaliacaoService.excluirFeedback` | DELETE | nenhum (policy mantida; função não é chamada por nenhum componente) |
| `useDesenvolvimentoColaborador`, `useHistoricoColaborador`, `useRealtimeDashboard` | SELECT | nenhum |
| `vw_matriz_nine_box` | SELECT/**`security_invoker`** | nenhum — e hoje ela **não lê `feedbacks_360`** (lê `public.avaliacoes`) |
| Nenhum outro módulo/edge function escreve em `feedbacks_360` | — | nenhum (grep: só o serviço acima) |

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

| # | Caso exigido | Onde será provado |
|---|---|---|
| 1 | Usuário sem permissão | unit (`validarTransicao` + `montarOperacao`) ✅ já existe · integração: RPC (teste 1-2 da Etapa 4) |
| 2 | Avaliação incompleta | unit ✅ (`validarConclusao`: impedimentos vs. avisos) |
| 3 | Finalização válida | unit ✅ (`montarOperacao` → `para: 'concluido'` + auditoria) · integração: RPC |
| 4 | Cancelamento com motivo | unit ✅ · integração: RPC grava motivo no destino aprovado |
| 5 | Reabertura | unit ✅ (só `admin_rh`) |
| 6 | Concorrência entre atualizações | integração: 2 chamadas simultâneas → 1 sucesso (lock `for update`) |
| 7 | Idempotência | unit ✅ (chave por operação) · integração: mesma chave não duplica auditoria |
| 8 | Falha na auditoria | integração: `audit_log` bloqueado → transação inteira reverte (status não muda) |
| 9 | Isolamento por empresa | unit ✅ (`empresaId` filtra) · integração: RPC recusa outra empresa |
| 10 | Compatibilidade com avaliações antigas | unit ✅ (`nota_geral` sem `performance`; status legado) |

## 7. Decisões que dependem de aprovação

| # | Decisão | Impacto se não decidida |
|---|---|---|
| D1 | Papéis que podem **concluir** (incluir o próprio avaliador?) | `TRANSICOES` fica com a proposta atual |
| D2 | Reabertura exige justificativa? mínimo de caracteres? | aceita só `admin_rh` com motivo opcional |
| D3 | Texto do motivo do cancelamento: `comentarios` ou `dados_novos` da auditoria? | a RPC não saberá onde gravar |
| D4 | Histórico: opção (a), (b) ou (c) da Etapa 5 | filtro de status não pode ser ligado |
| D5 | Verificação de `public.avaliacoes` / `vw_matriz_nine_box` no banco alvo (existem? são usadas?) | risco de a view estar quebrada ou duplicar a fonte do Nine-Box |
| D6 | Auditoria da finalização via app (INSERT em `audit_log`) ou trigger de banco? | hoje não há trigger; proposta é gravar na RPC |
| D7 | Autorização da mudança de UI (ação de finalizar no Feedbacks/dossiê) | sem ela, o fluxo não chega ao usuário |
| D8 | Método de ponderação 360° (pesos de potencial) | `PESOS_POTENCIAL` permanece `null` |

## 9. Revisão de segurança da RPC (Prioridade 3) — achados e correções à proposta

| # | Requisito | Veredito | Achado / correção proposta |
|---|---|---|---|
| 1 | Autorização no banco | ✅ viável | Identidade só de `auth.uid()`; **nunca** de `p_*`. Papel lido de `user_roles`/`permissions`. |
| 2 | Isolamento por empresa | ✅ viável | Conferir `empresa_id in (select public.get_user_empresas(auth.uid()))` — **o mesmo helper das policies** de `feedbacks_360` (consistência). |
| 3 | Privilégios `SECURITY DEFINER` | ⚠️ corrigir proposta | A função roda como o **proprietário**; o owner **não pode ser superusuário** e o corpo deve acessar só o necessário. `revoke all ... from public, anon` + `grant execute to authenticated`. |
| 4 | `search_path` + referências qualificadas | ⚠️ reforçar | `set search_path = public, pg_temp` **e** qualificar tudo (`public.feedbacks_360`, `public.audit_log`, `public.feedbacks_360_operacoes`) — dupla proteção. |
| 5 | Concorrência | ✅ viável | `select ... for update` + tratar "linha inexistente". Duas chamadas simultâneas: a perdedora cai na validação de transição (status já mudou) e é recusada — sem *last write wins*. |
| 6 | Idempotência | ⚠️ corrigir proposta | **Falta o tratamento de `unique_violation`**: com `idempotency_key` como PK, duas execuções concorrentes com a MESMA chave disparam erro de unicidade. Corrigir com `insert ... on conflict (idempotency_key) do nothing` + re-`select` do `resultado` (devolve a resposta anterior, não erro). |
| 7 | Auditoria transacional | ⚠️ detalhe | `audit_log.acao` tem CHECK `('INSERT','UPDATE','DELETE')` → usar `'UPDATE'`; `registro_id uuid NOT NULL`; `campos_alterados` é `text[]`; preencher `user_id = auth.uid()` e `user_email` da sessão. |
| 8 | Rollback | ✅ viável | Falha de qualquer passo reverte tudo (função = uma transação). O *script* de rollback restaura `policy` + `grant update`; a tabela de operações **não** deve ser removida (histórico de idempotência). |
| 9 | Compatibilidade com RLS | ⚠️ **crítico** | Uma função `SECURITY DEFINER` **não passa por RLS** (executa como proprietário). Portanto **a checagem de tenant é obrigatória dentro da função** — não é redundante com a policy. Sem isso, a RPC viraria uma brecha entre empresas. |
| 10 | Impacto da revogação de UPDATE | ✅ verificado | Zero consumidores de UPDATE (inventário na Etapa 4). `SELECT`/`INSERT`/`DELETE` continuam com policy; `vw_matriz_nine_box` não depende de `feedbacks_360`. |

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

## 11. Arquivos necessários (quando aprovado)

**Já prontos (inertes):** `statusFeedback.ts`, `auditoriaFeedback.ts`, `nineBoxConsolidacao.ts` (pipeline 4 etapas), `nineBoxComum.ts`, testes do escopo.
**A criar na ativação:** `supabase/migrations/2026XXXX_finalizacao_feedbacks.sql` (+ rollback), `src/services/avaliacaoService.ts` (`finalizarFeedback` chamando a RPC), UI de finalização no Feedbacks/dossiê (com autorização), eventual trigger/`GRANT`.
