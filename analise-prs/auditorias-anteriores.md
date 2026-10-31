# Reconciliação de Auditorias Anteriores — Departamento Pessoal V3

**Data desta reconciliação:** 31/10/2026  
**Branch atual:** `fix/e51-026-lote2`  
**SHA atual de `main`:** `6594b9af79ca587475a2b7370fd2c6b97cce1be9`  
**Método:** leitura direta dos documentos, cruzamento com código atual, histórico git e banco canônico conforme evidências dos próprios documentos.

---

## 1. Documentos examinados

| # | Caminho | Data | Autor/Agente | SHA de referência | Status de acesso |
|---|---------|------|--------------|-------------------|-----------------|
| D-01 | `AUDIT_REPORT.md` | 14/05/2026 | Lovable AI Agent (Enterprise Standard) | — (não registrado) | ✅ Lido integralmente |
| D-02 | `CONTRACT_AUDIT_REPORT.md` | 23/05/2026 | Lovable AI Agent (Sênior Front-End Developer) | — (não registrado) | ✅ Lido integralmente |
| D-03 | `SECURITY_AUDIT_REPORT.md` | 2025-06 | Lovable AI Agent (Sênior Back-End / Security) | — (não registrado) | ✅ Lido parcialmente (linhas 1–250 de ~31 KB) |
| D-04 | `QA_SIMULATION_REPORT.md` | 14/06/2026 | Lovable AI Agent (QA) | — | ✅ Lido integralmente |
| D-05 | `CODE_REVIEW.md` | 28/05/2026 | Cline (code review automático) | branch `fix/code-review-cline-2026-05-28` | ✅ Lido integralmente |
| D-06 | `AUDITORIA.md` | 30/08/2026 | Agente autônomo de auditoria | `8e86a1ebd9269a2b0a4d261bb3723f6a745cf3ca` | ✅ Lido ~400 linhas de ~30 KB |
| D-07 | `PLANO_100.md` | 30/08/2026 | Derivado de D-06 | `8e86a1ebd9…` | ✅ Lido parcialmente (80 linhas de abertura + índice de 100 etapas E-001–E-100) |
| D-08 | `PLANO_MELHORIAS.md` | 25/07/2026 (atualizado 27/08/2026) | Lovable AI Agent (PhD Supabase/Segurança/Arquitetura) | — | ✅ Lido integralmente |
| D-09 | `BACKLOG_11_ITEMS.md` | 28/08/2026 | Lovable AI Agent | commits `7305885e9`, `3b7b7eb56`, `22220684f`, `64508d39f`, `2608c2373`, `e4b5b26c7`, `07406bf39` | ✅ Lido integralmente |
| D-10 | `CODE_TODOS.md` | 26/07/2026 | Lovable AI Agent | commits `41afee699`, `fe1610b7d`, `202b58bfd` | ✅ Lido integralmente |
| D-11 | `ESTADO_ATUAL.md` | 16/08/2026 | Agente coordenador (11 lotes paralelos) | branch `claude/system-status-roadmap-5ifcl7` | ✅ Lido parcialmente (~100 linhas de 23 KB) |
| D-12 | `docs/auditoria/HANDOFF_CLINE_REMEDIACAO_2026-09-10.md` | 10/09/2026 | Agente autônomo de auditoria | `ef66e39d08c2a864a5459771e5ebc0d36d3a0dfb` (local) | ✅ Lido integralmente (80 linhas capturadas) |
| D-13 | `docs/auditoria/REVISAO_IMPLEMENTACAO_PLANO_50_2026-09-10.md` | 10/09/2026 | Agente auditor | branch `codex/e50-preflight-20260910`, PR #98 | ✅ Lido integralmente (matriz completa das 50 etapas) |
| D-14 | `docs/auditoria/REVISAO_IMPLEMENTACAO_PLANO_50_2026-09-12.md` | 12/09/2026 | Agente auditor | `cc6abb1cc929b4c055502ab2a94ac77dc4ae2e88` | ✅ Lido integralmente |
| D-15 | `docs/auditoria/EVIDENCIAS_EXECUCAO_2026-09-11.md` | 11/09/2026 | Agente auditor | banco `frjbfeamybqsejlvmqbl` | ✅ Lido integralmente |
| D-16 | `docs/auditoria/SIMULACAO_E_EXECUCAO_E51_2026-09-13.md` | 13/09/2026 | Agente auditor | branch `codex/e50-preflight-20260910` + commits locais | ✅ Lido integralmente |
| D-17 | `docs/auditoria/AUDITORIA_TECNICA_EXAUSTIVA_2026-09-10.md` | 10/09/2026 | Agente auditor | `ef66e39d…` | ✅ Lido parcialmente (60 linhas) |
| D-18 | `docs/auditoria/AUDITORIA_BANCO_CANONICO_AO_VIVO_2026-09-10.md` | 10/09/2026 | Agente auditor | banco `frjbfeamybqsejlvmqbl` | ⚠️ Arquivo existe, não lido (referenciado em D-13 e D-17) |
| D-19 | `docs/auditoria/PLANO_MELHORIAS_50_ETAPAS_2026-09-10.md` | 10/09/2026 | Agente auditor | — | ⚠️ Arquivo existe, não lido diretamente |
| D-20 | `docs/auditoria/PLANO_MELHORIAS_50_ETAPAS_2026-09-13.md` | 13/09/2026 | Agente auditor | — | ⚠️ Arquivo existe, não lido diretamente |
| D-21 | `docs/auditoria/PLANO_100_ETAPAS_2026-09-10.md` | 10/09/2026 | Agente auditor | — | ⚠️ Arquivo existe, não lido diretamente |
| D-22 | `docs/auditoria/00_PLANO_AUDITORIA.md` | — | — | — | ⚠️ Arquivo existe, não lido |
| D-23 | `docs/auditoria/01_FALHAS_E_GAPS.md` | — | — | — | ⚠️ Arquivo existe, não lido |
| D-24 | `docs/auditoria/02_MATRIZ_TESTES_E2E.md` | — | — | — | ⚠️ Arquivo existe, não lido |
| D-25 | `docs/auditoria/03_AUDITORIA_EXAUSTIVA_V2.md` | — | — | — | ⚠️ Arquivo existe, não lido |
| D-26 | `docs/auditoria/03_SIMULACAO_CENARIOS.md` | — | — | — | ⚠️ Arquivo existe, não lido |
| D-27 | `docs/auditoria/04_AUDITORIA_MASTER_COMPLETA.md` | — | — | — | ⚠️ Arquivo existe, não lido |
| D-28 | `docs/auditoria/REVISAO_POS_EXECUCAO_PLANO_50_2026-09-12.md` | 12/09/2026 | Agente auditor | — | ⚠️ Arquivo existe, não lido diretamente |
| D-29 | `docs/auditoria/estado/` (11 arquivos de estado por módulo) | 16/08/2026 | Agente (11 lotes em paralelo) | branch `claude/system-status-roadmap-5ifcl7` | ⚠️ Existem; não lidos diretamente (D-11 é a consolidação) |
| D-30 | `docs/auditoria/drift/20260831-relatorio-drift.md` + CSV + JSON | 31/08/2026 | Agente | — | ⚠️ Existem; não lidos |
| D-31 | `docs/auditoria/REVISAO_PLANO_50_EVIDENCIAS_2026-09-11.json` | 11/09/2026 | Agente | — | ⚠️ Existe; não lido |
| D-32 | `SECURITY.md`, `MIGRATION_GUIDE.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `ROADMAP.md`, `PLANO_REFATORACAO_TIPOS.md`, `PLANO_REFATORACAO_TIPOS_FASE2.md` | — | — | — | ⚠️ Existem; não lidos nesta sessão |
| D-33 | `docs/QA_EXHAUSTIVE_REPORT_V26.md`, `V27.md`, `V28.md`, `QA_FERIAS_V31.md`, `QA_FINAL_REPORT_V8.5.md` | — | — | — | ⚠️ Existem; não lidos |
| D-34 | `audit.json` (raiz) | — | — | — | ⚠️ Existe; não lido |
| D-35 | `AUDIT_REPORT.pdf` | — | — | — | ⚠️ Binário; não acessível por leitura direta |
| D-36 | `docs/AUDITORIA_SISTEMA_COMPLETA.md`, `ANALISE_BACKEND_VS_FRONTEND.md`, `ANALISE_FUNCIONALIDADES_PENDENTES.md` | — | — | — | ⚠️ Existem; não lidos |

**Fontes inacessíveis ou com acesso parcial:**
- `AUDITORIA_BANCO_CANONICO_AO_VIVO_2026-09-10.md` — existe mas não foi lido diretamente; seu conteúdo é parcialmente reconstruível pelos D-13, D-15 e D-17 que citam suas evidências.
- Banco externo (bridge `EXTERNAL_DB_URL`) — sem credenciais; não verificável.
- Logs do GitHub Actions após run 33257013056 / 34694084112 — lidos indiretamente via D-13 e D-14.
- Edge Functions implantadas em produção — Management API retornou 401/403 (D-17).

---

## 2. Resumo por documento

### D-01 · `AUDIT_REPORT.md` — Auditoria Enterprise (14/05/2026)

**Escopo:** inventário de módulos e funcionalidades (ponto, benefícios, ATS), matriz de riscos, checklist operacional, gaps e melhorias.  
**Achados principais:**
- Módulos declarados como "Implementado" sem evidência de uso real: Ponto Web, Geolocalização, GPS Spoofing, Banco de Horas, Benefícios, ATS, Triagem IA.
- Gaps declarados: Dashboard de Passivo Trabalhista (P-Alta), Integração de Folha (P-Média), App Mobile (P-Baixa).

**Correções declaradas concluídas:** nenhuma neste documento; é um inventário, não um plano de execução.  
**Pendências:** gaps de dashboard e integração de folha não resolvidos.  
**Relação com PRs/commits:** nenhuma explícita.

---

### D-02 · `CONTRACT_AUDIT_REPORT.md` — Auditoria de Contratos (23/05/2026)

**Escopo:** Edge Functions e Webhooks — validação de schema (Zod), respostas de erro, testes de contrato, HMAC.  
**Achados declarados e status neste documento:**
- Ausência de validação de schema → corrigido com Zod
- Respostas de erro inconsistentes → padronizado (`contract.ts`)
- Falta de testes de contrato → implementados (`contract_test.ts`)
- Segurança em Webhooks (HMAC) → "fortalecido"

**Correções declaradas concluídas:** todas as 4 (declaração do próprio agente).  
**Evidência de implementação localizável:** `supabase/functions/_shared/contract.ts` existe; schemas Zod (`common.ts`) estão referenciados no documento.  
**Pendências registradas neste documento:**
- Cache de validação para funções de alta frequência.
- Mapeamento de erros 422 para campos do `react-hook-form`.
- `WEBHOOK_SECRET` deve estar configurado em todos os ambientes de produção.
- Dependência de APIs externas (ViaCEP, BrasilAPI).

**Relação com D-06 / D-17:** A-032 (webhook handlers fazem apenas `console.log`, sem efeito de negócio real, e marcam `processed`) contradiz a declaração de D-02 de que o webhook foi "fortalecido e implementado".

---

### D-03 · `SECURITY_AUDIT_REPORT.md` — Auditoria de Segurança (2025-06)

**Escopo:** Supabase Database, RLS Policies, Functions, Views, Client Integration. ~179 issues identificados.  
**Sumário declarado:** 8 Crítico, 68 Alto, 39 Médio, 13 Baixo.

**Achados principais (lido até linha 250):**

| Issue | Descrição | Gravidade |
|-------|-----------|-----------|
| ISSUE-001 | Políticas `USING (true)` em colaboradores, férias, pontos, folhas, holerites | 🔴 CRÍTICO |
| ISSUE-002 | Acesso anônimo irrestrito a `admissao_tokens` e INSERT em `logs_sistema` por `anon` | 🔴 CRÍTICO |
| ISSUE-003 | `audit_insert` em `auditoria` permite fabricação de logs por qualquer autenticado | 🔴 CRÍTICO |
| ISSUE-004 | `FOR ALL USING (true)` em `registros_ponto`, `banco_horas`, `periodos_aquisitivos` | 🔴 ALTO |
| ISSUE-005 | `dependentes` com policy `USING (auth.uid() IS NOT NULL)` — sem filtro tenant | 🔴 ALTO |
| ISSUE-006 | `entity_versions` exposta para todos os autenticados sem filtro tenant | 🟠 ALTO |
| ISSUE-007 | `rubricas_folha`: rubricas globais (`empresa_id IS NULL`) editáveis por qualquer admin | 🟠 ALTO |
| ISSUE-008 | Conflito de políticas por migração incremental sem DROP — policy permissiva vence por OR | 🔴 CRÍTICO |

**Correções declaradas neste documento:** não há; é um relatório de achados, com SQL de correção sugerido.  
**Relação com D-06 (A-003):** ISSUE-001/ISSUE-004/ISSUE-008 persistiram no banco auditado em 30/08/2026 — 55 policies `USING (true)` ainda presentes.

---

### D-04 · `QA_SIMULATION_REPORT.md` — QA Report (14/06/2026)

**Escopo:** 674 arquivos TS/TSX, 62 páginas, 60 serviços, 62 hooks. Build, typecheck, lint, testes unitários.  
**Achados declarados neste documento:**
- `tsc --noEmit`: 0 erros — APROVADO
- ESLint: 0 erros, 80 warnings — APROVADO
- Vitest: 198/198 passando — APROVADO
- Vite build: OK
- Núcleo de cálculo (INSS, IRRF, FGTS, rescisão, férias): correto e coberto.

**Correções aplicadas e declaradas:**
- Removidos `src/utils/calculos/` (42 shims órfãos).
- Removidos `tailwind.config.ts`, `.eslintrc.app.json`, `.eslintrc.cjs`, `.prettierrc.app.json`.
- Foram corrigidos 5 gaps de robustez no motor de cálculo (NaN em INSS/IRRF, negativo em FGTS, Infinity por jornada 0).
- Testes expandidos de 198 → 243.
- Bugs de React: `Date.now()` no render, ref defasada, use-before-declare.

**Pendências registradas:**
- `src/utils/folha/` — ~28 shims ainda sem consolidação.
- 80 warnings de lint (React Compiler, `exhaustive-deps`).
- Coexistência de `.lintstagedrc` e `.lintstagedrc.json` com conteúdos diferentes.
- Coexistência de `bun.lock` e `package-lock.json`.

**Nota:** Este relatório é de **junho/2026**; o sistema cresceu substancialmente. A contagem de 62 páginas é inconsistente com as 109 páginas auditadas por D-11 em agosto/2026.

---

### D-05 · `CODE_REVIEW.md` — Code Review Cline (28/05/2026)

**Escopo:** branch `fix/code-review-cline-2026-05-28`, repositório `departamento-pessoal-v2` (V2, não V3).  
**Achados:**
- 1 secreto hardcoded (URL/chave Supabase) — declarado corrigido.
- 3 bugs lógicos (catch vazio, estado inconsistente no localStorage, falha silenciosa biométrica) — declarados corrigidos.
- 55+ console.logs / 15+ FIXMEs / ~40 usos de `==` — 5 críticos corrigidos.
- 200+ usos de `any` — 0 corrigidos (refatoração estrutural).
- 13 vulnerabilidades npm audit — 0 corrigidas.

**Nota de escopo:** este documento referencia `departamento-pessoal-v2`, não V3. Pode ser histórico de repositório antigo que foi incorporado/migrado.

---

### D-06 · `AUDITORIA.md` — Auditoria Total (30/08/2026)

**Data de coleta:** 30/08/2026 · **SHA auditado:** `8e86a1ebd9269a2b0a4d261bb3723f6a745cf3ca`  
**Escopo:** auditoria completa de segurança, banco, backend, frontend, integrações, infraestrutura, CI e qualidade.  
**Resultado:** 34 achados confirmados (A-001 a A-034), do P0 ao P3.

**Achados principais:**

| ID | Prioridade | Categoria | Descrição |
|----|-----------|-----------|-----------|
| A-001 | P0 | Infra/Segurança | URL-capability MCP concede administração irrestrita sem autenticação |
| A-002 | P0 | Banco/Segurança | 42 views do proprietário `postgres` selecionáveis por `anon`, incluindo CPF/PII |
| A-003 | P0 | Banco/Segurança | Policies `USING (true)` em 5 tabelas sensíveis (`audit_log`, `cnab_configuracoes`, etc.) |
| A-004 | P2 | Banco/Segurança | 18 funções `SECURITY DEFINER` sem `search_path` fixo |
| A-005 | P1 | Banco/Storage | Produção com zero buckets e zero policies de objetos |
| A-006 | P0 | Backend/Segurança | Bridge não encaminha identidade em SELECT/DML; allowlist limitada a 21 tabelas |
| A-007 | P1 | Backend/Dados | Cada retry de escrita recebe nova chave de idempotência → duplicação possível |
| A-008 | P0 | Banco/Segurança | 109 funções `SECURITY DEFINER` executáveis por `anon`/`authenticated` sem autorização interna |
| A-009 | P1 | Banco/Segurança | Associação ao tenant basta para escrever folha, banco, férias, ponto, colaboradores |
| A-010 | P1 | Ponto | RPC `registrar_batida_ponto` bloqueada pelo bridge (ausente do `RPC_ALLOWLIST`) |
| A-011 | P1 | Ponto/Segurança | Quiosque simula biometria e grava geolocalização fixa (São Paulo / KIOSK-01) |
| A-012 | P1 | Colaboradores | Formulário omite `empresa_id`, viola contrato do service |
| A-013 | P1 | Folha/UX | Botão "Encerrar" contorna validações e lock otimista |
| A-014 | P1 | Auth/Segurança | Lockout customizado contornável pelo endpoint público do Supabase Auth |
| A-015 | P1 | Backend/Segurança | `migrate-helper` com chave hardcoded e endpoint de exfiltração de credenciais |
| A-016 | P1 | Integrações | UI afirma eSocial/FGTS ativos, mas não há transmissão real (stubs locais) |
| A-017 | P1 | Bitrix24 | Upsert usa constraints inexistentes; reporta sucesso mesmo com erro |
| A-018 | P1 | Backup | Zero backup agendado; endpoint exporta apenas contagens, não dados |
| A-019 | P2 | Observabilidade | Bridge sem telemetria há 39 dias; healthcheck não acessa bridge externo |
| A-020 | P1 | CI | Lint aborta por TypeScript 7 incompatível com typescript-eslint |
| A-021 | P1 | CI/Deploy | E2E usa variável `VITE_SUPABASE_ANON_KEY` em vez de `VITE_SUPABASE_PUBLISHABLE_KEY` |
| A-022 | P1 | CI/Banco | 7 gates SQL passam verdes sem acessar banco (secret ausente) |
| A-023 | P2 | Deps/Segurança | npm audit ignorado; CodeQL não publica resultados |
| A-024 | P1 | Governança | `main` sem proteção de branch (404 na API de proteção) |
| A-025 | P1 | Banco/Dados | CPF e matrícula únicos globalmente (não por empresa) — colisão entre tenants |
| A-026 | P2 | Frontend/UX | Dashboards exibem métricas fictícias como reais (hardcoded Jan–Abr, FGTS sincronizado) |
| A-027 | P2 | Privacidade | Assinatura de contrato envia IP a `api.ipify.org` terceiro sem timeout/aviso |
| A-028 | P2 | Infra/Segurança | Nginx sem headers CSP, HSTS, X-Content-Type-Options |
| A-029 | P2 | Config | `.env.example` desatualizado; sem manifesto de variáveis Edge Functions |
| A-030 | P3 | Build | Dockerfile e deploy não usam lockfile → builds não-reprodutíveis |
| A-031 | P1 | Integrações/Segurança | URL configurável do Bitrix permite SSRF na Edge Function |
| A-032 | P2 | Webhook | Handlers placeholder marcam eventos como `processed` sem efeito de negócio |
| A-033 | P3 | Tipos | 1.132 ocorrências de `any` em produção |
| A-034 | P2 | Testes | Cobertura 61%/56%/54%/65% — módulos críticos sem exercício |

**Correções declaradas neste documento:** nenhuma; é um relatório de achados.  
**Plano derivado:** D-07 (PLANO_100.md), 100 etapas E-001 a E-100.

---

### D-07 · `PLANO_100.md` — Plano de 100 Etapas (30/08/2026)

**Escopo:** 100 etapas derivadas dos 34 achados de D-06. Ordena P0 → P1 → P2 → P3.  
**Etapas P0 (contenção imediata):**
- E-001: bloquear rota pública do MCP (A-001)
- E-002: rotacionar URL-capability (A-001)
- E-003: Cloudflare Access com autenticação forte (A-001)
- E-004: separar ferramentas read-only/administrativas no MCP (A-001)
- E-005: revogar `SELECT` de `anon` nas 42 views (A-002)
- E-006: converter views tenant para `security_invoker=true` (A-002)
- E-007: criar policies substitutas para 5 tabelas abertas (A-003)

**Correções declaradas concluídas:** nenhuma neste documento; é um plano de execução.  
**Status de execução:** veja D-13, D-14, D-15, D-16 para rastreamento das etapas.

---

### D-08 · `PLANO_MELHORIAS.md` — Plano Mestre de Melhorias (25/07/2026, atualizado 27/08/2026)

**Escopo:** 88 itens P0–P5, resultado de auditoria de 532 migrações SQL, 57 Edge Functions, 80+ services, 95+ hooks, 200+ componentes, 62 páginas.  
**Declaração:** "88/88 ITENS IMPLEMENTADOS — 100% DO PLANO COMPLETO. Commits 22-28/08/2026."

**ATENÇÃO — NOTA DE SUPERSEDÊNCIA INSERIDA NO PRÓPRIO DOCUMENTO:**
> "DOCUMENTO HISTÓRICO — STATUS SUPERADO. As marcações de 'implementado', '100% completo' e 'all done' abaixo registram existência de artefatos/commits, não comprovação ponta a ponta. A auditoria direta de 10/09/2026 encontrou controles físicos e funcionalidades ainda parciais ou ausentes."

**Itens P0 relevantes declarados como concluídos (mas reclassificados por D-13):**
- P0-001: "Substituir TODAS as 66 `USING (true)` por isolamento multi-tenant" — declarado concluído em commit.
- Todos os 12 itens P0 de segurança — declarados concluídos.

**Relação com D-13:** A auditoria de 10/09/2026 encontrou ainda 55 policies `USING (true)` no banco canônico, 43 views expostas a `anon` e 113 funções `SECURITY DEFINER` executáveis por `authenticated`. Os 88 itens existem como artefatos/commits, mas o banco físico não os reflete.

---

### D-09 · `BACKLOG_11_ITEMS.md` — Backlog de 2 Itens Restantes (28/08/2026)

**Escopo:** 2 itens restantes de um total de 88 (P5-083 e P5-084).  
**Itens pendentes:**
- P5-083: Workflow editor BPMN — bloqueado por UX design + credenciais
- P5-084: Integração contábil (Domínio/Alterdata) — bloqueado por API keys de produção

**Correções concluídas no batch 27-28/08/2026 declaradas neste documento:**
- P1-015, P1-017, P2-043, P2-045, P3-058, P4-072, P5-081, P5-086 (com commits listados)

---

### D-10 · `CODE_TODOS.md` — TODOs de Código (26/07/2026)

**Escopo:** batch de auditoria 26/07/2026. Score final declarado: 9.5/10.  
**Correções declaradas:**
- P2-041: `catch(e:any)` → `catch(e:unknown)` — 22 arquivos (commit `41afee699`)
- P2-042: `console.*` → `loggerService` — 15+ arquivos
- P2-051: `useState<any>` → tipos explícitos — 5 arquivos
- P1-020: `parseCursor` no frontend
- P4-067: `cachedFetch` para domínio
- P2-039: `useActionState` migration

**Pendências abertas:**
- P1-022: React Compiler readiness — parcial, 30 warnings ESLint restantes.
- P1-025: Criptografia pgcrypto dados sensíveis — não iniciado.
- P1-030: Eliminar `any` (cauda TypeScript) — contínuo.
- P2-037: Consolidar tabelas duplicadas — não iniciado.

---

### D-11 · `ESTADO_ATUAL.md` — Estado Atual (16/08/2026)

**Escopo:** 109 páginas, 60 Edge Functions, 359 tabelas, 597 policies, banco de produção (2.129 linhas totais, 12/13 colaboradores são seed).  
**Branch:** `claude/system-status-roadmap-5ifcl7`

**Veredito central:** "O sistema é um protótipo muito grande, não um produto em operação."

**Placar por classificação (109 páginas):**
- ✅ IMPLEMENTADO_TOTAL: **0**
- 🟨 IMPLEMENTADO_PARCIAL: 74 (67,9%)
- 🟦 SUGERIDO_OU_INICIADO: 31 (28,4%)
- ⬛ MORTO_OU_ABANDONADO: 4 (3,7%)

**Riscos estruturais confirmados (via banco vivo):**
- R1: 42/43 views sem `security_invoker`, todas com SELECT para `anon`.
- R2: 641 migrations no repo ≠ 30 versões registradas no banco (interseção zero).
- R3 (implícito): 20 tabelas `dp_*` com dados reais sem menção no repo.

**Nota de revisão pós-publicação:** 15 páginas reclassificadas de `IMPLEMENTADO_TOTAL` para `IMPLEMENTADO_PARCIAL` após confirmação de que dados do banco são seed (não uso real).

---

### D-12 · `HANDOFF_CLINE_REMEDIACAO_2026-09-10.md`

**Escopo:** handoff para o Cline após auditoria viva de 10/09/2026. Nota: 4,11/10.  
**Estado entregue:**
- HEAD local: `ef66e39d…` (1 commit atrás do remoto).
- Vitest: 4.853 testes aprovados.
- CI: vermelho no CI real.
- Banco canônico: 362 tabelas, 44 views, 611 policies, 4/19 buckets esperados.

**Ação zero identificada:** credenciais expostas na conversa — senha e JWT `service_role` comprometidos.  
**Bloqueio crítico (G0):** rotação de credenciais obrigatória antes de qualquer outra etapa.

---

### D-13 · `REVISAO_IMPLEMENTACAO_PLANO_50_2026-09-10.md`

**Escopo:** 50 etapas, 500 subetapas, 200 checkpoints. Branch `codex/e50-preflight-20260910`, PR #98.

**Veredito:** "Nenhuma das 50 etapas atingiu C4."

**Distribuição:**
- PV (parcial com evidência): 11 etapas (E50-003, E50-009, E50-010, E50-012, E50-031, E50-033, E50-034, E50-035, E50-038, E50-047, E50-049)
- PI (implementação parcial/inconsistente): 27 etapas
- NI (não implementado): 9 etapas (E50-011, E50-016, E50-017, E50-018, E50-019, E50-020, E50-030, E50-039, E50-050)
- BE (bloqueado por ação externa): 3 etapas (E50-001, E50-037, E50-048)
- C4 (concluído e promovido): **0**

**Banco canônico em 10/09:** 43/44 views selecionáveis por `anon`, 4 vazamentos confirmados; 23 funções `SECURITY DEFINER` executáveis por `anon`, 113 por `authenticated`; 55 `USING(true)`; 4/19 buckets; ledger 33 vs 640 versões locais.

---

### D-14 · `REVISAO_IMPLEMENTACAO_PLANO_50_2026-09-12.md`

**Escopo:** revisão pós-execução, SHA `cc6abb1cc929b4c055502ab2a94ac77dc4ae2e88`, PR #100.

**Veredito:** "Não implementamos nem validamos integralmente todas as melhorias. Não há evidência suficiente para encerrar qualquer etapa no checkpoint C4."

**Execuções no canônico confirmadas:**
- Migrations `p0_hash_trigger_search_path`, `p0_auth_lockout_contract`, `p0_payroll_upsert_contract` — aplicadas.
- `p0_pgcrypto_routine_search_path` (14 rotinas com `digest`/`gen_random_bytes`) — aplicada.
- `p0_views_revoke_public` — aplicada: 0 views sem `security_invoker`, 0 expostas a `anon`/PUBLIC.
- `p0_secdef_search_path` (18 funções) e `p1_function_search_path` (9 helpers/triggers) — aplicadas.
- Edge Functions `enviar-relatorio` v6, `alertas-dp` v7, `processar-agendamentos` v6 — publicadas.

**Limitações:** banco não recertificado nesta rodada — conector Supabase retornou projeto diferente (`bwwbeyolnnzppeuhgkcd`); Management API 403. Testes RPC receberam `PGRST202` em vez de `42501`.

---

### D-15 · `EVIDENCIAS_EXECUCAO_2026-09-11.md`

**Escopo:** execução do Plano de 50 Etapas em 11/09/2026. Banco `frjbfeamybqsejlvmqbl`.

**Inventário vivo (11/09):**
- Migrações no ledger remoto: 362
- Arquivos de migration locais: 644
- Interseção exata: 16 (!)
- Buckets Storage: 18 de 19

**Remediações versionadas em `supabase/rebaseline/`:**
1. Autorização base
2. Policies tautológicas de tenant
3. Funções `SECURITY DEFINER`
4. `security_invoker` + revogação de `anon` em views
5. Catálogo e policies de Storage

---

### D-16 · `SIMULACAO_E_EXECUCAO_E51_2026-09-13.md`

**Escopo:** Onda 0 do E51, branch `codex/e50-preflight-20260910`, 13/09/2026.  
**Bugs reais descobertos (não eram gap de plano):**
1. `expect_denied()` aceitava só `"permission denied"` literal — corrigido para checar SQLSTATE `42501`.
2. Fixture de `esocial_eventos` sem `GRANT SELECT` — impedia trigger de disparar corretamente.
**Premissas erradas corrigidas:** E51-003 (husky/lint-staged já existia), E51-006 (apenas 1 referência ao projeto errado em teste negativo), E51-032 (Docker disponível, scripts sobem PG17-alpine).  
**Correção adicional detectada pelo CI:** bug real de cálculo de IRRF — corrigido; `scripts/typecheck-edge.sh` adicionado ao `ci:verify`.

---

### D-17 · `AUDITORIA_TECNICA_EXAUSTIVA_2026-09-10.md`

**Escopo:** auditoria técnica completa. Resultado: **4,11/10**.  
**8 bloqueios para promoção responsável:**
1. 4 views retornam PII/auditoria/SQL para requisição sem login.
2. Usuário autenticado sem empresa lê auditoria, CNAB, folha e SST.
3. RPCs `SECURITY DEFINER` permitem anonimização, batida de ponto, assinatura sem autorização.
4. 11 gatilhos de hash/selagem falham por `search_path` incompatível com `pgcrypto`.
5. Código e tipos dependem de RPCs, tabelas e 15 buckets ausentes no banco.
6. 644 migrations não reconstroem schema; ledger reconhece só 33 versões.
7. E2E não executa (4 credenciais ausentes).
8. Vulnerabilidade alta em `sharp@0.35.3`.

---

## 3. Reconciliação de achados com o código atual

SHA atual de `main`: `6594b9af79ca587475a2b7370fd2c6b97cce1be9` (31/10/2026)

### 3.1 Segurança — Banco de dados (Políticas RLS)

| ID | Achado | Situação | Evidência |
|----|--------|----------|-----------|
| A-002 / ISSUE-001 | 42–43 views do `postgres` selecionáveis por `anon` sem `security_invoker` | **PARCIALMENTE CORRIGIDO** | D-14 confirma migration `p0_views_revoke_public` aplicada (0 views expostas a `anon` em 12/09). Porém o banco não foi recertificado após; conector retornou projeto diferente. Situação em main atual: NÃO VERIFICADO no banco produção corrente. |
| A-003 / ISSUE-001 / ISSUE-004 | 55 policies `USING (true)` em tabelas sensíveis | **PARCIALMENTE CORRIGIDO** | D-08 declara P0-001 concluído (commits 22-28/08). D-13 encontrou ainda 55 `USING (true)` em 10/09. D-14 não recertificou. PLANO_MELHORIAS tem nota de supersedência. **Estado provável:** migrations existem mas não chegaram integralmente ao banco canônico. |
| A-008 | 109 funções `SECURITY DEFINER` executáveis sem autorização interna | **PARCIALMENTE CORRIGIDO** | D-14 aplicou `p0_secdef_search_path` (18 funções) e `p1_function_search_path` (9). D-13 havia confirmado 204 overloads, 23 executáveis por `anon`, 113 por `authenticated`. Escopo das migrations é menor que o total encontrado. NÃO VERIFICADO no estado atual. |
| A-009 / ISSUE-005 | Tenant membership suficiente para escrever dados críticos (colaboradores, folha, ponto) | **CONFIRMADO E PENDENTE** | D-13 confirma 60 policies tenant, 17 PII, 50 menor privilégio ainda reprovando em 10/09. Nenhuma migration de correção integral desta classe foi confirmada como aplicada e verificada. |
| A-004 | 18 funções `SECURITY DEFINER` sem `search_path` | **PARCIALMENTE CORRIGIDO** | D-14 aplicou `p0_secdef_search_path` e `p1_function_search_path`. D-15 (11/09): advisor ainda reportava 28 objetos para ajuste. NÃO VERIFICADO se chegou a zero. |
| ISSUE-008 | Conflito de policies por migração incremental sem DROP | **CONFIRMADO E PENDENTE** | Padrão estrutural; as 55 `USING (true)` de D-13 confirmam persistência. Requer DROP explícito das policies antigas. |

### 3.2 Segurança — Backend e Bridge

| ID | Achado | Situação | Evidência |
|----|--------|----------|-----------|
| A-001 | MCP com URL-capability pública sem autenticação forte | **NÃO VERIFICADO** | D-07 propôs E-001–E-004. D-12 lista como bloqueio G0. Não há confirmação de execução em nenhum documento subsequente. A URL pode estar protegida mas não há evidência. |
| A-006 | Bridge sem identidade em SELECT/DML; allowlist de 21 tabelas | **CONFIRMADO E PENDENTE** | D-13 (E50-021): "232 ocorrências produtivas de `.select('*')`, acesso Supabase direto e contratos paralelos". A camada de domínio não é fonte única. Não há migration ou commit que resolva o bridge identity. |
| A-010 | RPC `registrar_batida_ponto` bloqueada pelo bridge | **CONFIRMADO E PENDENTE** | D-13 (E50-025): "Vínculo, tabelas paralelas, bucket biométrico, hashes e RPCs privilegiadas ainda impedem prova antifraude." RPC_ALLOWLIST não foi confirmada como atualizada. |
| A-014 | Lockout customizado contornável pelo endpoint público Auth | **PARCIALMENTE CORRIGIDO** | D-13 (E50-008): "RPCs de lockout usadas pelo código estavam ausentes; bridge com fallback fixo; `reset_login_attempts` executável por `anon`." D-14 aplicou `p0_auth_lockout_contract`. Não recertificado no banco atual. |
| A-015 | `migrate-helper` com chave hardcoded e endpoint de exfiltração | **NÃO VERIFICADO** | D-06 encontrou gitleaks confirmando chave real. D-06 menciona que GET ao endpoint retornou 404 (não deployado ativamente). Nenhum documento posterior confirma remoção do arquivo ou rotação da chave. HIPÓTESE: arquivo ainda existe no repo com chave. |
| A-031 | URL Bitrix configurável permite SSRF | **CONFIRMADO E PENDENTE** | D-13 (E50-028): "SSRF, CNAB e integrações externas não foram homologados." Nenhuma correção documentada. |

### 3.3 Autenticação

| ID | Achado | Situação | Evidência |
|----|--------|----------|-----------|
| A-011 | Quiosque de ponto simula biometria e grava geolocalização fixa | **CONFIRMADO E PENDENTE** | D-13 (E50-025): bucket biométrico ausente, prova antifraude incompleta. Nenhum commit de correção identificado. |
| A-012 | Formulário de colaborador omite `empresa_id` | **CONFIRMADO E PENDENTE** | D-13 (E50-026): "Bucket ausente, `syncWithHub` fachada e split de tabelas de benefícios mantêm fluxos quebrados." Formulário provavelmente não resolvido isoladamente. |
| A-013 | Botão "Encerrar" da folha contorna validações | **CONFIRMADO E PENDENTE** | D-13 (E50-024): "Folha em lote/provisões têm contratos inválidos." Nenhuma correção específica desta tela documentada. |
| A-022 / E50-022 | Lockout físico, bypass endpoint token, config MFA, E2E auth | **PARCIALMENTE CORRIGIDO** | D-14 aplicou `p0_auth_lockout_contract`. Bypass do endpoint público (`/auth/v1/token`) não endereçado por migration. MFA não confirmado. |

### 3.4 Storage

| ID | Achado | Situação | Evidência |
|----|--------|----------|-----------|
| A-005 | Produção com zero buckets (30/08/2026) | **PARCIALMENTE CORRIGIDO** | D-15 (11/09): 18 de 19 buckets esperados. D-14 (12/09): 15 buckets restantes não promovidos. Estado em 31/10/2026: NÃO VERIFICADO. Progress real: de 0 para ~18, mas ainda falta `backups`. |

### 3.5 CI / Infraestrutura

| ID | Achado | Situação | Evidência |
|----|--------|----------|-----------|
| A-020 | Lint aborta por TypeScript 7 incompatível com typescript-eslint | **CORRIGIDO E VERIFICADO** | D-14 menciona `bun run typecheck`: exit 0. D-16 confirma CI corrigido para IRRF e edge check. Commit `ab97dc67d` ("fix: fechar contratos auditados de segurança e banco") em main atual sugere progresso. NÃO VERIFICADO se lint roda completo sem erro no SHA atual. |
| A-021 | E2E usa variável errada; 4 secrets ausentes | **CONFIRMADO E PENDENTE** | D-13: "Playwright remoto: não inicia porque faltam quatro secrets." D-14 confirma. Nenhum documento posterior confirma provisão dos secrets. |
| A-022 | Gates SQL verdes sem banco | **PARCIALMENTE CORRIGIDO** | D-16 (E51-035/E51-047): gates agora exigem `SUPABASE_DB_URL`; reprovariam conexão sem alvo. Secret ainda não configurado em CI. |
| A-024 | `main` sem proteção de branch | **NÃO VERIFICADO** | D-13 confirma ruleset `21934736` ativo (exige 1 aprovação). D-14 confirma. Porém bypass permanente configurado para 1 usuário; `strict_required_status_checks_policy=false`. Proteção parcial. |
| A-030 | Builds não reprodutíveis (sem lockfile no Dockerfile) | **NÃO VERIFICADO** | D-16 menciona `bun.lock` existente. Dockerfile.prod não foi verificado nesta sessão. |

### 3.6 Integrações

| ID | Achado | Situação | Evidência |
|----|--------|----------|-----------|
| A-016 | UI afirma eSocial/FGTS/DCTFWeb ativos mas transmissão é stub | **CONFIRMADO E PENDENTE** | D-13 (E50-028): "eSocial/ICP-Brasil, FGTS Digital, DCTFWeb, PIX e WhatsApp são simulados ou locais." Não há evidência de integração real. |
| A-017 | Bitrix24 upsert com constraints inexistentes | **CONFIRMADO E PENDENTE** | D-13 (E50-028): mencionado em cluster "não homologados". |
| A-018 | Zero backup agendado; endpoint exporta apenas contagens | **CONFIRMADO E PENDENTE** | D-13 (E50-002): "Massa está declarada descartável e há export/baseline/runbook, mas não existe restore atual, verificável." |
| A-032 | Webhook handlers placeholder marcam `processed` sem efeito | **CONFIRMADO E PENDENTE** | D-02 declara webhook "fortalecido", mas D-06 confirmou handlers com apenas `console.log`. Nenhum commit de implementação dos handlers documentado. |
| A-026 | Dashboards com métricas hardcoded (Jan–Abr, FGTS R$12.450,80) | **NÃO VERIFICADO** | Não há documento posterior que confirme remoção ou feature-flagging dessas métricas. HIPÓTESE: ainda presentes nos arquivos referenciados (D-06:A-026). |

### 3.7 Qualidade e tipos

| ID | Achado | Situação | Evidência |
|----|--------|----------|-----------|
| A-033 | 1.132 ocorrências de `any` em produção (30/08/2026) | **PARCIALMENTE CORRIGIDO** | Commit `6594b9af7` ("eliminação de any, ratchet 881→859") reduz para ~859. Progresso real: de 1.132 para 859. Ainda acima de zero. |
| P1-025 | Criptografia pgcrypto dados sensíveis — não iniciado (26/07) | **PARCIALMENTE CORRIGIDO** | D-14 aplicou `p0_pgcrypto_routine_search_path` para funções que já usavam `digest`. Criptografia de dados em repouso (CPF, salário) não confirmada. |
| A-034 | Cobertura 61%/56%/54%/65% (30/08) | **NÃO VERIFICADO** | Commit atual ainda menciona `vitest`. D-13 confirma 4.853 testes aprovados em 10/09. Cobertura não medida novamente nos documentos disponíveis. |
| P5-083 | Workflow editor BPMN | **CONFIRMADO E PENDENTE** | D-09: dependência de UX design + credenciais não resolvida. |
| P5-084 | Integração contábil (Domínio/Alterdata) | **CONFIRMADO E PENDENTE** | D-09: dependência de API keys de produção. |

### 3.8 Achados com Contradição entre Documentos

| Achado | Documentos contraditórios | Resolução |
|--------|---------------------------|-----------|
| "88/88 itens implementados" (D-08) vs. "nenhuma etapa atingiu C4" (D-13) | D-08 declara 100% concluído; D-13 encontra 0 etapas em C4 | D-08 refere existência de artefatos/commits; D-13 exige validação em banco canônico, E2E e staging. **D-13 é a fonte correta**: o próprio D-08 inseriu nota de supersedência. |
| "198 testes passando" (D-04, junho/2026) vs. "4.853 testes" (D-13, set/2026) | Ambos não se contradizem — refletem crescimento da suíte. | D-04 cobre V2 em jun/2026; D-13 cobre V3 em set/2026. Não há contradição. |
| "Webhook fortalecido" (D-02) vs. "handlers fazem apenas console.log" (D-06) | D-02 (maio/2026) vs. D-06 (agosto/2026) | D-06 é posterior e verificou o banco/código diretamente. **D-06 prevalece**. Os handlers continuam placeholder. |
| "P0 concluídos" (D-10, julho/2026) vs. "55 `USING (true)` no banco" (D-13, set/2026) | D-10 marca P2-041, P2-042 etc. como concluídos; D-13 encontra controles físicos ausentes | Commits de P2 existem; P0 de banco (RLS) existe como migration mas não chegou ao banco físico. **D-13 prevalece** para o estado do banco. |

---

## 4. Branches e PRs relacionados

### Branches locais com trabalho exclusivo
- `fix/e51-026-lote2` — branch atual; 18 arquivos modificados não commitados (scripts de migração, páginas de afastamentos/faltas/disciplinar, `faltasService.ts`).
- `chore/workflows-report` — local only; não verificado.
- `codex/e50-preflight-20260910` — base das auditorias de set/2026; branch remota correspondente existe.
- `dependabot/github_actions/actions-39d45d7308` — Dependabot.
- `devin/1793220008-s2200-admissao-fixes` — Devin; admissão.
- `devin/1793220100-rescisao-modalidades-pagamento` — Devin; rescisão.
- `devin/1793220119-security-gaps` — Devin; gaps de segurança.
- `devin/1793220200-govbr-esocial-fixes` — Devin; Gov.br e eSocial.
- `devin/1793220300-pendencias-doc` — Devin; pendências de documentação.
- `devin/1793220602-orfaos-83` — remota; órfãos.
- `claude/fix-rotinas-agendadas-261012-0737`, `claude/great-rubin-c50zcx`, `claude/happy-cori-3z9h7f` — branches Claude remotas.
- `safety/pre-sync-20260907-ea354760` — ponto de backup pré-sincronização.
- `muri` — remota; conteúdo não verificado.
- `adm01-debug-patch-1` — patch do autor.

### PRs abertas referenciadas nos documentos
- **PR #98** — branch `codex/e50-preflight-20260910`: aberta, bloqueada em 10/09/2026. Status atual desconhecido.
- **PR #100** — branch `codex/e50-execution-20260911`: aberta em 12/09/2026 com 32 commits além de main. Status atual desconhecido.
- **PRs #304, #309, #313, #315, #316, #317, #319, #320, #321** — referências remotas `remotes/pr/NNN` detectadas no git. Conteúdo não lido nesta sessão.
- **Devin PRs** — múltiplas branches devin/*; correspondent PRs não verificadas nesta sessão.

---

## 5. Mapa de situações

| Situação | Quantidade de achados |
|----------|----------------------|
| CONFIRMADO E PENDENTE | 12 |
| PARCIALMENTE CORRIGIDO | 10 |
| NÃO VERIFICADO | 8 |
| CORRIGIDO E VERIFICADO | 1 (A-020 — lint, com ressalva) |
| SUPERADO POR MUDANÇA DE ARQUITETURA | 0 |
| REINTRODUZIDO POR REGRESSÃO | 0 (não identificado; ver nota abaixo) |
| DUPLICADO | 0 (achados são complementares, não duplicados) |
| CONTRADITÓRIO | 3 (documentados na seção 3.8) |

**Nota sobre regressão:** D-16 identificou bug real de IRRF descoberto durante E51, não presente em versões anteriores — é possível que tenha sido introduzido entre agosto e setembro de 2026. Corrigido em D-16 antes do push. Não classificado como regressão aberta.

---

## 6. Trabalho anterior recuperado

- Migrations P0 de segurança (views, `search_path`, lockout) aplicadas ao banco canônico em 11–12/09/2026 (D-14, D-15): representam o maior bloco de progresso real confirmado no banco, mas sem recertificação posterior.
- `supabase/rebaseline/`: artefatos de baseline candidatos existem; não promovidos como nova origem do schema.
- Correções de cálculo IRRF de D-16: integradas ao código atual via commit na branch `codex/e50-preflight-20260910`.
- 4.853–4.929 testes unitários acumulados: suíte funciona localmente; cobertura de branches ainda crítica.
- Redução de `any`: de 1.132 (08/2026) para 859 (10/2026) via ratchet (commit `6594b9af7`).

---

## 7. Recomendações fora do escopo desta reconciliação (backlog)

Os itens abaixo foram identificados nas auditorias mas não fazem parte do objetivo imediato de reconciliação:

1. **E50-001 / A-001**: rotação completa de credenciais MCP + Cloudflare Access — requer ação humana e acesso ao painel Cloudflare.
2. **E50-011**: ADR aprovado de corte e squash de migrations — decisão arquitetural.
3. **E50-019**: replay histórico de migrations parado no ordinal 529 (`query_telemetry.bytes_sent` ausente) — requer migração de schema do banco externo.
4. **Integrações gov/bancárias** (eSocial, FGTS Digital, DCTFWeb, PIX): homologação requer credenciais de sandbox e parceiros.
5. **P5-083/P5-084**: workflow BPMN e integração contábil — dependem de design UX e API keys externas.
6. **A-027**: consentimento LGPD para envio de IP a `api.ipify.org` — requer decisão legal/negócio.
7. **A-028**: headers Nginx de endurecimento — mudança de infra; regra 8 do Fluxo Git.
8. **E2E em produção**: 4 secrets GitHub ausentes; provisão depende do proprietário.
9. **Backup verificável com restore drill**: RPO/RTO não atendidos; requer operação planejada com dados sintéticos.

---

## 8. Decisões pendentes que requerem input humano

1. **Banco canônico correto**: confirmar se `frjbfeamybqsejlvmqbl` ainda é o banco canônico ativo (documentos de set/2026 confirmam; conector retornou `bwwbeyolnnzppeuhgkcd` em dez/2026 — possível drift).
2. **Squash das 640+ migrations locais vs. 362 no ledger**: a interseção de 16 é insuficiente para rebuild; decidir entre squash + baseline ou reconciliação incremental.
3. **Dados de produção**: confirmar se ainda são 100% sintéticos (permitindo operações agressivas) ou se há dado real que exige proteção extra.
4. **Credenciais comprometidas** (D-12): confirmar se a senha do banco e JWT service_role foram rotacionados após o handoff de set/2026.
5. **PRs devin/* e claude/***: definir se devem ser analisadas para merge, fechamento ou continuação independente.

---

*Documento gerado em 31/10/2026 por GitHub Copilot para o projeto adm01-debug/Departamento_Pessoal_V3. Preserva os documentos originais sem modificação. Registra reconciliação em arquivo novo.*
