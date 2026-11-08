# scripts/ci — Guardas de CI

Scripts que rodam no CI e podem ser executados localmente antes de abrir PR.

| Script | O que faz | Quando rodar |
|---|---|---|
| `check-claude-md-integrity.mjs` | Verifica que `AGENTS.md` existe, tem as 4 seções obrigatórias (`## 1. Contexto`, `## 2. Como trabalhar`, `## 7. Fluxo Git`, `## 8. Específico deste repositório`) e não encolheu >30% vs a base | Sempre que tocar em `AGENTS.md` (o `CLAUDE.md` é só `@AGENTS.md`) |

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

**Ligação real no CI:** PR [#396](https://github.com/adm01-debug/Departamento_Pessoal_V3/pull/396) (`ci: liga
o guard...`) adiciona esse step ao job `security-config`. Está empilhada sobre a `main`, não sobre esta PR —
por isso `grep check-claude-md-integrity .github/` ainda não retorna nada nesta branch. Depois que as duas
mergearem (qualquer ordem), o guard roda em todo PR.

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `CLAUDE_MD_BASE` | `HEAD` | Ref git para comparação de tamanho (no CI: `origin/main`) |

## Portado de

Zapp Web V2 (`scripts/ci/check-claude-md-integrity.mjs`), adaptado para a estrutura do DP V3.

Pendente: a versão endurecida do Zapp também vigia o **conjunto** `AGENTS.md` + `CLAUDE.md` +
`docs/agentes/*.md` (−30% no total e −50% por arquivo, mais existência de cada arquivo que havia na base).
Portar isso exige editar este script, que está sendo alterado por uma PR aberta de outra sessão.
