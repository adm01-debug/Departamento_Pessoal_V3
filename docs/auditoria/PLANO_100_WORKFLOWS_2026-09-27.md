# Plano de 100 etapas — Workflows GitHub Actions (auditoria de 27/09/2026)

> Escopo: os 10 workflows de `.github/workflows/`, `dependabot.yml`, `CODEOWNERS`, templates,
> configurações do repositório (ruleset, branch protection, environments, secrets, variables,
> permissões de Actions) e o histórico real de execuções (2.057 runs).
> Estado analisado: `main` em `ff37e7f`. **Este documento é só o plano. Nada foi executado.**

Legenda de gate de merge (regra 8 do fluxo Git):
- 🔴 **Precisa do Joaquim** — CI, segredos, ruleset, environment, banco de produção, custo.
- 🟢 **Autônomo** — documentação, scripts locais, higiene de `.github` sem efeito em CI.
- ⚙️ **Settings via MCP** — não é PR; é chamada de API no repositório (só com OK explícito).

---

## 0. Diagnóstico — o que está quebrado hoje (evidência real)

| # | Achado | Evidência | Gravidade |
|---|--------|-----------|-----------|
| D1 | **`branch-protection.yml` apaga os checks obrigatórios se for executado.** O payload do ruleset não contém a regra `required_status_checks`; o ruleset vivo (`21934736`) tem 7 checks. `PUT` substitui a lista de regras inteira. Hoje só não destrói porque o secret `BRANCH_PROTECTION_TOKEN` não existe e o job aborta no primeiro `if`. | `get_ruleset` vs. `.github/workflows/branch-protection.yml:38-67`; `list_actions_secrets` (7 secrets, sem `BRANCH_PROTECTION_TOKEN`) | P0 |
| D2 | **Duas proteções divergentes na `main`.** Branch protection clássica: 7 checks (inclui `P0 database migration simulations`, exclui `CodeQL & Audit`), `strict: true`, 0 aprovações, `enforce_admins: false`. Ruleset: 7 checks (inclui `CodeQL & Audit`, exclui `P0 …`), `strict: false`, 1 aprovação, `bypass_actors: owner=always`. Nenhuma exige `Playwright público (PR)`. | `get_branch_protection` + `get_ruleset` | P0 |
| D3 | **URL administrativa do banco canônico exposta a código de PR.** `SUPABASE_DB_URL` é secret de **repositório**; `ci.yml` job `db-integrity` roda em `pull_request` de branch interna e executa `scripts/audit-*.mjs` do próprio PR com essa URL. Um PR que edite um desses scripts roda código arbitrário contra produção **antes de review**. O environment `Production` tem **0 secrets e 0 regras de proteção**, então `environment: production` nos workflows canônicos é decorativo. | `list_actions_secrets`, `list_environment_secrets(Production)=0`, `list_environments` (`protection_rules: []`), `ci.yml:157-176` | P0 |
| D4 | **DDL aplicado em produção a partir de branches não mergeadas.** As 32 execuções de `canonical-migrations.yml` (modo `apply` incluído) partiram de `claude/fix-batidas-ponto-rls-2`, `claude/fix-registros-ponto-rls`, `claude/affectionate-sagan-kq50`… Sem `deployment_branch_policy`, sem revisor obrigatório. | `list_runs_for_workflow(canonical-migrations.yml)` | P0 |
| D5 | **E2E autenticado vermelho na `main` há 4 runs consecutivos (desde 24/09 22:45) e ninguém foi avisado.** 18 testes falham (`toBeVisible`/`toHaveURL` em colaboradores, folha, holerites, ponto, férias, eSocial, relatórios, configurações, dashboard). Não é check obrigatório, não abre issue, não notifica. | run `36076301600`, job `107888151089`: `18 failed` | P0 |
| D6 | **Probes de segurança no canônico: 7/7 execuções falharam.** Última: `RV-02` (`medidas_ciencia_tokens` exposta por ACL ou policy) e `RV-04` (RPCs de vínculo ausentes). Ou é exposição real em produção, ou expectativa desatualizada — em ambos os casos ninguém triou. Workflow é manual, sem schedule. | run `36047713320`: `{"rv02":"f","rv04":"f","ledger":"403"}` | P0 |
| D7 | **Deploy de Edge Functions nunca passou pelo CI.** `canonical-edge-functions.yml` tem **0 execuções** e `SUPABASE_ACCESS_TOKEN` não existe em lugar nenhum (repo nem environment). Os deploys estão acontecendo por CLI fora do GitHub, sem rastro. | `list_runs_for_workflow` = 0; `list_actions_secrets`; `list_environment_secrets` | P1 |
| D8 | **Repositório é PÚBLICO** (`private: false`) enquanto `CLAUDE.md`, a justificativa do fallback Bun→Node e a postura dos workflows assumem privado. Consequência prática: PRs de fork disparam `pull_request`, e o job `db-integrity` (obrigatório) é **pulado** para forks/Dependabot — job pulado conta como **sucesso** para required check. Dependabot já mergeou 3 PRs com esse check "verde por omissão" (#122, #126, #128). | `get_repo.private=false`; `ci.yml:150` (`if:`); docs GitHub "skipped job = success" | P0 |
| D9 | **Nenhuma action fixada por SHA**; `sha_pinning_required: false`; `allowed_actions: all`; `setup-bun` com `bun-version: latest` em 3 workflows. | `get_actions_permissions`; `grep uses:` | P1 |
| D10 | **Dois lockfiles e três instaladores.** `bun.lock` + `package-lock.json` coexistem; `ci.yml` usa `npm install` (mutável, sem cache), `security.yml` usa `npm ci`, `e2e.yml` usa `bun install --frozen-lockfile`, `deploy.yml` usa `bun install` sem frozen. A árvore testada não é necessariamente a árvore deployada pelo Vercel. | arquivos na raiz; 4 workflows | P1 |
| D11 | **Zero `timeout-minutes`** em `ci.yml` (7 jobs), `security.yml`, `deploy.yml`, `branch-protection.yml`, `healthcheck.yml` e nos 3 canônicos. Só `e2e.yml` e `db-tests.yml` têm. Job travado = 6 h de runner cobrado. | grep `timeout-minutes` | P1 |
| D12 | **`healthcheck.yml` gera issue com `\n` literal** (string em aspas duplas sem `printf`/`-e`), não fecha a issue quando o ambiente volta, e se o `gh issue create --label` falhar cria sem label — quebrando a deduplicação na próxima rodada. `APP_URL` (`departamento-pessoal-v3.vercel.app`) difere do `homepage` do repo (`visao-v2-mmp4.vercel.app`). | `healthcheck.yml:35-47`; `list_actions_variables`; `get_repo.homepage` | P2 |
| D13 | **Workflows canônicos são "de uso único".** `canonical-migrations.yml` tem a lista de migrations e a verificação pós-apply **hardcoded para o lote `bp_*`**; qualquer próximo lote exige editar o YAML (e a verificação falha para qualquer outro lote). `CANONICAL_REF` e a URL canônica repetidos em 5 pontos. | `canonical-migrations.yml:98-108,150-176`; `e2e.yml:40,111` | P1 |
| D14 | **CI gasta minutos sem necessidade.** 4× `npm install` sem cache; 26 scripts P0 sobem 26 Postgres em série; `fetch-depth: 0` no typecheck; `deploy.yml` refaz o build que o Vercel já faz em todo PR (inclusive Dependabot); E2E público + Security + Deploy + CI para cada bump do Dependabot; traces de E2E (84 MB/run) retidos 90 dias. | `ci.yml`; run E2E `36076301600` (artifact 84 MB) | P2 |
| D15 | **Testes de Edge Function com lista hardcoded de 15 globs.** Um `*.test.ts` novo em outra pasta nunca roda. `deno check --no-lock` sem `deno.lock` → imports `esm.sh` não reproduzíveis. | `ci.yml:105-107` | P2 |
| D16 | **Dependabot** sem ecossistema `docker` (há `Dockerfile`, `Dockerfile.prod`, 2 compose), `github-actions` só mensal e sem grupo, sem `ignore` para `typescript >= 6.1` (o `CLAUDE.md` documenta que TS 7 quebra o lint), grupos cobrem só 3 famílias. 30 alertas CodeQL abertos desde 31/08, nunca triados (todos `note`/`warning`). | `dependabot.yml`; `list_code_scanning_alerts` | P2 |
| D17 | **Higiene `.github`**: PR template duplicado (`PULL_REQUEST_TEMPLATE.md` e `pull_request_template.md` idênticos), issue templates em dobro (`.md` + `.yml` para os mesmos 2 tipos, sem `config.yml`), `FUNDING.yml` com Ko-fi em repo de RH, `CODEOWNERS` decorativo (`require_code_owner_review: false`), `ci.yml` escuta `master` (não existe), fallbacks para `VITE_SUPABASE_ANON_KEY` (secret inexistente) em 4 lugares, `delete_branch_on_merge: false`, `allow_merge_commit: true` (ruleset só permite squash/rebase). `CLAUDE.md` diz "7 workflows", "TS 7", "CI não roda em repo privado", "testes fora do typecheck" — tudo desatualizado. | arquivos; `get_repo` | P3 |

---

## Bloco A — Uma só proteção de `main`, correta (E01–E10)

1. **E01 · Congelar o `branch-protection.yml` antes de qualquer coisa.** Adicionar `if: false` no job (ou renomear para `.disabled`) até E04. Motivo: D1 — executá-lo hoje apaga os required checks. 🔴 `.github/workflows/branch-protection.yml`
2. **E02 · Exportar o ruleset vivo como baseline versionado.** Salvar o JSON de `get_ruleset(21934736)` em `infra/github/ruleset-main.json` para diff futuro. 🟢
3. **E03 · Decidir a fonte única: ruleset.** Remover a branch protection clássica (⚙️ `delete_branch_protection`) **depois** que o ruleset carregar a união dos checks (E04). Motivo: D2.
4. **E04 · Reescrever o payload do ruleset** com `required_status_checks` = união das duas listas + `Playwright público (PR)` + `Build` (E80): `Type Check`, `Lint`, `Unit Tests`, `Edge Functions (deno check)`, `Config de segurança (E-077, estático)`, `Integridade do banco (search_path x extensões)`, `P0 database migration simulations`, `CodeQL & Audit`, `Playwright público (PR)`; `strict_required_status_checks_policy: true`. 🔴
5. **E05 · Aprovação obrigatória compatível com dono único.** Manter `required_approving_review_count: 1`, mas trocar `bypass_mode: always` por `pull_request` (bypass só para merge, não para push direto) e documentar que o bypass é registrado no audit log. Alternativa de negócio: 0 aprovações + Claude Code Review como check obrigatório. 🔴
6. **E06 · Ler o ruleset a partir de arquivo, não de heredoc.** `branch-protection.yml` passa a fazer `jq -f infra/github/ruleset-main.json` — o review do PR vê exatamente o que vai para a API. 🔴
7. **E07 · Modo `plan` no workflow de proteção.** Input `mode: [diff, apply]`; `diff` baixa o ruleset atual e mostra `jq --slurp` das diferenças sem escrever. Default `diff`. 🔴
8. **E08 · Guard automático "job name ⇄ required check".** Novo `scripts/audit-required-checks.mjs`: lê `infra/github/ruleset-main.json` e os `name:` dos jobs em `.github/workflows/*.yml`; falha se algum check obrigatório não corresponder a um job existente (renomear job hoje trava a `main` silenciosamente). Roda no job `security-config`. 🟢
9. **E09 · Alinhar settings do repo ao ruleset.** ⚙️ `update_repo`: `allow_merge_commit=false`, `delete_branch_on_merge=true`, `allow_update_branch=true`, `use_squash_pr_title_as_default=true`. Motivo: D17.
10. **E10 · `enforce_admins` equivalente no ruleset.** Confirmar que sem bypass `always` o owner também passa pelos checks; registrar no runbook o procedimento de emergência (bypass documentado). 🟢 `infra/runbooks/`

## Bloco B — Segredos, environments e superfície de ataque (E11–E22)

11. **E11 · Criar role Postgres somente-leitura `ci_auditor`** (SELECT em `pg_catalog`, `information_schema`, `pg_policies`; sem `public`). Migration versionada + registro no ledger. Motivo: D3. 🔴 (DDL em produção)
12. **E12 · Novo secret `SUPABASE_DB_URL_READONLY`** com a role E11, no **repositório**; usado apenas pelo job `db-integrity`. ⚙️ `set_actions_secret`
13. **E13 · Mover `SUPABASE_DB_URL` (admin) para o environment `Production`** e apagar a cópia de repositório. ⚙️ `set_environment_secret` + `delete_actions_secret`
14. **E14 · Proteger o environment `Production`.** `reviewers: [adm01-debug]`, `deployment_branch_policy: protected_branches` (só `main`), `wait_timer: 0`. ⚙️ `create_or_update_environment`. Motivo: D3, D4.
15. **E15 · `canonical-migrations.yml` modo `apply` exige `main`.** Step inicial: `test "$GITHUB_REF" = refs/heads/main || exit 1` quando `inputs.mode == 'apply'`; `validate` continua livre para branches. 🔴
16. **E16 · `db-integrity` em PR usa a URL read-only; em `push main` usa a admin via environment.** Dois jobs (`db-integrity-pr`, `db-integrity-main`) ou `env` condicional. O check obrigatório passa a ser o de PR. 🔴 `ci.yml`
17. **E17 · Eliminar o "verde por omissão".** Trocar o `if:` do `db-integrity` por um job que **sempre roda** e, para fork/Dependabot, executa só a parte estática (`test:db-audit-contract`) e falha explicitamente se `DATABASE_URL` vazia **em PR interno**. Motivo: D8. 🔴
18. **E18 · Decisão de negócio: tornar o repo privado.** Contém project ref canônico, URLs de produção, modelo de dados de RH com PII e o inventário de Edge Functions. ⚙️ `update_repo(private=true)`. Se ficar público: E19–E20 tornam-se obrigatórios.
19. **E19 · `pull_request_creation_policy`/forks.** Se público: ⚙️ `allow_forking=false` e `pull_request_creation_policy: collaborators`. Se privado: desnecessário.
20. **E20 · Auditoria de `${{ }}` em `run:`.** Substituir `${{ steps.stage.outputs.dir }}` (canonical-migrations, 2×) por `env:`; grep-gate em `scripts/audit-workflow-hygiene.mjs` (E94) proibindo `${{ github.event.*` e `${{ inputs.*` dentro de `run:`. 🔴
21. **E21 · Remover fallbacks mortos `secrets.VITE_SUPABASE_ANON_KEY`** (ci.yml, deploy.yml, e2e.yml, healthcheck.yml). Secret não existe; o `||` só esconde erro de configuração. 🔴
22. **E22 · Fonte única de identidade pública.** `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` existem como secret **e** como variable. Manter só as `vars` (são públicas por natureza), apagar os secrets homônimos, ajustar 4 workflows. ⚙️ + 🔴

## Bloco C — Supply chain e reprodutibilidade (E23–E32)

23. **E23 · Pinar todas as actions por SHA** (16× `checkout@v7`, 7× `setup-node@v7`, 4× `cache@v6`, 3× `upload-artifact@v7`, 3× `setup-bun@v2`, 2× `setup-deno@v2`, `setup-cli@v1`, `codeql-action@v4.37.9`) com comentário `# vX.Y.Z`. Motivo: D9. 🔴
24. **E24 · Ligar `sha_pinning_required=true`** e `allowed_actions: selected` (GitHub + verified creators + os 6 repos usados). ⚙️ `set_actions_permissions` / `set_selected_actions`. Só depois de E23.
25. **E25 · Fixar `bun-version`** (ex.: `1.3.14`, a mesma do `CLAUDE.md`) nos 3 workflows; remover `continue-on-error` do `setup-bun` em `deploy.yml` (mascara falha real). 🔴
26. **E26 · Um gerenciador só.** Decisão: **npm + `package-lock.json`** (é o que Vercel usa com `@vercel/static-build` e o que `security.yml` já usa). Remover `bun.lock` do repo, `bun install` dos workflows e dos scripts `ci:verify`. Motivo: D10. 🔴 (mexe em build/deploy)
27. **E27 · `npm ci` em todo lugar** (ci.yml ×4, deploy.yml) com `--ignore-scripts` onde não há build (`prepare: husky` roda em CI hoje). 🔴
28. **E28 · Cache de dependências.** `actions/setup-node` com `cache: npm` nos 6 jobs Node; chave por `package-lock.json`. 🔴
29. **E29 · `deno.lock` versionado** para `supabase/functions` + cache `~/.cache/deno` keyed por `deno.lock`; remover `--no-lock` de ci.yml, canonical-edge-functions.yml e `scripts/typecheck-edge.sh`. Motivo: D15. 🔴
30. **E30 · Pinar `postgres:17-alpine` por digest** nos 33 scripts de teste (`scripts/tests/*.sh`) via variável única `PG_IMAGE` em `scripts/tests/_lib.sh`. 🟢
31. **E31 · `engines` + `packageManager` no `package.json`** (`node: "22.x"`, `npm`), alinhar `.nvmrc` (hoje `22`) e Dockerfile. 🟢
32. **E32 · Dependabot `github-actions` semanal e agrupado** (`groups: actions: patterns: ["*"]`), com `cooldown` de 7 dias para npm. 🟢

## Bloco D — `ci.yml`: robustez e custo (E33–E46)

33. **E33 · `timeout-minutes` em todos os jobs**: typecheck 15, lint 15, test 20, edge-functions 20, security-config 10, p0 30, db-integrity 15. Idem security 20, deploy 15, healthcheck 10, canônicos 20, branch-protection 5. Motivo: D11. 🔴
34. **E34 · `cancel-in-progress` só em PR**: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` para nunca cancelar run da `main`. 🔴
35. **E35 · Remover `master` dos triggers** (`branches: [main]`). 🔴
36. **E36 · `fetch-depth: 0` só onde o `format:check:changed` precisa** (job `lint`); no `typecheck` voltar ao default. 🔴
37. **E37 · Filtro de caminhos para jobs pesados.** `dorny/paths-filter` (pinado) num job `changes`; `p0-database-migrations` só roda se `supabase/migrations/**|scripts/tests/**` mudou; para PR só de docs o job devolve sucesso explícito com log "sem alteração relevante" (não `skipped`, para não depender do comportamento de E17). 🔴
38. **E38 · Paralelizar os 26 scripts P0.** `strategy.matrix` com 4 shards (`scripts/tests/run-shard.sh N/4`) ou um único Postgres via `services:` reutilizado com `DROP SCHEMA` entre scripts. Meta: de ~26 subidas seriais para ≤4 paralelas. 🔴
39. **E39 · Descoberta automática de testes Deno.** Substituir os 15 globs por `find supabase/functions -name '*.test.ts' -print0 | xargs -0 deno test --allow-env`. Motivo: D15. 🔴
40. **E40 · Reusar `scripts/typecheck-edge.sh`** no job `edge-functions` e no `canonical-edge-functions.yml` (hoje a lógica está triplicada). 🔴
41. **E41 · Job `test` não depende de produção.** `RUN_LIVE_RLS_TESTS` sai do job unitário e vai para um job `rls-live` separado, não obrigatório, só em `push main`. Unit test de PR deixa de flutuar com a saúde do Supabase. 🔴
42. **E42 · Upload do relatório de coverage** (`coverage/` como artifact, 14 dias) e resumo em `$GITHUB_STEP_SUMMARY`. 🔴
43. **E43 · `lint:ci --max-warnings=881` vira baseline versionado.** Mover o número para `scripts/.eslint-warnings-baseline.json` lido por `ratchet-any.mjs` (mesmo mecanismo do orçamento de `any`). 🟢
44. **E44 · `permissions:` explícito em todo workflow** (`deploy.yml` e `db-tests.yml` não têm bloco top-level). 🔴
45. **E45 · `$GITHUB_STEP_SUMMARY` nos gates de auditoria** (`security-config`, `db-integrity`, `p0`): tabela de scripts executados/resultado, para não precisar abrir log. 🔴
46. **E46 · Absorver `db-tests.yml` no job P0** (3 migrations `plano100` + suíte de asserts) e apagar o workflow. Path filter de plano encerrado = workflow morto. 🔴

## Bloco E — E2E: parar de sangrar em silêncio (E47–E56)

47. **E47 · Triagem dos 18 testes vermelhos na `main`** usando o artifact `playwright-traces-36076301600` (84 MB) e `playwright-report`. Hipótese principal: `auth.setup.ts` não persiste sessão (todas as rotas autenticadas caem em `toBeVisible`/`toHaveURL`). Registrar causa raiz em `docs/auditoria/`. Motivo: D5. 🟢 (diagnóstico)
48. **E48 · Corrigir a causa raiz de E47** (código ou credencial `E2E_USER_*`). Se for credencial, rotacionar via ⚙️; se for app, PR de fix. 🔴
49. **E49 · Falha de E2E na `main` abre issue** (mesmo padrão do healthcheck, label `e2e-main`, dedupe, fecha sozinha ao voltar a verde). 🔴
50. **E50 · `Playwright público (PR)` como check obrigatório** (E04) — dura 2 min e já roda em todo PR. 🔴
51. **E51 · `workflow_dispatch` no `e2e.yml`** com input `project` (`public|authenticated|mobile-smoke`) para reexecução manual sem push. 🔴
52. **E52 · Mailosaur: decidir.** Secrets `MAILOSAUR_*` não existem → `reset-password-callback.spec.ts` é pulado para sempre. Ou contratar/configurar (custo) ou remover o spec e a referência do workflow. 🔴 (custo)
53. **E53 · Retenção de artifacts**: traces/report 14 dias (hoje 90), público 7 dias (hoje 30). Cota de storage. 🔴
54. **E54 · `retries: 2` só em `main`; em PR `retries: 0`** para flakiness aparecer onde é barato corrigir. 🟢 `playwright.config.ts`
55. **E55 · Smoke pós-deploy real.** Novo workflow `post-deploy-smoke.yml` em `deployment_status` (Vercel emite) com `state == success` e environment `Production`: roda `test:e2e:public` contra a URL do deployment. Fecha o gap entre merge e o healthcheck de 6 h. 🔴
56. **E56 · Constante única de canônico.** `vars.CANONICAL_SUPABASE_REF` e `vars.CANONICAL_SUPABASE_URL`; workflows comparam com a var, não com string literal (e2e.yml ×2, canônicos ×3). `scripts/audit-canonical-project.mjs` passa a validar a var também. Motivo: D13. ⚙️ + 🔴

## Bloco F — Security, CodeQL e Dependabot (E57–E66)

57. **E57 · Triar os 30 alertas CodeQL abertos** (19 `unused-local-variable`, 4 `useless-assignment`, 2 `trivial-conditional`, 2 `useless-comparison`, 2 `unneeded-defensive-code`, 1 `incompatible-types`): corrigir os de `src/utils/safeError.ts`, `processar-agendamentos`, `alertas-preditivos`; dispensar os de teste com justificativa. 🟢
58. **E58 · CodeQL só `security-extended`** (não `security-and-quality`) — os 30 alertas são de qualidade, ruído que ninguém tria. Qualidade fica no ESLint. 🔴
59. **E59 · `concurrency` no `security.yml`** e `timeout` (E33). 🔴
60. **E60 · `dependency-review-action`** (pinado) em PR: bloqueia `high`/`critical` e licenças GPL/AGPL. Complementa o `npm audit` que só olha o lock inteiro. 🔴
61. **E61 · `npm audit` com política de exceção.** `--omit=dev` para o gate bloqueante + job informativo com dev; arquivo `.nsprc`/`audit-ci.json` para exceções datadas. Hoje uma vuln transitiva em devDependency trava a `main`. 🔴
62. **E62 · Dependabot: `ignore` `typescript` `>=6.1.0`** com comentário apontando o `CLAUDE.md` (TS 7 quebra `typescript-eslint`). Motivo: D16. 🟢
63. **E63 · Dependabot: grupo `docker`** (`Dockerfile`, `Dockerfile.prod`, `docker-compose.*.yml`) semanal. 🟢
64. **E64 · Dependabot: grupo catch-all `minor-patch`** para npm (tudo que não é radix/react/testing) — reduz de N PRs individuais para 1 por semana. Cada PR hoje custa ~20 min de runner (CI + Security + E2E público + Deploy). 🟢
65. **E65 · Habilitar `secret_scanning_non_provider_patterns` e `validity_checks`** (gratuito). ⚙️ `update_repo`
66. **E66 · Scorecard OSSF** semanal (`ossf/scorecard-action`, pinado) publicando em code-scanning — mede exatamente os itens deste bloco e do Bloco C. 🔴

## Bloco G — Workflows canônicos reutilizáveis e seguros (E67–E78)

67. **E67 · `canonical-migrations.yml`: lista de migrations por input**, não hardcoded. Input `migrations` (multilinha) validado por regex `^\d{14}_[a-z0-9_]+\.sql$` e existência do arquivo. Motivo: D13. 🔴
68. **E68 · Derivar a lista do drift repo⇄ledger.** Input vazio ⇒ usa a detecção do PR #132 (migration no repo sem registro no ledger) e imprime a lista para confirmação em `validate`; `apply` exige lista explícita. 🔴
69. **E69 · Verificação pós-apply genérica.** Substituir o bloco `bp_*` por: (a) ledger contém todas as versões aplicadas; (b) `canonical-probes` roda como job dependente (`needs`) no mesmo run. 🔴
70. **E70 · `canonical-probes.yml` roda em schedule diário** + `workflow_call` (para E69) + `workflow_dispatch`. Falha abre issue (padrão healthcheck). Motivo: D6. 🔴
71. **E71 · Probes saem do YAML para `scripts/canonical-probes.sql` + `scripts/canonical-probes.mjs`** — testáveis localmente contra Postgres descartável, saída JSON estruturada (acaba com o parsing frágil de `$GITHUB_OUTPUT`). 🟢
72. **E72 · Triar RV-02 e RV-04 hoje.** Confirmar no banco se `medidas_ciencia_tokens` tem ACL/policy exposta e se `get_my_user_empresas()`, `set_own_default_empresa`, `admin_associar_usuario_empresa`, `pode_gerir_rh_para`, `pode_gerir_pessoas_para` existem. Se exposição real → migration P0; se expectativa velha → ajustar probe. 🔴
73. **E73 · `SUPABASE_ACCESS_TOKEN` no environment `Production`** (token de CI dedicado, escopo mínimo) para o `canonical-edge-functions.yml` finalmente funcionar. Motivo: D7. ⚙️
74. **E74 · Primeira execução controlada do deploy de Edge Functions via CI** em modo `dry-run` (novo input: só `deno check` + `functions list` + diff de inventário, sem `deploy`). 🔴
75. **E75 · Deploy de Edge Functions em `push main` com path filter** `supabase/functions/**` + `supabase/config.toml`, atrás do environment protegido (E14). Deploy manual por CLI vira exceção documentada. 🔴
76. **E76 · Pós-deploy de Edge Functions chama `scripts/healthcheck.sh`** com `REQUIRE_BACKEND=1` contra o canônico. 🔴
77. **E77 · Concurrency compartilhada `canonical-database`** entre migrations e probes (hoje grupos distintos; probes durante `apply` leem estado intermediário). 🔴
78. **E78 · Runbook `infra/runbooks/CANONICAL_WORKFLOWS.md`**: quem dispara, com qual input, o que cada saída (`CANONICAL_*_OK`) significa, como reverter. 🟢

## Bloco H — Healthcheck, deploy e observabilidade (E79–E86)

79. **E79 · `healthcheck.yml`: corpo da issue com `printf`/heredoc**, link do run como markdown, e `gh issue create --label` só após garantir a label (`gh label create healthcheck --force`). Motivo: D12. 🔴
80. **E80 · Fechar a issue automaticamente ao voltar a verde** (`if: success()` → `gh issue close` com comentário "recuperado em <run>"). 🔴
81. **E81 · `APP_URL`: confirmar a URL canônica de produção** (variable diz `departamento-pessoal-v3.vercel.app`, `homepage` do repo diz `visao-v2-mmp4.vercel.app`) e alinhar as duas. ⚙️
82. **E82 · `deploy.yml` vira `build.yml` obrigatório e útil**: `npm ci` + `npm run build` + artifact `dist/` + orçamento de bundle (`size-limit` ou script que compara com baseline) + `permissions`, `concurrency`, `timeout`. Remove o step "Vercel preview handoff" (é um `echo`). Motivo: D14. 🔴
83. **E83 · Não rodar `build` para Dependabot** (`if: github.actor != 'dependabot[bot]'` com sucesso explícito), CI + Security já cobrem. 🔴
84. **E84 · Notificação de falha na `main` fora do GitHub.** Workflow `notify-main-failure.yml` em `workflow_run` (`conclusion: failure`, branch `main`) → webhook N8N → WhatsApp (`wpp2`). Hoje 4 runs vermelhos de E2E passaram despercebidos. 🔴 (integra N8N)
85. **E85 · `deployment_status` do Vercel como fonte de "deploy confirmado".** Registrar em `$GITHUB_STEP_SUMMARY` a URL e o SHA deployado (base para E55). 🔴
86. **E86 · Dashboard de saúde dos workflows** em `docs/auditoria/estado/WORKFLOWS_STATUS.md` gerado por script (`scripts/report-workflows.mjs` via API): último run por workflow, taxa de falha 7 dias, minutos consumidos. Rodar semanal e commitar via PR automático. 🔴

## Bloco I — Higiene de `.github` e documentação (E87–E93)

87. **E87 · Remover `pull_request_template.md` duplicado**; manter `PULL_REQUEST_TEMPLATE.md` e adicionar seção "Verificado de verdade (log/query/request)" — exigência da regra 10 do fluxo. 🟢
88. **E88 · Issue templates: só `.yml`** (apagar `bug_report.md` e `feature_request.md`) + `config.yml` com `blank_issues_enabled: false` e link para o runbook de incidentes. 🟢
89. **E89 · Remover `FUNDING.yml`** (Ko-fi em repo corporativo de RH). 🟢
90. **E90 · `CODEOWNERS` com efeito**: ou `require_code_owner_review: true` no ruleset (E04) ou remover o arquivo. Manter decorativo confunde. 🔴
91. **E91 · Atualizar `CLAUDE.md`**: 10 workflows (não 7), TS 6.0.3 pinado, repo público/privado (conforme E18), testes **incluídos** no typecheck (`tsconfig.tests.json`), branch protection **ativa** via ruleset, secrets/variables reais, tabela "gaps" refeita a partir deste plano. Motivo: D17. 🟢
92. **E92 · `README.md` com badges dos workflows obrigatórios** (CI, Security, E2E, Healthcheck) — visibilidade imediata de `main` vermelha. 🟢
93. **E93 · Labels padronizadas** para automações: `healthcheck` (existe), `e2e-main`, `ci`, `dependencies`, `security`, `canonical`. ⚙️ `create_label`

## Bloco J — Meta-gates e verificação final (E94–E100)

94. **E94 · `actionlint` + `zizmor` no CI** (job `workflow-lint`, pinados) rodando em todo PR que toque `.github/**`. Pegam sozinhos: `${{ }}` em `run:`, permissões largas, actions sem pin, `\n` literal, `if:` inválido. 🔴
95. **E95 · Pre-commit local para `.github/**`** (`lint-staged`: `actionlint`), para o erro morrer antes do push. 🟢 `.lintstagedrc.json`
96. **E96 · Teste de contrato dos workflows** `scripts/tests/workflows-contract.test.mjs`: todo job tem `timeout-minutes`, todo `uses:` tem SHA de 40 chars, nenhum `run:` interpola `${{ github.event`/`inputs`, todo workflow tem `permissions:`, `concurrency` presente onde há `pull_request`. Roda em `security-config`. 🟢
97. **E97 · Reexecutar `branch-protection.yml` em modo `diff`** (E07) e anexar a saída como evidência de que ruleset == arquivo. 🔴
98. **E98 · Rodada de validação ponta a ponta**: PR de teste (docs-only) e PR de teste (migration) para provar path filters, checks obrigatórios, tempo total e custo por PR antes/depois (meta: PR docs ≤ 4 min; PR código ≤ 12 min). 🔴
99. **E99 · Revisar minutos consumidos** (`get_workflow_usage` por workflow, 30 dias) antes/depois e registrar em `docs/auditoria/estado/`. ⚙️
100. **E100 · Fechar o ciclo**: `REVISAO_IMPLEMENTACAO_PLANO_100_WORKFLOWS_<data>.md` com estado de cada etapa (feito/pendente/descartado e por quê), evidência por link de run/API, e lista dos itens que viraram decisão de negócio (E05, E18, E52). 🟢

---

## Ordem de execução recomendada (por risco evitado)

1. **Semana 1 — parar o sangramento:** E01, E02, E04, E05, E03 (proteção), E13, E14, E15, E12, E16, E17 (segredos/ambiente), E47, E48, E49 (E2E vermelho), E72, E70 (probes).
2. **Semana 2 — reprodutibilidade e custo:** E23–E29, E33–E40, E46, E53, E64, E62.
3. **Semana 3 — canônicos reutilizáveis:** E67–E69, E71, E73–E77, E56.
4. **Semana 4 — observabilidade e higiene:** E55, E79–E86, E87–E93, E94–E96.
5. **Fechamento:** E97–E100.

Decisões que só o Joaquim toma (custo, arquitetura, risco de negócio): **E05** (modelo de aprovação com dono único), **E18** (repo privado), **E26** (npm vs Bun), **E52** (Mailosaur), **E84** (alerta via WhatsApp/N8N).
