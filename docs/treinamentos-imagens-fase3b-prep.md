# Fase 3B — preparação final (relatório)

Status: **infraestrutura pronta para homologação**, ainda **DESLIGADA**.
Nenhuma chamada à OpenAI, nenhuma chave configurada, nenhum projeto Supabase
criado, nenhuma migration remota, nenhum deploy.

---

## 1. Correções realizadas

| # | Achado | Correção |
|---|---|---|
| 1 | Worker **não aplicava quota** (só a geração manual) | worker usa o MESMO `edge_rate_limit_check_dual` por item |
| 2 | Fila não registrava o responsável | `requested_by` preenchido por `auth.uid()` no trigger (NULL quando não há JWT — nunca inventado) |
| 3 | Quota esgotada no worker não tinha tratamento | item volta para `queued` com `available_at` + 5 min (sem loop, sem provedor) |
| 4 | Recuperação de item travado podia repetir chamada paga | item `attempts > 1` com imagem `pending/processing` vira `resultado_desconhecido` e é encerrado como `skipped` |
| 5 | Janela de recuperação curta (10 min) | fila: **30 min** (>> wall clock 400 s + timeout 90 s); claim da imagem: 30 min no worker |
| 6 | Conteúdo criado com a fila desligada ficava sem capa | `backfill_training_image_requests(limite)` idempotente (curso + trilha, só sem capa e sem solicitação) |
| 7 | Lógica de idempotência duplicada entre funções | `estadoCapa.ts` compartilhado (`consultarEstadoDaCapa`) |
| 8 | Constantes de quota duplicadas | `quotas.ts` compartilhado (20/h empresa, 5/h usuário, janela, stale) |
| 9 | RPC duplo exigia usuário | modo **empresa-only** (usuário opcional), sem identidade fictícia |
| 10 | Agendamento inexistente | scripts pg_cron/pg_net + Vault preparados (não executados) |
| 11 | Sem roteiro de homologação sem Docker | `scripts/training-images-homolog/homolog.mjs` + spec Playwright + procedimento |

---

## 2. Contratos e migrations (consistência)

| Contrato | Migration/tabela | Situação |
|---|---|---|
| `training-image-generate` → `training_images` + `claim_training_image` | `20261023120000` | consistente |
| `training-image-dispatch` → `training_image_requests` | `20261023130000` | consistente (`requested_by`, `available_at`, retry, backfill) |
| Quota dupla (manual + worker) | `20261023140000` | consistente (usuário opcional) |
| `reconcile_training_image` | `20261023120000` | consistente (operador/notas/estado) |
| Colunas usadas pelas funções (`operation_id`, `generations`, `failures`, `unknown_outcomes`) | `20261023120000` | consistentes |

Detalhe: `training_image_requests.attempts` conta **tentativas de processamento da fila**
(máx. 5); `training_images.attempts` conta tentativas da **versão atual** do conteúdo
(máx. 3, reinicia quando o hash muda). São conceitos diferentes e documentados.

---

## 3. Worker

- Fonte da verdade: `training_image_requests` (persistente).
- Reivindicação: `FOR UPDATE SKIP LOCKED`, lote 2, recuperação > 30 min.
- Ordem por item: idempotência → recuperação segura → quota → pipeline → `done/skipped/failed`.
- Flags: `TRAINING_IMAGE_AUTOQUEUE_ENABLED` + `TRAINING_IMAGE_GENERATION_ENABLED`
  + `OPENAI_API_KEY`; qualquer ausência ⇒ `503` **antes** de reivindicar.
- Agendamento: `scripts/training-images-homolog/scheduler-enable.sql`
  (pg_cron `*/2 * * * *` → `net.http_post` com `X-Cron-Secret` do Vault).
  **Não executado.**

---

## 4. Quotas verificadas

| Verificação | Resultado |
|---|---|
| Teto por empresa (20/h) | aplicado no RPC duplo |
| Teto por usuário (5/h) | aplicado quando há `requested_by` |
| Worker sem usuário | somente empresa; `p_usuario_key = NULL`, `p_usuario_limit = 0` |
| Duplicata | resolvida antes da quota (não consome) |
| Empresas distintas | baldes independentes (teste SQL) |
| Concorrência | 2 sessões, limite 1 → exatamente 1 permitida |
| Worker | 1 consumo + 1 claim por item; quota esgotada não chama provedor |
| Persistência entre instâncias | tabela `rate_limits` + advisory lock |


---

## 5. Risco A — perda de trabalho (trigger)

- O trigger **não bloqueia** o cadastro; falha vira `WARNING`.
- Conteúdos criados com a fila desligada (ou em falha do trigger) são detectados por
  consulta de lacunas (documentada) e recuperados por
  `backfill_training_image_requests(limite)` — idempotente, cobre curso e trilha,
  ignora quem já tem capa ou solicitação.
- Fechar a página/reabrir o card não cria nova solicitação (só `AFTER INSERT`).

## 6. Risco B — cobrança duplicada

- Timeout/rede/5xx/download ⇒ `resultado_desconhecido`, tentativas esgotadas, sem retry.
- Recuperação após interrupção ⇒ marcada como desconhecida, sem nova chamada paga.
- Retentativas pagas: limitadas (imagem 3/versão; fila 5) e nunca automáticas em incerteza.
- Reconciliação manual obrigatória (operador + notas + `operation_id`).

---

## 7. Testes executados

| Suíte | Resultado |
|---|---|
| Vitest (imagens + componentes + serviço) | **330 testes / 22 arquivos PASS** |
| PostgreSQL local: migrations + RLS + claim + contadores + reconciliação | PASS |
| Fila: trigger, `requested_by`, unicidade, claim, finish, retry, backfill, RLS | 14 cenários PASS |
| Rate limit (simples + duplo + empresa-only) | 11 cenários PASS |
| Concorrência S1–S6 (claim, worker, fila, quotas) | PASS |
| Pipeline + provedor simulado + fila + trilha + backfill | **50 verificações PASS** |
| HTTP Edge Functions no runtime Deno | **71 verificações PASS** |
| `deno check` (funções + shared + script) | OK |
| `typecheck:e2e` | OK |
| `npm run build` | OK |
| `tsc --noEmit` | 13 erros **pré-existentes** em módulos alheios; 0 nos arquivos desta fase |
| ESLint do arquivo alterado | 0 erros |

Não executados (dependem de autorização): Supabase real, Auth/Storage reais, URL
assinada real, card com dados reais, agendamento ativo, geração OpenAI.

---

## 8. Homologação isolada

Procedimento completo e custos:
[`docs/treinamentos-imagens-homologacao.md`](./treinamentos-imagens-homologacao.md).

Scripts (não executados): `scripts/training-images-homolog/`
(`homolog.mjs`, `scheduler-enable.sql`, `scheduler-disable.sql`, `scheduler-status.sql`).
Spec de interface: `e2e/authenticated/training-images-homolog.spec.ts` (gated).

---

## 9. Ações que exigem autorização

1. Criar o projeto Supabase de homologação.
2. `supabase link` + `db push` (migrations).
3. Publicar as Edge Functions.
4. Configurar segredos do worker e das contas de teste.
5. Criar segredos no Vault + executar o agendamento.
6. Ligar `autoqueue_enabled` / `TRAINING_IMAGE_AUTOQUEUE_ENABLED`.
7. Configurar `OPENAI_API_KEY` + `TRAINING_IMAGE_GENERATION_ENABLED=true`.
8. Executar **uma** geração real controlada.
9. Qualquer promoção para produção.
