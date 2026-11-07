# Fluxo Git — dicas de ferramenta (complemento à seção 7 do `AGENTS.md`)

> As regras estão no `AGENTS.md`; aqui ficam só os detalhes operacionais que não cabem lá.

## Listar PRs abertas tocando os mesmos arquivos (regra 3)

Jeito barato de cumprir a regra numa chamada só, com `github_graphql` (MCP `GITHUB - MCP - FOREVER`):

```graphql
{
  repository(owner: "adm01-debug", name: "Departamento_Pessoal_V3") {
    pullRequests(states: OPEN, first: 50) {
      nodes { number headRefName files(first: 100) { nodes { path } } }
    }
  }
}
```

O núcleo é `pullRequests(states:OPEN){ nodes { number files { nodes { path } } } }`. Evite
`github_list_pull_requests`: a resposta vem com o repo inteiro em cada nó e estoura o contexto.

Alternativa fora do MCP (quando `gh` está autorizado na sessão):
`gh pr list --repo adm01-debug/Departamento_Pessoal_V3 --state open --json number,headRefName,files`.

## Um commit atômico (regra 5)

`github_push_files` aceita `files` e `delete` no mesmo commit — dá para criar, alterar e remover arquivos
numa única entrada de histórico.

## Branch e worktree

Nome: `claude/<fix|feat|chore|infra>-<slug>-<AAMMDD-HHMM>`, sempre a partir de `origin/main` atualizado
(`git fetch origin main && git worktree add <dir> -b <branch> origin/main`). Antes de cada push, confirme que
o último commit da branch é seu (`git log -1 --format=%an`).
