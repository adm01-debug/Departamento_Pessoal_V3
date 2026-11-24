# SLOs e Mapa Alerta → Runbook

Objetivos de nível de serviço (SLOs) dos caminhos críticos do sistema, com os
indicadores (SLIs) que os medem e o runbook a seguir quando um alerta dispara.
Revisão trimestral ou após qualquer postmortem.

## SLOs

| Caminho crítico              | SLI                                                            | SLO         | Medido por                                          |
| ---------------------------- | -------------------------------------------------------------- | ----------- | --------------------------------------------------- |
| Disponibilidade geral        | `up == 1` nos targets de health                                | 99,5% / mês | `HealthcheckLatencyHigh`, `BridgeDown`              |
| Latência do bridge PGBouncer | p95 de `http_request_duration_seconds` do `external-db-bridge` | < 2 s       | `BridgeHighLatencyP95` / `BridgeCriticalLatencyP95` |
| Taxa de erro do bridge       | p95 de erros 5xx por janela de 1 h                             | < 2%        | `BridgeHighErrorRate` / `BridgeCriticalErrorRate`   |
| Banco de dados               | conectividade + resposta do Postgres                           | 99,5% / mês | `DatabaseDown`, `PostgreSQLDown`                    |
| Telemetria                   | ingestão de métricas/query_telemetry                           | 99,9% / mês | `TelemetryDown`, `PrometheusTargetDown`             |
| Queries lentas               | queries > 5 s por janela de 5 min                              | < 10        | `ManySlowQueries`                                   |

Consequência de quebra de SLO: o incidente vira candidato a postmortem
(`infra/runbooks/RESPOSTA_INCIDENTES.md`) e entra no débito técnico do ciclo
seguinte com prioridade sobre features.

## Mapa alerta → runbook

Alertas definidos em `monitoring/alerts/bridge.yml`; roteamento em
`monitoring/alertmanager.yml` (severity=critical → responsável + página
direta; warning → canal/owner do serviço).

| Alerta                                              | Severidade       | Primeira ação                                                            | Runbook                                                        |
| --------------------------------------------------- | ---------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `BridgeDown`                                        | critical         | Verificar `healthcheck` edge fn e logs do bridge                         | `infra/runbooks/BRIDGE_PERFORMANCE.md`                         |
| `DatabaseDown` / `PostgreSQLDown`                   | critical         | Testar conectividade ao Supabase canônico; se conexão, checar pool       | `infra/runbooks/PGBOUNCER_CONFIG.md`, `RESPOSTA_INCIDENTES.md` |
| `BridgeHighLatencyP95` / `BridgeCriticalLatencyP95` | warning/critical | Inspecionar `query_telemetry` top offenders                              | `infra/runbooks/BRIDGE_PERFORMANCE.md`                         |
| `HealthcheckLatencyHigh`                            | warning          | Checar latência do healthcheck; se degradado, investigar DB              | `infra/runbooks/RESPOSTA_INCIDENTES.md`                        |
| `TelemetryDown` / `PrometheusTargetDown`            | warning          | Validar target Prometheus/metricas                                       | `DOCS_MONITORING.md`                                           |
| `BridgeHighErrorRate` / `BridgeCriticalErrorRate`   | warning/critical | Ler `error_rate` no endpoint `metrics`; correlacionar com deploy recente | `infra/runbooks/RESPOSTA_INCIDENTES.md`                        |
| `ManySlowQueries`                                   | warning          | Ver top offenders em `query_telemetry`; avaliar índice/EXPLAIN           | `infra/runbooks/BRIDGE_PERFORMANCE.md`                         |

## Degradação aceita

- Healthcheck `degraded` (DB ou telemetria falha) deve retornar 503 para
  refletir indisponibilidade real — não mascarar como 200.
- Falha de leitura em tabela opcional (`health_checks`) reporta `unavailable`
  mas não derruba o status geral.
