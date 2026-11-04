# scripts/ci — Guardas de CI

Scripts que rodam no CI e podem ser executados localmente antes de abrir PR.

| Script | O que faz | Quando rodar |
|---|---|---|
| `check-claude-md-integrity.mjs` | Verifica que `CLAUDE.md` tem as 4 seções obrigatórias e não encolheu >30% vs HEAD | Sempre que tocar em `CLAUDE.md` |

## Uso local

```bash
# Verificar integridade do CLAUDE.md (roda offline, sem credenciais)
node scripts/ci/check-claude-md-integrity.mjs
```

## Integração com CI

Adicionar ao job `security-config` de `.github/workflows/ci.yml`:

```yaml
- name: Verificar integridade do CLAUDE.md
  run: node scripts/ci/check-claude-md-integrity.mjs
```

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `CLAUDE_MD_BASE` | `HEAD` | Ref git para comparação de tamanho (no CI: `origin/main`) |

## Portado de

Zapp Web V2 (`scripts/ci/check-claude-md-integrity.mjs`), adaptado para a estrutura do DP V3.
