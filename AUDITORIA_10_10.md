# Auditoria Técnica 10/10 — Departamento Pessoal V3

Data: 13/11/2026 · Main auditada: `10f6d9f` · Deploy Vercel prod: READY · CI main: success (run#43531549565) · Gitleaks: success (run#43531616)
Metodologia: Arsenal de Auditoria Técnica 10/10 — 20 dimensões ponderadas (×3 Seg/Auth/Authz/Data, ×2 Banco/Tipos/Validação/Testes/Arq, ×1 demais). Evidência ou silêncio.

## Fase 0 — Inventário

- Stack (package.json): React 19.3.1 · TypeScript 6.0.3 (strict, tsconfig.json:19) · Vite 8 · @supabase/supabase-js 2.118 · Zod 4.6.5 (24 arquivos) · @sentry/react 11.10 · Vitest 5 · Playwright 1.64.
- Código: src com 1242 arquivos TS · 1248 testes vitest (thresholds vitest.config.ts: lines 72/functions 57/branches 61/statements 68 — gate ratchet) · 30 specs Playwright em 7 projetos (public/authenticated/non-admin/mobile).
- Supabase canônico (frjbfeamybqsejlvmqbl): 388 tabelas public com Rows Security ativa · 615 policies · 1308 indexes · 542 FKs · 538 triggers · 1811 colunas NOT NULL · 68 Edge Functions ACTIVE · 801 migrations SQL.
- Integrações: Bitrix24 · eSocial · FGTS/Caixa · Gov.br · Resend · Metabase · IA/OCR · Evolution API · n8n · Docker Swarm/Portainer · Cloudflare Worker (MCP) · Vercel.
- PRs abertas que aguardam aplicação (drifts reais de produção): #528 (15 tabelas sem updated_at — UPDATE falha sempre), #529 (pensoes sem empresa_id — confirmado ausente), #499 (catalogo_cursos sem metadata — confirmado ausente), #530 (RLS escrita por papel), #546 (Muri).

## Fase 1 — 20 dimensões

| # | Dimensão (peso) | Nota | Evidência central | Gaps |
|---|---|---|---|---|
| 1 | Segurança (×3) | 8.5 | CSP completa + HSTS/COOP/CORP/Referrer-Policy em vercel.json (headers) e nginx.conf; SSRF guard `_shared/ssrf-guard.ts` + `UnsafeUrlError` no sincronizar-bitrix; rateLimit `_shared/rateLimit.ts`; gitleaks success no tip; override de CVEs no package.json | 16 tabelas RLS-on sem policy (deny-all presumido): `dp_audit_log_*`, `colaboradores_pin`, `medidas_ciencia_tokens`, `pii_access_alerts` — confirmar intencional; bridge external-db (AUDITORIA.md §4.7) preserva identidade ÷ divergência RLS |
| 2 | Autenticação (×3) | 9.0 | Supabase Auth PKCE + MFA aal2 no AdminRoute (src/components/AdminRoute.tsx): sessão aal1 com TOTP enrolado exige challenge (fail-closed, .catch bloqueia) | Flag `VITE_E2E_BYPASS_MFA` salta MFA em AdminRoute — verificar se ausente de env de prod |
| 3 | Autorização (×3) | 7.5 | RLS 100% (388/388 relrowsecurity=true); RBAC `isAdmin = roles.includes('admin')` AuthContext.tsx:362; RPCs `is_admin`/`user_belongs_to_empresa` nas edges; AdminRoute nega não-admin | #530 aberta (papel exigido em 9 tabelas; colaborador aprova próprio ponto); 16 tabelas sem policy; `isAdmin` vindo só de roles do user (forjável se policy de roles divergir) |
| 4 | Data Integrity (×3) | 8.5 | 542 FKs + 388 PKs + 1811 NOT NULL; check constraints (`check_constraints_integridade.sql`); ledger com hash (`_shared/integrityHash.ts` + smoke-hash-triggers); db-integrity(-live) no CI | Drifts ativos em prod confirmados: #529 (pensoes.empresa_id ausente), #499 (catalogo_cursos.metadata ausente), #528 (tipos_* etc. sem updated_at) |
| 5 | Banco de Dados (×2) | 8.0 | 801 migrations com shards P0/P1/hash/search-path + tests `migrations-p0-*`; advisor security 0 ERROR; RLS live smoke pós-merge; canonical-bridge audit | 16 tabelas sem policy; `logs_sistema` 1 registro/7d (auditoria quase inativa); edge logs não expostos no DB |
| 6 | Tipagem (×2) | 8.5 | tsconfig strict; typecheck em 3 projetos (src/tests/e2e); audit `types-drift`; `gen-table-columns` (mapa por migration); ratchet de `any` (lint job) | `noUnusedLocals:false`; tipos gerados requerem pipeline (não verificado no build) |
| 7 | Validação (×2) | 8.0 | Zod em 24 arquivos src + nas edges (BodySchema no sincronizar-bitrix, parseJsonBody `_shared/contract.ts`); 400 com flatten; `parseCSVStrict` na importacao (MAX_ROWS 5000); NOT NULL/CHECK no DB | Form injection por components UI manual em pontos pontuais (não auditados 1 a 1) |
| 8 | Testes (×2) | 8.5 | 1248 unit com thresholds ratchet; 30 specs Playwright em 7 projetos (incl. non-admin e mobile); tests de migrations (p0 hash/search-path/lockout); msw; cobertura upload no CI | Lighthouse vira job queued recorrente (baseline não publicada); E2E já expôs flake de RBAC no passado (fix #541) |
| 9 | Arquitetura (×2) | 8.0 | Camadas React + Supabase + Edge + bridge external-db + PWA/SW; `_shared` com 34 módulos (csrf/sentry/ssrf/rateLimit/idempotency/aal2/outboundDelivery/aiProvider…) reutilizados | 68 functions = superfície alta de manutenção; bridge external-db herda risco de autorização (AUDITORIA.md §4.7) |
| 10 | CI/CD (×1) | 8.5 | 21 workflows; ci.yml com 16 jobs (typecheck/lint/test/rls-live/lighthouse/edge-functions/security-config/p0-database-migrations/db-integrity/npm-audit/dependency-review); canonical-migrations/probes/sql-diag; e2e 2 jobs; gitleaks; ossf-scorecard; post-deploy-smoke; ruleset-sync | Fila GitHub Actions congestionada (padrão B21 — jobs grandes queued mesmo com runners livres) |
| 11 | Documentação (×1) | 8.0 | docs/ ~40 arquivos (ARCHITECTURE, prod-readiness atualizado na #561, AUDITORIA_SISTEMA_COMPLETA, PLANO_100, QA_REPORT…) | Publicação fracionada; QA reports antigos sem data de refresh |
| 12 | Infra/DevOps (×1) | 8.0 | docker-compose dev e prod, Dockerfile, nginx.conf com security headers, deploy Vercel automático + smoke pós-deploy | docker-compose.prod não validado na sessão; fila de self-hosted FF |
| 13 | Logging (×1) | 7.5 | `logs_sistema` (5 refs em src), loggerService, `captureException` nas edges (`_shared/sentry.ts`), partições de audit log mensais (dp_audit_log_2026_*) | Volume real: 1 registro em 7 dias — telemetria de auditoria quase nula |
| 14 | Observabilidade (×1) | 7.5 | Sentry front (source maps ativos via sentryVitePlugin vite.config.ts:92-124) + edges; endpoints metrics/folha-metrics/metricas; healthcheck | `SENTRY_RELEASE_TRACKING` desligado (vite.config.ts:100-103); DSN/env não verificáveis daqui |
| 15 | Lógica de Negócio (×1) | 8.5 | Art. 145 OJ-123 (D-2) entregue e verificado no canônico; rescisão/13º/provisões/INSS/IRRF (`_shared/inss.ts`, `irrf.ts`), decimal.js; ledger com hash | Regras novas precisam de teste de contrato no front (não medido) |
| 16 | Manutenibilidade (×1) | 8.0 | Módulos _shared; strict TS; lint-staged + husky + commitlint; automation.mjs doctor/heal (self-healing); ratchets (any/warnings) | `noUnusedLocals:false`; 68 functions sem padrão único de contrato |
| 17 | Operacionalidade (×1) | 8.0 | Deploy Vercel automático + smoke pós-deploy; healthcheck; backup (`backup.sh` + edge backup-automatico); SLO.md; rate limits nas edges | Incidentes: fila CI; E2E flake histórico de RBAC |
| 18 | Performance (×1) | 7.5 | 1308 indexes; edge cache `_shared/cache.ts`; bundle budget (check-bundle-budget); lhci config | Lighthouse job recorrentemente queued — baseline não verificada nesta sessão; slow-queries não auditadas |
| 19 | Qualidade de Código (×1) | 8.5 | eslint + prettier + format:check; ratchet de warnings por regra (E43); react-compiler (babel-plugin-react-compiler); ESLint flat 10 | nenhum gap relevante encontrado na sessão |
| 20 | Operações (×1) | 7.5 | post-deploy-smoke, notifica-falha-main, healthcheck yml, metrics de folha | Sem runbook de incidentes além do notifica-falha; logs_sistema inativo |

## Fase 2 — Scorecard ponderado

Nota = Σ(nota×peso)/Σpeso = (100.5 + 82 + 87.5)/33 = **8.18/10**

Grupos: Crítico (×3) média 8.38 · Alto (×2) média 8.20 · Padrão (×1) média 7.95.

## Top 10 ações por ROI

1. **🔴 Aplicar os 4 drifts DDL no canônico (#528/#529/#499/#530)** — 3 bugs de produção confirmados (UPDATE falha sempre, pensões sem empresa_id, certificado sem metadata) + fechamento de RLS por papel. Regra 8 — aguarda seu ok.
2. **🔴 Confirmar/endurecer as 16 tabelas RLS-on sem policy** (deny-all explícito ou policy) — fecha o maior branco de autorização do banco.
3. **🔴 Auditar `VITE_E2E_BYPASS_MFA` nas envs de prod** — se presente, bypass de MFA de admin em produção.
4. **🟠 Ligar `SENTRY_RELEASE_TRACKING=1`** (vite.config.ts:100) — releases/deploys rastreados no Sentry; validar antes em preview.
5. **🟠 Reativar auditoria: hook de `logs_sistema`** para mutações críticas — hoje 1 registro/7d, telemetria de auditoria morta.
6. **🟠 Revisar authorization do bridge external-db** (AUDITORIA.md §4.7) — caminho cross-tenant fora do RLS (segurança crítica).
7. **🟡 Deduplicar canonizar as 68 edge functions** com healthcheck + orçamento de verify.sql.
8. **🟡 Publicar baseline Lighthouse** — job fica queued recorrente; sem baseline o budget não trava nada.
9. **🟡 Auto-dimensionar runners** para drenar a fila CI (B21).
10. **🟢 Docs de operações/runbook** apontando cada recurso chinês já enumerado.

## Roadmap

- **🔴 Quick Wins (1-3d):** itens 1-3 acima; re-rodar Playwright auth quando a fila drenar.
- **🟠 Sprint 1 (1-2sem):** itens 4-6 + testes de contrato p/ regras novas de folha.
- **🟡 Sprint 2 (2-4sem):** itens 7-9.
- **🟢 Backlog:** item 10; migrar de `$` views para generated types pipeline nos 3 projetos.

## NÃO VERIFICADO

- Lighthouse real (baseline) — job de CI queued na fila, não medido.
- `VITE_E2E_BYPASS_MFA`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` nas variáveis de ambiente do projeto Vercel — sem acesso às envs de prod.
- Runtime real do bridge external-db (eventos de observabilidade ausentes — AUDITORIA.md §4.7).
- n8n/Evolution API/Cloudflare Worker em runtime — nenhum comando atingível desta sessão.
- `noUnusedLocals` — não é erro, apenas configuração menos rigorosa.