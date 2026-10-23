# `training-image-dispatch`

Worker da **fila automática** de capas. Não é chamado pelo navegador.

## Como o trabalho chega aqui

1. `catalogo_cursos` / `trilhas_aprendizado` recebem um `AFTER INSERT` trigger.
2. Se `training_image_settings.autoqueue_enabled = true`, o trigger grava uma
   linha em `training_image_requests` (`queued`). Caso contrário, não faz nada.
3. Este worker reivindica o lote com `FOR UPDATE SKIP LOCKED` e executa o
   pipeline existente (`gerarCapaDeTreinamento` → `claim_training_image`).

O trigger **nunca bloqueia o cadastro**: erro na fila vira `WARNING`.

## Requisição

```http
POST /functions/v1/training-image-dispatch
X-Cron-Secret: <TRAINING_IMAGE_DISPATCH_SECRET>
```

Alternativa para operação manual: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.
Comparações usam HMAC (tempo constante). Sem credencial: `401 NAO_AUTORIZADO`.

## Variáveis de ambiente (servidor)

| Variável | Padrão | Efeito |
|---|---|---|
| `TRAINING_IMAGE_DISPATCH_SECRET` | — | Segredo do agendador (recomendado). |
| `TRAINING_IMAGE_AUTOQUEUE_ENABLED` | `false` | Precisa ser `"true"`. |
| `TRAINING_IMAGE_GENERATION_ENABLED` | `false` | Precisa ser `"true"` (mesma flag da geração manual). |
| `OPENAI_API_KEY` | — | Sem chave ⇒ `503`, fila intacta. |
| `TRAINING_IMAGE_DISPATCH_BATCH` | `2` | Itens por execução (1–20 no SQL). Lote pequeno respeita o wall clock da função. |
| `TRAINING_IMAGE_MODEL/SIZE/QUALITY/TIMEOUT_MS` | iguais à geração manual | — |

> Com qualquer flag desligada, a resposta é `503` **antes** de reivindicar a
> fila: nenhum trabalho é perdido e nenhuma cobrança acontece.

## Fluxo por item

1. `training_image_requests` é reivindicada com `FOR UPDATE SKIP LOCKED`
   (recuperação de `processing` > 30 min, máx. 5 tentativas).
2. **Idempotência** (`consultarEstadoDaCapa`, a mesma da geração manual):
   capa concluída, trabalho em andamento, falha definitiva ou resultado
   desconhecido ⇒ fecha como `skipped`, sem quota e sem provedor.
3. **Recuperação segura:** item com `attempts > 1` e linha de imagem
   `pending/processing` pode ter chamado o provedor na tentativa anterior. Nesse
   caso marca `resultado_desconhecido: recuperacao_apos_interrupcao` e fecha como
   `skipped` — **nunca** repete a chamada paga.
4. **Quota** (`edge_rate_limit_check_dual`, o mesmo RPC da geração manual):
   - empresa sempre (20/h padrão);
   - usuário quando `requested_by` foi registrado no cadastro (5/h padrão).
   Sem usuário confiável, aplica **somente** o teto da empresa (não inventa
   identidade). Quota esgotada ⇒ `queued` com adiamento de 5 min.
5. Executa o pipeline, valida bytes, sobe no bucket e fecha `done/skipped/failed`.

## Backfill (Risco A)

Conteúdo salvo com a fila desligada (o trigger não enfileira por design) não é
perdido: `public.backfill_training_image_requests(limite)` enfileira, de forma
idempotente, tudo que não tem capa nem solicitação. Exclusivo do backend.


| Status | Situação |
|---|---|
| `200` | `{ ok: true, processados, resultados[] }` |
| `401` | sem `X-Cron-Secret`/service role válido |
| `405` | método diferente de `POST` |
| `503` | `autoqueue_desativado`, `geracao_desativada` ou `chave_ausente` |
| `500` | falha interna (sem chave/segredo na resposta) |

Cada item termina em `done`, `skipped` (já processado/em andamento/provedor
desligado/limite/incerteza) ou `failed`. Requisição já fechada não volta para a
fila: **não há loop de retentativas**.

## Ativação (somente após autorização)

1. Aplicar as migrations em homologação.
2. `supabase secrets set TRAINING_IMAGE_DISPATCH_SECRET=...`
3. `supabase secrets set TRAINING_IMAGE_AUTOQUEUE_ENABLED=true`
4. `supabase secrets set TRAINING_IMAGE_GENERATION_ENABLED=true OPENAI_API_KEY=...`
5. `SELECT public.set_training_image_autoqueue(true);`
6. Agendar o worker (pg_cron + pg_net ou scheduler externo) — modelo no fim de
   `supabase/migrations/20261023130000_training_image_autoqueue.sql`.
7. Autorizar **uma** geração real e conferir o bucket/consumo.

## Reconciliação de resultado desconhecido

Timeout/rede/5xx não são reenviados automaticamente. Para liberar uma linha:

```sql
SELECT public.reconcile_training_image(
  '<empresa_id>', 'course', '<content_id>',
  'confirmar_nao_gerado',          -- ou 'manter_bloqueado'
  '<operador>',
  '<notas com operation_id + conferência no painel OpenAI>'
);
```

A função exige operador, notas e que a linha esteja em `resultado_desconhecido`.
Ela **não** permite zerar `attempts` de um estado conhecido.
