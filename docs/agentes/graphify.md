# Grafo de conhecimento do código (graphify)

> Extraído do antigo `CLAUDE.md` em 07/11/2026. Skill: `.claude/skills/graphify/SKILL.md` (`/graphify`).

O projeto tem um grafo em `graphify-out/` (god nodes, comunidades, relações entre arquivos).

## Regras

- Pergunta sobre o código → primeiro `graphify query "<pergunta>"` quando `graphify-out/graph.json` existe.
  `graphify path "<A>" "<B>"` para relações, `graphify explain "<conceito>"` para um nó. Retornam um
  subgrafo bem menor que `GRAPH_REPORT.md` ou grep cru.
- Se `graphify-out/wiki/index.md` existir, use-o para navegação ampla em vez de ler fonte crua.
- Leia `graphify-out/GRAPH_REPORT.md` só para revisão ampla de arquitetura ou quando query/path/explain
  não bastarem.
- Depois de modificar código, `graphify update .` (AST-only, sem custo de API).

## Frescura do grafo

Antes de consultar, confira se está atualizado:

```sh
git rev-parse --short HEAD
grep "Built from commit" graphify-out/GRAPH_REPORT.md
```

Não existe sync automático: em clone novo (sem `graphify-out/graph.json` local) rode `npm run graph:rebuild`
primeiro — o incremental depende do grafo local. Com o grafo construído, `npm run graph:update` atualiza
incrementalmente e `npm run graph:rebuild` refaz tudo. Após o rebuild, commite `graphify-out/GRAPH_REPORT.md`
e `graphify-out/manifest.json` — são os únicos artefatos versionados; `graph.json`/`graph.html`/cache são
regeneráveis e ficam fora do git (`.gitignore`).

## Sessão na nuvem (Claude Code remoto)

`.claude/hooks/session-start.sh` (só com `CLAUDE_CODE_REMOTE=true`) instala o graphify e gera o grafo em
segundo plano — log em `graphify-out/.session-start.log`; clone sem `graph.json` faz build completo. Se os
versionados `GRAPH_REPORT.md`/`manifest.json` estavam limpos, voltam ao commitado depois de um build
bem-sucedido (`git status` limpo) e o relatório fresco fica em `graphify-out/GRAPH_REPORT.sessao.md`; se já
estavam editados, o hook não mexe neles. `.claude/settings.json` também tem hooks `PreToolUse`
(`graphify hook-guard search|read`) em Bash/Grep/Read/Glob.

## Comandos e notas operacionais

```bash
pip install "graphifyy[sql]"   # instalação (uma vez; o extra [sql] é obrigatório para parsear as ~730
                               # migrations — sem ele elas entram vazias no grafo)
npm run graph:update           # atualização incremental
npm run graph:rebuild          # rebuild completo
graphify query "quem chama episService"
graphify path "App" "supabase"
graphify explain "useEmpresas"
```

- O grafo tem ~20k nós (>5.000), então `graph.html` abre em modo agregado (nós de comunidade). Para detalhe
  por arquivo, `graphify update . --obsidian` ou consulte `graph.json`/`query`/`path`/`explain`.
- `query/path/explain` funcionam offline sobre `graph.json`. `graphify label` (nomes semânticos das
  comunidades) é opcional e exige `GEMINI_API_KEY`/`GOOGLE_API_KEY`.
- `.graphifyignore` exclui secrets, baselines JSON e artefatos gerados — mantenha-o alinhado ao `.gitignore`.
- 2 arquivos não são extraídos por completo (limitação do parser): `src/types/entities.ts` (tipos
  `import()` inline) e `src/utils/__tests__/cursorPagination.test.ts` (string com null byte).
