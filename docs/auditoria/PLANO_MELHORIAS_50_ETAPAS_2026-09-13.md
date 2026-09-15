# Plano de Melhorias e Correções — Ciclo 2 — 50 Etapas

**Projeto:** Departamento Pessoal V3
**Data-base:** 13/09/2026
**SHA de referência:** `3c77982f5` (HEAD local = `origin/codex/e50-remediation-20260912`; tree `61aa7ab2a`)
**Ciclo anterior:** [`PLANO_MELHORIAS_50_ETAPAS_2026-09-10.md`](./PLANO_MELHORIAS_50_ETAPAS_2026-09-10.md) (E50) e sua [revisão pós-execução de 12/09](./REVISAO_POS_EXECUCAO_PLANO_50_2026-09-12.md)
**Estado inicial:** lote de remediação aprovado localmente, porém 31 arquivos não publicados, dois gates locais reprovados, PR #106 bloqueado por check que não roda em PR, 15 incidentes de healthcheck por variável ausente, três refs de projeto Supabase e dívida de 724 `any` explícitos
**Meta:** publicar e promover o lote com ledger exato, encerrar os 16 RV com checkpoint remoto, converter dívida de tipos e cobertura em gates decrescentes e recertificar no mesmo SHA

> Este plano é a continuação do E50. Ele não repete objetivos já entregues localmente; converte cada pendência externa (RV-01…RV-16), cada achado da análise de sincronização de 13/09 e cada gap estrutural em uma etapa com evidência inicial verificada, implementação delimitada, teste positivo, teste negativo e gate permanente. Toda afirmação de “Evidência inicial” foi observada em 13/09/2026 por comando, API ou log referenciado; nada foi inferido.
>
> Não autoriza reset, exclusão, `db push` ou `migration repair` em massa. A exceção de ambiente do owner (alterar o canônico enquanto os dados são descartáveis) permanece válida e não substitui evidências de rollback, staging (E51-048) ou recertificação (E51-050).

## Como a análise de 13/09 alimenta este plano

| Achado verificado                                               | Evidência                                     | Etapa       |
| --------------------------------------------------------------- | --------------------------------------------- | ----------- |
| 31 arquivos modificados só localmente                           | `git status`; tree local = GitHub `61aa7ab2a` | E51-001     |
| `audit:edge-audit-log` reprova localmente e passa em HEAD       | worktree descartável de HEAD                  | E51-002     |
| 3 arquivos fora do Prettier                                     | `format:check:changed`                        | E51-003     |
| PR #106 `BLOCKED`: check obrigatório com `if: != pull_request`  | ruleset 21934736 + `ci.yml:188`               | E51-004     |
| 15 issues de healthcheck; causa `APP_URL` ausente               | run 34743412410                               | E51-005     |
| 3 refs Supabase (`frjb…`, `cizi…`, `jpcb…`)                     | config, commit `3fc908103`, check Preview     | E51-006     |
| `main` 4 atrás, 2 stashes, 9 branches paradas                   | `git branch -vv`, API de branches             | E51-007     |
| PDF regenerado no build; grafo em `5d3b0c7b`                    | `package.json`, GRAPH_REPORT                  | E51-008     |
| 724 `: any`, 274 `as any`, 41 `eslint-disable`, regra desligada | grep + `eslint.config.js:41`                  | E51-025–028 |
| Sem PostgreSQL local para 26 suítes SQL                         | `which initdb`                                | E51-032     |
| Chunks de 1,93 MB / 1,32 MB / 0,97 MB                           | `dist/assets`                                 | E51-042     |
| Dois lockfiles; CI com `npm install`                            | `ls`, `ci.yml`                                | E51-039     |
| Claims obsoletos em CLAUDE.md                                   | leitura + `typecheck:tests` verde             | E51-047     |

## Regras de execução

- Ordem obrigatória por onda; E51-001–E51-008 antes de qualquer promoção ao canônico.
- Banco muda primeiro em ambiente efêmero (validate), depois canônico com manifesto; staging real é entregue em E51-048.
- Testes usam exclusivamente dados e identidades sintéticos; nenhum secret transita por chat, PR ou relatório.
- Checkbox requer evidência vinculada (`E51/subitem → SHA/objeto → ambiente → cenário positivo/negativo → resultado → rollback → revisor → link`); afirmação verbal não conta.
- C1–C4 são cumulativos; somente C4 encerra a etapa. Existência de código, migration, teste ou workflow não encerra nada.
- Ausência de conexão, secret ou ambiente bloqueia o gate; nunca produz verde.
- Toda mudança tem teste positivo, teste negativo, observabilidade e rollback ensaiado.
- Prioridade: P0 bloqueia dados reais; P1 bloqueia go-live; P2 bloqueia recertificação 10/10.

## Ondas

| Onda                                       | Etapas          | Saída                                                                               |
| ------------------------------------------ | --------------- | ----------------------------------------------------------------------------------- |
| Onda 0 — Sincronização e higiene           | E51-001–E51-008 | lote publicado, gates verdes, ruleset e healthcheck corrigidos, refs únicas         |
| Onda 1 — Promoção ao canônico              | E51-009–E51-017 | migrations aplicadas com ledger, Edge publicadas, E2E autenticado, rollback provado |
| Onda 2 — Fechamento dos RV externos        | E51-018–E51-024 | RV-01…RV-15 com checkpoint remoto encerrado                                         |
| Onda 3 — Tipos, lint e arquitetura         | E51-025–E51-031 | orçamento de `any` decrescente, zero supressão, god files fragmentados              |
| Onda 4 — Testes e cobertura por risco      | E51-032–E51-038 | PostgreSQL local, metas por domínio, handlers Edge, RLS e concorrência no CI        |
| Onda 5 — Segurança, performance e operação | E51-039–E51-046 | supply chain hermético, segredos, pentest, bundle, bridge, SLOs, PII, a11y          |
| Onda 6 — Governança e recertificação       | E51-047–E51-050 | docs fiéis, staging/DR, plano auditável e decisão go/no-go                          |

## E51-001 — Publicar o lote local não commitado

| Campo        | Valor                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Sincronização e higiene                                                                                     |
| Prioridade   | P0                                                                                                                   |
| Dependências | nenhuma                                                                                                              |
| Origem       | Achado 13/09 (sincronização Git)                                                                                     |
| Objetivo     | Levar ao GitHub os 31 arquivos modificados que existem apenas na árvore local, em commits coesos e sem o PDF gerado. |

### 10 subetapas

1. [ ] **Evidência inicial:** `git status` mostra 31 arquivos modificados (384 inserções, 62 remoções), nada em stage, nada untracked; HEAD `3c77982f5` e tree `61aa7ab2a` são idênticos ao GitHub, logo o trabalho de migrations, Edge, serviços, workflows e simulações existe só na máquina local.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Separar em commits por contrato: (a) migrations + `scripts/tests/migrations-*.sh`; (b) Edge Functions e `_shared`; (c) `src/services`, página de folha e tipos; (d) workflows canônicos. Excluir `AUDIT_REPORT.pdf` do commit. Empurrar para `codex/e50-remediation-20260912` e atualizar a descrição do PR #106 com o mapa dos contratos alterados.
5. [ ] **Teste positivo:** `git status --porcelain` vazio (exceto PDF), `git rev-list origin/...HEAD` = 0/0, PR #106 exibe os novos commits e o `ci.yml` executa nos SHAs publicados.
6. [ ] **Teste negativo:** Commit contendo `AUDIT_REPORT.pdf`, arquivo fora do Prettier ou gate `audit:edge-audit-log` reprovado é rejeitado antes do push.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Hook `pre-push` que executa `npm run ci:verify` e recusa PDF gerado; job de CI `Type Check` obrigatório no ruleset.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-002 — Corrigir drift do contrato de ações de auditoria

| Campo        | Valor                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Onda         | Onda 0 — Sincronização e higiene                                                                                                     |
| Prioridade   | P0                                                                                                                                   |
| Dependências | E51-001                                                                                                                              |
| Origem       | Achado 13/09 (gate `audit:edge-audit-log`)                                                                                           |
| Objetivo     | Realinhar a constraint `audit_log_acao_check` e a allowlist revisada do gate estático sem reabrir escrita de ações legadas por Edge. |

### 10 subetapas

1. [ ] **Evidência inicial:** `npm run audit:edge-audit-log` falha na árvore local e passa em HEAD: a migration `20260912206000_p1_audit_action_contract.sql` passou a incluir `CLOSE`, `REOPEN` e `BACKUP_RUN`, mas `scripts/audit-edge-audit-log-contract.mjs` não foi atualizado. As três ações existem em linhas legadas lidas por `v_payroll_audit`.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Declarar no gate uma lista `legacyReadOnlyActions` (`CLOSE`, `REOPEN`, `BACKUP_RUN`) aceita na constraint por compatibilidade de dados históricos, porém proibida em inserts de Edge; manter `allowedActions` como conjunto de escrita. Registrar a decisão no comentário da constraint.
5. [ ] **Teste positivo:** Gate reporta `EDGE_AUDIT_LOG_CONTRACT_OK`, `scripts/tests/audit-edge-audit-log-contract.test.mjs` cobre a nova partição e `migrations-p1-audit-action-contract.sh` continua aprovado.
6. [ ] **Teste negativo:** Insert em Edge com `acao: "CLOSE"` ou `"BACKUP_RUN"` reprova o AST gate; constraint sem uma das três ações reprova a comparação SQL×script.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Job `Type Check` (ci.yml linhas 39–40) permanece bloqueante; teste do gate versionado.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-003 — Restaurar formatação e tornar o Prettier pré-commit

| Campo        | Valor                                                            |
| ------------ | ---------------------------------------------------------------- |
| Onda         | Onda 0 — Sincronização e higiene                                 |
| Prioridade   | P1                                                               |
| Dependências | E51-001                                                          |
| Origem       | Achado 13/09 (`format:check:changed`)                            |
| Objetivo     | Zerar o drift de formatação e impedir que ele volte antes do CI. |

### 10 subetapas

1. [ ] **Evidência inicial:** `format:check:changed` reprova três arquivos: `src/services/edgeFunctionsService.ts`, `src/services/__tests__/edgeFunctionsService.test.ts` e `src/services/folha/calculoLoteService.ts`.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Executar `prettier --write` nos três arquivos; adicionar `lint-staged` + hook `pre-commit` (husky ou `core.hooksPath`) rodando Prettier e ESLint nos arquivos staged; documentar em CONTRIBUTING.
5. [ ] **Teste positivo:** `npm run format:check:changed` e `format:check` aprovados; commit com arquivo fora do padrão é reformatado ou bloqueado localmente.
6. [ ] **Teste negativo:** Hook desabilitado (`--no-verify`) não engana o CI: job `Lint` continua reprovando.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Job `Lint` obrigatório no ruleset + hook local versionado.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-004 — Corrigir o ruleset da main: check obrigatório que nunca roda em PR

| Campo        | Valor                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Onda         | Onda 0 — Sincronização e higiene                                                                                         |
| Prioridade   | P0                                                                                                                       |
| Dependências | nenhuma                                                                                                                  |
| Origem       | Achado 13/09 (PR #106 `BLOCKED`)                                                                                         |
| Objetivo     | Fazer o ruleset exigir apenas checks que executam em PR e mover o gate de banco vivo para pós-merge/agendado com alerta. |

### 10 subetapas

1. [ ] **Evidência inicial:** Ruleset `21934736` exige `Integridade do banco (search_path x extensões)`, mas o job tem `if: github.event_name != 'pull_request'`; resultado: todo PR fica `BLOCKED` (PR #106: `mergeStateStatus=BLOCKED`, `reviewDecision` vazio) e só entra com bypass administrativo.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Remover o job vivo da lista de required checks; manter obrigatórios `Type Check`, `Lint`, `Unit Tests`, `Edge Functions (deno check)`, `Config de segurança (E-077)`, `CodeQL & Audit` e adicionar `P0 database migration simulations`; exigir 1 aprovação com CODEOWNERS; o gate vivo roda em `push: main` + cron e abre issue única em falha.
5. [ ] **Teste positivo:** PR com todos os checks de PR verdes passa a `CLEAN`; push direto na main é recusado; gate vivo continua executando em main.
6. [ ] **Teste negativo:** PR com `Unit Tests` vermelho permanece `BLOCKED`; alteração do ruleset sem registro em `branch-protection.yml` é detectada pela auditoria de configuração.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `branch-protection.yml` declara o ruleset como código e um teste compara a lista exigida com os jobs que rodam em `pull_request`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-005 — Desbloquear o healthcheck e deduplicar incidentes

| Campo        | Valor                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Sincronização e higiene                                                          |
| Prioridade   | P1                                                                                        |
| Dependências | nenhuma                                                                                   |
| Origem       | Achado 13/09 (issues #66–#108)                                                            |
| Objetivo     | Configurar `APP_URL`, fechar as 15 issues duplicadas e impedir nova enxurrada de alertas. |

### 10 subetapas

1. [ ] **Evidência inicial:** 15 issues abertas “Healthcheck falhou” a cada 6h desde 09/09 (duas de 31/08). Log do run 34743412410: `APP_URL não definida`, enquanto Edge (200), Auth (200) e bridge (405) passam. Não é indisponibilidade; é configuração ausente.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Definir a variável de repositório `APP_URL` com a URL de produção Vercel; no workflow, procurar issue aberta com o mesmo título-base antes de criar (comentar em vez de abrir); fechar as 15 com referência a esta etapa; runbook `RESPOSTA_INCIDENTES.md` atualizado.
5. [ ] **Teste positivo:** Próximo run agendado verde; simulação de frontend indisponível gera exatamente uma issue e a reutiliza nas execuções seguintes.
6. [ ] **Teste negativo:** `APP_URL` vazia continua reprovando (fail-closed); ausência do secret não produz verde.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Step do workflow que valida presença e formato de `APP_URL` e teste do script de dedupe.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-006 — Unificar referências de projeto Supabase e remover integração Preview obsoleta

| Campo        | Valor                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Sincronização e higiene                                                                                       |
| Prioridade   | P1                                                                                                                     |
| Dependências | nenhuma                                                                                                                |
| Origem       | Achado 13/09 (três refs) / E50-003                                                                                     |
| Objetivo     | Garantir que apenas `frjbfeamybqsejlvmqbl` seja referenciado por código, workflows, proxy de dev e integrações GitHub. |

### 10 subetapas

1. [ ] **Evidência inicial:** `config.toml` e `canonical-migrations.yml` apontam `frjbfeamybqsejlvmqbl`; commit `3fc908103` apontou o proxy de dev para `ciziytrrjjotlsjzshnm`; o check externo “Supabase Preview” do PR #106 falha contra `jpcbsleodkashudlfuds`.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Decidir e documentar o alvo de dev (ADR curta); remover ou reconfigurar a integração GitHub↔Supabase que gera o check Preview; estender `audit:canonical-project` para varrer workflows, `vercel.json`, proxy e `.env.example`.
5. [ ] **Teste positivo:** `npm run audit:canonical-project` reporta uma única ref em todas as fontes; PR sem check externo reprovado.
6. [ ] **Teste negativo:** Qualquer nova ocorrência de outra ref falha o auditor; integração reativada sem ADR é detectada.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `audit:canonical-project` no `ci:verify` com fontes ampliadas.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-007 — Higiene de branches, stashes e main local

| Campo        | Valor                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Sincronização e higiene                                                             |
| Prioridade   | P2                                                                                           |
| Dependências | E51-001                                                                                      |
| Origem       | Achado 13/09                                                                                 |
| Objetivo     | Deixar o repositório com apenas branches ativas, sem stashes órfãos e `main` local alinhada. |

### 10 subetapas

1. [ ] **Evidência inicial:** `main` local 4 commits atrás de `origin/main`; 2 stashes de PDF em `codex/e50-preflight-20260910`; branch `safety/pre-sync-20260907-ea354760` sem upstream; 9 branches remotas paradas desde 08–16/08 (`fix/*`, `supabase-migracao`, `claude/*`).
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** `git switch main && git pull --ff-only`; listar `git log origin/main..<branch>` para cada branch antiga; excluir as sem commits únicos e abrir issue para as demais; descartar stashes após confirmar que o PDF é regenerável por `npm run audit:pdf`.
5. [ ] **Teste positivo:** `git branch -r` lista somente main, branches E50/E51 vivas e `sync/*` justificadas; `git stash list` vazio.
6. [ ] **Teste negativo:** Branch com commit único não referenciado em main não é excluída sem revisão do owner.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Regra do ruleset impede exclusão da `main`; checklist de encerramento de branch no CONTRIBUTING.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-008 — Tratar artefatos gerados: PDF fora do versionamento e grafo atualizado

| Campo        | Valor                                                                                 |
| ------------ | ------------------------------------------------------------------------------------- |
| Onda         | Onda 0 — Sincronização e higiene                                                      |
| Prioridade   | P2                                                                                    |
| Dependências | E51-001                                                                               |
| Origem       | Achado 13/09 / CLAUDE.md (frescura do grafo)                                          |
| Objetivo     | Eliminar churn de artefatos de build no Git e manter o grafo graphify no SHA de HEAD. |

### 10 subetapas

1. [ ] **Evidência inicial:** `AUDIT_REPORT.pdf` é regenerado por `npm run build` e aparece modificado a cada build; `graphify-out/GRAPH_REPORT.md` foi construído em `5d3b0c7b` enquanto HEAD é `3c77982f5`.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Publicar o PDF como artefato de CI/Release e removê-lo do índice (`.gitignore`); ou tornar a geração determinística (sem timestamp). Adicionar step pós-merge `graphify update .` com commit automatizado ou verificação de frescura no CI.
5. [ ] **Teste positivo:** `npm run build` não suja a árvore; `grep "Built from commit" graphify-out/GRAPH_REPORT.md` = `git rev-parse --short HEAD`.
6. [ ] **Teste negativo:** Job “clean tree after build” reprova se qualquer arquivo versionado mudar após o build.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Step de CI comparando `git status --porcelain` após build e comparando commit do grafo com HEAD.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-009 — Reconciliar inventário de migrations local versus ledger canônico

| Campo        | Valor                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Promoção ao canônico                                                                                        |
| Prioridade   | P0                                                                                                                   |
| Dependências | E51-001–002                                                                                                          |
| Origem       | RV-04 / RV-15 / E50-009–010                                                                                          |
| Objetivo     | Produzir o manifesto exato (versão, nome, hash) do que será aplicado, sem `db push` nem `migration repair` em massa. |

### 10 subetapas

1. [ ] **Evidência inicial:** Checkout com 671 arquivos SQL; ledger canônico com 369 versões; 7 migrations aplicadas com timestamps remotos distintos dos nomes locais; `p0_restore_atomic_rate_limit` e `p0_bridge_membership_authorization` ausentes do ledger.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Script que lê `supabase_migrations.schema_migrations`, mapeia nome↔versão remota, calcula hash do conteúdo e emite `MANIFEST_APLICACAO_<data>.json` com o subconjunto pendente do lote (as 19 + as alteradas neste ciclo).
5. [ ] **Teste positivo:** Manifesto lista exatamente N versões pendentes com hash; reexecução produz o mesmo arquivo.
6. [ ] **Teste negativo:** Migration fora do manifesto é recusada pelo workflow canônico; hash divergente entre local e manifesto aborta.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `canonical-migrations.yml` consome o manifesto e falha se o conjunto diferir.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-010 — Executar o workflow canônico em modo validate

| Campo        | Valor                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Promoção ao canônico                                                                        |
| Prioridade   | P0                                                                                                   |
| Dependências | E51-009                                                                                              |
| Origem       | Ordem de promoção item 2                                                                             |
| Objetivo     | Aplicar todo o lote em uma única transação revertida contra o canônico e checar o catálogo esperado. |

### 10 subetapas

1. [ ] **Evidência inicial:** `canonical-migrations.yml` exige `CONFIRM_PROJECT_REF` = `frjbfeamybqsejlvmqbl` e valida `get_audit_trail(uuid,integer,timestamptz,text,text,text[],uuid)`, claims, provisões, destino de relatório e bucket `backups` (ajuste ainda não commitado).
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Despachar o workflow em `validate` com o manifesto de E51-009; capturar o JSON de catálogo pós-aplicação; anexar ao PR.
5. [ ] **Teste positivo:** Transação aplica e reverte sem erro; todos os predicados do catálogo retornam `true`.
6. [ ] **Teste negativo:** Objeto ausente (função, bucket, coluna) aborta antes de qualquer escrita; ref divergente aborta no preflight.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Modo `validate` obrigatório antes de qualquer `apply`; evidência do run vinculada.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-011 — Aplicar o lote no canônico e registrar apenas as versões do manifesto

| Campo        | Valor                                                      |
| ------------ | ---------------------------------------------------------- |
| Onda         | Onda 1 — Promoção ao canônico                              |
| Prioridade   | P0                                                         |
| Dependências | E51-010                                                    |
| Origem       | Ordem de promoção item 3                                   |
| Objetivo     | Promover o lote com ledger exato e sem efeitos colaterais. |

### 10 subetapas

1. [ ] **Evidência inicial:** Exceção de ambiente autorizada pelo owner enquanto os dados são descartáveis; não há staging separado.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Backup lógico pré-apply (E51-016 depende dele); despachar `apply`; verificar ledger = manifesto; guardar hash do inventário físico antes/depois.
5. [ ] **Teste positivo:** `schema_migrations` contém exatamente as N versões novas; reexecução é no-op.
6. [ ] **Teste negativo:** Aplicação parcial é impossível (transação única); tentativa de reaplicar reporta zero mudanças.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Comparação automática ledger×manifesto no final do job.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-012 — Rodar os auditores vivos contra o banco atualizado

| Campo        | Valor                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Onda         | Onda 1 — Promoção ao canônico                                            |
| Prioridade   | P0                                                                       |
| Dependências | E51-011                                                                  |
| Origem       | RV-03 / RV-16                                                            |
| Objetivo     | Provar RLS, grants, SECURITY DEFINER e search_path no canônico pós-lote. |

### 10 subetapas

1. [ ] **Evidência inicial:** Auditores `audit:rls-pii`, `rls-roles`, `rls-tenant`, `secdef`, `search-path` e `embeds` existem; o CI de main anterior reprovava em RLS sobre PII.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Executar o job `Integridade do banco` em `main` após o merge; publicar relatório consolidado; abrir issue por achado P0/P1.
5. [ ] **Teste positivo:** Seis auditores reportam todos os resultados; zero P0; P1 com owner e prazo.
6. [ ] **Teste negativo:** Sem `SUPABASE_DB_URL` o job reprova, nunca “skip”; auditor que ignora falha é detectado pelo `test:db-audit-contract`.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Job vivo em `push: main` + cron diário com issue única.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-013 — Publicar as 60 Edge Functions e comparar inventário por slug

| Campo        | Valor                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Onda         | Onda 1 — Promoção ao canônico                                            |
| Prioridade   | P0                                                                       |
| Dependências | E51-011                                                                  |
| Origem       | RV-14 / E50-030                                                          |
| Objetivo     | Eliminar o drift entre 60 entrypoints locais e 59 remotos sem `--prune`. |

### 10 subetapas

1. [ ] **Evidência inicial:** `canonical-edge-functions.yml` (versão local) troca contagem por `comm -23` de slugs; exige `SUPABASE_ACCESS_TOKEN` com acesso ao projeto.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Provisionar o token no ambiente do workflow; despachar; anexar `functions-after.json`; comparar hash de bundle de amostra (relatórios, alertas, agendador, folha).
5. [ ] **Teste positivo:** `missing` vazio; 60 slugs remotos; bundles de amostra idênticos aos locais.
6. [ ] **Teste negativo:** Token sem acesso falha antes de escrever; slug local ausente remoto reprova com lista nominal.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Comparação por slug no workflow + smoke `edge healthcheck` pós-deploy.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-014 — Configurar identidades sintéticas e secrets do E2E autenticado

| Campo        | Valor                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Promoção ao canônico                                                                             |
| Prioridade   | P1                                                                                                        |
| Dependências | E51-011                                                                                                   |
| Origem       | E50-037 / revisão item 7                                                                                  |
| Objetivo     | Permitir a suíte Playwright autenticada em `main` com quatro papéis sem expor credenciais a código de PR. |

### 10 subetapas

1. [ ] **Evidência inicial:** Job `Playwright E2E` aparece como `skipping` no PR; a suíte pública passa 22/2; run anterior abortou por falta de quatro secrets.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Criar quatro usuários sintéticos (admin, RH, gestor, colaborador) em duas empresas descartáveis; gravar secrets no ambiente `main-e2e`; manter job de PR restrito à suíte pública.
5. [ ] **Teste positivo:** Job autenticado executa em `push: main` e reporta por papel; PR continua sem acesso a secrets de escrita.
6. [ ] **Teste negativo:** `pull_request` que tente ler os secrets recebe valor vazio e o job falha explicitamente.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Ambiente protegido do GitHub + verificação de escopo do `SUPABASE_DB_URL` (papel restrito, não só presença).
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-015 — Executar E2E autenticado pós-deploy e retestar os 17 reprovados

| Campo        | Valor                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Promoção ao canônico                                                                                                 |
| Prioridade   | P0                                                                                                                            |
| Dependências | E51-013–014                                                                                                                   |
| Origem       | Simulações E2E 47/17/6/1                                                                                                      |
| Objetivo     | Confirmar que os 17 erros eram drift (RPC ausente, `security_alerts` negado, CORS Lovable) e obter matriz papel×tenant verde. |

### 10 subetapas

1. [ ] **Evidência inicial:** Antes do deploy: 47 aprovados, 17 reprovados, 6 ignorados, 1 não executado, todos ligados ao backend antigo.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Rodar a suíte completa no SHA integrado; classificar cada reprovação remanescente como defeito de produto ou de teste; abrir issue por defeito.
5. [ ] **Teste positivo:** Zero reprovações atribuíveis a drift; jornadas críticas (folha, ponto, férias, rescisão, relatórios) verdes em dois tenants.
6. [ ] **Teste negativo:** Qualquer leitura cross-tenant ou ação sem papel reprova a run inteira.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Suíte autenticada obrigatória para tag de release (não para PR).
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-016 — Provar rollback do lote em ambiente efêmero

| Campo        | Valor                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Promoção ao canônico                                                                 |
| Prioridade   | P1                                                                                            |
| Dependências | E51-011                                                                                       |
| Origem       | E50-019 / revisão item 8                                                                      |
| Objetivo     | Restaurar o backup pré-apply em PostgreSQL descartável e comparar inventário físico e ledger. |

### 10 subetapas

1. [ ] **Evidência inicial:** Nenhuma restauração integral foi executada nas revisões anteriores; “rollback ensaiado” é subetapa aberta em todas as etapas E50.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Script `restore-and-diff.sh`: restaura dump pré-apply, aplica o manifesto, gera manifest físico (tabelas, views, funções, policies, triggers, buckets) e compara com o canônico.
5. [ ] **Teste positivo:** Duas restaurações consecutivas produzem o mesmo hash de inventário; diff contra o canônico vazio.
6. [ ] **Teste negativo:** Dump corrompido ou manifesto divergente reprova com relatório nominal.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Job semanal de restauração em runner efêmero com artefato de diff.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-017 — Registrar aceite formal do lote nas etapas E50 correspondentes

| Campo        | Valor                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 1 — Promoção ao canônico                                                                                           |
| Prioridade   | P1                                                                                                                      |
| Dependências | E51-010–016                                                                                                             |
| Origem       | Regra de conclusão do plano E50                                                                                         |
| Objetivo     | Marcar C2/C3/C4 apenas das etapas E50 cujas evidências (SHA, run, ambiente, cenários, rollback, revisor, link) existam. |

### 10 subetapas

1. [ ] **Evidência inicial:** Plano E50 tem 4 checkboxes marcados e 696 abertos; o texto proíbe marcação em massa e exige evidência por item.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Para cada E50 tocada pelo lote (001–008, 013, 016, 020, 024, 030–031, 044, 047), preencher `E50/subitem → SHA → ambiente → cenário → resultado → rollback → revisor → link` e marcar somente o comprovado.
5. [ ] **Teste positivo:** `npm run audit:plan50` aprovado após a edição; cada `[x]` novo tem link de evidência.
6. [ ] **Teste negativo:** Checkbox sem link é revertido em revisão; validador reprova se contagem de subetapas mudar.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Validador estrutural + revisão dupla do diff do plano.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-018 — Fechar RV-01 e RV-03: matriz de tenant e policies no canônico

| Campo        | Valor                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Fechamento dos RV externos                                                       |
| Prioridade   | P0                                                                                        |
| Dependências | E51-012                                                                                   |
| Origem       | RV-01 / RV-03                                                                             |
| Objetivo     | Comprovar que tenant deriva de vínculo persistido e que nenhuma policy permissiva restou. |

### 10 subetapas

1. [ ] **Evidência inicial:** Localmente o helper deixou de confiar em `user_metadata` e policies confirmadas foram removidas; falta a matriz T1/T2 remota.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Executar matriz T1 (mesmo tenant) e T2 (tenant alheio) por papel em transação READ ONLY; listar `pg_policies` com `qual`/`with_check` permissivos.
5. [ ] **Teste positivo:** T2 retorna zero linhas em todas as tabelas com PII; zero policy `USING (true)` sem justificativa registrada.
6. [ ] **Teste negativo:** JWT com `user_metadata.empresa_id` forjado não amplia escopo.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `audit:rls-tenant` e `audit:rls-roles` com matriz versionada em `scripts/tests`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-019 — Fechar RV-02: enumeração e replay de tokens públicos remoto

| Campo        | Valor                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Fechamento dos RV externos                                             |
| Prioridade   | P0                                                                              |
| Dependências | E51-012                                                                         |
| Origem       | RV-02                                                                           |
| Objetivo     | Provar que tokens de admissão/assinatura não são enumeráveis nem reutilizáveis. |

### 10 subetapas

1. [ ] **Evidência inicial:** Tabela sem ACL para anon/authenticated e fluxo público via RPC com hash/expiração/consumo entregues; repetição remota pendente.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Probe remoto: SELECT anon/authenticated na tabela (esperado 42501), RPC com token expirado, consumido e inválido.
5. [ ] **Teste positivo:** Todos os probes negativos retornam erro; token válido consome uma única vez.
6. [ ] **Teste negativo:** Segundo uso do mesmo token é rejeitado; auditor não isenta mais a tabela de token.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Teste de simulação em `migrations-p1-admission-esocial-claim.sh` + probe remoto no job vivo.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-020 — Fechar RV-05: concorrência do rate limiter e lockout no Auth implantado

| Campo        | Valor                                                                            |
| ------------ | -------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Fechamento dos RV externos                                              |
| Prioridade   | P0                                                                               |
| Dependências | E51-012–013                                                                      |
| Origem       | RV-05 / E50-008                                                                  |
| Objetivo     | Demonstrar rate limit transacional service-only e lockout sob carga concorrente. |

### 10 subetapas

1. [ ] **Evidência inicial:** `reset_login_attempts` revogado para browser; limiter transacional entregue; teste concorrente remoto pendente.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Script k6/Deno disparando N tentativas paralelas por identificador; validar contadores, janela e bloqueio; validar que `anon` não executa o limiter.
5. [ ] **Teste positivo:** Tentativas acima do limite recebem 429 de forma consistente; lockout ativa e expira conforme contrato.
6. [ ] **Teste negativo:** Chamada direta ao RPC com chave publicável é negada.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `rateLimit.test.ts` (Deno) + cenário concorrente em `migrations-p0-auth-lockout.sh`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-021 — Fechar RV-07: reconciliar provisões e cálculo em lote com casos legais

| Campo        | Valor                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Fechamento dos RV externos                                                                                  |
| Prioridade   | P1                                                                                                                   |
| Dependências | E51-011                                                                                                              |
| Origem       | RV-07 / E50-024                                                                                                      |
| Objetivo     | Comparar a saída de `replace_monthly_provisions` e do cálculo em lote com casos homologados (13º, férias, encargos). |

### 10 subetapas

1. [ ] **Evidência inicial:** Schema compatível e substituição mensal transacional entregues; reconciliação com casos legais não executada.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Fixture com 12 casos (admissão no mês, afastamento, férias fracionadas, rescisão) e valores esperados de referência; teste de propriedade para arredondamento.
5. [ ] **Teste positivo:** 12/12 casos batem com tolerância de R$0,01; auditoria registra `PROVISOES_CALC`.
6. [ ] **Teste negativo:** Caso com competência fechada é recusado; divergência acima da tolerância reprova.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Suíte em `src/services/folha/__tests__` + simulação SQL `migrations-p1-company-payroll-tax-contract.sh`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-022 — Fechar RV-09, RV-10 e RV-11 no runtime implantado

| Campo        | Valor                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Fechamento dos RV externos                                                             |
| Prioridade   | P1                                                                                              |
| Dependências | E51-013                                                                                         |
| Origem       | RV-09 / RV-10 / RV-11                                                                           |
| Objetivo     | Validar agenda concorrente, streaming sob carga e corrida CNAB A→B→A contra as Edge publicadas. |

### 10 subetapas

1. [ ] **Evidência inicial:** Claim atômico, lease, cursor durável, cancelamento não aguardado e invalidação por contexto entregues com testes locais; falta prova no runtime.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Disparar `processar-agendamentos` em paralelo com relógio congelado; relatório manual com stream aberto por 60s; sequência CNAB alternada com três operadores.
5. [ ] **Teste positivo:** Sem duplicidade de ocorrência; sem deadlock; resposta obsoleta de CNAB nunca sobrescreve a atual.
6. [ ] **Teste negativo:** Provedor com falha injetada não perde ocorrência nem gera envio duplicado.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Testes Deno dos handlers (E51-034) + smoke pós-deploy versionado.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-023 — Fechar RV-12 e RV-13: probes CORS e E2E com duas empresas

| Campo        | Valor                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Onda         | Onda 2 — Fechamento dos RV externos                                                  |
| Prioridade   | P1                                                                                   |
| Dependências | E51-013–015                                                                          |
| Origem       | RV-12 / RV-13                                                                        |
| Objetivo     | Confirmar CORS apenas para origens deliberadas e UI sem agregados ou saúde enganosa. |

### 10 subetapas

1. [ ] **Evidência inicial:** Erros propagam request e proxy usa origem Vercel canônica; probes de todas as origens e E2E de dois tenants pendentes.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Matriz OPTIONS por Edge Function × origem (Vercel prod, preview, localhost, Lovable obsoleta); E2E de briefing/saúde com duas empresas.
5. [ ] **Teste positivo:** Origem obsoleta recebe recusa; saúde sem eventos difere de 100%; briefing respeita tenant.
6. [ ] **Teste negativo:** Origem coringa em qualquer função reprova o probe.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Teste de CORS em `_shared` + spec Playwright `briefing-tenant.spec.ts`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-024 — Fechar RV-15: buckets 19/19, PCS e crons de segurança com smoke real

| Campo        | Valor                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Onda         | Onda 2 — Fechamento dos RV externos                                                      |
| Prioridade   | P1                                                                                       |
| Dependências | E51-011–013                                                                              |
| Origem       | RV-15 / E50-014–016                                                                      |
| Objetivo     | Provisionar e provar capacidades declaradas: Storage, contrato PCS e rotinas periódicas. |

### 10 subetapas

1. [ ] **Evidência inicial:** Bucket `backups`, contrato PCS, destinatários internos e alvos dos três crons entregues; aplicação e smoke reais pendentes.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Listar `storage.buckets` vs manifesto (19); executar `smoke:selos`; disparar cada cron manualmente e verificar efeito e auditoria.
5. [ ] **Teste positivo:** 19/19 buckets privados; 3/3 crons com efeito observável e sem PII no log.
6. [ ] **Teste negativo:** Bucket público ou cron sem owner reprova.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Auditor de Storage no job vivo + `migrations-p1-security-cron-contract.sh`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-025 — Ligar `no-explicit-any` com baseline e orçamento decrescente

| Campo        | Valor                                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| Onda         | Onda 3 — Tipos, lint e arquitetura                                             |
| Prioridade   | P1                                                                             |
| Dependências | E51-003                                                                        |
| Origem       | Achado 13/09 / E50-041                                                         |
| Objetivo     | Transformar `any` explícito de tolerado em dívida medida que só pode diminuir. |

### 10 subetapas

1. [ ] **Evidência inicial:** `eslint.config.js:41` desliga `@typescript-eslint/no-explicit-any`; em `src` há 724 ocorrências de `: any` e 274 de `as any` (excluindo testes); `lint:ci` tolera 18 warnings apesar de 0 atuais.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Ativar a regra como `warn`; script `scripts/ratchet-any.mjs` grava baseline por diretório e reprova se algum contador subir; `lint:ci` com `--max-warnings` igual ao baseline global.
5. [ ] **Teste positivo:** Baseline versionado; PR que reduz `any` atualiza o baseline automaticamente.
6. [ ] **Teste negativo:** PR que introduz um novo `any` reprova o job `Lint` com arquivo e linha.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `ratchet-any` no `ci:verify`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-026 — Eliminar `any` na camada de serviços e integrações

| Campo        | Valor                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Onda         | Onda 3 — Tipos, lint e arquitetura                                                              |
| Prioridade   | P1                                                                                              |
| Dependências | E51-025                                                                                         |
| Origem       | E50-020–021 / E50-041                                                                           |
| Objetivo     | Tipar os 86 serviços e `src/integrations` com os tipos gerados do banco e schemas de validação. |

### 10 subetapas

1. [ ] **Evidência inicial:** Serviços concentram acesso a dados e RPCs; `types.ts` gerado tem 24.404 linhas e é a fonte de verdade de contratos.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Substituir `any` por tipos derivados de `Database[...]`, `zod` nas fronteiras (RPC/Edge) e `unknown` com narrowing; regenerar tipos a partir do canônico pós-lote.
5. [ ] **Teste positivo:** Contador de `any` em `src/services` e `src/integrations` = 0; typecheck verde.
6. [ ] **Teste negativo:** Retorno de RPC sem schema reprova em tempo de compilação.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Baseline por diretório em zero para os dois caminhos.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-027 — Eliminar `any` em páginas, componentes e hooks

| Campo        | Valor                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| Onda         | Onda 3 — Tipos, lint e arquitetura                                     |
| Prioridade   | P2                                                                     |
| Dependências | E51-026                                                                |
| Origem       | E50-041                                                                |
| Objetivo     | Levar 111 páginas, componentes e 91 hooks a tipagem estrita sem `any`. |

### 10 subetapas

1. [ ] **Evidência inicial:** Maior parte das 724 ocorrências está em componentes de dashboard, workflows e formulários.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Ondas por domínio (folha → ponto → férias → rescisão → relatórios → demais); props e estados tipados; genéricos em hooks de dados.
5. [ ] **Teste positivo:** Baseline global de `any` = 0; sem regressão de comportamento nos testes de componente.
6. [ ] **Teste negativo:** Componente que reintroduz `any` reprova o ratchet.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `no-explicit-any` promovido de `warn` para `error`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-028 — Remover supressões: `eslint-disable` e `@ts-ignore`

| Campo        | Valor                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Onda         | Onda 3 — Tipos, lint e arquitetura                                              |
| Prioridade   | P2                                                                              |
| Dependências | E51-027                                                                         |
| Origem       | Achado 13/09                                                                    |
| Objetivo     | Corrigir na fonte as 41 supressões de ESLint e a única supressão de TypeScript. |

### 10 subetapas

1. [ ] **Evidência inicial:** 41 `eslint-disable` e 1 `@ts-ignore|@ts-expect-error` em `src`.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Inventariar por regra; corrigir; onde uma exceção for legítima, converter para `eslint-disable-next-line` com justificativa e issue de expiração.
5. [ ] **Teste positivo:** Contador de supressões sem justificativa = 0.
6. [ ] **Teste negativo:** Supressão sem comentário `-- motivo: … expira: …` reprova o lint.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Regra `eslint-comments/require-description` habilitada.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-029 — Zerar tolerância de warnings e tornar `lint:edge` bloqueante em PR

| Campo        | Valor                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Onda         | Onda 3 — Tipos, lint e arquitetura                                                       |
| Prioridade   | P2                                                                                       |
| Dependências | E51-025                                                                                  |
| Origem       | RV-16                                                                                    |
| Objetivo     | Alinhar `lint:ci` a zero warnings e garantir que Edge Functions passem pelo mesmo rigor. |

### 10 subetapas

1. [ ] **Evidência inicial:** `lint:ci` usa `--max-warnings=18` com 0 warnings reais; revisão anterior registrou 18 erros Edge tolerados.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** `lint:ci` → `--max-warnings=0`; job `Lint` executa também `lint:edge`; remover exceções por arquivo.
5. [ ] **Teste positivo:** Ambos os comandos verdes no PR; ruleset exige o job.
6. [ ] **Teste negativo:** Um warning novo em `src` ou `supabase/functions` reprova.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Job `Lint` obrigatório com os dois comandos.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-030 — Fragmentar god files e tipos gerados por domínio

| Campo        | Valor                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| Onda         | Onda 3 — Tipos, lint e arquitetura                                                |
| Prioridade   | P2                                                                                |
| Dependências | E51-026                                                                           |
| Origem       | E50-040                                                                           |
| Objetivo     | Reduzir arquivos acima de 800 linhas e particionar `types.ts` por schema/domínio. |

### 10 subetapas

1. [ ] **Evidência inicial:** `src/integrations/supabase/types.ts` 24.404 linhas; `AnalyticsSection.tsx` 1.010; `WorkflowDesigner.tsx` 991.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Extrair subcomponentes e hooks; gerar tipos por domínio (`types/folha.ts`, `types/ponto.ts`…) com re-export raiz; medir com `wc -l` no CI.
5. [ ] **Teste positivo:** Nenhum arquivo de `src` (exceto gerados) acima de 800 linhas; bundle por rota reduz.
6. [ ] **Teste negativo:** Arquivo novo acima do limite reprova o gate de tamanho.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Script `audit:file-size` no `ci:verify`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-031 — Eliminar ciclos de import e código morto com gate permanente

| Campo        | Valor                                                 |
| ------------ | ----------------------------------------------------- |
| Onda         | Onda 3 — Tipos, lint e arquitetura                    |
| Prioridade   | P2                                                    |
| Dependências | E51-030                                               |
| Origem       | E50-040                                               |
| Objetivo     | Zerar ciclos detectados e remover exports não usados. |

### 10 subetapas

1. [ ] **Evidência inicial:** Auditorias anteriores apontaram ciclos e duplicação; não há gate automatizado.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** `madge --circular src`, `knip` para exports/dependências não usadas; corrigir; adicionar ao `ci:verify`.
5. [ ] **Teste positivo:** Zero ciclos; zero exports mortos; `package.json` sem dependências não usadas.
6. [ ] **Teste negativo:** Novo ciclo reprova com caminho completo.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `audit:cycles` e `audit:dead-code` bloqueantes.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-032 — Ambiente local reproduzível para simulações PostgreSQL

| Campo        | Valor                                                            |
| ------------ | ---------------------------------------------------------------- |
| Onda         | Onda 4 — Testes e cobertura por risco                            |
| Prioridade   | P1                                                               |
| Dependências | E51-002                                                          |
| Origem       | Achado 13/09 (sem `initdb` local)                                |
| Objetivo     | Permitir que as 26 suítes SQL rodem na máquina do desenvolvedor. |

### 10 subetapas

1. [ ] **Evidência inicial:** A máquina tem apenas `psql`; `initdb`/`postgres` ausentes; 6 scripts alterados no lote só foram validados no CI.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** `docker-compose.test.yml` com PostgreSQL 17 + `pgcrypto`; `scripts/tests/lib/pg.sh` detecta container ou binário; documentar em CONTRIBUTING.
5. [ ] **Teste positivo:** `npm run test:migrations` executa localmente com o mesmo resultado do CI.
6. [ ] **Teste negativo:** Sem Docker nem binário, o script falha com mensagem clara e código ≠ 0.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Mesma biblioteca usada por CI e local.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-033 — Metas de cobertura por domínio de risco

| Campo        | Valor                                                   |
| ------------ | ------------------------------------------------------- |
| Onda         | Onda 4 — Testes e cobertura por risco                   |
| Prioridade   | P1                                                      |
| Dependências | E51-032                                                 |
| Origem       | E50-033 / RV-16                                         |
| Objetivo     | Substituir o gate global por metas por domínio crítico. |

### 10 subetapas

1. [ ] **Evidência inicial:** Cobertura real 61,94% statements, 57,12% branches, 54,42% functions, 66,25% lines; gate = baseline global com folga mínima.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** `vitest.config` com `coverage.thresholds` por glob: engines de folha/rescisão/férias/provisões ≥90% branches; ponto/eSocial/CNAB ≥85%; UI ≥60%.
5. [ ] **Teste positivo:** Relatório por domínio publicado no CI; metas atingidas ou com plano datado.
6. [ ] **Teste negativo:** Queda de cobertura em engine crítica reprova o job `Unit Tests`.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Thresholds versionados e job obrigatório.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-034 — Testar handlers HTTP das Edge Functions

| Campo        | Valor                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| Onda         | Onda 4 — Testes e cobertura por risco                                        |
| Prioridade   | P1                                                                           |
| Dependências | E51-032                                                                      |
| Origem       | RV-16 / E50-031                                                              |
| Objetivo     | Cobrir os 60 entrypoints com testes de request/response, não apenas helpers. |

### 10 subetapas

1. [ ] **Evidência inicial:** 32 arquivos de teste Deno cobrem `_shared` e alguns handlers; revisão registra “não são testes completos dos handlers HTTP”.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Harness `_shared/testing/invoke.ts` que monta `Request` com JWT sintético, CORS e corpo; casos positivo/negativo por função; inclusão no job `Edge Functions`.
5. [ ] **Teste positivo:** 60/60 funções com ao menos um teste de autorização negada e um de sucesso.
6. [ ] **Teste negativo:** Função nova sem teste reprova o inventário de cobertura Edge.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Script que compara slugs com arquivos de teste.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-035 — Testes de contrato bridge e frontend com Supabase efêmero

| Campo        | Valor                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| Onda         | Onda 4 — Testes e cobertura por risco                                                  |
| Prioridade   | P1                                                                                     |
| Dependências | E51-032                                                                                |
| Origem       | E50-034                                                                                |
| Objetivo     | Executar chamadas reais do frontend via `external-db-bridge` contra um Supabase local. |

### 10 subetapas

1. [ ] **Evidência inicial:** `audit:bridge-contract` mapeia 79 RPCs literais e 90 allowlisted estaticamente; não há execução real no CI.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** `supabase start` no CI (ou container), aplicar manifesto, executar suíte de integração por RPC com papéis sintéticos.
5. [ ] **Teste positivo:** Cada RPC allowlisted tem um teste executado com sucesso e um negado.
6. [ ] **Teste negativo:** RPC allowlisted sem teste ou com tabela sensível reprova.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Job `Integration (bridge)` no CI.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-036 — Matriz RLS automatizada por papel e tenant no CI

| Campo        | Valor                                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| Onda         | Onda 4 — Testes e cobertura por risco                                          |
| Prioridade   | P1                                                                             |
| Dependências | E51-035                                                                        |
| Origem       | E50-035 / RV-01                                                                |
| Objetivo     | Gerar e executar a matriz papel×tenant×tabela em PostgreSQL efêmero a cada PR. |

### 10 subetapas

1. [ ] **Evidência inicial:** A matriz T1/T2 (E51-018) existe como procedimento manual.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Gerador que lê `pg_policies` e produz asserts SQL por combinação; executa nas simulações P0.
5. [ ] **Teste positivo:** Matriz cobre 100% das tabelas com PII; zero leitura cross-tenant.
6. [ ] **Teste negativo:** Tabela nova sem policy reprova; policy permissiva sem justificativa reprova.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Simulação `migrations-p0-identity-rls-authz.sh` estendida.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-037 — Testes de concorrência e idempotência versionados

| Campo        | Valor                                                     |
| ------------ | --------------------------------------------------------- |
| Onda         | Onda 4 — Testes e cobertura por risco                     |
| Prioridade   | P1                                                        |
| Dependências | E51-022                                                   |
| Origem       | E50-036                                                   |
| Objetivo     | Transformar os cenários de E51-022 em suítes permanentes. |

### 10 subetapas

1. [ ] **Evidência inicial:** Cenários de agenda, streaming e CNAB executados manualmente pós-deploy.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Testes Deno com promises controladas e `FakeTime`; testes SQL com `pg_advisory_lock` e sessões paralelas; chaves de idempotência com replay.
5. [ ] **Teste positivo:** Suítes verdes no CI; falha injetada reproduz o defeito quando a correção é revertida.
6. [ ] **Teste negativo:** `IDEMPOTENCY_REPLAY` e `IDEMPOTENCY_CONFLICT` são auditados em toda repetição.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Job `P0 database migration simulations` + `Edge Functions`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-038 — Manter testes sob typecheck estrito e sanear mocks

| Campo        | Valor                                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| Onda         | Onda 4 — Testes e cobertura por risco                                          |
| Prioridade   | P2                                                                             |
| Dependências | E51-026                                                                        |
| Origem       | CLAUDE.md (gap “testes fora do typecheck”)                                     |
| Objetivo     | Garantir que `typecheck:tests` permaneça bloqueante e que mocks sejam tipados. |

### 10 subetapas

1. [ ] **Evidência inicial:** `typecheck:tests` e `typecheck:e2e` passam hoje; CLAUDE.md ainda afirma 232 erros latentes e testes excluídos.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Remover `as any` em mocks (`vi.mocked`, factories tipadas); manter os três typechecks no job `Type Check`.
5. [ ] **Teste positivo:** Zero `any` em `__tests__`; três typechecks verdes.
6. [ ] **Teste negativo:** Mock sem tipo reprova o ratchet de testes.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Baseline de `any` também para `__tests__`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-039 — Supply chain hermético: lockfile único e actions pinadas

| Campo        | Valor                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Onda         | Onda 5 — Segurança, performance e operação                                      |
| Prioridade   | P1                                                                              |
| Dependências | E51-001                                                                         |
| Origem       | E50-038 / E50-047                                                               |
| Objetivo     | Um único lockfile, instalação congelada em CI/Docker e actions fixadas por SHA. |

### 10 subetapas

1. [ ] **Evidência inicial:** `bun.lock` (07/09) e `package-lock.json` (10/09) coexistem; CI usa `npm install`; Dockerfile usa `npm install`; `npm audit` = 0 vulnerabilidades hoje.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Escolher npm (CI já roda Node) e remover `bun.lock`, ou o inverso; `npm ci`; `packageManager`/`engines` no `package.json`; `uses:` com SHA + comentário de versão; Dependabot para actions.
5. [ ] **Teste positivo:** Instalação falha se lockfile divergir; build reproduzível em dois runners produz o mesmo hash de bundle.
6. [ ] **Teste negativo:** Action referenciada por tag móvel reprova a auditoria de workflows.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `audit:workflows` verificando SHAs e `npm ci`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-040 — Inventário e rotação de segredos com cadência

| Campo        | Valor                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| Onda         | Onda 5 — Segurança, performance e operação                                             |
| Prioridade   | P0                                                                                     |
| Dependências | E51-006                                                                                |
| Origem       | E50-001 / E50-038                                                                      |
| Objetivo     | Fechar a rotação das credenciais expostas e instituir cadência com prova de revogação. |

### 10 subetapas

1. [ ] **Evidência inicial:** E50-001 permanece sem C1; ruleset e secrets não são auditados; `.env` já foi versionado no passado.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Inventário de secrets por consumidor (GitHub, Vercel, Supabase, Sentry); rotacionar senha de banco e token administrativo; secret scanning + push protection; calendário trimestral.
5. [ ] **Teste positivo:** Credencial antiga recebe 401/403; inventário sem valores versionado; alerta de secret em commit bloqueia push.
6. [ ] **Teste negativo:** Consumidor esquecido aparece como falha em smoke pós-rotação, não silenciosamente.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Secret scanning do GitHub + smoke de consumidores pós-rotação.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-041 — Threat model e pentest sobre o SHA promovido

| Campo        | Valor                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 5 — Segurança, performance e operação                                                              |
| Prioridade   | P1                                                                                                      |
| Dependências | E51-015–024                                                                                             |
| Origem       | E50-039                                                                                                 |
| Objetivo     | Executar modelagem de ameaças por superfície (bridge, Edge, Auth, Storage, cron) e pentest autenticado. |

### 10 subetapas

1. [ ] **Evidência inicial:** Nenhum pentest completo foi executado; auditorias foram estáticas e de catálogo.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** STRIDE por superfície; pentest com quatro identidades; ZAP/burp sobre Edge com JWT; relatório com CVSS e owner.
5. [ ] **Teste positivo:** Zero achado alto/crítico aberto; médios com prazo.
6. [ ] **Teste negativo:** Bypass de tenant ou escalada de papel encontrada bloqueia go-live.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Reteste dos achados corrigidos versionado como testes.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-042 — Reduzir o bundle e concluir divisão por rota

| Campo        | Valor                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| Onda         | Onda 5 — Segurança, performance e operação                              |
| Prioridade   | P2                                                                      |
| Dependências | E51-030                                                                 |
| Origem       | E50-042                                                                 |
| Objetivo     | Cortar os chunks gigantes e carregar Excel, PDF e gráficos sob demanda. |

### 10 subetapas

1. [ ] **Evidência inicial:** `dist/assets`: `index` 1,93 MB, `excelDownload` 1,32 MB, `vendor-charts` 0,97 MB, `jspdf` 0,60 MB, `vendor-react` 0,56 MB; avisos de chunk no build.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** `React.lazy` por rota; import dinâmico de `xlsx`/`jspdf`/charts; `manualChunks` por domínio; orçamento `size-limit`.
5. [ ] **Teste positivo:** Chunk inicial < 400 kB gzip; LCP em produção < 2,5 s no P75.
6. [ ] **Teste negativo:** PR que estoura o orçamento reprova `size-limit`.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `size-limit` no CI com relatório no PR.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-043 — Timeouts, keyset pagination e cache no bridge

| Campo        | Valor                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 5 — Segurança, performance e operação                                                                 |
| Prioridade   | P2                                                                                                         |
| Dependências | E51-035                                                                                                    |
| Origem       | `infra/runbooks/BRIDGE_PERFORMANCE.md` / E50-043                                                           |
| Objetivo     | Fechar os gaps do runbook: `AbortController` por query, paginação por cursor e cache de tabelas estáticas. |

### 10 subetapas

1. [ ] **Evidência inicial:** Runbook lista 10 gaps; `external-db-bridge` sem timeout de query; paginação por offset em tabelas > 100k.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Timeout configurável com erro tipado; cursor `(created_at,id)` em listagens; cache com TTL e invalidação por escrita; métricas SLOW/VERY_SLOW já existentes alimentam SLO.
5. [ ] **Teste positivo:** P95 de listagens < 300 ms com 100k linhas sintéticas; nenhuma query > 10 s.
6. [ ] **Teste negativo:** Query acima do timeout retorna erro e é auditada; offset além do limite é recusado.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Teste de carga no job de integração + alerta de SLO.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-044 — Observabilidade: SLOs, alertas e deduplicação de incidentes

| Campo        | Valor                                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| Onda         | Onda 5 — Segurança, performance e operação                                     |
| Prioridade   | P2                                                                             |
| Dependências | E51-005                                                                        |
| Origem       | E50-045                                                                        |
| Objetivo     | Definir SLOs por superfície e alertas que geram uma única issue por incidente. |

### 10 subetapas

1. [ ] **Evidência inicial:** Healthcheck gera issue por execução; Sentry configurado sem release tagging verificado; sem SLO documentado.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** SLO de disponibilidade/latência para app, Edge e bridge; release tagging no Sentry com SHA; runbook por alerta; dedupe por fingerprint.
5. [ ] **Teste positivo:** Painel com SLOs e burn rate; incidente simulado abre uma issue com runbook.
6. [ ] **Teste negativo:** Alerta sem runbook é rejeitado na revisão de configuração.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Teste do script de alertas + verificação de release no deploy.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-045 — Redação de PII, logs padronizados e cabeçalhos CSP

| Campo        | Valor                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| Onda         | Onda 5 — Segurança, performance e operação                                             |
| Prioridade   | P1                                                                                     |
| Dependências | E51-013                                                                                |
| Origem       | E50-044 / CLAUDE.md (CSP pendente)                                                     |
| Objetivo     | Garantir que nenhuma Edge, bridge ou frontend registre PII e que o app sirva CSP/HSTS. |

### 10 subetapas

1. [ ] **Evidência inicial:** Redator central existe com testes locais; nem todos os sinks foram validados; CSP no nginx/Vercel listado como pendente.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Middleware de log único em `_shared` com redator obrigatório; teste que injeta CPF/e-mail e verifica ausência no sink; `vercel.json`/nginx com CSP, HSTS, `frame-ancestors`.
5. [ ] **Teste positivo:** Scanner de logs pós-smoke não encontra padrões de PII; `securityheaders` nota A.
6. [ ] **Teste negativo:** Log com CPF em claro reprova o teste do redator.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `audit:security-config` estendido a cabeçalhos.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-046 — Acessibilidade WCAG 2.2 AA com axe no E2E

| Campo        | Valor                                                                              |
| ------------ | ---------------------------------------------------------------------------------- |
| Onda         | Onda 5 — Segurança, performance e operação                                         |
| Prioridade   | P2                                                                                 |
| Dependências | E51-015                                                                            |
| Origem       | E50-046                                                                            |
| Objetivo     | Cobrir jornadas críticas com auditoria automatizada de acessibilidade e correções. |

### 10 subetapas

1. [ ] **Evidência inicial:** Sem gate de a11y; componentes shadcn/ui parcialmente acessíveis.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** `@axe-core/playwright` nas specs públicas e autenticadas; corrigir violações sérias/críticas; teclado e leitor de tela nas 10 telas mais usadas.
5. [ ] **Teste positivo:** Zero violações sérias/críticas nas jornadas; foco visível e ordem lógica.
6. [ ] **Teste negativo:** Nova violação séria reprova o E2E.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Spec `a11y.spec.ts` obrigatória para release.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-047 — Atualizar CLAUDE.md, README e runbooks com o estado real

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Onda         | Onda 6 — Governança e recertificação                                          |
| Prioridade   | P2                                                                            |
| Dependências | E51-038–039                                                                   |
| Origem       | Achado 13/09 (claims obsoletos)                                               |
| Objetivo     | Remover afirmações desatualizadas e registrar o estado verificado do ciclo 2. |

### 10 subetapas

1. [ ] **Evidência inicial:** CLAUDE.md cita TypeScript 7 (re-pinado 6.0.3), 232 erros de teste fora do typecheck (hoje `typecheck:tests` passa), 675 arquivos “não validado”, `tsconfig.app.json` já removido; README de auditoria aponta 18/07 como histórico.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Reescrever seções de estado com data e SHA; mover histórico para `docs/HISTORICO.md`; runbooks de promoção canônica, rotação de segredos e incidentes.
5. [ ] **Teste positivo:** Cada claim de estado em CLAUDE.md tem SHA/run de referência; graphify atualizado.
6. [ ] **Teste negativo:** Revisão do PR recusa claim sem evidência.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Checklist de docs no template de PR.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-048 — Staging, rollback e DR com RTO/RPO medidos

| Campo        | Valor                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Onda         | Onda 6 — Governança e recertificação                                        |
| Prioridade   | P1                                                                          |
| Dependências | E51-016                                                                     |
| Origem       | E50-048                                                                     |
| Objetivo     | Substituir a exceção de ambiente por staging real e recuperação comprovada. |

### 10 subetapas

1. [ ] **Evidência inicial:** Alterações vão direto ao canônico por exceção do owner; PITR/restauração integral não testados.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Projeto Supabase de staging com manifesto idêntico; pipeline validate→staging→canônico; exercício de DR com relógio: RTO ≤ 1 h, RPO ≤ 15 min.
5. [ ] **Teste positivo:** Restauração integral em staging dentro do RTO/RPO; inventário igual ao canônico.
6. [ ] **Teste negativo:** Restauração fora do objetivo bloqueia o aceite de E51-050.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Exercício de DR trimestral com evidência.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-049 — Automatizar a revisão do plano com evidências por checkbox

| Campo        | Valor                                                                                 |
| ------------ | ------------------------------------------------------------------------------------- |
| Onda         | Onda 6 — Governança e recertificação                                                  |
| Prioridade   | P2                                                                                    |
| Dependências | E51-017                                                                               |
| Origem       | Revisão item 9–10                                                                     |
| Objetivo     | Fazer o validador exigir link de evidência em todo `[x]` e suportar múltiplos ciclos. |

### 10 subetapas

1. [ ] **Evidência inicial:** `validate-plan-50.mjs` valida apenas a estrutura de um arquivo fixo; checkboxes não exigem evidência.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Validador varre `PLANO_MELHORIAS_50_ETAPAS_*.md`, detecta prefixo (E50/E51), exige `→ link` em itens marcados e gera `REVISAO_<data>.json` com contagens.
5. [ ] **Teste positivo:** `audit:plan50` reprova `[x]` sem link; relatório de progresso gerado no CI.
6. [ ] **Teste negativo:** Marcação em massa é detectada por diff (> 10 checkboxes sem runs distintos).
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** `audit:plan50` no `ci:verify`.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## E51-050 — Recertificar no mesmo SHA e decidir go-live

| Campo        | Valor                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| Onda         | Onda 6 — Governança e recertificação                                                                                  |
| Prioridade   | Gate final                                                                                                            |
| Dependências | E51-001–049                                                                                                           |
| Origem       | E50-050                                                                                                               |
| Objetivo     | Reexecutar CI, Security, SQL, Edge, E2E, auditores vivos, restauração e pentest no mesmo SHA e emitir decisão formal. |

### 10 subetapas

1. [ ] **Evidência inicial:** Nota de referência 4,11/10 (10/09); lote local aprovado mas sem C4; meta escrita ≥8,0 versus pedido de 10/10 ainda sem rubrica objetiva.
2. [ ] **Ownership:** nomear executor, revisor e aprovador; mapear consumidores, dados, pré-condições e blast radius.
3. [ ] **Contrato:** documentar invariantes, entradas/saídas, autorização, compatibilidade, métricas, ameaça e critério de abort.
4. [ ] **Implementação:** Rubrica de 22 dimensões com critério objetivo por nota; execução de todas as evidências no SHA candidato; ata de go/no-go com pendências explícitas.
5. [ ] **Teste positivo:** Todos os gates verdes no SHA; zero P0/P1; nota ≥ 8,0 pela rubrica; decisão assinada.
6. [ ] **Teste negativo:** Qualquer P0/P1, drift, PII pública, credencial antiga ou rollback não provado bloqueia.
7. [ ] **Regressão:** executar typecheck, lint, unidade, integração, banco e E2E diretamente afetados.
8. [ ] **Operação:** medir antes/depois, garantir logs sem PII, alertas acionáveis e rollback ensaiado.
9. [ ] **Gate permanente:** Tag de release assinada somente com ata anexada.
10. [ ] **Promoção:** revisão dupla, staging/canário e evidências de commit, PR, runs, inventário, decisão e smoke pós-deploy.

### Checkpoints

- [ ] **C1 — Diagnóstico:** evidência inicial reproduzida no SHA corrente; owner, escopo, contrato e ameaça aprovados.
- [ ] **C2 — Implementação:** mudança revisada; testes positivo/negativo e rollback demonstrados.
- [ ] **C3 — Verificação:** regressão completa, gate permanente ativo no CI e métricas dentro do limite.
- [ ] **C4 — Evidência:** ambiente-alvo aprovado, documentação atualizada e links de commit, PR, run e decisão anexados.

## Gate final

O ciclo 2 só é encerrado, e o sistema só recebe dados reais, após E51-050 e a comprovação simultânea, no mesmo SHA, de:

- lote publicado, aplicado com ledger exato e revertível (E51-001, E51-011, E51-016);
- ruleset exigindo apenas checks que executam em PR, com gate de banco vivo em main (E51-004, E51-012);
- zero incidente de healthcheck por configuração e uma única ref de projeto Supabase (E51-005, E51-006);
- RV-01…RV-15 com checkpoint remoto encerrado (E51-018–024);
- orçamento de `any` e supressões em zero, warnings em zero, sem ciclos (E51-025–031);
- PostgreSQL local, metas de cobertura por domínio, handlers Edge, matriz RLS e concorrência no CI (E51-032–038);
- supply chain hermético, segredos rotacionados, pentest sem alto/crítico, bundle dentro do orçamento, SLOs e CSP (E51-039–046);
- docs fiéis ao SHA, staging/DR dentro de RTO/RPO, plano auditável e decisão go/no-go assinada (E51-047–050).
