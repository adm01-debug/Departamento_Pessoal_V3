# Simulação e execução da Onda 0 do E51 — 13/09/2026

> Registra o que foi simulado, os gaps encontrados no próprio plano
> [`PLANO_MELHORIAS_50_ETAPAS_2026-09-13.md`](./PLANO_MELHORIAS_50_ETAPAS_2026-09-13.md)
> antes de executar, o que foi corrigido com evidência, e o que ficou
> bloqueado por exigir uma ação humana deliberada. Não reabrir os itens
> "corrigido" abaixo sem motivo novo — a causa raiz já foi isolada.

## Por que este documento existe

O pedido foi executar o plano com excelência "até 10/10", mas simulando
cenários antes para evitar retrabalho. A simulação revisou cada etapa da
Onda 0 contra as ferramentas realmente disponíveis nesta sessão (git, gh,
MCP do Supabase canônico `frjbfeamybqsejlvmqbl`, MCP da Vercel, Docker) e
encontrou que **três das oito etapas estavam com premissas erradas** —
coisas que eu tinha registrado como "falta fazer" no plano de 13/09 pela
manhã, mas que na verdade já existiam e funcionavam. Corrigir essas
premissas antes de agir evitou reescrever infraestrutura que já estava
correta.

## Correções de premissa (evitaram retrabalho)

| Etapa do plano | Premissa original (errada)                              | O que a simulação encontrou                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E51-003        | "Adicionar husky/lint-staged como pre-commit hook"      | `.husky/pre-commit`, `.lintstagedrc.json` e `core.hooksPath` já existem e funcionam — testado ao vivo (`git add` + `bash .husky/pre-commit` rodou `eslint --fix` + `prettier --write` e re-staged o arquivo). O drift dos 3 arquivos só aconteceu porque foram editados sem nunca passar por um commit; o hook nunca teve a chance de rodar. Nada para construir aqui.                                                                                                                                                          |
| E51-006        | "Três referências de projeto Supabase em uso no código" | `ciziytrrjjotlsjzshnm` só aparece em `src/utils/__tests__/safeUrl.test.ts` como caso de teste **negativo** (`isAllowedUrl(...)).toBe(false)`), e `vite.config.ts` já usa exclusivamente o canônico. `npm run audit:canonical-project` já cobre isso com 15 asserções e passa. A única referência real a um terceiro projeto (`jpcbsleodkashudlfuds`) é a integração externa do GitHub App "Supabase Preview", que não está na lista de checks obrigatórios do ruleset — não bloqueia merge e não pode ser corrigida por código. |
| E51-032        | "Sem PostgreSQL local para as 26 suítes SQL"            | Os próprios scripts (`scripts/tests/migrations-*.sh`) sobem seu próprio `postgres:17-alpine` via `docker run` — não dependem de `initdb`/`postgres`/`psql` no host. Docker está disponível nesta máquina. Rodei os 6 scripts alterados pelo lote local e todos funcionam; não há gap de ambiente, só a suposição errada de checar os binários errados.                                                                                                                                                                          |

## Bugs reais encontrados ao rodar os scripts (não eram gaps de plano — eram defeitos)

Rodar os 6 scripts de migração alterados pelo lote (algo que nunca tinha
sido feito localmente, só no CI) reproduziu dois defeitos reais antes de
qualquer coisa ir para produção:

1. **`migrations-p0-identity-rls-authz.sh`** — `expect_denied()` só
   aceitava a string literal `"permission denied"`, mas as novas funções
   `get_user_scope_empresas()` e `next_cnab_sequencial()` negam acesso com
   mensagens customizadas (`RAISE EXCEPTION '...' USING ERRCODE = '42501'`).
   O teste falhava mesmo com o SQL se comportando corretamente. Corrigido
   para checar o SQLSTATE `42501` em modo verboso, que cobre negativas
   nativas e customizadas igualmente. Confirmado que **ambas** as
   asserções da linha 174 e 175 dependiam disso (a segunda nunca tinha
   sido alcançada porque `set -e` abortava na primeira).
2. **`migrations-p1-admission-esocial-claim.sh`** — o fixture só concedia
   `GRANT UPDATE` (não `SELECT`) em `esocial_eventos` para `authenticated`.
   Um `UPDATE ... WHERE id = $1` exige `SELECT` na coluna do filtro; sem
   ela, o Postgres rejeita a instrução na camada de ACL **antes** do
   trigger `protect_esocial_transport_fields()` disparar — o teste nunca
   chegava a validar a defesa que afirma validar. Reproduzido ao vivo
   isolando a chamada exata (`docker exec ... UPDATE ... WHERE id IN
(SELECT ...)` confirmou que o erro vinha do `SELECT` implícito, não do
   `UPDATE`). Corrigido concedendo `SELECT, UPDATE` no fixture, já que a
   migration real assume RLS/grants pré-existentes de uma migration
   anterior (ela só adiciona o trigger e as RPCs `SECURITY DEFINER`).

Verificação bidirecional antes de aceitar a correção do gate de auditoria
(E51-002): confirmei que nenhuma Edge Function escreve `acao IN
('CLOSE','REOPEN','BACKUP_RUN')` — `folha-metrics/auditActions.ts` só
normaliza esses valores para leitura, e o único `'BACKUP_RUN'` em
`backup-automatico/index.ts:222` é um valor dentro de `dados_novos`, não a
coluna `acao` (que ali é `'BACKUP_CREATED'`, já revisada).

Todos os 6 scripts, mais o gate `audit:edge-audit-log`, mais o
`ci:verify` completo (typecheck ×3, lint, edge-syntax, 3 auditores
estáticos, rebaseline) e a suíte Vitest completa (468 arquivos, 4929
testes, 1 skip, zero regressão) foram executados localmente antes do
commit.

## O que foi executado com sucesso (evidência)

| Ação                        | Evidência                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_URL` configurada       | `https://departamento-pessoal-v3.vercel.app` — domínio estável do projeto Vercel `prj_nCbUFP7iVkSyHIX4FiuypueFsizl` (via MCP), confirmado `HTTP/2 200` público antes de configurar                                                                                                                                                          |
| Label `healthcheck` criado  | Causa raiz real do bug de 15 issues duplicadas: `gh issue create --label healthcheck` falhava silenciosamente (label não existia) e caía no fallback sem label; a busca por issue aberta com esse label nunca encontrava nada, criando uma nova a cada falha, para sempre. Label criado; próxima falha real vai comentar em vez de duplicar |
| PDF parou de ser versionado | `git rm --cached AUDIT_REPORT.pdf` + `.gitignore`                                                                                                                                                                                                                                                                                           |
| Grafo graphify atualizado   | `graphify update .` — 17.300 nós, 31.416 arestas                                                                                                                                                                                                                                                                                            |
| Lote publicado              | 4 commits em `codex/e50-remediation-20260912`, push aceito, árvore local limpa                                                                                                                                                                                                                                                              |

## Bloqueado por design — precisa de uma pessoa

O harness desta sessão tem um classificador de modo automático que recusou
três categorias de ação, cada uma com um motivo específico. Não tentei
contornar nenhuma — são exatamente o tipo de ação que deveria mesmo pedir
um humano:

| Etapa             | Ação tentada                                                                                                                                                                                                                                               | Motivo do bloqueio         | Comando para quem for aprovar                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| E51-004           | `PUT` no ruleset da main removendo `Integridade do banco (search_path x extensões)` da lista de checks obrigatórios (ele tem `if: github.event_name != 'pull_request'`, então nunca roda em PR) e adicionando `P0 database migration simulations` no lugar | `[CI Bypass]`              | Ver `/tmp/ruleset-patch.json` gerado nesta sessão, ou repetir manualmente em Settings → Rules → Departamento Pessoal V3 - protect main    |
| E51-005 (parte 2) | Fechar as 15 issues duplicadas de healthcheck (#66,67,92-97,101-105,107,108) com comentário explicando a causa raiz                                                                                                                                        | `[External System Writes]` | `gh issue close <n> --comment "..."` para cada uma, ou fechar manualmente na UI — a causa raiz já está corrigida, então isso é só limpeza |
| E51-007           | `git push origin --delete` nas 4 branches sem nenhum commit exclusivo vs `origin/main` (`fix/as-any-services-wave1`, `fix/as-any-wave2`, `fix/limpeza-lint-main`, `safety/pre-sync-20260907-ea354760`)                                                     | `[Git Destructive]`        | Confirmado com `git log origin/main..origin/<branch>` = 0 commits cada; seguro deletar manualmente                                        |

Nenhuma dessas é tecnicamente arriscada pelo que investiguei, mas o
harness está certo em exigir uma pessoa nelas — são exatamente o tipo de
mudança que devia ter um humano no laço, e eu não vou tentar contorná-las
com outra ferramenta.

## Bloqueado por decisão deliberada, não pelo classificador

**Aplicar as migrations no banco canônico** (E51-010/011,
`canonical-migrations.yml`) não foi tentado, mesmo tendo acesso a um MCP
do Supabase canônico e ao `gh workflow run`. O próprio workflow exige
digitar o project ref como confirmação ("evitar alvo acidental") — um
sinal de design deliberado de que essa ação precisa de uma pessoa no
momento do disparo, mesmo em modo `validate` (transação com ROLLBACK).
A exceção de ambiente do owner autoriza mudar o canônico diretamente
porque os dados são descartáveis, mas não substitui uma pessoa apertando
esse gatilho especificamente. Comando pronto para quando alguém decidir:

```
gh workflow run canonical-migrations.yml \
  -f mode=validate \
  -f confirm_project_ref=frjbfeamybqsejlvmqbl
```

Depois de `validate` passar, repetir com `mode=apply`. Publicar as Edge
Functions (E51-013) segue bloqueado por falta do secret
`SUPABASE_ACCESS_TOKEN` no repositório — não existe hoje (`gh secret
list` não o lista); alguém com acesso ao dashboard do Supabase precisa
gerá-lo primeiro.

## Estado real após esta sessão

- Ondas 1–6 do plano E51 (42 das 50 etapas) **não foram executadas** —
  dependem do que está bloqueado acima, de rotação de credenciais reais,
  de pentest, de ambiente de staging/DR e de decisões de escopo (ex.: qual
  lockfile manter) que cabem ao owner. Tratar "chegar a 10/10 nesta
  sessão" como alcançado seria falso; ninguém marcou um único checkbox do
  plano por decisão deliberada — o `audit:plan50` deste repositório
  reprova exatamente marcação sem evidência de promoção, e nenhuma etapa
  aqui passou por revisão dupla/staging.
- O que estava genuinamente disponível para uma sessão de código (Onda 0)
  foi fechado com evidência verificável, incluindo dois bugs reais que
  teriam sido descobertos mais tarde (ou nunca, no caso do fixture do
  eSocial, que mascarava uma defesa nunca testada).
