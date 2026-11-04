# scripts/graphify — Instalação do grafo de código

Script de setup do [graphify](https://pypi.org/project/graphifyy/) para este repositório.
O graphify gera um grafo de conhecimento do código para navegação e consulta semântica.

## Pré-requisitos

- `uv` (recomendado) ou `pipx`
- `npm install` já executado (instala o husky)

## Uso

```bash
npm run graph:setup
```

Requer que `package.json` tenha o script:

```json
"graph:setup": "bash scripts/graphify/setup.sh"
```

## O que faz

1. Instala `graphifyy[sql]==0.9.68` via uv ou pipx
2. Configura hooks git (post-commit/post-checkout para rebuild incremental)
3. Roda `graphify update .` para gerar o grafo inicial

## Consultas após instalação

```bash
graphify query "quem chama externalDbBridge"
graphify path "App" "supabase"
graphify explain "useEmpresas"
```

## Variável de controle

| Var | Default | Descrição |
|---|---|---|
| `GRAPHIFY_VERSION` | `0.9.68` | Versão do pacote a instalar |

## Portado de

Zapp Web V2 (`scripts/graphify/setup.sh`), adaptado: `bun install` → `npm install`.
