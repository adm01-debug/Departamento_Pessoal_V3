# Plano de 100 etapas — Workflows GitHub Actions (auditoria de 14/10/2026)

> Escopo: os 11 workflows de `.github/workflows/`, `dependabot.yml`, `CODEOWNERS`, templates, scripts que os
> workflows executam (`scripts/audit-*.mjs`, `scripts/tests/*.sh`, `scripts/probes`, `scripts/diag`), as
> configurações vivas do repositório (ruleset `21934736`, branch protection clássica, environments `Production` e
> `Preview`, secrets, variables, permissões de Actions, webhooks, apps instalados) e o histórico real de execuções
> (289 runs de `ci.yml`, 289 de `e2e.yml`, 555 de `deploy.yml`, 855 de `security.yml`, 176 de `healthcheck.yml`,
> 57 de `canonical-migrations.yml`, 34 de `canonical-sql-diag.yml`, 7 de `canonical-probes.yml`, 4 de
> `canonical-edge-functions.yml`, 43 de `db-tests.yml`).
> Estado analisado: `main` em `ce182e4` (13/10/2026). Sucede o plano de 27/09 (`PLANO_100_WORKFLOWS_2026-09-27.md`):
> as etapas que aquele plano já entregou **não** são repetidas aqui; as que ficaram pendentes foram reavaliadas com a
> evidência atual e só entram se ainda forem necessárias.
>
> **Este documento é só o plano. Nada foi executado.**

Legenda de gate de execução:

- 🔴 **Precisa do dono** — altera CI de produção, segredos, ruleset, environment, banco canônico ou tem custo.
- 🟢 **Autônomo** — documentação, scripts locais, testes, higiene de `.github` sem efeito em produção.
- ⚙️ **Settings via API** — não é PR; é chamada de API no repositório (só com OK explícito).
- 💰 **Decisão de negócio** — custo, arquitetura ou risco; o dono decide antes de qualquer etapa dependente.

Prioridade: **P0** = produção ou gate de merge comprometido hoje · **P1** = risco real a curto prazo ·
**P2** = custo, ruído ou dívida · **P3** = higiene.

---

## 0. O que mudou desde o plano de 27/09 (para não refazer)

| Etapa de 27/09 | Estado em 14/10 | Evidência |
| --- | --- | --- |
| E01 congelar `branch-protection.yml` | ✅ `if: false` no job | `.github/workflows/branch-protection.yml:14` |
| E02 baseline do ruleset | ✅ `infra/github/ruleset-main.json` idêntico ao ruleset vivo | `get_ruleset(21934736)` |
| E08 guard job ⇄ required check | ✅ roda em `security-config` | `scripts/audit-required-checks.mjs` |
| E09 settings de merge | ✅ squash-only, delete-branch, update-branch | `get_repo` |
| E15 `apply` só de `main` | ✅ step "Gate de branch para apply" | `canonical-migrations.yml:38-46` |
| E21 fallbacks mortos removidos | ✅ | grep `VITE_SUPABASE_ANON_KEY` = 0 |
| E23 SHA-pin de todas as actions | ✅ 45 `uses:`, todos com SHA de 40 caracteres | `grep uses:` |
| E25 `bun-version: 1.3.14` | ✅ nos 3 jobs Bun | `e2e.yml:48,147`, `deploy.yml:51` |
| E30 digest do `postgres:17-alpine` | ✅ 29 scripts | `scripts/tests/*.sh` |
| E31 `engines` + `packageManager` | ✅ `node 22.x`, `npm@10.x` | `package.json:6-9` |
| E32/E62/E63/E64 Dependabot | ✅ semanal, grupos, docker, ignore TS≥6.1 | `.github/dependabot.yml` |
| E33 `timeout-minutes` | ✅ 100% dos jobs | contrato E96 |
| E34 `cancel-in-progress` só em PR | ✅ em `ci.yml`, `e2e.yml`, `deploy.yml`, `security.yml`, `db-tests.yml` | |
| E39 descoberta automática de testes Deno | ✅ `deno test supabase/functions/` | `ci.yml:227` |
| E40 reuso de `typecheck-edge.sh` no CI | ✅ no job `edge-functions`; **não** no `canonical-edge-functions.yml` (lógica duplicada ainda) | `ci.yml:222`, `canonical-edge-functions.yml:57-66` |
| E41 `rls-live` separado do job `test` | ✅ | `ci.yml:122-160` |
| E42 artifact + resumo de cobertura | ✅ | `ci.yml:84-105` |
| E44 `permissions:` top-level | ✅ nos 11 workflows | contrato E96 |
| E49/E80 issue automática de E2E na `main` + fechamento ao recuperar | ✅ mecanismo existe — e é exatamente ele que mostra o problema D1 | issue #186, 41 comentários |
| E53 retenção de artifacts | ✅ 14/7 dias | `e2e.yml` |
| E54/E55 `CI_BRANCH` + `retries` 0/2 | ✅ | `playwright.config.ts:24` |
| E57 fix `sign_before_send` | ✅ | |
| E71 probes fora do YAML | ✅ `scripts/probes/run-probes.mjs` + `rv-probes.sql` | |
| E73/E77 `SUPABASE_ACCESS_TOKEN` no environment | ✅ criado em 12/10; `canonical-edge-functions.yml` passou 3× desde então | `list_environment_secrets(Production)`; runs 38247610978, 38261720691, 38385706309 |
| E78 runbook canônico | ✅ `infra/runbooks/CANONICAL_WORKFLOWS.md` (desatualizado — ver D28) | |
| E79 `printf` no corpo da issue | ✅ | `healthcheck.yml:45` |
| E87/E88/E89/E91/E93 higiene `.github` + labels | ✅ | |
| E96/E97 contrato dos workflows no CI | ✅ `scripts/tests/workflows-contract.test.mjs` | `ci.yml:283` |
| Environment `Production` com `deployment_branch_policy` = `main` | ✅ (feito em 12/10, fora do plano) | `GET /environments/Production/deployment-branch-policies` |
| `canonical-sql-diag.yml` | 🆕 criado em 13/10 (PR #223) — não existia na auditoria anterior; 34 execuções no primeiro dia | `list_runs_for_workflow` |

Pendentes de 27/09 que **continuam válidos** e foram reabsorvidos aqui com evidência nova: E03, E04, E05, E06/E07,
E11–E14, E16, E17, E18/E19, E20, E22, E24, E26–E29, E36–E38, E43, E45, E46, E48, E50–E52, E56, E58–E61, E65, E66,
E67–E70, E72, E74–E76, E81–E86, E90, E94.

---

## 1. Diagnóstico — o que está quebrado hoje (evidência real)

| # | Achado | Evidência | Grav. |
| --- | --- | --- | --- |
| **D1** | **`bun.lock` está divergente de `package.json` desde 13/10 e isso derruba três workflows em cadeia.** O Dependabot atualiza só `package-lock.json` (3 PRs em 13/10: #216, #217, #218); `bun.lock` ficou em 07/10 (`25bbce6`). Todo job que roda `bun install --frozen-lockfile` falha com `error: lockfile had changes, but lockfile is frozen`. Consequências: (a) **`Playwright E2E` vermelho em 14 de 15 pushes recentes na `main`** (o 15º foi cancelado), issue #186 recebendo um comentário por push (41 até 13/10); (b) **`Playwright público (PR)` vermelho em todo PR** (ex.: PR #230, job 116004197050); (c) **`Build & Preview` vermelho em todo PR** (job 116004195627). Como nenhum dos três é check obrigatório, **os merges continuaram normalmente** — a "triagem" E47/E48 do plano anterior atribuiu o E2E vermelho a credenciais; a causa atual é o lockfile. O script `scripts/sync-lockfiles.sh` que detectaria o drift **existe e não roda em nenhum workflow**. | `git log -- bun.lock package-lock.json`; logs dos jobs 115484036164, 116004197050, 116004195627 | **P0** |
| **D2** | **Duas proteções divergentes na `main`, igual a 27/09.** Clássica: 6 checks (`Type Check`, `Lint`, `Unit Tests`, `Edge Functions (deno check)`, `Config de segurança`, `P0 database migration simulations`), `strict: false`, 0 aprovações, `enforce_admins: false`. Ruleset: 7 checks (troca `P0…` por `Integridade do banco…` + `CodeQL & Audit`), 1 aprovação, `bypass_mode: always` para o dono. Nenhuma exige `Playwright público (PR)`, `Build & Preview` ou `Lighthouse`. E03/E04/E05 nunca foram executadas. | `get_branch_protection(main)`, `get_ruleset(21934736)` | **P0** |
| **D3** | **Check obrigatório "verde por omissão".** `Integridade do banco (search_path x extensões)` é obrigatório no ruleset mas tem `if:` que o **pula** para Dependabot e forks; job pulado satisfaz o required check. No PR #230 (Dependabot) ele aparece como `skipped` e o PR fica mergeável. Além disso `SUPABASE_DB_URL` (URL administrativa, role `postgres`) continua **secret de repositório** e o job executa `scripts/audit-*.mjs` **do próprio PR** contra produção antes de qualquer review. Em 14 dias, 41 dos 50 commits em `main` vieram de `devin-ai-integration[bot]`: código gerado por agente roda com credencial admin do banco de produção em todo PR interno. | `ci.yml:308`; check-runs do SHA `3a60a6b`; `list_actions_secrets`; `git log --since=2026-10-01 --format=%an` | **P0** |
| **D4** | **Repositório PÚBLICO + logs públicos + workflow de SQL ad hoc em produção.** `canonical-sql-diag.yml` (criado 13/10) executa qualquer `SELECT` digitado no `workflow_dispatch` contra o banco canônico e **imprime o resultado no log do run**. Em repositório público, logs de Actions são legíveis por qualquer pessoa. Foram 34 execuções em um único dia (13/10, 16:30–16:46), por agentes, em tabelas de RH com CPF, salário e conta bancária. O environment `Production` **não tem reviewer obrigatório** (`protection_rules` só tem `branch_policy`), então o `environment:` não barra nada. O mesmo vale para o `result` JSON do `canonical-migrations.yml` e para a saída dos probes. | `get_repo.private=false`; `list_environments`; `canonical-sql-diag.yml:39,75`; `scripts/diag/run-sql-diag.mjs:175-177` | **P0** |
| **D5** | **Decisão npm × Bun nunca foi tomada e o custo chegou (D1).** Hoje: `ci.yml` usa `npm install` (mutável, sem cache, executa lifecycle scripts) em 5 jobs; `security.yml` usa `npm ci --ignore-scripts`; `e2e.yml` e `deploy.yml` usam `bun install --frozen-lockfile`; `Dockerfile` usa `npm install` sem lockfile; `Dockerfile.prod` usa `npm ci --legacy-peer-deps`; `vercel.json` usa `@vercel/static-build` (a Vercel detecta `bun.lock` e tende a instalar com Bun — **não verificado**: a API da Vercel negou `get_project`/`list_deployments` para esta sessão). A árvore testada pelo CI (npm) não é a árvore que o E2E executa (bun) nem necessariamente a que a Vercel publica. | arquivos citados; 403 da Vercel | **P1** |
| **D6** | **Toolchain flutuante e comentários de versão errados.** `deno-version: v2.x` em 2 workflows (Supabase Edge Runtime roda uma versão fixa); `deno check --no-lock` em `ci.yml:227`, `canonical-edge-functions.yml:62` e `scripts/typecheck-edge.sh:25,32` **apesar de existir `deno.lock` na raiz** (17 KB, versionado); `node-version: '22'` literal 8× em vez de `.nvmrc`; `Dockerfile` e `Dockerfile.prod` em `node:26-alpine` enquanto `engines` diz `22.x` e `.nvmrc` diz `22`; `actions/setup-node@…820762 # v4` em `canonical-probes.yml:61` e `canonical-sql-diag.yml:64` com SHA de **v7** (o Dependabot usa o comentário para decidir o bump); `npx -y @lhci/cli@0.14.0` baixa e executa código no job; `apt-get install postgresql-client` sem versão em 4 jobs; `sha_pinning_required: false` e `allowed_actions: all` nas permissões do repositório. | arquivos citados; `get_actions_permissions` | **P1** |
| **D7** | **`canonical-migrations.yml` virou o lugar onde se edita YAML a cada lote.** A lista fechada (`:126-130`) e o bloco de verificação pós-apply (`:178-420`, 40 asserts acumulados de todos os lotes desde setembro, `ledger_count === 6` para um lote de 3) são editados em todo PR de migração (#203, #226, #227 só em outubro). Dos 15 últimos runs, 2 `apply` falharam no meio (`38428460909`: `Encryption key not configured`, `38423343573`) — a transação reverte, mas não há registro de qual `validate` precedeu qual `apply`, o workflow não exige `validate` bem-sucedido no mesmo SHA antes de `apply`, e o `INSERT` no ledger grava `statements = ARRAY[]` (o `supabase db push` futuro não reconhece o conteúdo). O `config.toml` copiado no stage não é usado. | `canonical-migrations.yml`; runs listados | **P1** |
| **D8** | **Probes de segurança: 7/7 falharam e ninguém as roda desde 24/09.** Último resultado: `rv02=f` (`medidas_ciencia_tokens` com ACL/policy exposta) e `rv04=f` (RPCs de vínculo ausentes). Três semanas e 20+ migrações depois (onda 3a/3b/4a/4b), não se sabe se RV-02/RV-04 foram corrigidos. Sem `schedule`, sem `workflow_call` após `apply`, sem issue automática. | run 36047713320; `list_runs_for_workflow` | **P1** |
| **D9** | **`canonical-edge-functions.yml` publica as 63 funções inteiras a cada dispatch**, sem diff, sem smoke pós-deploy, sem rollback, sem vínculo com o SHA de `main` (basta `workflow_dispatch` de qualquer branch — o `environment` só restringe deploy via `deployment_branch_policy`, que agora está em `main`, ok). O type-check duplica `scripts/typecheck-edge.sh`. | arquivo; 4 runs | **P1** |
| **D10** | **CI gasta minutos e fila sem necessidade.** Run `38448883939` (push `main`): criado 18:49, primeiro job começou 19:08 (**20 min de fila** por 5 pushes de Dependabot em 1 h), terminou 19:17. Por push: 9 jobs em `ci.yml` + 2 em `e2e.yml` + 1 em `security.yml` (+1 em `deploy.yml` em PR). 6 jobs fazem `npm install` do zero (20 s cada) sem `cache: npm`; cache do repositório em **10,6 GB / 104 entradas**, acima da cota de 10 GB — eviction contínua, então o cache de Bun/Playwright raramente acerta. Nenhum `paths` filter em `ci.yml`: PR só de docs custa a mesma coisa. `deploy.yml` refaz o build que `lighthouse` (em `ci.yml`) e a Vercel já fazem. | `GET /actions/runs/38448883939/jobs`; `GET /actions/cache/usage` | **P2** |
| **D11** | **`deploy.yml` é um `echo`.** O job "Build & Preview" valida secrets, instala, builda e imprime uma frase. Para Dependabot (sem secrets) o step de validação roda com `secrets` vazios e falharia mesmo sem D1. Não publica artifact, não compara com Vercel, não é obrigatório. E82/E83 pendentes. | `deploy.yml`; run 38608129528 | **P2** |
| **D12** | **Lighthouse publica relatório em `temporary-public-storage`** (URL pública no log), executa `npx -y` de pacote remoto, e builda com `VITE_SUPABASE_URL \|\| ''` (em PR de fork/Dependabot o bundle vai com URL vazia e ninguém vê). Não é obrigatório. | `lighthouserc.cjs:34`; `ci.yml:162-209` | **P2** |
| **D13** | **E2E autenticado escreve no banco de produção.** As 4 identidades E2E vivem no projeto canônico; os specs `authenticated/*` criam, editam e apagam registros reais (férias, contratos, importação). Não há Supabase branch, banco de staging nem `pg_dump` de volta. O check "Supabase Preview" (integração GitHub da Supabase) **falha em todo PR com migração** com `Remote migration versions not found` (relatado no corpo do PR #209), porque o ledger de produção tem 421 versões contra 748 arquivos no repositório. `MAILOSAUR_*` continuam inexistentes (spec pulado para sempre). | `e2e.yml:116-122`; PR #209; `LEVANTAMENTO_PENDENCIAS_2026-10-12.md §5` | **P1** |
| **D14** | **CodeQL: 100+ alertas abertos, 99 de `js/unused-local-variable`** (query `security-and-quality`), do dia 31/08 até 12/10, nunca triados. `npm audit --audit-level=high` sem `--omit=dev` (vuln em devDependency trava a `main`). Sem `dependency-review-action`. `secret_scanning_non_provider_patterns` e `validity_checks` desativados. Dependabot alerts: 0 (bom). | `list_code_scanning_alerts` (100, paginado); `get_repo.security_and_analysis` | **P2** |
| **D15** | **`db-tests.yml` é workflow morto.** Filtro de caminhos só para `2026*_plano100_*.sql` (lote de 30/08 já aplicado); último run 02/10 disparado por acaso. 1 job que `ci.yml` poderia absorver (E46). | `db-tests.yml:9-18`; runs | **P2** |
| **D16** | **Webhook para N8N responde 404 a cada push.** Hook `web` → `n8n.atomicabr.com.br/webhook/gh-push-graph-sync-…`, `last_response: 404 missing`. Dispara em todo push, falha, ninguém vê. | `GET /hooks` | **P2** |
| **D17** | **`branch-protection.yml` continua com payload destrutivo** (sem `required_status_checks`), só protegido pelo `if: false`. E06/E07 (ler de `infra/github/ruleset-main.json`, modo `diff`) nunca foram feitos. Aparece como workflow "active" na UI. | `branch-protection.yml:38-67` | **P2** |
| **D18** | **`healthcheck.yml` verde 176/176, mas mede pouco.** Só HTTP 200/405 em 4 URLs; não confirma que o SHA publicado na Vercel é o de `main`, não testa login, não chama `/functions/v1/metrics`. `APP_URL` (variable) = `departamento-pessoal-v3.vercel.app`; `homepage` do repositório = `visao-v2-mmp4.vercel.app` — divergência de 27/09 ainda aberta (E81). | `list_actions_variables`; `get_repo.homepage` | **P2** |
| **D19** | **Identificadores canônicos repetidos em 9 pontos** (`frjbfeamybqsejlvmqbl` literal em `e2e.yml` ×2, 4 workflows canônicos, `scripts/validate-canonical-db-url.mjs`, `scripts/audit-canonical-project.mjs`, `vite.config.ts`). E56 pendente. Fonte única (`vars.CANONICAL_SUPABASE_REF`) nunca criada. | grep | **P2** |
| **D20** | **Contrato E96 não cobre o que quebrou.** `workflows-contract.test.mjs` valida timeout, SHA, interpolação, permissions, concurrency — não valida: comentário `# vX` ≠ versão do SHA (D6), `--no-lock` com `deno.lock` presente (D6), lockfile Bun ≠ `package.json` (D1), `if:` em job obrigatório (D3), `continue-on-error`, saída de dados de produção em log (D4). `audit-required-checks.mjs` compara com o **baseline em arquivo**, não com o ruleset vivo nem com a branch protection clássica. | scripts citados | **P2** |
| **D21** | **Nomes de check com acento, `&` e parênteses** (`Config de segurança (E-077, estático)`, `Integridade do banco (search_path x extensões)`, `CodeQL & Audit`) são a chave de matching do ruleset: qualquer ajuste de texto trava a `main` silenciosamente (o guard E08 protege, mas só se o PR rodar). | ruleset | **P3** |
| **D22** | **Issue automática vira spam.** O padrão "comentar na issue existente a cada falha" gerou 41 comentários em #186; o fechamento automático nunca acontece porque o job nunca volta a passar. `rls-live` usa o label `ci`, o mesmo que o Dependabot põe em PRs de actions. | issue #186; PR #230 labels | **P3** |
| **D23** | **Apps de terceiros com escrita** no repositório: Claude (contents/workflows/actions: write), Devin, cubic, Mermaid Diagram Sync Assistant, SonarCloud, Vercel. Nenhum inventário versionado, nenhuma regra de quem pode mergear o quê além do bypass do dono. `require_extra_approval_for_unattributed_changes: true` é anulado pelo `bypass_mode: always`. | check-runs do PR #230; ruleset | **P2** |
| **D24** | **Dependabot abre PR de GitHub Actions que vai falhar sempre** (grupo `actions`, PR #230): `Playwright público (PR)` e `Build & Preview` vermelhos por D1, `Integridade do banco` pulado por D3. `allow_auto_merge: false`, então cada bump de patch exige clique manual + aprovação de 1 revisor que o dono dá a si mesmo via bypass. | PR #230 | **P3** |
| **D25** | **`CLAUDE.md` e runbooks desatualizados de novo.** Diz "10 workflows" (são 11), "Deploy Netlify sem secrets", "Branch protection inativo", "CI não roda em repo privado" (o repo é público), e o runbook canônico diz que `production` "requer aprovação de um reviewer configurado" (não há reviewer). `ISSUE_TEMPLATE/config.yml` aponta para `BRIDGE_PERFORMANCE.md` em vez de `RESPOSTA_INCIDENTES.md`. | arquivos | **P3** |
| **D26** | **`format:check:changed` depende de `fetch-depth: 0` + `GITHUB_BASE_REF`**, mas em `push` na `main` `GITHUB_BASE_REF` é vazio e o script cai em `origin/main...HEAD` = diff vazio → gate verde sem checar nada no push pós-merge (aceitável, mas não documentado). | `scripts/format-check-changed.sh:10-31` | **P3** |
| **D27** | **`p0-database-migrations` roda 27 scripts em série, cada um sobe um Postgres** (2 min hoje). Aceitável, mas cada lote novo adiciona ~5 s e a lista é hardcoded no YAML (`ci.yml:250-277`) — um script novo em `scripts/tests/` não roda até alguém editar o YAML (mesmo defeito que E39 corrigiu para Deno). | `ci.yml` | **P2** |
| **D28** | **Runbook `CANONICAL_WORKFLOWS.md` descreve 4 workflows; existem 5** (`canonical-sql-diag.yml` ausente), afirma reviewer obrigatório inexistente, e manda editar a lista hardcoded (D7) em vez de resolver o problema. | runbook | **P3** |

---

## 2. As 100 etapas

### Bloco A — Parar o sangramento: lockfile, E2E e deploy (W01–W10) · P0

1. **W01 · Regenerar `bun.lock` com Bun 1.3.14 a partir do `package.json` atual** e commitar. Prova: `bun install --frozen-lockfile` passa localmente; `Playwright público (PR)` e `Build & Preview` voltam ao verde no mesmo PR. Motivo: D1. 🟢 (PR normal; não toca produção)
2. **W02 · Gate "lockfiles em paridade" no CI.** Novo step no job `security-config`: `bash scripts/sync-lockfiles.sh` (já existe, nunca rodou) **mais** um `bun install --frozen-lockfile --dry-run` (ou `bun install --frozen-lockfile` em runner descartável) que falha se `bun.lock` não bate com `package.json`. Esse gate vive em check obrigatório, então o drift passa a bloquear merge em vez de quebrar silenciosamente. 🔴
3. **W03 · Decidir o gerenciador único** (reaberto de E26): recomendação **npm + `package-lock.json`**, porque é o que `ci.yml`, `security.yml`, `Dockerfile.prod`, `engines`/`packageManager` e o Dependabot já usam. Alternativa: Bun em tudo, com Dependabot configurado para `bun.lock`. 💰 Decisão do dono; W04–W06 dependem dela.
4. **W04 · Migrar `e2e.yml` e `deploy.yml` para o gerenciador escolhido** (se npm: `npm ci`, `npx playwright`, `webServer.command: npm run dev` em `playwright.config.ts:106`; remover `oven-sh/setup-bun` e os caches `~/.bun`). Enquanto W03 não decide, W01+W02 seguram o sangramento. 🔴
5. **W05 · Remover o lockfile perdedor do repositório** e adicioná-lo ao `.gitignore`; `scripts/sync-lockfiles.sh` passa a ser gate de "lockfile proibido presente" em vez de paridade. 🔴
6. **W06 · Confirmar como a Vercel instala** (dashboard → Settings → General → Install Command; a sessão não teve acesso à API). Se a Vercel detectar Bun por `bun.lock`, W05 corrige; se usar npm, documentar em `infra/runbooks/` e em `CLAUDE.md`. 🔴
7. **W07 · Reexecutar o E2E autenticado na `main` após W01** e registrar quantos testes restam vermelhos. Se sobrarem falhas, elas são as de credencial/tenant da triagem E47 (`docs/auditoria/E47_TRIAGE_E2E_2026-09-27.md`) — tratar em W62. 🔴 (dispatch manual)
8. **W08 · Fechar a issue #186 com o resumo de causa raiz** (lockfile, não credencial) e um link para este plano; o fechamento automático só acontece quando o job passar (W07). 🟢
9. **W09 · Reduzir o ruído do mecanismo de issue:** comentar na issue existente **só se o SHA ou o conjunto de testes falhos mudou** (comparar com o último comentário via `gh issue view --json comments`); caso contrário, apenas atualizar o título com a contagem de runs consecutivos. Aplicar em `e2e.yml`, `healthcheck.yml` e `rls-live`. Motivo: D22. 🔴
10. **W10 · Dependabot: tornar PRs de dependência verificáveis.** Enquanto W03 não resolve, adicionar ao grupo `minor-patch` um `post-update` documentado (regenerar `bun.lock`) **ou** desligar o ecossistema que não é o escolhido. Nenhum PR de Dependabot pode nascer com check vermelho estrutural. Motivo: D24. 🟢

### Bloco B — Uma proteção só, com os checks certos (W11–W20) · P0

11. **W11 · Reescrever `infra/github/ruleset-main.json`** com `required_status_checks` = união das duas listas atuais + `Playwright público (PR)` + `Build` (W87) + `Lockfiles em paridade` (W02): `Type Check`, `Lint`, `Unit Tests`, `Edge Functions (deno check)`, `Config de segurança (E-077, estático)`, `Integridade do banco (search_path x extensões)`, `P0 database migration simulations`, `CodeQL & Audit`, `Playwright público (PR)`; `strict_required_status_checks_policy: true`. (Era E04.) 🔴
12. **W12 · Aplicar o ruleset via API a partir do arquivo** (⚙️ `update_ruleset(21934736)` com o JSON de W11) — nunca via `branch-protection.yml` enquanto W16 não existir. (Era E04/E03.)
13. **W13 · Remover a branch protection clássica** (⚙️ `delete_branch_protection(main)`) **depois** de W12 estar verde em um PR de teste. Uma fonte só. (Era E03.) Motivo: D2.
14. **W14 · Modelo de aprovação com dono único** (era E05): manter `required_approving_review_count: 1`, trocar `bypass_mode: always` → `pull_request` (bypass só para o merge, nunca para push direto), e registrar no runbook que o bypass fica no audit log. 💰 + ⚙️
15. **W15 · Eliminar o "verde por omissão" no `db-integrity`** (era E17): o job passa a **sempre rodar**. Para Dependabot/fork executa a parte estática (`test:db-audit-contract`) e termina com sucesso explícito e log "alvo canônico não disponível para este ator"; para PR interno exige `DATABASE_URL` e falha fechado. Combinar com W23 (URL read-only). Motivo: D3. 🔴
16. **W16 · `branch-protection.yml` → `ruleset-sync.yml` em modo `diff` por padrão** (era E06/E07): lê `infra/github/ruleset-main.json`, baixa o ruleset vivo, imprime `jq` diff; `apply` só com input explícito e `environment: production`. Remover o heredoc destrutivo. Motivo: D17. 🔴
17. **W17 · `audit-required-checks.mjs` compara também com o ruleset vivo** quando `GITHUB_TOKEN` estiver disponível (`GET /repos/…/rulesets/21934736`), e falha se baseline ≠ vivo. Roda em `ruleset-sync.yml` (W16) e semanalmente. Motivo: D20. 🟢
18. **W18 · Renomear os checks para identificadores estáveis ASCII** (`ci / typecheck`, `ci / lint`, `ci / unit`, `ci / edge`, `ci / security-config`, `ci / db-integrity`, `ci / p0-migrations`, `security / codeql`, `e2e / public`) **no mesmo PR** que atualiza W11 e o guard E08. Motivo: D21. 🔴 (coordenado com W12)
19. **W19 · `CODEOWNERS` com efeito ou sem arquivo** (era E90): com W14, ligar `require_code_owner_review: true` para `.github/workflows/**`, `supabase/migrations/**`, `infra/**`; o resto fica livre. Se o dono preferir, apagar o arquivo. 💰
20. **W20 · PR de validação ponta a ponta da proteção**: um PR docs-only e um PR com migração provam que (a) todos os required checks reportam, (b) nenhum fica `skipped`, (c) o bypass não é necessário para o fluxo normal. Registrar run IDs em `docs/auditoria/estado/`. 🔴

### Bloco C — Segredos, environments, repositório público e logs (W21–W32) · P0/P1

21. **W21 · Decisão: tornar o repositório privado** (era E18). O repositório contém project ref, modelo de dados de RH, inventário de 63 Edge Functions, e **logs de Actions com saída de SQL de produção** (D4). Se ficar público, W22, W27 e W28 tornam-se obrigatórios. 💰 ⚙️ `update_repo(private=true)`
22. **W22 · Se público: `allow_forking=false` e `pull_request_creation_policy: collaborators`** (era E19). ⚙️
23. **W23 · Role Postgres `ci_auditor` somente-leitura** (era E11): `SELECT` em `pg_catalog`, `information_schema`, `pg_policies`, `cron.job`; sem `public`. Migration versionada e aplicada pelo fluxo canônico. 🔴 (DDL em produção)
24. **W24 · Secret `SUPABASE_DB_URL_READONLY` (role W23) no repositório**, consumido só por `db-integrity` em PR. (Era E12.) ⚙️
25. **W25 · Mover `SUPABASE_DB_URL` (admin) para o environment `Production` e apagar a cópia de repositório** (era E13). Workflows canônicos já usam `environment: production`; `rls-live` (push `main`) passa a usar o environment também. ⚙️
26. **W26 · Reviewer obrigatório no environment `Production`** (`reviewers: [adm01-debug]`, `prevent_self_review: false` por ser dono único, `wait_timer: 0`). Hoje `environment: production` é decorativo (D4). Era E14. ⚙️ `create_or_update_environment`
27. **W27 · `canonical-sql-diag.yml`: nunca imprimir dados de linha em log.** (a) Restringir por padrão a `pg_catalog`, `information_schema`, `cron`, `supabase_migrations` e views de diagnóstico sem PII; (b) consultas em `public.*` exigem input `allow_pii=true` **e** o resultado vai para **artifact com retenção de 1 dia** (não para o log), com `::add-mask::` em colunas que batam com regex de CPF/PIS/conta; (c) limite de 50 linhas; (d) registrar quem disparou e a consulta em `audit_log` (via a própria conexão). Motivo: D4. 🔴
28. **W28 · Varredura dos logs já publicados** (34 runs de `canonical-sql-diag.yml` + `canonical-migrations.yml` + `canonical-probes.yml`): listar quais runs imprimiram linhas de tabelas com PII e **apagar os logs** (⚙️ `delete_workflow_run_logs`) — os runs continuam, só o log some. Registrar no `ROTACAO_SEGREDOS.md`/incidente LGPD se houver exposição. 🔴
29. **W29 · Fonte única de identidade pública** (era E22): `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` existem como secret **e** variable. Manter só `vars`, apagar os secrets homônimos, ajustar `ci.yml`, `e2e.yml`, `deploy.yml`, `healthcheck.yml`. ⚙️ + 🔴
30. **W30 · `vars.CANONICAL_SUPABASE_REF` e `vars.CANONICAL_SUPABASE_URL`** (era E56): workflows e scripts (`validate-canonical-db-url.mjs`, `audit-canonical-project.mjs`) leem da var com fallback para a constante, e um teste garante que as duas coincidem. Motivo: D19. ⚙️ + 🟢
31. **W31 · Inventário versionado dos GitHub Apps e integrações com escrita** (`infra/github/apps.md`): Claude, Devin, cubic, Mermaid Diagram Sync Assistant, SonarCloud, Vercel, Supabase GitHub integration, webhook N8N. Para cada um: permissões, quem instalou, o que pode fazer num PR, como revogar. Motivo: D23. 🟢
32. **W32 · Regra de merge para PRs de agentes**: PR cujo autor é bot (`devin-ai-integration[bot]`, `claude[bot]`, `dependabot[bot]`) não pode ser mergeado por bypass; exige aprovação humana real (W14) e `require_extra_approval_for_unattributed_changes` efetivo. Documentar em `CONTRIBUTING.md`. 💰

### Bloco D — Supply chain e reprodutibilidade (W33–W44) · P1

33. **W33 · `sha_pinning_required=true`** (⚙️ `set_actions_permissions`) — os 45 `uses:` já estão pinados; a política impede regressão. (Era E24.)
34. **W34 · `allowed_actions: selected`** com GitHub + verified creators + a lista explícita dos 7 repositórios de actions usados (`actions/*`, `github/codeql-action`, `denoland/setup-deno`, `oven-sh/setup-bun` enquanto existir, `supabase/setup-cli`). ⚙️
35. **W35 · Corrigir os comentários `# v4` → `# v7`** em `canonical-probes.yml:61` e `canonical-sql-diag.yml:64` e adicionar ao contrato E96 um teste "comentário de versão coerente com o SHA" (consulta `GET /repos/{action}/git/ref/tags/{tag}` em modo online, ou tabela `infra/github/action-pins.json` em modo offline). Motivo: D6. 🟢
36. **W36 · `deno.lock` de verdade**: remover `--no-lock` de `ci.yml:227`, `canonical-edge-functions.yml:62` e `scripts/typecheck-edge.sh:25,32`; `deno check --lock=deno.lock --frozen`; cache `~/.cache/deno` keyed por `deno.lock`. Verificar que o `deno.lock` da raiz cobre `supabase/functions/**` (se não, gerar um em `supabase/functions/deno.lock`). (Era E29.) 🔴
37. **W37 · Pinar `deno-version` na versão exata que o Supabase Edge Runtime executa** (consultar `supabase functions list --output json` / docs da release do runtime) nos 2 workflows; Dependabot não acompanha Deno, então registrar a data de revisão no YAML. 🔴
38. **W38 · `node-version-file: .nvmrc`** nos 8 `setup-node`; `.nvmrc` → `22.x` exato que o Vercel usa; `Dockerfile` e `Dockerfile.prod` de `node:26-alpine` para `node:22-alpine` por digest (Dependabot docker continua bumpando patch). Motivo: D6. 🔴
39. **W39 · `npm ci --ignore-scripts` em `ci.yml`** (5 jobs) com `cache: npm` no `setup-node`; onde o build precisa de binário nativo (`sharp`, `esbuild`), adicionar `npm rebuild <pkg>` explícito. `prepare: husky` deixa de rodar em CI (`HUSKY=0`). (Era E27/E28.) 🔴
40. **W40 · `@lhci/cli` como devDependency pinada** (em vez de `npx -y …@0.14.0`), e upload do relatório para artifact (não `temporary-public-storage`). Motivo: D12. 🔴
41. **W41 · `postgresql-client` por versão fixa** (`postgresql-client-17=17.x…`) nos 4 jobs, ou substituir por container `postgres:17-alpine@sha256:…` já pinado em `scripts/tests` e usar `docker run --rm … psql`. 🔴
42. **W42 · Dependabot: `cooldown` de 7 dias para npm e `open-pull-requests-limit` menor** (10 → 5) até W03; o grupo `actions` passa a `schedule: monthly` se W33 estiver ligado (o SHA pin é a proteção real). 🟢
43. **W43 · Provenance mínima**: o job `lighthouse`/`build` publica `dist/` como artifact com `attest-build-provenance` (action da GitHub, pinada), para que a Vercel ou um auditor possa comparar o hash do que foi publicado com o que o CI construiu. 🔴
44. **W44 · OSSF Scorecard semanal** publicando em code-scanning (era E66): mede exatamente W33–W43. 🔴

### Bloco E — `ci.yml`: custo, cache, fila (W45–W56) · P2

45. **W45 · Filtro de mudanças (`dorny/paths-filter` pinado) em um job `changes`**: `p0-database-migrations` só roda se `supabase/migrations/**` ou `scripts/tests/**` mudou; `edge-functions` só se `supabase/functions/**` ou `deno.lock`; `lighthouse` só se `src/**`, `vite.config.ts`, `package-lock.json`. Jobs filtrados terminam com **sucesso explícito** (não `skipped`) para continuar satisfazendo o ruleset. (Era E37.) 🔴
46. **W46 · Descoberta automática dos scripts P0/P1** (`find scripts/tests -name 'migrations-p*.sh' | sort`), eliminando a lista hardcoded `ci.yml:250-277`. Motivo: D27. 🔴
47. **W47 · Um Postgres por shard, não por script**: `strategy.matrix` com 3 shards e `scripts/tests/run-shard.sh N/3`, cada shard reutilizando o container com `DROP SCHEMA … CASCADE` entre scripts (ou `services:` + `template1`). Meta: P0 de 2 min → <1 min e paralelo. (Era E38.) 🔴
48. **W48 · Limpar o cache de Actions e reindexar**: apagar as 104 entradas (⚙️ `delete_actions_cache`), passar a usar `setup-node cache: npm` (W39) e uma chave só por lockfile; meta < 3 GB. Motivo: D10. ⚙️
49. **W49 · `concurrency` por SHA para pushes em `main`** (`group: ci-main-${{ github.sha }}`), evitando que 5 merges seguidos do Dependabot enfileirem 20 min. 🔴
50. **W50 · Dependabot: auto-merge de patch/minor dos grupos `minor-patch`, `actions`, `docker` quando todos os checks obrigatórios passam** — `allow_auto_merge=true` (⚙️) + workflow `dependabot-automerge.yml` com `gh pr merge --auto --squash` apenas para `github.actor == 'dependabot[bot]'` e `update-type` ≠ major (via `dependabot/fetch-metadata`, pinado). Requer W14 (o bot não pode se auto-aprovar; usar `pull-request-reviews: write` de um app ou manter aprovação humana e só automatizar o merge após aprovação). 💰
51. **W51 · `$GITHUB_STEP_SUMMARY` nos gates `security-config`, `db-integrity`, `p0-database-migrations`** com tabela script → resultado → duração (era E45). 🔴
52. **W52 · Absorver `db-tests.yml` no job P0** (era E46): `scripts/tests/migrations-plano100.sh` entra na descoberta de W46; apagar o workflow. Motivo: D15. 🔴
53. **W53 · `lint:ci --max-warnings=1` → baseline versionado** (era E43): mover o número para `scripts/.eslint-warnings-baseline.json` (o `ratchet-lint-warnings.mjs` já tem o mecanismo). 🟢
54. **W54 · `typecheck`: `persist-credentials: false` já está; adicionar `sparse-checkout`?** Não: o typecheck precisa de tudo. Em vez disso, mover "Contrato físico dos eventos de auditoria Edge" (`ci.yml:36-41`) para `security-config` (é estático) e deixar `typecheck` puro. 🟢
55. **W55 · Medir antes/depois**: `GET /actions/workflows/{id}/timing` não se aplica a repo público; usar `jobs[].started_at/completed_at` dos últimos 50 runs via `scripts/report-workflows.mjs` (W92) e gravar em `docs/auditoria/estado/WORKFLOWS_STATUS.md`. Meta: PR docs-only ≤ 4 min; PR de código ≤ 12 min; fila ≤ 2 min. (Era E98/E99.) 🟢
56. **W56 · Retenção de artifacts do `coverage-*`** (14 dias) e dos relatórios Lighthouse (7 dias); `delete_artifact` dos acumulados antes de 01/10. ⚙️

### Bloco F — E2E e isolamento de produção (W57–W66) · P1

57. **W57 · `Playwright público (PR)` como check obrigatório** (em W11) — depois de W01, é verde e dura ~2 min. 🔴
58. **W58 · Decisão: onde o E2E autenticado escreve** (era E52, reaberto com evidência D13). Opções: (a) **Supabase branch** por PR (a integração já está instalada; precisa reconciliar o ledger — W73); (b) projeto Supabase de staging com seed; (c) manter produção com identidades sintéticas e `cleanup` obrigatório. Recomendação: (b) até W73 fechar, depois (a). 💰
59. **W59 · Seed determinístico para o E2E** (`scripts/e2e/seed.sql` + `scripts/provision-e2e-users.mjs` já existente): cria empresa, 2 usuários, 3 colaboradores, 1 folha aberta; roda no alvo de W58 antes do job `playwright`. 🔴
60. **W60 · `cleanup` que apaga o que o E2E criou** no alvo (hoje `cleanup/logout.spec.ts` só faz logout): deletar por `empresa_id` da empresa sintética. 🔴
61. **W61 · `workflow_dispatch` no `e2e.yml`** com inputs `project` (`public|authenticated|authenticated-non-admin|mobile-smoke`) e `ref`, para reexecução sem push (era E51). 🔴
62. **W62 · Se W07 ainda mostrar falhas após W01**: aplicar a triagem E47 (credencial, tenant default, `user_roles`) usando `scripts/provision-e2e-users.mjs` com `E2E_ALLOW_EXISTING_ACCOUNT=1` no alvo de W58. 🔴
63. **W63 · Mailosaur: decidir** (era E52 original): contratar e criar os 3 secrets, ou remover `reset-password-callback.spec.ts` e as 3 variáveis de `e2e.yml:123-125`. 💰
64. **W64 · Smoke pós-deploy real** (era E55): `post-deploy-smoke.yml` em `deployment_status` (a Vercel emite) com `state == success` e environment `Production`: `test:e2e:public` contra a URL do deployment e `healthcheck.sh` com `REQUIRE_APP=1`. Fecha o buraco entre merge e o healthcheck de 6 h. 🔴
65. **W65 · Traces só do que falhou** já está (`retain-on-failure`); adicionar `--reporter=github` já está. Falta: `--shard` 2× no job autenticado (13 specs, 2 workers) e `timeout-minutes: 30 → 20` quando W58 isolar o alvo. 🟢
66. **W66 · Dependência de E2E ↔ migrações**: o job `playwright` em `main` passa a rodar **depois** de `canonical-migrations apply` do mesmo SHA quando houver migração no push (via `workflow_run` ou `needs` num workflow único de release — W75). Hoje o E2E pode rodar contra um banco que ainda não recebeu a migração do commit testado. 🔴

### Bloco G — Workflows canônicos: migrações, Edge Functions, probes, diagnóstico (W67–W80) · P1

67. **W67 · `canonical-migrations.yml`: lista de migrações por input ou por diff, nunca hardcoded** (era E67/E68): input `migrations` (multilinha, regex `^\d{14}_[a-z0-9_]+\.sql$`) **ou** vazio ⇒ `scripts/db/classify-migration-drift.mjs` deriva "arquivos no repo sem versão no ledger" e imprime a lista para confirmação em `validate`; `apply` exige lista explícita igual à do último `validate` bem-sucedido (W68). Motivo: D7. 🔴
68. **W68 · `apply` exige `validate` verde no mesmo SHA e mesma lista**: o `validate` grava artifact `validated-<sha>.json` (lista + hash dos arquivos); o `apply` baixa o artifact do run anterior (`gh run download`) e compara; sem artifact, aborta. 🔴
69. **W69 · Verificação pós-apply genérica** (era E69): substituir o bloco de 40 asserts por (a) ledger contém exatamente as versões do lote; (b) cada migração pode declarar seus asserts num arquivo irmão `supabase/migrations/<versão>.verify.sql` (SELECT que retorna `ok`); (c) `canonical-probes` roda como job `needs` no mesmo run. Os asserts históricos migram para os `.verify.sql` dos lotes correspondentes. 🔴
70. **W70 · Ledger com `statements` preenchido**: o `INSERT` em `supabase_migrations.schema_migrations` passa a gravar `statements = ARRAY[pg_read_file…]` ou, mais simples, o conteúdo do arquivo via `psql -v`, para que `supabase migration list` e o check "Supabase Preview" reconheçam o lote. 🔴
71. **W71 · `canonical-probes.yml` com `schedule` diário + `workflow_call`** (era E70): falha abre issue com label `canonical` (dedupe por W09); saída estruturada em `$GITHUB_STEP_SUMMARY`, **sem dados de linha**. Motivo: D8. 🔴
72. **W72 · Triar RV-02 e RV-04 hoje**, rodando os probes contra o canônico (dispatch manual) após as ondas 4a/4b: se ainda falharem, migration P0; se passarem, fechar o item e registrar o run. (Era E72.) 🔴
73. **W73 · Reconciliar o ledger de produção com o repositório** (pré-requisito de W58a e do check "Supabase Preview"): seguir `infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md`; registrar as 7 versões aplicadas com timestamp diferente via `supabase migration repair --status applied` em modo `validate` primeiro; medir "arquivos sem versão" antes/depois com `scripts/db/classify-migration-drift.mjs`. 🔴 (operação de produção)
74. **W74 · `canonical-edge-functions.yml` reutiliza `scripts/typecheck-edge.sh`** (era E40, metade pendente) e ganha input `functions` (lista) com default "as que mudaram desde o último deploy bem-sucedido" (comparar `git diff --name-only <sha-do-último-run-verde>`). Motivo: D9. 🔴
75. **W75 · Deploy de Edge Functions em `push main` com path filter** `supabase/functions/**` + `supabase/config.toml`, atrás do environment protegido (W26), com `dry-run` por padrão em PR (só `deno check` + diff de inventário). (Era E74/E75.) 🔴
76. **W76 · Smoke pós-deploy das Edge Functions** (era E76): `scripts/healthcheck.sh` com `REQUIRE_BACKEND=1` + chamada autenticada a `external-db-bridge` com payload inofensivo; falha ⇒ issue `canonical` + instrução de rollback (redeploy do SHA anterior via o mesmo workflow com `ref`). 🔴
77. **W77 · Concurrency compartilhada `canonical-database`** entre migrations, probes e sql-diag (era E77): hoje são 3 grupos distintos; um diagnóstico pode ler estado intermediário de um `apply`. 🔴
78. **W78 · `canonical-sql-diag.yml`: pré-requisitos de uso** além de W27: `timeout-minutes: 5` já existe; adicionar `statement_timeout = '15s'`, `SET LOCAL ROLE` para uma role read-only (W23) em vez de `postgres`, e registro do `actor` + query em `audit_log`. 🔴
79. **W79 · Runbook `CANONICAL_WORKFLOWS.md` reescrito** para 5 workflows, fluxo W67–W78, "reviewer obrigatório" só depois de W26 existir, e a regra "o YAML não muda por lote". Motivo: D28. 🟢
80. **W80 · Verificação pós-apply da onda 4b**: o run `38428460909` falhou em `encrypt_dados_bancarios` por chave do Vault ausente e foi refeito após `fix(vault)`; confirmar no canônico que `contas_bancarias.*_encrypted` existe e que o `cron`/trigger de criptografia tem a chave — como item do `verify.sql` de W69 e do probe de W71. 🔴

### Bloco H — Security, CodeQL e Dependabot (W81–W88) · P2

81. **W81 · CodeQL só `security-extended`** (era E58): os 99 alertas `unused-local-variable` são qualidade e já são cobertos pelo ESLint (`no-unused-vars`). Fechar os 100+ abertos com `dismissed_reason: won't fix` após W82. 🔴
82. **W82 · Corrigir o único alerta `warning`** (`js/comparison-between-incompatible-types`) e os `unused-local-variable` de `supabase/functions/**` (8 — código que roda em produção). 🟢
83. **W83 · `npm audit --omit=dev --audit-level=high` como gate** + job informativo com dev (era E61); arquivo `audit-ci.json` para exceções datadas. 🔴
84. **W84 · `actions/dependency-review-action`** (pinada) em PR: bloqueia `high`/`critical` e licenças copyleft fortes (era E60). 🔴
85. **W85 · `secret_scanning_non_provider_patterns` e `validity_checks` ligados** (era E65). ⚙️ `update_repo`
86. **W86 · `zizmor` + `actionlint` no CI** (era E94): job `workflow-lint` em PR que toque `.github/**`; `actionlint` já está no `lint-staged` local. 🔴
87. **W87 · `deploy.yml` → `build.yml`** (era E82/E83): `npm ci` + `npm run build` + artifact `dist/` + `audit:bundle` (hoje duplicado em `lighthouse`) + attest (W43); `lighthouse` passa a baixar o artifact em vez de rebuildar; não roda para Dependabot (sucesso explícito). Remover o step "Vercel preview handoff". Motivo: D11. 🔴
88. **W88 · `security.yml`: `npm ci` só se houver `package-lock.json` escolhido em W03**; CodeQL `build-mode: none` explícito (já é o default para JS, mas documenta); `schedule` move para quinta 03:00 BRT para não coincidir com os três Dependabots (seg/ter/qua 09:00). 🟢

### Bloco I — Observabilidade, healthcheck, deploy e documentação (W89–W96) · P2/P3

89. **W89 · Webhook N8N: consertar ou remover.** `last_response 404` em todo push desde (pelo menos) 29/08. Se o fluxo `gh-push-graph-sync` ainda importa, corrigir a URL no N8N; senão ⚙️ `delete_webhook`. Motivo: D16. 🔴
90. **W90 · `APP_URL` e `homepage` alinhados** (era E81): confirmar a URL canônica de produção na Vercel e corrigir o outro lado. ⚙️
91. **W91 · Healthcheck mais forte**: além dos 4 HTTP, (a) `GET /` da `APP_URL` e comparar o `<meta name="build-sha">` (injetar `VITE_GIT_SHA` no build) com `main`; (b) `POST /auth/v1/token` com a identidade E2E não-admin e `REQUIRE_LOGIN=1`; (c) `/functions/v1/metrics` ≠ 503. Motivo: D18. 🔴
92. **W92 · `scripts/report-workflows.mjs` + `docs/auditoria/estado/WORKFLOWS_STATUS.md`** (era E86): último run por workflow, taxa de falha 7/30 dias, duração mediana, fila mediana, cache usado; gerado semanalmente por workflow `workflows-report.yml` que abre PR. 🔴
93. **W93 · Notificação de `main` vermelha fora do GitHub** (era E84): `notify-main-failure.yml` em `workflow_run` (`conclusion: failure`, branch `main`) → webhook N8N (o que for consertado em W89) → WhatsApp/e-mail. A issue #186 com 41 comentários prova que issue não é alerta. 💰 (integra N8N)
94. **W94 · `CLAUDE.md` e `README.md`**: 11 workflows, repo público (ou privado após W21), estado real da proteção, tabela "Gaps Conhecidos" refeita a partir deste plano (remover "Deploy Netlify", "Branch protection inativo", "CI não roda em repo privado"), `ISSUE_TEMPLATE/config.yml` → `RESPOSTA_INCIDENTES.md`. Motivo: D25. 🟢
95. **W95 · `format:check:changed` em push na `main`**: documentar que o gate só vale em PR (D26) ou passar `BASE_REF=HEAD~1` em `push`. 🟢
96. **W96 · Labels e dedupe**: `rls-live` usa label `ci-main` (não `ci`, que o Dependabot usa); `healthcheck`, `e2e-main`, `canonical`, `ci-main` ficam documentados em `infra/github/labels.json` e criados por `ruleset-sync.yml`. Motivo: D22. 🟢

### Bloco J — Meta-gates e fechamento (W97–W100)

97. **W97 · Contrato E96 ampliado** (motivo: D20): (a) comentário `# vX` coerente com o SHA (W35); (b) proibir `--no-lock` quando `deno.lock` existe; (c) proibir `if:` em job cujo `name:` está no ruleset baseline (D3); (d) proibir `continue-on-error` sem comentário `# contrato: …`; (e) proibir `echo`/`cat` de variáveis que casem `SUPABASE_DB_URL|DIAG_QUERY|RESULT` em `run:`; (f) proibir `npx -y`; (g) exigir `node-version-file`. 🟢
98. **W98 · Teste de regressão do D1**: `scripts/tests/lockfile-parity.test.sh` que, num tmpdir, altera `package.json` e prova que W02 falha; roda em `security-config`. 🟢
99. **W99 · Rodada de validação final**: executar W20 (PRs de prova) de novo com tudo aplicado, mais um `canonical-migrations validate` + `apply` de um lote vazio, um `canonical-probes` agendado, um `post-deploy-smoke` e um `ruleset-sync diff` limpo. Registrar run IDs. 🔴
100. **W100 · `REVISAO_IMPLEMENTACAO_PLANO_100_WORKFLOWS_<data>.md`**: estado de cada etapa (feito / pendente / descartado e por quê), evidência por run/API, lista das decisões 💰 e o que mudou em `CLAUDE.md`. 🟢

---

## 3. Ordem de execução recomendada (por risco evitado)

| Onda | Etapas | Resultado esperado |
| --- | --- | --- |
| **0 — hoje, sem decisão** | W01, W02, W08, W35, W53, W54, W82, W94, W95, W96, W97, W98 | E2E, deploy e PRs voltam ao verde; o drift passa a bloquear merge; docs param de mentir |
| **1 — decisões do dono** | W03, W14, W21, W32, W50, W58, W63, W93 | npm × Bun; aprovação; privado × público; onde o E2E escreve |
| **2 — proteção e segredos** | W11, W12, W13, W15, W16, W17, W18, W19, W20, W23–W30 | uma proteção só, checks reais, URL admin fora de PR, logs sem PII |
| **3 — supply chain e custo** | W04–W06, W33, W34, W36–W49, W51, W52, W55, W56 | árvore única, cache que acerta, fila curta |
| **4 — canônicos** | W67–W80, W66 | YAML não muda por lote; apply só após validate; probes diárias; Edge com smoke |
| **5 — E2E e observabilidade** | W57, W59–W62, W64, W65, W83–W92 | E2E isolado, smoke pós-deploy, alerta real de `main` vermelha |
| **Fechamento** | W99, W100 | evidência e revisão |

Decisões que só o dono toma (💰): **W03** (npm × Bun), **W14** (modelo de aprovação), **W19** (CODEOWNERS), **W21**
(repo privado), **W32** (merge de PRs de agentes), **W50** (auto-merge do Dependabot), **W58** (alvo do E2E
autenticado), **W63** (Mailosaur), **W93** (alerta via N8N/WhatsApp).

Metas mensuráveis ao fim do plano:

| Indicador | Hoje | Meta |
| --- | --- | --- |
| Pushes em `main` com E2E autenticado vermelho (últimos 15) | 14 | 0 |
| PRs com check estrutural vermelho ou `skipped` obrigatório | 100% (D1, D3) | 0 |
| Proteções de `main` | 2 divergentes | 1 ruleset = arquivo |
| Secrets admin disponíveis a código de PR | 1 (`SUPABASE_DB_URL`) | 0 |
| Runs que imprimem dados de linha de produção em log | 34+ | 0 |
| Fila mediana de CI em `main` | ~20 min em rajada | ≤ 2 min |
| Cache de Actions | 10,6 GB / 104 | ≤ 3 GB |
| Edições de YAML por lote de migração | 1 PR por lote | 0 |
| Probes canônicos | último run 24/09, 7/7 falhos | diário, verde |
| Alertas CodeQL abertos | 100+ | < 10, todos triados |

---

## 4. Evidência (IDs para conferência)

- Runs: CI `38448883939` (fila 20 min, 9 jobs); E2E main `38448883863` (job `115484036164`, `lockfile is frozen`);
  E2E PR #230 job `116004197050`; deploy PR #230 job `116004195627`; canonical-migrations `38428460909`
  (`Encryption key not configured`) e `38423343573`; canonical-edge-functions `37450077900` (token ausente, antes
  de 12/10); canonical-probes `36047713320` (`rv02=f`, `rv04=f`).
- API: `get_repo` (`private=false`, `allow_auto_merge=false`, `homepage=visao-v2-mmp4`), `get_branch_protection(main)`,
  `get_ruleset(21934736)`, `get_actions_permissions` (`allowed_actions=all`, `sha_pinning_required=false`),
  `list_actions_secrets` (8), `list_actions_variables` (3), `list_environments` (sem reviewers),
  `GET /environments/Production/deployment-branch-policies` (`main`), `list_environment_secrets(Production)`
  (`SUPABASE_ACCESS_TOKEN`), `GET /actions/cache/usage` (10,59 GB / 104), `GET /hooks` (N8N 404),
  `list_code_scanning_alerts` (100, 99 `unused-local-variable`), `list_dependabot_alerts` (0),
  check-runs do SHA `3a60a6b8` (17 contextos, 6 apps).
- Git: `git log -- bun.lock` (último `25bbce6`, 07/10) vs `git log -- package-lock.json` (último `ce182e4`, 13/10);
  `git log --since=2026-10-01 --format=%an` (41 devin, 5 dependabot, 4 adm01-debug).
- Não verificado nesta sessão: configuração de build/install da Vercel (API retornou 403/404 para o projeto
  `prj_nCbUFP7iVkSyHIX4FiuypueFsizl`) — tratado em W06.
