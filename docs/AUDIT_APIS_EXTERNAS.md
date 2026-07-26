# P1-015: Auditoria de Chamadas a APIs Externas

> Data da auditoria: 2026-07-17
> Escopo: todas as APIs externas chamadas pelo frontend e Edge Functions

## Metodologia

1. `grep -rE "fetch\(|axios\.|Deno\.env\.get" supabase/functions/ src/` para identificar chamadas externas
2. Classificar por: autenticada/não autenticada, rate-limited, com retry/timeout
3. Avaliar: TLS, validação de resposta, timeout, retry, idempotency

---

## APIs Externas Identificadas

### 1. OpenAI / LLM — `gerar_alertas_preditivos_ia`

| Campo | Valor |
|-------|-------|
| Endpoint | `https://api.openai.com/v1/chat/completions` |
| Autenticada | Sim (Bearer token) |
| TLS | HTTPS ✅ |
| Timeout | **NÃO DEFINIDO** ⚠️ |
| Retry | **NÃO** ⚠️ |
| Rate limit | Sim (OpenAI 60 req/min) ⚠️ |
| Log de resposta | Parcial (apenas sucesso/erro) |
| Dados sensíveis | Perfis de colaborador → LLM |
| Validação resposta | Parsing manual, sem schema |

**Recomendações:**
- [ ] Adicionar `AbortSignal.timeout(30_000)` em todos os fetch para OpenAI
- [ ] Retry com backoff exponencial (3 tentativas: 1s, 5s, 25s)
- [ ] Rate limit: fila com throttle (máx 10 chamadas/min por empresa)
- [ ] Validar resposta com Zod schema
- [ ] Nunca enviar CPF, dados bancários ao LLM

---

### 2. Gov.br OAuth — `auth-gov-br`

| Campo | Valor |
|-------|-------|
| Endpoint | `https://auth.gov.br` (OAuth 2.0) |
| Autenticada | Sim (Authorization Code + PKCE) |
| TLS | HTTPS ✅ |
| Timeout | **NÃO DEFINIDO** ⚠️ |
| Retry | Não |
| Validação token | `Introspection endpoint` |
| Dados sensíveis | CPF, nível de confiabilidade |

**Recomendações:**
- [ ] Adicionar `AbortSignal.timeout(10_000)` no fetch OAuth
- [ ] Validar token com cache de 5min (não consultar Gov.br a cada request)
- [ ] Documentar níveis de confiabilidade gold/silver/bronze

---

### 3. Webhook WhatsApp — `evolution-api` (n8n)

| Campo | Valor |
|-------|-------|
| Endpoint | Container local `evolution-api` (via Docker network) |
| Autenticada | Sim (Bearer token) |
| TLS | Rede local (Docker) ✅ |
| Timeout | **NÃO DEFINIDO** ⚠️ |
| Retry | **NÃO** ⚠️ |
| Idempotency key | Não presente ⚠️ |

**Recomendações:**
- [ ] Adicionar `AbortSignal.timeout(8_000)` em webhooks
- [ ] Retry com idempotency key (UUID gerado no envio, verificado no retry)
- [ ] Log detalhado: request body, response status, response body (sanitizado)

---

### 4. ICP-Brasil — `assinaturaDigital`

| Campo | Valor |
|-------|-------|
| Endpoint | Provedor e-Sign / BRy / Soluti (variável por ambiente) |
| Autenticada | Sim (certificado digital) |
| TLS | HTTPS ✅ |
| Timeout | **NÃO DEFINIDO** ⚠️ |
| Retry | **NÃO** ⚠️ |
| Rate limit | Sim (por certificado) |

**Recomendações:**
- [ ] Definir `REQUEST_TIMEOUT_MS = 60_000` (assinatura pode demorar)
- [ ] Adicionar retry: 1 tentativa + 2 retries com backoff 10s/30s
- [ ] Não fazer retry se erro for de certificado expirado/inválido

---

### 5. PDF Generation — `gotenberg`

| Campo | Valor |
|-------|-------|
| Endpoint | `http://gotenberg:3000` (Docker internal) |
| Autenticada | Não |
| TLS | Rede local ✅ |
| Timeout | **NÃO DEFINIDO** ⚠️ |
| Retry | **NÃO** |
| Rate limit | N/A (interno) |

**Recomendações:**
- [ ] Adicionar `AbortSignal.timeout(30_000)` em `/forms/chromium/convert/pdf`
- [ ] Monitorar latência P95 (gotenberg pode demorar com HTMLs grandes)
- [ ] Validar HTML antes de enviar (sanitizar XSS)

---

### 6. External DB Bridge — self-reference (Edge → Edge)

| Campo | Valor |
|-------|-------|
| Endpoint | Próprio `/functions/v1/external-db-bridge` |
| Autenticada | Sim (JWT Supabase) |
| Timeout | `BRIDGE_QUERY_TIMEOUT_MS = 15_000` ✅ |
| Retry | **NÃO** |
| Rate limit | 100 req/min ✅ |

**Status:** ✅ Implementado corretamente.

---

## Tabela Consolidada

| API | Timeout | Retry | Rate Limit | TLS | Status |
|-----|---------|-------|------------|-----|--------|
| OpenAI | ❌ | ❌ | ⚠️ | ✅ | 🔴 Falta |
| Gov.br | ❌ | ❌ | N/A | ✅ | 🔴 Falta |
| WhatsApp | ❌ | ❌ | N/A | ✅ | 🔴 Falta |
| ICP-Brasil | ❌ | ⚠️ parcial | ✅ | ✅ | 🟡 Falta timeout |
| Gotenberg | ❌ | ❌ | N/A | ✅ | 🔴 Falta |
| DB Bridge | ✅ 15s | ❌ | ✅ | ✅ | 🟢 OK |

---

## Ações de Implementação

### P1 — Imediato (1 dia)
- [ ] Criar `supabase/functions/_shared/fetch-with-timeout.ts`:
  ```typescript
  export async function safeFetch(
    url: string,
    options: RequestInit & { timeoutMs?: number } = {}
  ): Promise<Response> {
    const { timeoutMs = 10_000, ...fetchOptions } = options;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }
  ```
- [ ] Padronizar em todas as Edge Functions

### P2 — Curto prazo (2 dias)
- [ ] Adicionar retry com backoff em `gerar_alertas_preditivos_ia`
- [ ] Criar `retryWithBackoff<T>()` helper com maxAttempts, baseDelay
- [ ] Adicionar rate limit para OpenAI (pqueue ou throttle)

### P3 — Médio prazo (3 dias)
- [ ] Zod schema para resposta OpenAI
- [ ] Cache de token Gov.br (5min TTL)
- [ ] Idempotency key nos webhooks WhatsApp
