# AGENTS.md — Departamento_Pessoal_V3

Regras do dono para qualquer agente de IA; **vencem `docs/`** (histórico, não ordem). Responda em PT-BR.

<!-- Seções 1–7: texto-mestre adm01-debug; mudou aqui → mude em todos os repos. -->

## 1. Contexto

Sistema ~80% pronto, em manutenção: bugs, hardening, deploy/infra quebrado em produção, implementar o que falta.
**O dono não é dev**: decide negócio, o agente executa engenharia. **Princípio:** qualidade + velocidade, pelo caminho
mais rápido e mais barato em tokens; isso decide ferramenta, leitura, diff e resposta.

## 2. Como trabalhar

1. Execução end-to-end via MCP; o agente resolve inteiro. Nunca "copie e cole", "roda aí", "você faz X e eu faço Y", nem
   passo manual do dono quando há MCP.
2. Decida como dev sênior, pelo dono. Pergunte só por custo, arquitetura, dado destrutivo em produção, trade-off real
   de negócio ou regra 8 do Fluxo Git. Para ler nunca peça permissão; sem "quer que eu faça?" após pedido.
3. **Verdade acima de validação.** Não sabe/falhou → diga. "Testado/validado/funcionando" só se rodou. Toda afirmação
   sobre código cita evidência (arquivo:linha, diff, saída); sem evidência = "NÃO VERIFICADO" + motivo. Nome
   de branch/commit/PR não prova nada: leia o código.
4. **Diff mínimo, zero churn.** Causa raiz, não reescrita; não refatore, renomeie, "melhore" ou comente o que não foi
   pedido. Dependência nova/bump major só se indispensável, avisando na PR. Sem plano de 12 fases para fix de 20 linhas.
5. `APROVADO` = execute o plano exatamente como descrito, sem reconfirmar.
6. **Uma tarefa por vez**, cada uma com sua branch/PR. Outro bug, mesmo quebrado? Não conserte nem expanda escopo:
   anote em "Próximos passos". Travou → reporte o erro exato e pare, sem pivotar ou contornar regra. Antes de concluir,
   releia o pedido.
7. **Tokens:** só o trecho necessário (range, grep), nunca o repo inteiro; grafo de código (seção 8)
   antes de buscar por texto; exploração ampla → subagente. Sem tool "por garantia", sem código que não será aplicado,
   sem replanejar a cada turno.
8. **Segredos** (`.git-credentials`, `.env.local`, tokens, chaves de API, service_role) nunca em código, commit, output
   ou resposta; só em variável de ambiente/secret do serviço.

## 3. Bugs

- **Diagnóstico antes de patch:** logs e estado real, ponto exato (arquivo:linha) e causa. Não chute fix. Mais de uma
  causa → liste todas, corrija a pedida.
- **Antes de abrir PR:** typecheck/lint/testes dos arquivos tocados; só erro seu conta, herdado do `main` → "Próximos passos".
- **"Pronto"** = PR mergeada + deploy confirmado + comportamento verificado (log, query ou request real). Faltou um →
  diga onde parou.

## 4. Funcionalidades

- **Pronta** = integrada de ponta a ponta: componente importado e usado, rota registrada, entrada na UI, serviço/hook
  chamado, edge function invocada e registrada, tabela/coluna existe e tem RLS, estados de erro/loading/vazio, botão com
  handler, form com submit. Sem corpo vazio, mock, hardcode, TODO/WIP.
- Fluxo incompleto (cria sem editar/excluir, lê sem salvar) = pela metade, não "pronto".
- Não cabe na sessão → entregue o funcional e integrado e liste o que falta, em ordem, com arquivos; nunca código morto
  ou feature "quase" sem dizer.

## 5. Comunicação

- **Resultado primeiro**: o que mudou e o efeito no negócio; técnica só se perguntarem. Sem introdução, recapitulação,
  narração, comentário sobre o processo, hedging, disclaimers, desculpas, lição de moral. Único fechamento: "Próximos passos".
- **Proporcional:** fix de 3 linhas = resposta de 5 linhas. Não despeje log/arquivo/tool; cite só a linha que importa.
  Caminhos, comandos e links completos. Destrutivo de verdade: uma linha ("isso apaga X, sem volta — confirma?").
- **Toda execução fecha com exatamente 3 "Próximos passos"** (`1. [título] — [por quê] · [onde]`): por impacto, do que
  você viu nesta sessão (nada genérico), executáveis via MCP, para não-dev. É menu: `1`, `1 e 3`, `APROVADO 2`,
  "todos" ou o bloco colado = executar na ordem, sem reconfirmar. Só consulta, 3 já rejeitados ou nada pendente →
  `Próximos passos: nada pendente neste escopo.`

## 6. Nunca

Reaproveitar branch · commitar em branch que não criou nesta sessão ou em `main` · mergear item da regra 8 abaixo ·
expandir escopo · afirmar sem evidência.

## 7. Fluxo Git (vários agentes ao mesmo tempo)

Escrita no GitHub (`adm01-debug`): MCP **`GITHUB - MCP - FOREVER`** (o padrão dá 403 em write; `git push`/`gh` só em repo
autorizado da sessão).

1. Nunca commite em `main`. Toda mudança nasce em branch própria.
2. Só escreva em branch que **você** criou nesta sessão; branch alheia é somente leitura, mesmo "só uma linha".
3. Antes de começar, liste PRs abertas nos mesmos arquivos (`github_graphql`, não `github_list_pull_requests`: estoura
   o contexto). Conflito → pare e avise o dono.
4. Branch de `main` atualizado: `claude/<fix|feat|chore|infra>-<slug>-<AAMMDD-HHMM>` (sem carimbo não é aceito); uma
   tarefa = uma branch = uma PR. Antes de push, confirme que o último commit é seu.
5. Commits curtos em PT-BR com prefixo (`fix:`, `feat:`, `chore:`, `infra:`), de preferência 1 commit atômico.
6. PR sempre: título = o que muda; corpo = causa/por quê + o que foi verificado de verdade, com evidência.
7. **Mergeie sem aprovação** PR sua pronta (CI verde, sem conflito, escopo comum: front, edge function, workflow,
   config): squash-merge e apague a branch. Exceção: regra 8.
8. **Deixe aberta e chame o dono** quando envolver: DDL/migration em produção; CI/workflows, segredos, Dockerfile,
   stack/Swarm, Traefik; deleção de dado, arquitetura ou custo; conflito com PR de outro agente.
9. Conflito: rebase em `main`; `--force-with-lease` só na sua branch. Nunca force-push em `main` nem toque em branch alheia.
10. Merge = **produção** (deploy automático na Vercel). Confira o deploy e reporte. CI vermelha → leia o resumo antes de
    patch; se foi seu merge, corrija em branch nova (`fix:`) na mesma sessão.
11. Reporte no fim: link da PR + estado (mergeada / aberta aguardando o dono / CI vermelha e por quê).

## 8. Específico deste repositório

- **Repo** `adm01-debug/Departamento_Pessoal_V3` · **Supabase canônico** `frjbfeamybqsejlvmqbl` · deploy Vercel via Git.
  **Stack:** React + TS strict (`tsconfig.json` raiz = CI) · Vite · Tailwind · Vitest · Playwright · Edge Functions Deno
  em `supabase/functions/` (gateway `external-db-bridge/`). **npm único** (`npm ci`; nunca Bun/yarn/pnpm). **Não bumpar
  `typescript` para ≥ 6.1.**
- **Comandos:** `npm run build` · `typecheck` · `lint:ci` · `test` · `test:e2e` · `ci:verify` (gate completo).
  Mudou rota/menu → `npm run inventario:rotas`, senão o CI reprova.
- **Antes de qualquer tarefa:** leia `docs/contexto/00-INDEX.md` (branch `contexto`) e `inventario/estado/*.json`; são
  gerados (divergiu → regenere). Nunca edite `docs/contexto/` na main (só `regras/manual/`) nem abra PR da branch `contexto`.
- **Grafo:** `graphify query|path|explain` antes de grep; clone novo → `npm run graph:rebuild`, mudou código →
  `graph:update`; versionados só `GRAPH_REPORT.md`/`manifest.json`.
- **Banco de produção:** migration só via `canonical-migrations.yml` (`validate` → `apply`), nunca `psql`/MCP direto;
  ledger não prova DDL aplicado: exija o sidecar `.verify.sql`. Edge Functions via `canonical-edge-functions.yml`;
  `verify_jwt = false` só com justificativa em `config.toml`. Tabela nova: RLS + policies por `empresa_id`. Runbooks:
  `infra/runbooks/`.
- **CI:** `ci.yml` + canônicos; `main` squash-only, 10 checks obrigatórios, 0 aprovações, code owner só em
  `.github/CODEOWNERS`.
- Detalhes: `docs/agentes/` (arquitetura, contexto-inventario, graphify, decisoes-e-gaps).
