# scripts/ci — Guardas de CI

Scripts que rodam no CI e podem ser executados localmente antes de abrir PR.

| Script | O que faz | Quando rodar |
|---|---|---|
| `check-claude-md-integrity.mjs` | Verifica que `AGENTS.md` existe, tem as 4 seções obrigatórias (`## 1. Contexto`, `## 2. Como trabalhar`, `## 7. Fluxo Git`, `## 8. Específico deste repositório`) e não encolheu >30% vs a base | Sempre que tocar em `AGENTS.md` (o `CLAUDE.md` é só `@AGENTS.md`) |
| `github-settings-guard.mjs` | Confere o perímetro do GitHub (repo, actions, workflow permissions, selected actions, rulesets, environments) contra o baseline versionado (`github-settings-baseline.json`) e abre/atualiza a issue `[settings-guard]` se houver divergência ou ponto cego | Rodado diariamente pelo `settings-guard.yml`; disparar manualmente após mudar uma config intencional |
| `github-settings-baseline.json` | Baseline das configurações esperadas para este repo (medido em 2026-11-09) | Atualizar manualmente quando mudar uma config intencional |
| `issue-rotativa.mjs` | Helper: abre ou rotaciona uma issue de alerta (pagina corretamente, rotaciona em >20 comentários conforme E51/W91) | Importado por `notifica-falha.mjs` |
| `notifica-falha.mjs` | Glue para `notifica-falha-main.yml`: lê o contexto do `workflow_run` via env vars e chama `abrirOuRotacionar` | Chamado pelo workflow de falha na main |

## Uso local

```bash
# Verificar integridade das instruções para agentes (roda offline, sem credenciais)
node scripts/ci/check-claude-md-integrity.mjs
```

## Integração com CI

Adicionar ao job `security-config` de `.github/workflows/ci.yml`:

```yaml
- name: Integridade das instruções para agentes (GA02)
  env:
    CLAUDE_MD_BASE: origin/main
  run: node scripts/ci/check-claude-md-integrity.mjs
```

Precisa de `fetch-depth: 0` no checkout desse job, senão `origin/main` não existe localmente para a
comparação de bytes.

**Ligação no CI:** o step está no job `security-config` de `.github/workflows/ci.yml`, adicionado pela PR
[#396](https://github.com/adm01-debug/Departamento_Pessoal_V3/pull/396) — já mergeada, roda em todo PR.

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `CLAUDE_MD_BASE` | `HEAD` | Ref git para comparação de tamanho (no CI: `origin/main`) |

## Portado de

Zapp Web V2 (`scripts/ci/check-claude-md-integrity.mjs`), adaptado para a estrutura do DP V3.

Pendente: a versão endurecida do Zapp também vigia o **conjunto** `AGENTS.md` + `CLAUDE.md` +
`docs/agentes/*.md` (−30% no total e −50% por arquivo, mais existência de cada arquivo que havia na base).
Portar isso exige editar este script, que está sendo alterado por uma PR aberta de outra sessão.
