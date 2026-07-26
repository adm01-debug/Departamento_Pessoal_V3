# Monitoramento e Alertas de Performance

Este sistema utiliza tabelas internas e views para monitorar o desempenho das Edge Functions e da fila de processamento.

## Métricas Disponíveis

As métricas são armazenadas na tabela `public.metricas_processamento`.

### Prometheus Metrics (P3-058)

**Endpoint:** `GET /functions/v1/metrics`

Formato: Prometheus text exposition. Scrape a cada 30s.

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `departamento_pessoal_health_overall` | gauge | 1=healthy, 0=degraded |
| `departamento_pessoal_health_database` | gauge | 1=ok, 0=error |
| `departamento_pessoal_health_telemetry` | gauge | 1=ok, 0=error |
| `departamento_pessoal_health_total_latency_ms` | gauge | Latência do healthcheck |
| `departamento_pessoal_bridge_p95_latency_ms` | gauge | P95 de latência (última hora) |
| `departamento_pessoal_bridge_errors_total` | counter | Erros na última hora |
| `departamento_pessoal_bridge_slow_queries_total` | counter | Queries >5s na última hora |

**Alertas configurados em** `monitoring/alerts/bridge.yml`:

| Alerta | Condição | Severidade |
|--------|----------|------------|
| `BridgeHighLatencyP95` | P95 > 5s por 5min | warning |
| `BridgeCriticalLatencyP95` | P95 > 10s por 2min | critical |
| `BridgeDown` | health_overall = 0 por 1min | critical |
| `BridgeHighErrorRate` | taxa > 1% por 1min | warning |
| `BridgeCriticalErrorRate` | taxa > 5% por 30s | critical |
| `ManySlowQueries` | > 50 slow queries/h | warning |

**Configuração Prometheus** em `monitoring/prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'supabase-edge-functions'
    metrics_path: '/functions/v1/metrics'
    scrape_interval: 30s
    static_configs:
      - targets: ['<SUPABASE_REF>.supabase.co']
    scheme: https
```

### View de Alertas: `v_alertas_timeout`

Esta view destaca funções que estão operando próximo ao limite de 60 segundos do Supabase Edge Functions.

| Coluna | Descrição |
|--------|-----------|
| `funcao_nome` | Nome da função que disparou o alerta. |
| `ocorrencias` | Número de vezes que o tempo excedeu 55s. |
| `media_ms` | Tempo médio de execução. |
| `ultima_ocorrencia` | Timestamp do evento mais recente. |

## Como Configurar Alertas

A tabela `public.configuracoes_alertas` permite definir limites customizados.

Exemplo de configuração (via SQL):
```sql
INSERT INTO configuracoes_alertas (metrica, threshold, email_notificacao)
VALUES ('timeout', 55000, 'admin@exemplo.com');
```

## Monitoramento da Fila (PGMQ)

Para acompanhar a saúde da fila de limpeza LGPD (`lgpd_fila_limpeza`):

1. **Backlog:**
   ```sql
   SELECT count(*) FROM lgpd_fila_limpeza WHERE status = 'pending';
   ```
2. **Tempo Médio na Fila:**
   ```sql
   SELECT avg(updated_at - created_at) FROM lgpd_fila_limpeza WHERE status = 'completed';
   ```

## Boas Práticas

1. **Logging:** Sempre use `console.time()` e `console.timeEnd()` dentro das functions para logs detalhados.
2. **Retentativas:** Funções que falham por timeout devem ser idempotentes para permitir retentativas automáticas.
3. **Escalabilidade:** Se o backlog da fila crescer constantemente, considere aumentar o paralelismo ou otimizar a query principal.

## Retry Exponencial com Idempotência (P3-061)

**Implementação:** `src/lib/retry.ts`

Métodos `gerarGuias`, `processarPonto` e `calcularFerias` no `edgeFunctionsService` agora usam retry exponencial com idempotency key:

- Backoff: 500ms → 1s → 2s → 4s (max 4 tentativas)
- Jitter: ±20% para evitar thundering herd
- 429 Rate Limit: respeita header `Retry-After`
- 5xx: retry automático
- 4xx (não 429): falha imediata
- Idempotency key no body garante que retries não causam duplicação

```typescript
const result = await retryWithIdempotency({
  fn: () => edgeFunctionsService.calcularFolha({ empresaId, competencia }),
  idempotencyKey: `${empresaId}:${competencia}:${Date.now()}`,
  onRetry: (attempt, delay, error) => logger.warn('retry', { attempt, delay }),
});
```
