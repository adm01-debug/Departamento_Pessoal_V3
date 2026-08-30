# Execução do PLANO_100 — Relatório de 30/08/2026

> Sessão de execução do plano de 100 etapas derivado de `AUDITORIA.md`.
> **Exclusão explícita a pedido do usuário:** E-001, E-002, E-003 (Cloudflare).
> Legenda: ✅ já existia no repo (verificado nesta sessão) · 🔧 implementado
> nesta sessão · 🔄 resolvido por caminho alternativo documentado · ⚠️ requer
> ação manual/plataforma · ⏳ pendente (backlog) · 🚫 fora de escopo.

## P0 — Contenção (E-001..E-031)

| Etapa | Status | Evidência |
|---|---|---|
| E-001..E-003 | 🚫 | Cloudflare (excluído pelo usuário) |
| E-004 | ⚠️ | Perfil read-only do MCP server — fora do repo |
| E-005 revoke anon views | ✅ | migrations RLS/security 19–28/07; aplicação p/ prod = runbook E-026 §3 B1 |
| E-006 security_invoker | ✅ | 91 ocorrências em 24 migrations (ESTADO_ATUAL §2) |
| E-007 quarentena views | 🔄 | Substituído por revoke+invoker (E-005/006) com allowlist documentada (`GRANTS_REVOGADOS.md` §1) |
| E-008 policies `USING(true)` | ✅ | `20260809000000_p0_001_rls_batch1_core_rh` … `20260813000000_p0_001_rls_batch5_final` |
| E-009 RLS gates no CI | ✅ | `ci.yml` job `db-integrity` (7 gates: rls-pii, least-privilege, tenant-open, secdef-authz, search-path, smoke-hash, embed-hints) |
| E-010/E-011 policy linters | ✅ | `scripts/audit-rls-least-privilege.mjs`, `audit-rls-tenant-open.mjs` |
| E-012 definer permissions | 🔧 | migration `20260830000003_plano100_e012_secdef_permissions_helpers.sql` |
| E-013..E-015 secdef hardening | ✅ | `20260807000000_p0_006_search_path_public` + revokes + advisory locks |
| E-016 calcular_rescisao RPC | 🔄 | Writes de desligamentos atravessam o bridge (JWT+CSRF+tenant); RPC dedicada = follow-up (`VISAO_FUTURA.md` §2) |
| E-017 erro sanitizado | ✅ | bridge retorna mensagens genéricas; detalhes só em log server (`index.ts:663,749,776-786`) |
| E-018 auth p/ writes | ✅ | bridge `index.ts:455-469` (401 sem JWT em writes/RPCs protegidas) |
| E-019 rate limit writes | ✅ | bridge `index.ts:471-485` (30 writes/min; 100 reads/min auth; 20 anon) |
| E-020 inventário secdef | ✅ | `scripts/audit-secdef-authz.mjs` + CI |
| E-021 CORS allowlist | ✅ | `_shared/contract.ts` (allowlist + enforceOrigin 403) |
| E-022/E-023 bridge→RPCs | 🔄 | Substituído por hardening (opção prevista no plano): E-017..E-019 + E-025 |
| E-024 rate limit atômico | ✅ | `rateLimit.ts` com advisory lock (`20260724120000_atomic_rate_limit_rpc`) |
| E-025 tenant assert | ✅ | `assertTenantScope` + `lookupEmpresaIdsForWrite` (bridge) |
| E-026 runbook promoção | 🔧 | `infra/runbooks/PROMOCAO_BANCO_PRODUCAO.md` (baseline, lotes B1–B7, verificações, rollback) |
| E-027 advisory locks | ✅ | `pg_advisory_xact_lock` em ponto/CNAB/rate-limit (5 migrations) |
| E-028 buckets privados | 🔧 | migration `20260830000001` (4 criados + 2 endurecidos + 16 policies tenant) |
| E-029 verify_jwt | 🔧 | `config.toml` deny-by-default; **A-015: `migrate-helper` REMOVIDO** (chave hardcoded + exfiltração) — rotacionar service_role (E-056 §3) |
| E-030 webhook fail-closed | ✅ | `webhook/index.ts:88-92` (sem secret → 503) |
| E-031 auth-login CORS | ✅ | pública por design com allowlist + lockout |

## P1 (E-032..E-071) — seleção verificada

| Etapa | Status | Evidência |
|---|---|---|
| E-032 authz colaborador/CPF | ✅ | policies `colaboradores_tenant_*` (batch1) + tenant scope no bridge |
| E-033/E-034 folha autorizada | ✅ | `_shared/authz.ts` + `fechar-folha` (JWT+CSRF+idempotência+hash) |
| E-035 quiosque funcional | 🔧 | `PontoKioskPage.tsx`: geolocalização real (`captureKioskGeo`), auditoria `KIOSK_*`, speech honesto |
| E-036 trilha PII | 🔧 | migration `20260830000002` (tabela+RLS+view suspeitos+alerta+purge+cron) |
| E-037 SW allowlist estática | 🔧 | `public/sw-custom.js` v3: sem cache de PII, sem default SWR; `node --check` ✅ |
| E-038 sem debug MFA | ✅ | grep: nenhum console de MFA em `LoginPage.tsx` |
| E-039 monitor sem PII | ✅ | `loggerService` (persist só warn/error/fatal) + `auditLogger` redaction |
| E-040 rotas legadas | ✅ | `DeprecacaoLegadoPage`/`RotaLegada` inexistentes no código atual |
| E-041 contract tests edges | ✅ | `webhook/contract_test.ts`, `_shared/idempotency.test.ts` |
| E-042..E-045 contratos | ⏳ | E-072 criado; E-044 desenhado em `MODELO_LOGICO.md` §4 |
| E-046..E-053 LGPD | ⏳ | base E-036 entregue; export cifrado/DSAR pendentes |
| E-051/E-052 crons | ✅ | 17 `cron.schedule` no repo; drift `dp-*` no runbook E-026 §3 B7 |
| E-055 dashboards | ✅ | `PolicyAuditPanel.tsx` |
| E-056 rotação segredos | 🔧 | `infra/runbooks/ROTACAO_SEGREDOS.md` (+ incidente A-015) |
| E-057 grants revogados | 🔧 | `infra/runbooks/GRANTS_REVOGADOS.md` |
| E-060 drift CI | ✅ | gates `db-integrity` (exigem secret `SUPABASE_DB_URL`) |
| E-062..E-066 Bitrix/backup | ⏳ | backlog (ver `docs/auditoria/estado/11`) |
| E-067 PITR | ⚠️ | plataforma — pré-requisito no runbook E-026 §1 |
| E-068..E-071 | ⏳ | backlog |

## P2/P3 (E-072..E-100) — itens desta sessão

| Etapa | Status | Evidência |
|---|---|---|
| E-072 modelo contratos | 🔧 | `docs/contratos/MODELO_LOGICO.md` |
| E-074 pentest | ⚠️ | externo; critérios em `VISAO_FUTURA.md` §3 |
| E-077 gates CI config | 🔧 | `scripts/audit-security-config.mjs` + job `security-config` no `ci.yml`; **reprovou 2 CORS `*` reais** (`metrics`, `tabelas-dominio`) — corrigidos para `getCorsHeaders`/`handlePreflight` |
| E-079 break-glass | 🔧 | `infra/runbooks/BREAK_GLASS.md` |
| E-080/E-083 drills | 🔄 | base em `RESPOSTA_INCIDENTES.md` |
| E-084 resposta incidentes | 🔧 | `infra/runbooks/RESPOSTA_INCIDENTES.md` |
| E-094 mapa API | 🔧 | `docs/MAPA_API.md` |
| E-095 healthcheck | 🔧 | `scripts/healthcheck.sh` + `.github/workflows/healthcheck.yml` (6h, issue na falha) |
| E-100 visão futura | 🔧 | `docs/VISAO_FUTURA.md` |
| E-091..E-093, E-096..E-099 | ⏳ | backlog documentado |

## Correção de configuração adicional

- `supabase/config.toml`: `project_id` corrigido `ciziytrrjjotlsjzshnm` → **`frjbfeamybqsejlvmqbl`** (ESTADO_ATUAL §8.6).

## Pendências que exigem ação humana (fora do repo)

1. **Rotacionar `SERVICE_ROLE_KEY`/`DB_URL`** (A-015: migrate-helper com chave commitada) — runbook E-056 §3.
2. **Promover migrations** (lotes B1–B7) via runbook E-026 — sem acesso DB nesta sessão (MCP aponta para outra instância).
3. **Confirmar remoção do deploy** da migrate-helper no console.
4. E-004 (MCP read-only), E-067 (PITR), E-074 (pentest): plataforma/externos.

---

## Apêndice — Auditoria exaustiva pós-implementação (30/08/2026, noite)

Revisão por 5 frentes (SQL/PostgreSQL, Frontend, Edge/Deno, CI/Scripts, Docs)
com **simulação em Postgres 17 real** (docker, stubs fiéis do Supabase +
drift simulado de produção). Resultado: **6 defeitos encontrados e corrigidos**
(commit `953d6e64e`), ciclo final 100% verde.

### Achados e correções

| # | Achado (com prova) | Severidade | Correção |
|---|---|---|---|
| 1 | **E-012 não matava o IDOR em drift real**: sobrecarga legada `get_my_permissions(uuid)` concedida a `anon` sobreviveu à migration (`DROP ...()` só remove a variante sem-args) — teste T6.4 provou `anon_can_exec=true` | 🔴 P1 | Bloco anti-drift: `REVOKE EXECUTE` de TODAS as sobrecargas com argumentos via varredura `pg_proc` (REVOKE em vez de DROP para não quebrar dependências) |
| 2 | **E-036 sem grants explícitos**: `permission denied` para `authenticated` em PG puro — funcionava no Supabase apenas por *default privileges* (frágil em self-hosted divergente) | 🟠 P2 | `GRANT SELECT, INSERT` explícitos (tabela e view) |
| 3 | **E-036 dedup nunca casava**: `payload->>'janela'` (JSONB ISO-8601, `...T21:00:00+00:00`) ≠ `r.janela::text` (formato PG, `... 21:00:00+00`) → 1 evento duplicado por execução (T3.5) | 🟠 P2 | Cast tipado `(payload->>'janela')::timestamptz = r.janela`; validado: 3 execuções → 1 evento |
| 4 | **E-028 assumia RLS ativo em `storage.objects`**: policies em tabela sem RLS são ignoradas — `anon` leu 2 objetos no teste (T5.3) até o guard ser simulado | 🔴 P1 | `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY` (idempotente; testado `f→t` pela própria migration) |
| 5 | **Gate E-077 falso negativo**: checagem de SW por *menção* a `PII_PATH` era satisfeita por comentário (V6 do teste negativo) | 🟡 P3 | Exigir a declaração `const PII_PATH =` |
| 6 | **healthcheck.sh**: curl falho concatenava `000`+`000` → `HTTP 000000` | 🟡 P3 | Captura única + guarda de vazio |

### Suítes de certificação (todas verdes)

| Suíte | Escopo | Resultado |
|---|---|---|
| Aplicação migrations ×2 passes | PG 17 + stubs + drift | 0 erros (idempotência) |
| Testes de papel T1–T7 | buckets/RLS/anomalia/dedup/purge/storage/grants/secdef | 24/24 asserts OK (T2.2/T2.4 bloqueiam conforme projetado) |
| Harness SW (novo: `scripts/tests/sw-routing.test.mjs`) | 18 cenários de roteamento E-037 | 18/18 (PII/auth/fn/Supabase/default → network-only) |
| Gate E-077 negativo | 7 violações plantadas em repo-fake | todas reprovam + baseline aprova |
| healthcheck.sh | sintaxe + alvo morto + alvo real | fail-loud/exit 1; 200/exit 0 |
| `deno check` metrics/tabelas-dominio | tipos | 0 erros |
| `tsc --noEmit` | app inteiro | 0 erros |
| `vitest run` | suíte do projeto | **4841 passed / 0 failed** |
| YAML/TOML parse | ci.yml, healthcheck.yml, config.toml | válidos; 6 jobs CI; allowlist verify_jwt = 4 funções |

### Observações herdadas (não introduzidas por este trabalho)

- `deno lint` acusa `no-import-prefix` nos imports `https://` das edges — padrão de todo o repo (60 funções), inclusive do bridge; migração para import-maps é decisão de arquitetura, não de correção pontual.
- A trilha `pii_access_logs` ainda não é populada pelo frontend (instrumentação é o passo seguinte do E-036); view/funções já estão prontas e protegidas.
- Harness SQL de validação preservado em `/tmp/dptest/` desta sessão; para reprodutibilidade, os stubs devem ser versionados como fixture se o time adotar CI com Postgres service container (recomendado).
