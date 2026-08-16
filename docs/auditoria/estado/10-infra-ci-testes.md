# Infra, CI/CD e Testes

## 1. Cobertura

**Lido integralmente (arquivo por arquivo):**
- 5 workflows (`.github/workflows/*.yml`) + `.github/dependabot.yml`
- `package.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`
- 4 tsconfigs (`tsconfig.json`, `.tests.json`, `.e2e.json`, `.build.json` parcial)
- `netlify.toml`, `vercel.json`, `Dockerfile`, `Dockerfile.prod`, `docker-compose.dev.yml`, `docker-compose.prod.yml`, `nginx.conf`, `.dockerignore`, `.gitignore`, `.prettierignore`, `.lintstagedrc.json`, `.husky/*`
- `scripts/format-check-changed.sh`, `scripts/audit-edge-syntax.mjs`, `scripts/check-dependencies.js`, `scripts/generate-audit-pdf.js`, `scripts/deploy.sh`, `scripts/rollback.sh`; `main()` dos 7 scripts `audit-*.mjs`/`smoke-*.mjs`
- **Toda** a infra declarada: `k8s/` (12), `helm/` (3), `terraform/` (4), `ansible/` (2), `monitoring/` (10 + `alerts/bridge.yml`), `docker/` (5), `infra/runbooks/` (3 títulos)
- Os **26 arquivos** de `e2e/` (lista completa); 9 deles lidos linha a linha

**Amostrado / analisado programaticamente:**
- **499 arquivos de teste** (460 em `src/`, 26 em `e2e/`, 13 em `supabase/`) varridos por script próprio: resolução de todo `import`/`vi.mock`, contagem de `expect`/`it`/`vi.mock`, distribuição de matchers (6.313), detecção de `skip`/`only`/`todo`.
- **27 arquivos de teste abertos e lidos** (integral ou trechos decisivos): `rls-logic`, `rpc-permissions`, `pontoCompliance`, `authService`, `rescisaoSecurity`, `AnalyticsSection`, `useActionStateHelper`, `CPFInput`, `UnifiedAuditSection`, `GestaoRegistrosPonto`, `RubricasDialog`, `CalculoFolhaWizard`, `calculators/rescisao`, `calculators/impostos`; `supabase/tests/migration_consistency`, `external-db-bridge/validation`, `_shared/integrityHash`, `calcular-folha/index`, `fechar-folha/e2e_concorrencia`; e2e: `auth.setup`, `fuzz-testing`, `audit-checklist`, `dashboard`, `calculadora-rescisao`, `ferias`, `mobile/ponto`, `modulos-criticos`.

**Execução real do CI consultada ao vivo** via GitHub API (repo `adm01-debug/Departamento-Pessoal-V3`): lista de workflows, 572 runs, jobs e **logs brutos** dos runs `31503074185` (CI), `31503074433` (E2E) e `31916486294` (Security). Isto **não** é execução minha de build/teste — é leitura de execuções passadas do GitHub Actions.

> `node_modules` ausente. **Não executei** build, typecheck, lint, vitest ou playwright. Toda afirmação sobre "passa/falha" abaixo vem de log do GitHub Actions (citado com run/job id) ou está marcada `NAO_VERIFICADO`.

---

## 2. Tabela de funcionalidades

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta |
|---|---|---|---|
| CI — job `Type Check` (3 configs) | `IMPLEMENTADO_TOTAL` | `.github/workflows/ci.yml:19-34`; run 31503074185 job 93817736495 → 3 passos `success` | — (é o único gate de tipo que de fato reprova) |
| CI — job `Unit Tests` + thresholds de cobertura | `IMPLEMENTADO_TOTAL` | `ci.yml:49-63`; `vitest.config.ts:27-32`; job 93817736394 `success` (11min) | Thresholds baixos (lines 65 / functions 53) |
| CI — job `Lint` | `IMPLEMENTADO_PARCIAL` (quebrado) | `ci.yml:36-47`; job 93817736410 `failure` em 1s: `"typescript-eslint does not support TS 7.0"` | ESLint **aborta antes de analisar qualquer arquivo** desde 11/08/2026 |
| CI — job `Edge Functions (deno check)` | `IMPLEMENTADO_PARCIAL` | `ci.yml:65-93`; job 93817736299 `success` | Só o `external-db-bridge` bloqueia; as outras 60 funções rodam com `continue-on-error: true` (`ci.yml:81`) |
| CI — job `db-integrity` (7 gates de RLS/search_path/SECDEF) | `MORTO_OU_ABANDONADO` | `ci.yml:95-164`; log job 93817736469: `DATABASE_URL:` **vazio**, 7 passos em <1s, todos "gate NÃO executado" | Secret `SUPABASE_DB_URL` inexistente; scripts retornam 0 (`audit-rls-pii.mjs:187-191`, `audit-secdef-authz.mjs:97`, etc.) |
| E2E Playwright (workflow) | `MORTO_OU_ABANDONADO` | `e2e.yml:49`; job 93817737679: `error: lockfile had changes, but lockfile is frozen` | **161 runs, 0 sucessos** nos 30 mais recentes (23 failure + 7 cancelled). Nenhum teste E2E jamais executou |
| E2E — specs `e2e/audit-checklist.spec.ts` e `e2e/fuzz-testing.spec.ts` | `MORTO_OU_ABANDONADO` | `playwright.config.ts:35-101` (todos os `testMatch` exigem subpasta `public/`, `authenticated/`, `authenticated-non-admin/`, `mobile/`, `cleanup/`) | Estão na raiz de `e2e/` → nenhum projeto os casa |
| Security / CodeQL | `SUGERIDO_OU_INICIADO` | `security.yml:24-43`; job 95088985323: `"Code scanning is not enabled for this repository"`, `CodeQL job status was configuration error` | Code scanning desligado nas Settings; **todos** os runs recentes `failure` |
| `npm audit` no Security | `MORTO_OU_ABANDONADO` | `security.yml:39` → `npm audit --audit-level=high \|\| true` | `\|\| true` anula o gate; `security.yml:36` idem para o install |
| Branch protection | `SUGERIDO_OU_INICIADO` | `branch-protection.yml:1-29`; API: `total_count: 0` runs desde 28/07/2026 | Nunca executado. Usa `github.token` (sem `administration:write`) e `curl -s` sem `-f` → reportaria sucesso mesmo com 403 |
| Deploy preview Netlify | `IMPLEMENTADO_PARCIAL` | `deploy.yml:46-57`; 3/3 runs `success` | Só preview de PR; nenhum deploy de produção; roda **em paralelo** ao CI, sem `needs:` — publica preview de código com lint quebrado |
| `vercel.json` | `MORTO_OU_ABANDONADO` (no repo) | `vercel.json:1-45` | Nenhum workflow o referencia; se há projeto Vercel é por integração Git → `NAO_VERIFICADO` |
| `k8s/` + `helm/` + `terraform/` + `ansible/` | `SUGERIDO_OU_INICIADO` (esqueleto) | ver §3.7 | 20 de 21 arquivos são placeholder de 6 ou 14 linhas |
| `monitoring/prometheus.yml` + `alerts/bridge.yml` | `SUGERIDO_OU_INICIADO` | `monitoring/prometheus.yml:45` `'<SUPABASE_PROJECT_REF>.supabase.co'` | Placeholder não substituído; os outros 8 arquivos de `monitoring/` são stubs de 14 linhas |
| `ci:verify` (gate descrito no briefing) | `MORTO_OU_ABANDONADO` | `package.json:28`; grep em `.github/`, `.husky/`, `scripts/` → **única ocorrência é a própria definição** | Nenhum workflow o chama. `audit:edge-syntax` e `format:check:changed` **nunca rodam em CI** |
| Git hooks (husky/lint-staged) | `MORTO_OU_ABANDONADO` | `.husky/pre-commit:2` `. "\"\/bin/_/husky.sh"` (caminho inválido); modo `rw-r--r--` (sem +x); `husky` e `lint-staged` **ausentes** de `package.json` | Hook nunca dispara |
| commitlint / semantic-release / stylelint / sonar / codeclimate / lighthouse / renovate | `MORTO_OU_ABANDONADO` | `commitlint.config.js`, `release.config.js` **e** `releaserc.json` (duplicados), `stylelint.config.js`, `sonar-project.properties`, `.codeclimate.yml`, `lighthouserc.js`, `renovate.json` | Nenhuma das ferramentas está em `package.json`; nenhum workflow as invoca |
| 13 testes Deno em `supabase/` | `MORTO_OU_ABANDONADO` | `vitest.config.ts:12` (`include: src/**`), `playwright.config.ts:17` (`testDir: './e2e'`), `ci.yml:65-93` roda `deno check`, **nunca** `deno test` | Nenhum runner os executa |
| Testes unitários de `src/calculators/` | `IMPLEMENTADO_TOTAL` | `src/calculators/__tests__/impostos.test.ts:2` importa `../impostos` real; `rescisao.test.ts:2` idem | Assertivas fracas (`toBeGreaterThan(0)`, `toHaveProperty`) mas testam o alvo real |

---

## 3. Achados graves

### 3.1 [CRÍTICO] Os 7 gates de segurança de banco do CI passam sem verificar nada
`ci.yml:95-164` declara 7 passos com comentários longos sobre RLS de PII, menor privilégio, políticas multi-tenant abertas e autorização em `SECURITY DEFINER`. Todos dependem do secret `SUPABASE_DB_URL`, **que não existe**. Log do job `93817736469` (run 31503074185, main @ `f279f4bf`, 11/08/2026):

```
env:
  DATABASE_URL: 
[rls-least-privilege] Banco indisponível neste ambiente — verificação ignorada.
[rls-tenant-open] banco inacessível, gate NÃO executado: Command failed: psql ...
[secdef-authz] AVISO: banco inacessível, gate não executado
[embed-hints] AVISO — banco inacessível ... 17 dica(s) de relacionamento NÃO foram verificadas.
```

Os 7 passos completaram entre `14:43:39` e `14:43:40` (**1 segundo para os 7**) e o job foi marcado `success`. O padrão está no código: `scripts/audit-db-search-path.mjs:76-80`, `smoke-hash-triggers.mjs:59-62`, `audit-rls-pii.mjs:187-191`, `audit-rls-least-privilege.mjs:209-213`, `audit-rls-tenant-open.mjs:174-180`, `audit-secdef-authz.mjs:97-99`, `audit-embed-hints.mjs:112-115` — todos `return 0`/`exit(0)` quando não há banco. É um **check verde permanente** sobre 599 policies e 3.864 funções nunca auditadas pelo pipeline.

### 3.2 [CRÍTICO] O Lint do CI está quebrado desde 11/08/2026 e o merge foi feito assim mesmo
`CLAUDE.md` avisa explicitamente: *"NÃO re-bumpar `typescript` para ≥6.1.0"*. O commit HEAD `f279f4b` ("Bump typescript from 6.0.3 to 7.0.2 (#35)") fez exatamente isso. Log do job `93817736410`:

```
> eslint src --ext ts,tsx --max-warnings=18
typescript-eslint does not support TS 7.0.
Oops! Something went wrong! :(  ESLint: 10.8.0
##[error]Process completed with exit code 2.
```

O passo durou **1 segundo** — o ESLint aborta no `import` de `typescript-eslint/dist/index.js:52`, antes de ler um único arquivo. O PR #35 foi mergeado em `main` com o CI vermelho (run 31503074185 = `failure`), provando que **não há branch protection ativa**.

### 3.3 [CRÍTICO] Nenhum teste E2E jamais executou
`e2e.yml:49` usa `bun install --frozen-lockfile`. Log do job `93817737679`:

```
bun install v1.3.14
error: lockfile had changes, but lockfile is frozen
note: try re-running without --frozen-lockfile and commit the updated lockfile
##[error]Process completed with exit code 1.
```

`bun.lock` está dessincronizado de `package.json` (o CI usa `npm install`, que atualiza `package-lock.json` e ignora o `bun.lock`). Histórico da API: **161 runs do workflow E2E; nos 30 mais recentes (09→11/08/2026) 23 `failure` + 7 `cancelled`, ZERO sucessos.** O job morre antes do `playwright install`. Além disso, todos os secrets aparecem vazios no log (`VITE_SUPABASE_ANON_KEY:`, `E2E_USER_EMAIL:`, `E2E_USER_PASSWORD:`, `MAILOSAUR_*:`) — mesmo consertando o lockfile, `e2e/auth.setup.ts:7-8` cairia nos defaults `admin@teste.local` / `Admin@2026!`, que não existem no banco (`profiles=2`, `user_roles=4`).

### 3.4 [CRÍTICO] CodeQL nunca produziu um alerta — o workflow "de segurança" só falha
Log do job `95088985323` (run 31916486294, agendado, 16/08/2026):

```
CodeQL job status was configuration error.
Details: Code scanning is not enabled for this repository. Please enable code scanning in the repository settings.
```

Todos os runs recentes do `Security Scan & Code Quality` são `failure` (9 de 9 na janela consultada, incluindo `push`, `pull_request` e `schedule`). O único passo que "passa" é `npm audit --audit-level=high || true` (`security.yml:39`) — anulado pelo `|| true`, assim como o install em `security.yml:36` (`npm install 2>/dev/null || true`). `CLAUDE.md` afirma "CodeQL scanning ativado ✅": **falso**.

### 3.5 [ALTO] `ci:verify` é um gate de fachada — nenhum workflow o executa
`package.json:28` define `ci:verify = audit:edge-syntax && typecheck && typecheck:tests && typecheck:e2e && lint:ci && format:check:changed`. Grep em `.github/`, `.husky/`, `.lintstagedrc.json` e `scripts/`: a **única** ocorrência da string é a própria definição. `ci.yml` executa os 3 typechecks e o `lint:ci` diretamente, mas **nunca** `audit:edge-syntax` nem `format:check:changed`. Consequência: o gate de sintaxe das edge functions — criado justamente porque "quatro funções estavam com erro de sintaxe e falhavam no bundle do deploy, e em produção continuavam rodando a versão antiga, silenciosamente" (`scripts/audit-edge-syntax.mjs:7-9`) — **não roda em lugar nenhum**. Agravante: ele importa `esbuild` (`audit-edge-syntax.mjs:20`), que não é dependência direta (`package.json` não contém `esbuild`; só aparece como transitiva do Vite no `bun.lock:334`).

Sobre `--max-warnings=18`: **não consigo dizer quantos warnings existem hoje** — o lint aborta antes de analisar (§3.2) e não tenho `node_modules`. O artefato `eslint_out.json` (287 KB, na raiz, versionado) registra **8 warnings e 0 errors em 690 arquivos**, o que deixaria 10 de folga sob o teto de 18. Mas ele é **desatualizado e de outra máquina/checkout**: os `filePath` são `C:\Users\Joaquim\departamento-pessoal-v2\src\...` (Windows, repositório **v2**), e hoje `src/` tem **734** arquivos `.ts/.tsx` não-teste contra os 690 do relatório. Estado real do lint: `NAO_VERIFICADO`.

### 3.6 [ALTO] Testes que não protegem — 5 categorias, com evidência

**(a) Teste-espelho (reimplementa a lógica em vez de importar o alvo)**
- `src/tests/rls-logic.test.ts:3-14` — comentário `// Simulating RLS policy logic from migrations/006_rls_policies.sql`. Define `can_select_empresa` / `can_select_colaborador` **em TypeScript** e testa essas funções locais. Não importa nada do projeto, não abre conexão, não lê o SQL. As 5 asserções (`:29`, `:33`, `:37-38`, `:44`, `:48`) validam código que só existe dentro do próprio arquivo de teste. Isolamento multi-tenant real: 0% coberto.
- `src/services/__tests__/pontoCompliance.test.ts` — "Ponto Compliance (Portaria 671)". Monta o payload de hash à mão (`:11`), chama `CryptoJS.SHA256` e compara com ele mesmo (`:21`); reimplementa Haversine dentro do teste (`:43-52`) e valida a própria implementação (`:55`, `:61`). Não importa nenhum módulo de `src/`. O código de ponto real nunca é exercido.
- `src/services/__tests__/rescisaoSecurity.test.ts:42-50` — "Security and RLS Scenarios". O teste **chama o mock diretamente** (`await supabase.from('desligamentos').select('*').eq('empresa_id', 'target-tenant-id')`, `:47`) e em seguida assevera `expect(fromSpy).toHaveBeenCalledWith('desligamentos')` (`:49`). Tautologia pura: nenhum código de `src/services` participa.

**(b) `skip` / suíte desligada cobrindo código vivo**
- `src/tests/rpc-permissions.test.ts:22-23`: `const isCI = ...process.env.CI || process.env.GITHUB_ACTIONS; const hasBackend = Boolean(URL && ANON) && !isCI;` — e as duas suítes usam `describe.skipIf(!hasBackend)` (`:30`, `:75`). **Por construção, em CI `hasBackend` é sempre `false`**: as 4 asserções de que `check_login_lock`, `record_failed_login`, `has_role` e `get_user_scope_empresas` não são executáveis por `anon` — regressão de DoS de lockout descrita em `:31-35` — **nunca rodam no pipeline**. Pior: quando roda, o regex aceita `not found` e `egress` (`:42`, `:51`, `:62`, `:71`), então um bloqueio de rede conta como prova de que a permissão foi revogada.
- `supabase/tests/migration_consistency.test.ts:23` declara-se inofensivo: *"Todos os testes são IGNORADOS quando as envs não estão presentes — não quebra CI padrão"*. `supabase/functions/fechar-folha/e2e_concorrencia.test.ts:21,25` idem (`ignore: !canRun`).

**(c) Asserção vacuamente verdadeira**
- `src/hooks/__tests__/useActionStateHelper.test.ts:289-299` — bloco `describe('documentação viva de gaps')`, teste `'documenta: state obsoleto em chamadas rápidas'`, corpo = 6 linhas de comentário + `expect(true).toBe(true)` (`:298`).
- `src/components/__tests__/UnifiedAuditSection.test.tsx:113-123` — teste `'shows error message when isError'` cuja asserção é `expect(screen.queryByText(/Falha ao carregar/i) || screen.getByText(/Clique em Buscar/i)).toBeTruthy()`. O estado **inicial** já satisfaz o segundo operando; o teste passa mesmo que a UI de erro não exista.
- `e2e/authenticated/ferias.spec.ts` — 3 dos 4 testes são condicionais (`if (await statusFilter.isVisible())` `:21`, `if (await programmingLink.isVisible())` `:34`) e as asserções restantes têm `.catch(() => {})` engolindo a falha (`:24-26`, `:44-46`). Se o filtro não renderizar, o teste passa.
- `e2e/audit-checklist.spec.ts:25-29` registra `page.on('console', ...)` **depois** do `page.goto` (`:14`) e apenas faz `console.error` — nunca assevera.

**(d) Arquivo que nenhum runner executa**
- `e2e/audit-checklist.spec.ts` e `e2e/fuzz-testing.spec.ts`: `playwright.config.ts:35-101` define 7 projetos e **todos** os `testMatch` exigem subpasta (`/public\/.*\.spec\.ts/`, `/authenticated\/.*/`, `/authenticated-non-admin\/.*/`, `/mobile\/.*/`, `/cleanup\/.*/`). Esses dois estão na raiz de `e2e/` → nunca coletados. São justamente os únicos testes de fuzzing e de varredura de rotas admin do repositório.
- **13 arquivos de teste em `supabase/`**: `vitest.config.ts:12` (`include: ["src/**/*.{test,spec}.{ts,tsx}"]`) não os alcança; `playwright.config.ts:17` (`testDir: './e2e'`) idem; `ci.yml:65-93` roda `deno check` (tipo) e **nunca** `deno test`. Inclui `external-db-bridge/validation.test.ts` (283 linhas, "centenas de cenários" adversariais de SQL injection contra o gateway) e `_shared/integrityHash.test.ts` (selo de integridade da folha). Zero execução.
- `supabase/functions/calcular-folha/index.test.ts:4` aponta para `http://localhost:54321/functions/v1/calcular-folha` — Supabase local que nenhum workflow sobe.

**(e) Alvo do mock inexistente → o mock nunca se aplica**
Varredura de resolução de todo `import`/`vi.mock` nos 460 testes de `src/` encontrou **8 especificadores não resolvíveis**, todos em `vi.mock`:

| Teste | `vi.mock(...)` | Módulo real |
|---|---|---|
| `src/components/__tests__/RubricasDialog.test.tsx:20` | `@/validators/esocial` | `src/validators/esocialValidators.ts` |
| `src/components/__tests__/CalculoFolhaWizard.test.tsx:69` | `@/validators/esocial` | idem |
| `src/components/__tests__/GestaoRegistrosPonto.test.tsx:49,53,57` | `./PontoInconsistencyPanel`, `./GestaoPontoAnalytics`, `./PontoGeoAnalytics` | `src/components/ponto/*` (teste está em `src/components/__tests__/`) |
| `src/components/__tests__/ContratosAssinaturaKPICard.test.tsx` | `./ContratoTokenTimelineDialog` | `src/components/contratos/…` |
| `src/hooks/__tests__/useESocial.test.ts` | `./useServerValidation` | `src/hooks/useServerValidation.ts` |
| `src/services/__tests__/pontoService.test.ts` | `./pontoMonitorService` | `src/services/pontoMonitorService.ts` |

O componente sob teste importa `'./PontoInconsistencyPanel'` a partir de `src/components/ponto/` (`GestaoRegistrosPonto.tsx:10,16,17`), enquanto o teste registra o mock a partir de `src/components/__tests__/`. **São chaves de módulo diferentes** → o dublê declarado (`<div data-testid="inconsistency-panel"/>`) nunca substitui nada. Se o arquivo hoje passa, é porque o componente real renderiza; e o mesmo vale para os validadores eSocial, que se pretendia neutralizar. Qual dos dois comportamentos o Vitest 4 adota (mock silenciosamente inerte vs. erro de resolução) é `NAO_VERIFICADO` — mas em nenhuma das hipóteses o teste faz o que declara.

**Perfil quantitativo dos 460 testes de `src/`** (medido, não amostrado): 6.313 matchers, dos quais **26,0% `toBeInTheDocument`** e 3,5% `toBeDefined`/2,3% `toBeTruthy`. **39 arquivos têm ≥8 `vi.mock`** e razão de exatamente 1 asserção por teste — ex.: `AnalyticsSection.test.tsx` com **21 `vi.mock`** (react-query, supabase, router, sonner, framer-motion, 3 hooks, 2 services e todos os widgets filhos) e 8 asserções, todas `expect(screen.getByText('<literal>')).toBeInTheDocument()` (`:157-192`). Com react-query e supabase mockados, esses testes verificam que uma string estática aparece na tela — não tocam lógica de negócio nem persistência.

**Contraponto honesto:** `src/calculators/__tests__/` (9 arquivos) importa os módulos reais (`impostos.test.ts:2`, `rescisao.test.ts:2`) e exercita INSS/IRRF/FGTS/rescisão de verdade; `src/components/__tests__/CPFInput.test.tsx` testa comportamento real (máscara, `onValidate(true/false)`, estado desabilitado). O job `Unit Tests` roda com thresholds de cobertura ativos e passou. O problema não é ausência de testes — é que a maior parte da massa não protege nada.

### 3.7 [ALTO] `k8s/`, `helm/`, `terraform/`, `ansible/` são esqueleto gerado
21 arquivos; **20 são placeholder**. Dois moldes se repetem:
- 6 linhas: `# terraform/main.tf` + `# Auto-generated DevOps configuration` + `# TODO: Customize for your environment` (`terraform/main.tf`, `outputs.tf`, `variables.tf`, `helm/Chart.yaml`, `helm/values.yaml`, `k8s/configmap.yaml`, `ingress.yaml`, `secrets.yaml`, `service.yaml`).
- 14 linhas de YAML genérico `version: '1.0' / name: K8s HPA / enabled: true / settings: {environment, logging, monitoring} / config: {timeout: 300, retries: 3, cache: true}` (`k8s/*.yml` ×6, `helm/values-prod.yaml`, `ansible/inventory.yml`, `ansible/playbook.yml`, `terraform/backend.tf`, `docker/*` ×5, `monitoring/*.yml` ×8).

Detalhes que confirmam geração automática sem revisão: **`terraform/backend.tf` contém YAML, não HCL** (`version: '1.0'`) — `terraform init` falha no parse. `k8s/` tem pares duplicados `.yaml`/`.yml` do mesmo recurso (`service.yaml` placeholder de 6 linhas + `service.yml` YAML genérico de 14). O único arquivo com conteúdo plausível é `k8s/deployment.yaml` (29 linhas, `replicas: 3`, `image: departamento-pessoal:latest`) — mas nenhum pipeline constrói ou publica essa imagem. `monitoring/prometheus.yml` (88 linhas) e `monitoring/alerts/bridge.yml` são reais em forma, porém apontam para `'<SUPABASE_PROJECT_REF>.supabase.co'` (`prometheus.yml:45,69`) — placeholder nunca substituído.

### 3.8 [ALTO] Quatro alvos de deploy declarados, um só real; e o de container está quebrado
Coexistem `netlify.toml`, `vercel.json`, `Dockerfile`+`Dockerfile.prod`+2 `docker-compose`, `k8s/`+`helm/`. Evidência de qual é o real: **só o Netlify aparece em workflow** (`deploy.yml:46-57`, 3/3 runs `success`), e mesmo assim apenas como *preview de PR* — não há job de deploy de produção em nenhum dos 5 workflows. `vercel.json` não é referenciado por nada no repo (se existe projeto Vercel via integração Git é `NAO_VERIFICADO`, mas então há dois hosts servindo o mesmo bundle com CSPs idênticos duplicados manualmente — `netlify.toml:27` e `vercel.json:25` — que já vão divergir no primeiro ajuste).

Defeitos concretos no caminho de container:
- `Dockerfile.prod:12` copia `nginx.conf` para `/etc/nginx/nginx.conf`, mas `nginx.conf:1` é um bloco `server { ... }` **sem** `events{}`/`http{}` → o nginx não sobe (`"server" directive is not allowed here`). O `Dockerfile:10` (dev) copia para `conf.d/default.conf`, que é o correto — os dois divergem.
- `docker-compose.dev.yml:7` referencia `dockerfile: Dockerfile.dev`, **que não existe** no repositório.
- `docker-compose.prod.yml:13` faz healthcheck com `curl -f http://localhost/health`: `nginx.conf` não tem `location /health` e a imagem `nginx:alpine` não traz `curl`.
- `nginx.conf:11-12` faz proxy de `/api` para `http://api:3001` — não existe serviço `api` em nenhum compose.
- `Dockerfile:3-4` copia só `package.json` e roda `npm install` (sem lockfile) → build não reprodutível. `Dockerfile.prod:5` usa `npm ci --legacy-peer-deps` com `package-lock.json` (588 KB) enquanto `deploy.yml`/`e2e.yml` usam `bun.lock` — **três lockfiles/estratégias em conflito**, que é a causa raiz de §3.3.
- `netlify.toml:11` fixa `NODE_VERSION = "20"`, contra `.nvmrc` = `22`, `Dockerfile:1` `node:22-alpine` e `ci.yml:26` `node-version: '22'`.
- `package.json:8` — `build` roda `node scripts/generate-audit-pdf.js`, que lê `AUDIT_REPORT.md` e **escreve `AUDIT_REPORT.pdf` na raiz do repo** durante o build de produção (`generate-audit-pdf.js:6,17`), com `process.exit(1)` se o `.md` faltar. Acopla o deploy a um artefato de documentação.

### 3.9 [MÉDIO] Branch protection: workflow que mentiria se rodasse — e nunca rodou
`branch-protection.yml` tem `total_count: 0` runs (API, desde 28/07/2026). Se fosse disparado, `branch-protection.yml:11` usa `${{ github.token }}`, que **não tem escopo `administration: write`**, e `branch-protection.yml:13` usa `curl -s` sem `-f`/`--fail`: um HTTP 403 seria impresso como corpo JSON e o passo terminaria com exit 0 → **job verde sem proteção aplicada**. Prova indireta de que a proteção não existe: PRs do Dependabot foram mergeados em `main` com E2E e Security vermelhos (runs de 11/08/2026), e o próprio `f279f4b` entrou com o CI `failure`.

### 3.10 [MÉDIO] Gate de edge functions com dois pesos
`ci.yml:73-77` type-checa **apenas** `external-db-bridge/index.ts` com tolerância zero. `ci.yml:78-93` varre as outras ~60 funções com `continue-on-error: true` e imprime uma contagem que ninguém consome. `supabase/functions` tem 106 arquivos `.ts` / 17.908 linhas; **1 arquivo é gate, 105 são informativos**.

### 3.11 [MÉDIO] Ferramentas configuradas sem estarem instaladas
`husky`, `lint-staged`, `commitlint`, `semantic-release`, `stylelint` — **nenhum consta de `package.json`** (dependencies ou devDependencies), mas há `.husky/pre-commit`, `.husky/pre-commit.sh`, `.lintstagedrc.json`, `commitlint.config.js`, **dois** configs de semantic-release (`release.config.js` e `releaserc.json`, divergentes em formato), `stylelint.config.js`. O `.husky/pre-commit:2` é sintaticamente inválido (`. "\"\/bin/_/husky.sh"`) e o arquivo não é executável. Também há **dois bots de dependência** configurados (`.github/dependabot.yml` e `renovate.json`); todos os PRs observados são do Dependabot → `renovate.json` é config morta. `sonar-project.properties`, `.codeclimate.yml` e `lighthouserc.js` não são citados por nenhum workflow.

### 3.12 [BAIXO] Documentação do repo contradiz o CI real
`CLAUDE.md` afirma: (a) *"`typescript` re-pinado 7.0.2 → 6.0.3"* — `package.json:135` diz `"typescript": "7.0.2"`; (b) *"o `tsgo` (typecheck) vem do pacote `@typescript/native-preview`"* — o pacote **não existe** no `package.json`, e `package.json:24` roda `tsc --noEmit`; (c) *"arquivos de teste seguem excluídos do typecheck — 232 erros latentes"* — `tsconfig.tests.json:6-7` sobrescreve o `exclude` e **inclui** os testes, e o passo `Type Check (tests)` passou em 11/08 (job 93817736495); (d) *"CodeQL ativado ✅"* — §3.4. Também `eslint.config.js:87-88` comenta que `src/components/ui/**` está "excluído no tsconfig": `tsconfig.json:24-32` não o exclui, e há apenas **1** arquivo com `@ts-nocheck` em todo o `src/`.

---

## 4. Lacunas (o que NÃO consegui verificar)

1. **Estado atual do lint / contagem de warnings** — `node_modules` ausente e o ESLint aborta no CI (§3.2). O número "8 warnings" vem de `eslint_out.json`, artefato **de outra máquina (`C:\Users\Joaquim\`), de outro repositório (`departamento-pessoal-v2`) e com 690 arquivos contra os 734 atuais**. Não é execução minha nem do CI atual. `NAO_VERIFICADO`.
2. **Se `npm install` sequer resolve hoje** — TS 7.0.2 vs peer range de `typescript-eslint@8.66.0`. Nos runs de 11/08 o install passou (jobs `Install` `success`), então o `ERESOLVE` não bloqueou; mas não reproduzi localmente.
3. **Quantos dos 460 testes de `src/` efetivamente passam** — o job `Unit Tests` passou em 11/08/2026 no commit `f279f4b`, o que cobre o estado do HEAD. Não executei nada.
4. **Se existe deploy de produção fora do GitHub Actions** (Netlify build hook, integração Git da Vercel, Lovable) — nenhum workflow o faz; a existência de pipeline externo é `NAO_VERIFICADO`.
5. **Se os secrets `SUPABASE_DB_URL`, `E2E_*`, `MAILOSAUR_*`, `NETLIFY_*` existem hoje** — nos logs de 11/08 e 16/08 aparecem vazios (exceto os do Netlify, cujo job passou). Não tenho acesso às Settings do repositório.
6. **Comportamento exato do Vitest 4 diante de `vi.mock` com caminho irresolvível** (§3.6e) — se lança erro ou registra mock inerte. Ambas as hipóteses invalidam o teste; qual delas ocorre é `NAO_VERIFICADO`.
7. **Quais edge functions estão deployadas** — Management API indisponível (conforme briefing). Relevante porque o gate de sintaxe que protegeria o bundle nunca roda (§3.5).
8. **Histórico completo do E2E** — consultei os 30 runs mais recentes de 161. Não posso afirmar que o E2E *nunca na vida* passou, apenas que **não passa desde ao menos 09/08/2026**.
