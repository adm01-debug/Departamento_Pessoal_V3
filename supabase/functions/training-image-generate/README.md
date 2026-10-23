# `training-image-generate`

Gera a capa de **um** curso ou trilha e grava no bucket privado `training-images`.

> **Fase 3A — geração REAL desativada.** Sem `TRAINING_IMAGE_GENERATION_ENABLED`
> e `OPENAI_API_KEY`, a função responde `503` **antes** de reivindicar qualquer
> trabalho: nenhum custo, nenhuma linha pendente. Nenhuma chave está configurada
> neste repositório.

## Requisição

```http
POST /functions/v1/training-image-generate
Authorization: Bearer <JWT do usuário>
Content-Type: application/json
X-CSRF-Token: <token>          # verifyCsrf (mesmo padrão das funções existentes)

{ "empresa_id": "<uuid>", "content_type": "course|learning_path", "content_id": "<uuid>" }
```

Turmas e certificados **não** são aceitos: herdam a capa do curso.

## Variáveis de ambiente (servidor)

| Variável | Padrão | Observação |
|---|---|---|
| `OPENAI_API_KEY` | — | Segredo (`supabase secrets set`). Nunca `VITE_*`. |
| `TRAINING_IMAGE_GENERATION_ENABLED` | `false` | Precisa ser `"true"` para qualquer geração. |
| `TRAINING_IMAGE_MODEL` | `gpt-image-2.5-flare` | Confirmar disponibilidade na ativação. |
| `TRAINING_IMAGE_SIZE` | `1536x864` | Allowlist: `1536x864`, `1536x1024`, `1024x1536`, `1024x1024`, `auto`. |
| `TRAINING_IMAGE_QUALITY` | `medium` | `low`/`medium`/`high`/`auto`. |
| `TRAINING_IMAGE_TIMEOUT_MS` | `90000` | Timeout da chamada. |
| `TRAINING_IMAGE_RATE_LIMIT` | `5` | Gerações por usuário por hora. |

## Segurança

1. `handlePreflight` + `verifyCsrf` + `Authorization` + `auth.getUser()`.
2. Corpo estrito, UUIDs validados, tipo restrito (`course`/`learning_path`).
3. Geração desligada / sem chave ⇒ `503` **sem** `claim_training_image`.
4. Vínculo real: `user_empresas` (user × empresa do body) — o UUID do cliente
   nunca é confiado.
5. Papel autorizado: `admin` ou `rh`.
6. Rate limit por usuário (proteção de custo).
7. Pipeline busca o cadastro **escopado pela empresa** e o `claim` revalida a
   posse no SQL (turma via curso, certificado via colaborador).
8. `claim_training_image` é atômico (`INSERT … ON CONFLICT … WHERE`): só um
   worker recebe `reclamado = true`.
9. Erros retornados sem chave, token, URL ou corpo cru da OpenAI.

## Respostas

| Status | Situação |
|---|---|
| `200` | `{ ok: true, status: "succeeded", storage_path, ... }` **ou** `{ ok: true, motivo: "ja_processado" }` |
| `202` | trabalho já em andamento (`em_processamento`) |
| `400/422` | corpo inválido |
| `401/403` | sem JWT, sem vínculo com a empresa ou sem papel autorizado |
| `404` | conteúdo inexistente **ou de outra empresa** (não distingue) |
| `409` | limite de tentativas atingido |
| `429` | rate limit do usuário |
| `502` | falha do provedor/upload/registro |
| `503` | integração desativada ou sem chave |

## Limites da plataforma (Supabase)

150 s (free) / 400 s (pago) de wall clock, CPU 2 s, idle 150 s. A geração + upload
cabe, mas **não** há garantia de execução infinita. Por isso o estado do trabalho
vive em `training_images` (fila), e `pending/processing` antigo é reivindicável
após `p_stale_after` (10 min). `EdgeRuntime.waitUntil` **não** é usado como
garantia de conclusão.

## Testes sem custo

O fluxo completo é exercitado com o provedor simulado
(`_shared/trainingImages/simulatedProvider.ts`), que devolve um PNG 1×1 local:

```bash
npx vitest run src/services/trainingImages/__tests__
```

Testes cobrem: autorização, isolamento por empresa, concorrência, idempotência,
limite de tentativas, falha de provedor, timeout, imagem inválida, excesso de
tamanho e ausência de chave. Nenhuma chamada real é feita.

## Ativação (Fase 3B — requer autorização)

1. Aplicar a migration `20261023120000_training_images_infrastructure.sql` em
   homologação.
2. `supabase secrets set OPENAI_API_KEY=... TRAINING_IMAGE_MODEL=...`
   (nunca em `.env` versionado).
3. `TRAINING_IMAGE_GENERATION_ENABLED=true` **somente** no ambiente de teste.
4. Rodar **uma** geração para um curso de teste e conferir o arquivo no bucket.
5. `VITE_TRAINING_IMAGES=true` para a UI ler a capa.
6. Ligar o disparo automático depois da validação manual.
