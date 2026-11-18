# SQL preservado da branch `muri`

DDL que a `muri` tinha e a `main` não, **guardado aqui para não se perder quando a branch for
apagada**, e deliberadamente **fora de `supabase/migrations/`**.

Por que fora: o `canonical-migrations.yml` copia de `supabase/migrations/$migration` no ref em que
roda. Um arquivo solto lá, sem estar no LOTE ATUAL, é DDL que ninguém aplica e que o
`audit-migration-style` passa a cobrar — e, pior, confunde quem for montar o próximo lote. Aqui o
SQL fica legível e rastreável sem entrar no fluxo de aplicação.

## Inventário: as 14 migrations que só existiam na `muri`

`comm` entre `git ls-tree origin/main` e `origin/muri` em `supabase/migrations/`: **14** arquivos
só na branch. Quatro deles **estão na `main` com o timestamp incrementado** — colisão de versão
resolvida no merge, não perda:

| só na `muri`                                             | na `main` como     | conteúdo                                  |
| -------------------------------------------------------- | ------------------ | ----------------------------------------- |
| `20260724120000_atomic_rate_limit_rpc`                   | `20260724120001_…` | blob **idêntico**                         |
| `20260724130000_codex_p1_function_overload_and_auth_gap` | `20260724130004_…` | blob **idêntico**                         |
| `20260724140000_t007_backup_logs_rls`                    | `20260724140001_…` | blob **idêntico**                         |
| `20260818000000_p2_037_deprecate_legacy_tables`          | `20260818000001_…` | a `main` **corrige** a da `muri` (abaixo) |

Sobre o `p2_037`: a versão da `muri` detectava a tabela `ferias` legada pela presença de
`empresa_id` (coluna errada) e tinha `RAISE WARNING '… % rows …'` **sem argumento** — erro de
runtime em PL/pgSQL. A `main` discrimina por `NOT EXISTS (… column_name = 'data_inicio')`, passa
`ferias_count` ao `RAISE`, protege o `COMMENT` com `to_regclass` e recria a `ferias` canônica se o
rename a tiver removido. **Não resgatar a da `muri`.**

Os **10 restantes** estão preservados nesta pasta. Veredito de cada um:

| arquivo                                           | estado na `main`                                 | o que fazer                                    |
| ------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| `20260929120000_colaborador_lotacoes`             | ausente                                          | **decisão do dono** — detalhado abaixo         |
| `20260925120000_document_upload_storage_columns`  | ausente (`storage_path` não está nos tipos)      | **candidato real** — detalhado abaixo          |
| `20260925130000_storage_documentos_delete_…`      | ausente (a `main` tem **0** policy `FOR DELETE`) | **decisão do dono: amplia acesso**             |
| `20261005000000_onboarding_kits_rls_additive`     | redundante, menos um índice                      | aproveitar **só o índice**                     |
| `20261005010000_onboarding_audit_trigger`         | ausente                                          | **decisão do dono** — valor baixo              |
| `20261005020000_onboarding_modelo_b_convergencia` | ausente                                          | **não aplicar** — converte linhas que são seed |
| `20261026090000_ciclos_exclusao_autorizada`       | ausente como arquivo, **já em produção**         | não aplicar; guardado como registro            |
| `20260819000000_p0_fix_user_empresa_id_rls`       | ausente                                          | **NÃO APLICAR — é regressão**                  |
| `20260820000000_p0_fix_auditoria_rpc`             | ausente                                          | **NÃO APLICAR — é regressão**                  |
| `20260821000000_p0_rls_dashboard_audit`           | ausente                                          | **NÃO APLICAR** — desfaria duas remediações    |

A análise que sustenta as linhas de "regressão", de `onboarding` e de `ciclos` está em
`docs/auditoria/MIGRATIONS_ORFAS_MURI_2026-11-16.md`, seções 1-3 e 7-10. As três marcadas
**NÃO APLICAR** estão aqui só para não desaparecerem: aplicá-las reabriria buracos de RLS que a
`main` já fechou.

## Mais dois arquivos de SQL que só existiam na `muri`

| arquivo                                                  | o que é                                                                | veredito                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| `20261026090000_ciclos_exclusao_autorizada_rollback.sql` | o rollback da migration `20261026090000`, preservada acima             | guardado junto com a forward  |
| `FIX_APLICAR_REGISTRAR_AUDITORIA.sql`                    | script manual de diagnóstico + correção de `registrar_auditoria` (404) | **não executar** — ver abaixo |

`supabase/rollback/` existe na `main` com 10 arquivos, mas **não** com o do
`20261026090000` — porque a forward também não está lá. Os dois ficam aqui juntos: se o dono
decidir aplicar a forward, o rollback vem no mesmo pacote.

`FIX_APLICAR_REGISTRAR_AUDITORIA.sql` é um roteiro de sessão: o próprio cabeçalho manda abrir o
SQL Editor do dashboard, colar e clicar "Run". Isso é exatamente o caminho que o AGENTS.md §5
proíbe — DDL em produção só por `canonical-migrations.yml`. E o PASSO 2 faz
`DROP FUNCTION` em três assinaturas de `registrar_auditoria`/`listar_auditoria`; rodá-lo hoje
derrubaria as versões vigentes, que a `main` define em várias migrations. Fica preservado como
registro — **a metade útil é o PASSO 1**, a consulta de diagnóstico que lista as sobrecargas
existentes em `pg_proc`.

## O resíduo não-SQL da `muri`, para fechar a conta

Fora de `supabase/migrations/`, sobraram 2 504 caminhos só na `muri`. Nenhum é perda:

| grupo                                                                     | arquivos | por quê não é perda                                                                                                                                                                   |
| ------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tmp-*/`, `anim-out/`, `_tmp-*.mjs`, PNG/WEBM/TXT de sessão               | ~2 050   | artefato de sessão de auditoria visual                                                                                                                                                |
| `scripts/` de auditoria pontual                                           | 154      | scripts de uma sessão                                                                                                                                                                 |
| `docs/api/`                                                               | 37       | preenchimento de template de uma API REST que não existe (veredito em `VEREDITO_MURI_2026-11-17.md` §2)                                                                               |
| `src/`                                                                    | 111      | triado em `VEREDITO_MURI_2026-11-17.md` §4 — 13 melhorias recuperadas em PRs próprias                                                                                                 |
| `e2e/`                                                                    | 9        | 5 recuperados na #661; 4 descartados com defeito confirmado                                                                                                                           |
| `docs/ADR/` + `docs/adr/`                                                 | 7        | **todos na `main`**, consolidados e renumerados em `docs/adr/0001-0007`. Única diferença amostrada: o título `ADR 001` → `ADR 0001`                                                   |
| `docs/{API,API_REFERENCE,ARCHITECTURE,ARQUITETURA,CONTRIBUTING*,DEPLOY*}` | 10       | **todos na `main`, byte a byte**, em `docs/_archive/docs-duplicados/` — foram arquivados de propósito como duplicados                                                                 |
| `k8s/`, `helm/`, `terraform/`, `ansible/`                                 | 21       | scaffolding genérico de um deploy Kubernetes/Terraform que **não existe**: nenhum desses arquivos menciona `supabase` ou `vercel`. Os `secrets.y*ml` são placeholders, sem valor real |
| `bun.lock`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`                       | 3        | **proibidos** — AGENTS.md §8: npm único                                                                                                                                               |
| `netlify.toml`                                                            | 1        | o deploy é Vercel                                                                                                                                                                     |
| `.github/ISSUE_TEMPLATE/*.md`, `pull_request_template.md`                 | 3        | a `main` tem a forma melhor: `bug_report.yml`, `feature_request.yml`, `config.yml` e `PULL_REQUEST_TEMPLATE.md`                                                                       |
| `.github/workflows/branch-protection.yml`                                 | 1        | **regressão**: define `required_status_checks.contexts: []`, apagando os 10 checks obrigatórios da `main`, e exige 1 aprovação onde hoje são 0. Correto estar ausente                 |
| `.husky/pre-commit.sh`                                                    | 1        | a `main` tem `.husky/pre-commit` com o mesmo `npx lint-staged` (o nome com `.sh` o husky não executa)                                                                                 |
| `lighthouserc.js`                                                         | 1        | a `main` tem `lighthouserc.cjs` **funcionando**: a da `muri` auditava `localhost:3000` em rotas autenticadas, que redirecionam para `/login` — mediria a tela de login                |
| `public/manifest.webmanifest`                                             | 1        | a `main` tem `public/manifest.json` com a marca real e ícones SVG inline; a da `muri` aponta para `/icon-192.png` e `/icon-512.png`, que não existem                                  |
| `.clinerules`, `.github/FUNDING.yml`, `AUDIT_REPORT.pdf`, `audit.json`    | 4        | configuração de outra ferramenta, patrocínio e relatórios de sessão                                                                                                                   |
| `docs/ninebox-aprovacao-gestor-vinculo-abner.sql`                         | 1        | **não resgatar**: a `main` tem o mesmo SQL em `…-conta-homologacao.sql`, sanitizado. A versão da `muri` traz e-mail e `user_id` reais em claro                                        |

> **Nenhum arquivo desta pasta deve ser movido para `supabase/migrations/` sem decisão do dono.**
> Todo ele é DDL em produção — regra 8 do fluxo Git.

## `20260925120000_document_upload_storage_columns.sql` — o candidato mais concreto

Acrescenta `storage_path`, `mime_type`, `nome_arquivo` e `tamanho` em `public.documentos`, e
`storage_path` + `mime_type` em `public.documentos_pessoais_arquivos`.

**Não está na `main`:** `storage_path` aparece **0 vezes** em
`src/integrations/supabase/database.types.ts`, que é gerado do banco canônico e tem gate de frescura
(`gen:table-columns --check`). Então as colunas não existem em produção.

Por que interessa: a #653 trouxe upload real de arquivo nos quatro formulários de documento. Sem
essas colunas, o que o upload grava sobre o arquivo (caminho no bucket, tipo, nome original,
tamanho) não tem onde ser guardado de forma estruturada. É `ADD COLUMN IF NOT EXISTS` em colunas
anuláveis — aditivo, sem reescrever linha existente.

**O que falta antes de aplicar:** o sidecar `.verify.sql` (este arquivo não tem) e o código que
passa a gravar e ler as colunas. Sem o segundo, vira coluna vazia.

## `20260929120000_colaborador_lotacoes.sql`

Cria o relacionamento **N:N** colaborador ↔ lotação que não existe hoje.

O que ele entrega, e que a `main` não tem de outra forma:

- a tabela de associação `public.colaborador_lotacoes`;
- índice único **parcial** `colaborador_lotacoes_principal_unica`, garantindo **no máximo uma**
  lotação principal por colaborador (não existe `UNIQUE … WHERE` como constraint, só como índice
  parcial — o arquivo documenta isso);
- trigger `colaborador_lotacoes_valida_tenant`: valida que **linha, colaborador e lotação são da
  mesma empresa** antes de aceitar a gravação. A RLS garante que o usuário pertence à `empresa_id`
  da linha, mas **não** valida o tenant das linhas referenciadas por FK;
- `COMMENT` depreciando `lotacoes.colaborador_id`.

### Por que não foi aplicada

Nada na `main` lê ou escreve a tabela: as duas menções em `src/mocks/colaboradoresMock.ts:1679,1686`
são comentários. Aplicá-la agora criaria uma tabela vazia sem consumidor.

A `main` cobre "unidade de lotação" por outro caminho — `colaboradores.local_trabalho_id` →
`locais_trabalho`, em `src/components/colaborador-detalhes/TrabalhoHierarquiaTab.tsx:306-308` — mas
isso é **uma** unidade por colaborador, só leitura. Não é o N:N com flag `principal`.

`public.lotacoes` tem **0 linhas** em produção, o que confirma o diagnóstico do próprio arquivo: a
página `/lotacoes` trata a tabela como catálogo e nunca grava `colaborador_id`, então
`colaboradorDetalhesService.listarLotacoes`, que filtra por essa coluna, sempre devolveu vazio.

### Quando aplicar

Junto com a tela que a consome — é o que `MIGRATIONS_ORFAS_MURI_2026-11-16.md:146-156` já concluía:
"quem consulta é a aba Trabalho & Hierarquia da `muri`. **Aplicar junto com essa aba**".

O caminho é o do repositório: mover o arquivo para `supabase/migrations/`, escrever o sidecar
`.verify.sql` (este SQL não tem), pôr as duas no **LOTE ATUAL** do
`.github/workflows/canonical-migrations.yml` e rodar `validate` → `apply` → `verify` a partir da
`main`. É DDL em produção: decisão do dono (regra 8 do fluxo Git).
