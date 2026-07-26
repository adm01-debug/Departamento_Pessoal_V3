# 📊 Monitoring & Observability — Departamento Pessoal v2

> **Última atualização:** 2026-07-25
> **Stack:** Prometheus + Grafana + Sentry + Edge Function Healthchecks

---

## 📐 Arquitetura de Observabilidade

```
┌──────────────┐    ┌──────────────────────────────────────────────┐
│   Browser     │───►│  external-db-bridge (Deno Edge Function)      │
│  (Sentry)    │    │  ├── Logs → JSON /structured (P3-063)         │
└──────────────┘    │  ├── Trace → trace_id em todas as queries     │
                    │  ├── Telemetry → query_telemetry table         │
                    │  └── Health → /functions/v1/healthcheck (P3-056)│
                    └────────────┬─────────────────────────────┘
                                 │ metrics (30s)
                                 ▼
                    ┌─────────────────────────────────────┐
                    │  Prometheus scrape targets:          │
                    │  /functions/v1/healthcheck           │
                    │  /functions/v1/metricas (P3-055)    │
                    │  postgres_exporter (Denylist: auth) │
                    │  node_exporter                       │
                    └──────────────────┬──────────────────┘
                                       │ dashboards
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  Grafana (dashboards P3-054)           │
                    │  • P50/P75/P95/P99 latency por hora   │
                    │  • Error rate 1h                       │
                    │  • Slow query count                   │
                    │  • eSocial processing health           │
                    └──────────────────────────────────────┘
```

---

## 🔍 Endpoints de Monitoramento

### `GET /functions/v1/healthcheck` (P3-056)
Verifica 3 serviços em paralelo:
1. **Banco de dados** — `SELECT 1` via Supabase
2. **Sistema de telemetria** — `query_telemetry` acessível
3. **External DB Bridge** — disponibilidade do gateway

Resposta:
```json
{
  "status": "ok",
  "timestamp": "2026-07-25T12:00:00Z",
  "services": {
    "database": { "ok": true, "latency_ms": 4 },
    "telemetry": { "ok": true, "latency_ms": 2 },
    "bridge": { "ok": true, "latency_ms": 18 }
  }
}
```

**Status codes:**
- `200` — todos os serviços OK
- `503` — um ou mais serviços degradeados (não bloqueia login, mas alerta oncall)

### `GET /functions/v1/metricas` (P3-055)
KPIs em tempo real para o dashboard DP:
```json
{
  "colaboradores": { "total": 142, "ativos": 138, "em_ferias": 3, "afastados": 1 },
  "folha": { "competencia": "2026-07", "total_bruto": 892450.00 },
  "bridge": { "p95_latency_ms": 245, "error_count_1h": 2 },
  "monitoring": { "success_rate_pct": 99.7 }
}
```
**Cache:** `Cache-Control: private, max-age=60` (polling-friendly)

---

## � Prometheus — Scrape Config

Arquivo: `monitoring/prometheus.yml`

### Jobs configurados

| Job | Target | Interval | Labels |
|-----|--------|----------|--------|
| `prometheus` | localhost:9090 | 30s | — |
| `node` | node-exporter:9100 | 30s | host metrics |
| `supabase-edge-functions` | `{ref}.supabase.co` | 30s | bridge metrics |
| `external-db-bridge` | `{ref}.supabase.co` | 30s | healthcheck JSON |
| `postgresql` | postgres-exporter:9187 | 30s | DB metrics |
| `nginx` | nginx-exporter:9113 | 30s | proxy metrics |

### Variáveis de ambiente necessárias

```bash
# .env (Edge Functions)
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
BRIDGE_QUERY_TIMEOUT_MS=15000        # P1-027

# Prometheus
METRICS_BEARER_TOKEN=<token_opcional> # Se bridge exigir auth
```

---

## 🚨 Alert Rules

Arquivo: `monitoring/alerts/*.yml`

### Alertas críticos

| Alerta | Condição | Severidade | Ação |
|--------|----------|------------|------|
| `BridgeDown` | healthcheck 3xx | critical | PagerDuty |
| `BridgeP95Latency` | p95 > 5s | warning | Slack |
| `BridgeErrorRate` | errors > 50/min | warning | Slack |
| `BruteForceDetected` | `v_login_anomalies` rows > 5 | critical | Bloquear IP + Slack |
| `DatabaseConnectionPoolExhausted` | `pg_stat_activity` > 80% | warning | Slack |
| `BackupFailed` | `audit_log.acao=BACKUP_RUN` fail | critical | PagerDuty |
| `EsocialProcessingStuck` | `metricas_processamento` sem updates em 4h | warning | Slack |

### Alertas operacionais (P3-057 brute-force)

```yaml
# monitoring/alerts/security.yml
groups:
  - name: security
    rules:
      - alert: BruteForceDetected
        expr: |
          sum by (ip_address) (
            increase(v_login_anomalies[5m])
          ) > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Brute-force detectado — IP {{ $labels.ip_address }}"
          runbook: "infra/runbooks/SECURITY.md"
```

---

## 📈 Dashboards Grafana

### Dashboard: Bridge Performance (P3-054)

Métricas calculadas na materialized view `mv_telemetry_dashboard`:

```sql
-- Agregações por hora (refresh automático via cron noturno)
SELECT
  date_trunc('hour', created_at) AS hour,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY duration_ms) AS p75,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99,
  count(*) FILTER (WHERE severity = 'error')  AS errors_1h,
  count(*) FILTER (WHERE duration_ms > 5000) AS slow_1h
FROM query_telemetry
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;
```

### Painéis recomendados

1. **Latência P50/P75/P95/P99** — linha temporal, 7 dias
2. **Error rate 1h** — gauge com threshold: verde <1%, amarelo 1-5%, vermelho >5%
3. **Slow query count** — heatmap por hora
4. **Throughput** — req/s por endpoint
5. **Top tables by latency** — tabela ordenável
6. **eSocial processing health** — taxa de sucesso (%)

---

## 🔗 Runbooks

| Runbook | Conteúdo |
|---------|----------|
| `infra/runbooks/BRIDGE_PERFORMANCE.md` | 10 gaps do bridge, rate limiting, gzip, pagination |
| `infra/runbooks/SECURITY.md` | Brute-force, IP blocking, resposta a incidentes |

---

## 📋 Health Check Contract

O healthcheck do bridge (`supabase/functions/healthcheck/index.ts`) segue este contrato:

```typescript
interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string; // ISO 8601
  version?: string;
  services: {
    database: { ok: boolean; latency_ms?: number; error?: string };
    telemetry: { ok: boolean; latency_ms?: number; error?: string };
    bridge: { ok: boolean; latency_ms?: number; error?: string };
  };
}
```

**Prometheus scrape** usa `json_exporter` ou parser custom para extrair `services.bridge.ok` como métrica binária `bridge_up`.

---

## 📊 SLIs e SLOs

| SLI | SLO | Como medir |
|-----|-----|------------|
| Disponibilidade | 99.9% | `healthcheck.status != 'down'` |
| Latência P95 | < 3s | `mv_telemetry_dashboard.p95_ms` |
| Taxa de erro | < 0.5% | `errors_1h / total_requests` |
| Tempo de recovery | < 15 min | Incidente → resolve |
| Backup integrity | 100% | `audit_log BACKUP_RUN` com `sha256` válido |

---

## 🛠 Troubleshooting

### Bridge retornando 503
1. Verificar `healthcheck` — qual serviço está down?
2. Ver logs: `query_telemetry` para latência
3. Se DB: verificar `pg_stat_activity`, locks, conexões ativas
4. Se Bridge: verificar Supabase Edge Functions console

### P95 latency alta
1. Identificar tabela: `mv_telemetry_dashboard.top_tables`
2. Verificar índices em `empresa_id` (criados em P1-023)
3. Se tabela >100K linhas: implementar keyset pagination (P1-020)
4. Considerar read replica para queries analíticas

### Alerta BruteForce
1. Acessar `v_login_anomalies` diretamente
2. Verificar IPs na tabela `login_attempts`
3. IPs >10 falhas → automaticamente bloqueados via RPC `is_ip_blocked`
4. Se falso positivo (usuário legítimo): limpar via `limpesa/index.ts`

---

## 📦 Dependências

| Componente | Requisito | Install |
|------------|-----------|---------|
| Prometheus | v2.40+ | `docker pull prom/prometheus:v2.50` |
| Grafana | v10+ | `docker pull grafana/grafana:10` |
| postgres_exporter | v0.12+ | `docker pull prometheuscommunity/postgres-exporter` |
| node_exporter | v1.6+ | `docker pull prom/node-exporter:v1.6` |
| json_exporter | latest | `docker pull prometheuscommunity/json-exporter` |

---

*Documento mantido pela equipe de plataforma. Atualizar após cada mudança de infraestrutura.*
