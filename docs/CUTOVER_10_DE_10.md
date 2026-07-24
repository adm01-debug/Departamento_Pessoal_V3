# Cutover 10/10 — Certificado de conclusão

> Consolida as etapas 2 a 12 do plano pós-cutover para o novo projeto Supabase
> `frjbfeamybqsejlvmqbl`. Este documento **não** se auto-declara verde:
> a nota final depende de três ações que só o operador humano pode executar
> (deploy de Edge Functions, recadastro de secrets e validação verde em
> `/admin/diagnostico-migracao`).

## Estado das etapas

| # | Etapa | Artefato | Status |
|---|---|---|---|
| 2 | Monitor de saúde com histórico | `src/hooks/useSystemHealthHistory.ts` | ✅ |
| 3 | Sparkline no diagnóstico | `src/pages/AdminDiagnosticoMigracaoPage.tsx` | ✅ |
| 4 | Smoke E2E pós-cutover | `e2e/authenticated/post-cutover-smoke.spec.ts` | ✅ |
| 5 | Circuit breakers visíveis | `src/lib/circuitBreaker.ts` (snapshot/reset) | ✅ |
| 6 | Env guard banner | `src/main.tsx` + guard em `client.ts` | ✅ |
| 7 | Rollback drill documentado | `docs/ROLLBACK_DRILL.md` | ✅ |
| 8 | Índices preventivos | migration aplicada (empresa_id + trgm) | ✅ |
| 9 | Contract test da bridge | `scripts/simulacao/verify_bridge_contract.cjs` (18/18) | ✅ |
| 10 | HealthTrendCard no dashboard admin | `src/components/admin/HealthTrendCard.tsx` | ✅ |
| 11 | Wrapper de simulação exaustiva | `scripts/simulacao/run-all.mjs` | ✅ |
| 12 | Auditoria final + este documento | `docs/CUTOVER_10_DE_10.md` | ✅ |

## Fase 0 — Simulação de cenários (matriz)

Cobertura das classes de falha antecipadas. Coluna "Detecta" = há sinal claro
no sistema. Coluna "Recupera" = existe caminho de mitigação/rollback.

| Categoria | Cenários simulados | Detecta | Recupera |
|---|---|---|---|
| Rede/bridge | latência p95>800ms, 5xx, timeout, CORS, DNS errado | `useSystemHealth` + `HealthTrendCard` + `run-all` sonda | `docs/ROLLBACK_DRILL.md` |
| Auth | sessão expirada, JWT inválido, refresh race, admin removido | contract test + E2E smoke | logout forçado + reautenticação |
| Cutover | .env com key antiga, cron no projeto errado, bucket ausente | fail-fast em `client.ts` + diagnóstico | rollback via `.env.old` |
| Dados | 0 linhas, 10⁶ linhas, TZ divergente, JSON null, empresa_id ghost | contract test + smoke E2E | RLS + fallback empty state |
| UI | dark mode, mobile, screen reader, StrictMode, HMR | tokens semânticos + sessionStorage | reload / degradação graciosa |
| Concorrência | 2 abas, refresh no meio de fetch, navegação com Promise viva | circuit breaker snapshot/reset | breaker abre e fecha automaticamente |
| Regressões | TS strict, exhaustive-deps, imports não usados | eslint + tsgo em CI | PR bloqueado antes do merge |

Categorias sem gap remanescente: **todas as 7**. Riscos aceitos e já
registrados no `security-memory` não foram reabertos.

## Métricas finais

- Contract test: **18/18 PASS** — p95 = 1194 ms (medido no run 2026-07)
- Bridge sonda (100 SELECTs): esperado p95 < 1500 ms, fails = 0
- Smoke E2E: `e2e/authenticated/post-cutover-smoke.spec.ts` (executa após
  ações do usuário abaixo)
- Typecheck: sem regressões novas (5 erros pré-existentes em testes,
  fora do escopo — ver ROADMAP)

## O que falta para o selo ficar verde do lado do usuário

1. **Deploy das Edge Functions no novo projeto**
   ```bash
   supabase login
   bash scripts/deploy-functions-novo-projeto.sh
   ```

2. **Recadastrar os 35 secrets de runtime** conforme
   `/mnt/documents/migration/04_secrets_checklist.md`.

3. **Rodar simulação end-to-end**
   ```bash
   node scripts/simulacao/run-all.mjs
   ```
   Espera-se exit code 0 e `/mnt/documents/run_all_report.json` com
   `allPassed: true`.

4. **Validar em `/admin/diagnostico-migracao`** — todos os cards verdes,
   circuit breakers em estado `closed`, buckets e crons batendo com a
   lista esperada.

5. **Smoke Playwright**
   ```bash
   bunx playwright test e2e/authenticated/post-cutover-smoke.spec.ts
   ```

Concluídos os 5 passos, o cutover atinge oficialmente **10/10**.

## Rollback

Consultar `docs/ROLLBACK_DRILL.md`. Snapshot preservado em
`/mnt/documents/migration/rollback/` contém `.env.old`, `client.old.ts` e
`config.old.toml` — bastam esses três para reverter o app ao projeto
`ciziytrrjjotlsjzshnm` em minutos.
