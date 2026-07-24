# CODE_TODOS — Índice de TODOs e Pendências

> Atualizado em 2026-07-24. Cada item tem referência de arquivo/linha, prazo e ação proposta.

## ✅ Resolvidos (últimas sprints)

| Item | Arquivo | Resolução |
|---|---|---|
| FIXME(dep-fantasma) data-table | `src/components/ui/data-table.tsx` | P2-033: adicionado @tanstack/react-table, removido @ts-nocheck |
| client.ts fallbacks hardcoded | `src/integrations/supabase/client.ts` | P0-008: throw se env vars ausentes |

## 🟢 Backlog (sem prazo)

| Item | Arquivo | Origem | Ação proposta |
|---|---|---|---|
| formatarXXX aliases | `src/lib/masks.ts` | Histórico | Consolidar em funções nomeadas |
| eSocial eventos S-XXXX fallback | `src/components/esocial/tabs.tsx` | Falta evento | P5-082: implementar S-3000, S-5001, S-5011 |

## 📋 Pendências por área (vinculadas ao PLANO_MELHORIAS.md)

| ID | Item | Origem | Prazo |
|---|---|---|---|
| P1-022 | React Compiler (75 warnings) | QA_SIMULATION | Próximo trimestre |
| P1-025 | Criptografia pgcrypto de dados_bancarios | SECURITY_AUDIT | Q3 2026 |
| P1-030 | Eliminar 2.364 ocorrências de `any` (cauda) | PLANO_REFATORACAO_TIPOS | Contínuo |
| P2-037 | Consolidar tabelas férias/folha/ponto duplicadas | SECURITY_AUDIT | Q3 2026 |
| P3-054 | View materializada para telemetria | BRIDGE_PERFORMANCE | Q3 2026 |
| P3-055 | Endpoint /api/metricas | BRIDGE_PERFORMANCE | Q3 2026 |
| P3-057 | v_login_anomalies | Brute force | Q3 2026 |
| P3-058 | Prometheus scrape + alertas | DOCS_MONITORING | Q3 2026 |
| P3-059 | Separar APMs em DOCS_MONITORING.md | DOCS_MONITORING | Q3 2026 |
| P3-060 | Backup automatizado + alerta | infra | Q3 2026 |
| P3-061 | Retry exponencial em idempotency | infra | Q3 2026 |
| P3-065 | Retenção e purga de logs (LGPD) | LGPD Art. 16 | Q4 2026 |
| P4-068 | Read replicas | BRIDGE_PERFORMANCE | Q4 2026 |
| P4-069 | PgBouncer config para 100+ tenants | Scaling | Q4 2026 |
| P4-071 | Índices compostos para top-20 queries | perf | Q4 2026 |
| P4-072 | Materialized views para dashboards | perf | Q4 2026 |
| P4-074 | Code splitting em 62 pages | perf | Q4 2026 |
| P4-075 | Workbox strategies (offline-first) | PWA | Q4 2026 |
| P4-076 | Pre-fetch de dados no Login | perf | Q4 2026 |
| P5-077 a P5-088 | Features de roadmap | ROADMAP | 2026-2027 |

## 🔄 Atualização

Para adicionar novo item: edite este arquivo + crie issue no GitHub linkando a linha.
Para fechar: apague a linha e mova para "Resolvidos" com data.

## 📊 Estatísticas

- Total de TODOs remanescentes: **0 no código de produção** (todos os FIXME foram resolvidos via migrations/scripts).
- Backlog P2-P5 ativo: **~30 itens**, 60% já com PR aberto ou branch.

---

*Mantido pelo time de dev. Última revisão: 2026-07-24.*
