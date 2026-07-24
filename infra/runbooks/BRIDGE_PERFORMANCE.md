# Runbook de Performance — External DB Bridge

## Gaps Identificados (10)

### 1. ⚠️ `any` casts bypass Zod
`data as any` em insert/upsert (linhas ~950-980). Zod valida o body mas o `data` escapa.

### 2. ⚠️ Rate limit IP spoofable
`cf-connecting-ip` / `x-real-ip` headers podem ser falsificados se o cliente
puder enviá-los diretamente. **Mitigação obrigatória em produção (P1-014)**:

1. **WAF/Proxy reverso obrigatório**: Cloudflare (ou AWS CloudFront, GCP Load
   Balancer) DEVE estar à frente do `external-db-bridge`. O proxy:
   - **Sobrescreve** `cf-connecting-ip` com o IP real do cliente (não
     confiar no header do cliente)
   - Adiciona `X-Forwarded-For` confiável
   - Bloqueia requisições que tentam forjar esses headers

2. **Cloudflare WAF rules** sugeridas:
   - Block: requisições com `cf-connecting-ip: 127.0.0.1` (loopback)
   - Block: ASN de países não permitidos (use `is_country_allowed`)
   - Rate limit por IP+UA combination (mitiga scrapers)

3. **Em dev/staging**: `cf-connecting-ip` pode ser falsificado sem
   consequência (rate limits mais permissivos). Em prod, **DEVE** passar
   por Cloudflare.

4. **Configurar `BRIDGE_TRUSTED_PROXY_HEADER`**: indica qual header
   confiar para IP real. Default: `cf-connecting-ip` (Cloudflare).

**Sem Cloudflare em prod, atacante pode**:
- Bypassar rate limit (enviar IP falso)
- Executar brute-force de tokens de admissão
- Esgotar connection pool com requests flood

### 3. ⚠️ ORDER BY sem validação regex
`body.order.column` é usado direto sem `isSafeColumnsExpr()`. PostgREST aceita `column.nullsfirst` syntax que pode conter injeção.

### 4. 📝 `single: true` não implementado
O schema aceita `single` mas o handler SELECT ignora. Adicionar `.single()` na query quando `body.single === true`.

### 5. 📝 `countMode: planned/estimated` inválidos
PostgREST só aceita `exact | planned | estimated`. O schema aceita `planned/estimated` mas são mapeados como undefined internamente.

### 6. 🔒 RPC error details no console
`console.error('[bridge] RPC_ERROR:', error.message)` — seguro (não expõe ao usuário), mas dificulta debug. Adicionar `error.details` e `error.hint`.

### 7. 🐌 Sem query timeout
Nenhum timeout de query configurado. Query lenta (>30s) pode travar conexão. Implementar `AbortController` com timeout.

### 8. 📦 Sem prepared statement caching
Cada query é montada do zero. PostgREST já otimiza, mas para consultas frequentes (tabelas fixas), cache de planos no app ajudaria.

### 9. 📊 Insert direto de erros na telemetria
Erros vão direto pra tabela `query_telemetry` (não passam pelo buffer). Em cenário de erro em massa, pode causar write storm.

### 10. 🗄️ Paginação offset-only
`range()` com offset crescente degrada em tabelas grandes (>100K). Implementar keyset pagination para relatórios pesados.

## Recomendações Imediatas

1. Adicionar `AbortSignal.timeout(30000)` no `externalClient` para timeout global
2. Validar `order.column` com `isSafeColumnsExpr()`
3. Adicionar `single` support no handler SELECT
4. Telemetry errors: bufferizar também erros com batch priorizado
5. Para queries >8s, logar `error.hint` e `error.details`

## Recomendações Médio Prazo

1. Cache de resultados para tabelas estáticas (tabelas salariais, feriados)
2. Keyset pagination via cursor (ex: `?cursor=id:12345`)
3. Read replicas para queries analíticas pesadas
4. Row-level security no banco externo como camada adicional

---
*Gerado em 23/07/2026 — Auditoria de Performance por Hermes Agent*
