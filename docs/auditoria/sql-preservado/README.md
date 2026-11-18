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

Dos **10 restantes**, quatro **já foram resgatados para a `main`** num lote anterior, com nome
novo e conteúdo revisado. Conferido objeto por objeto:

| arquivo da `muri`                                       | na `main` como                                              | prova de equivalência                                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `20260925120000_document_upload_storage_columns`        | `20261117170300_documentos_colunas_storage.sql`             | as mesmas 4 colunas em `documentos` e 2 em `documentos_pessoais_arquivos`                                    |
| `20260925130000_storage_documentos_delete_tenant_scope` | `20261117170000_storage_documentos_delete_tenant_scope.sql` | as 2 policies `FOR DELETE`, com os mesmos nomes: `documentos_delete_rh_admin` e `docs_colab_delete_rh_admin` |
| `20261005010000_onboarding_audit_trigger`               | `20261117170100_onboarding_audit_trigger.sql`               | o trigger `audit_tarefas_onboarding` em `public.tarefas_onboarding`                                          |
| `20261005000000_onboarding_kits_rls_additive`           | `20261117170200_onboarding_kits_indice_empresa.sql`         | o índice `idx_onboarding_kits_empresa_id` — a parte que faltava                                              |

Esses quatro **não** ficam duplicados aqui: guardar a versão pré-revisão da `muri` ao lado da que a
`main` já tem só convidaria alguém a aplicar a errada. O mapeamento acima é o registro.

### Correção de uma afirmação anterior deste README

Uma versão anterior deste arquivo chamava os dois primeiros de "candidatos reais" e dizia que as
colunas de storage e as policies `FOR DELETE` **não existiam** na `main`. **Estava errado**, e o erro
foi de método, duas vezes:

- procurei `storage_path` nas migrations da `main` **com `head -8`** e concluí da lista truncada.
  O `20261117170300` estava fora dos 8 primeiros;
- procurei `FOR DELETE` **só** no `20261117193000_storage_documentos_tenant_scope.sql`, achei 0 e
  concluí que a `main` não tinha policy de DELETE. Elas estão no `20261117170000`, outro arquivo.

Também usei `storage_path` ausente de `database.types.ts` como prova de que a coluna não existia no
banco. Não prova: o arquivo gerado pode estar desatualizado, e a ausência num artefato gerado não
diz nada sobre a migration estar ou não no repositório. Apontado na revisão da #672.

## Os seis que ficam preservados, e por quê

| arquivo                                           | estado na `main`                         | o que fazer                                      |
| ------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| `20260929120000_colaborador_lotacoes`             | ausente                                  | **a única perda real** — decisão do dono, abaixo |
| `20261005020000_onboarding_modelo_b_convergencia` | ausente                                  | **não aplicar** — converte linhas que são seed   |
| `20261026090000_ciclos_exclusao_autorizada`       | ausente como arquivo, **já em produção** | não aplicar; guardado como registro              |
| `20260819000000_p0_fix_user_empresa_id_rls`       | ausente                                  | **NÃO APLICAR — é regressão**                    |
| `20260820000000_p0_fix_auditoria_rpc`             | ausente                                  | **NÃO APLICAR — é regressão**                    |
| `20260821000000_p0_rls_dashboard_audit`           | ausente                                  | **NÃO APLICAR** — desfaria duas remediações      |

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

### Decisão: não aplicar — o sistema já responde essa pergunta duas vezes

Esta é a decisão tomada na auditoria de 2026-11-18, com a medição que a sustenta. **Não reabrir sem
antes ler isto**, porque ela já foi reaberta duas vezes por enquadramento errado (inclusive por mim).

O propósito do outro agente, lido no `colaboradorLotacaoService.ts` da `muri`, era um Select
**"Unidade / Lotação principal"** no dossiê, com a tabela N:N servindo de armazenamento e o índice
parcial garantindo **uma** principal. Não era "colaborador em vários lugares ao mesmo tempo".

O problema é o conceito, não a implementação. As colunas, lidas do mapa gerado do banco
(`src/schemas/tableColumns.ts`):

| tabela            | colunas                                                              | o que responde                 |
| ----------------- | -------------------------------------------------------------------- | ------------------------------ |
| `locais_trabalho` | `nome, endereco, cep, cidade, uf, pais, **latitude**, **longitude**` | **endereço físico**            |
| `centros_custo`   | via `colaboradores.centro_custo_id`                                  | **código administrativo**      |
| `lotacoes`        | `nome, **codigo**, **endereco**, ativa, colaborador_id (legado)`     | sobrepõe as duas metades acima |

E o dossiê (`TrabalhoHierarquiaTab.tsx`) já exibe as duas:

- **Centro de custo** em `:603-604` (de `centro_custo_id`, com fallback no texto livre `centro_custo`);
- **Local de trabalho** em `:385`, `:608` e `:683` (de `local_trabalho_id`).

Acrescentar "Lotação" criaria um **terceiro** campo para uma pergunta já respondida duas vezes — e a
versão de `lotacoes` é a mais pobre das três: tem endereço mas **não tem latitude/longitude**.

Quem consome as coordenadas é o **ponto**, e só ele: `pontoService.ts:62` traz
`locais_trabalho(latitude, longitude)` e `:76-84` calcula a distância para o geofencing da marcação.
A tela de **SST** usa o local apenas pelo nome — `SSTRiscosTab.tsx:20` seleciona
`local:locais_trabalho(nome)`, sem coordenada alguma. A distinção importa: trocar `locais_trabalho`
por `lotacoes` quebraria o geofencing do ponto, não o risco ambiental.

Soma-se a isso: `public.lotacoes` estava com **0 linhas** em produção (medido em 2026-11-17; **não
reverificado** depois, porque o MCP do Supabase passou a devolver vazio para qualquer `SELECT`). O
catálogo nunca foi adotado, e a única tela que o toca é o CRUD avulso `/lotacoes`.

**Decisão:** não aplicar a DDL e não construir a tela. A tarefa correta, se um dia valer a pena, não
é "ligar lotação": é **consolidar** — decidir se `lotacoes` substitui `centros_custo`, se é retirada,
ou se vira uma visão de `locais_trabalho`. Isso tem escopo próprio e mexe em código vizinho de folha
e de SST.

O SQL fica preservado porque a engenharia dele está **pronta e provada** (ver acima: 12 asserções,
seis estados ruins reprovados, quatro regras exercitadas com dados). Se a consolidação decidir pelo
N:N, não há nada a reescrever.

### Quando aplicar

Junto com a tela que a consome — é o que `MIGRATIONS_ORFAS_MURI_2026-11-16.md:146-156` já concluía:
"quem consulta é a aba Trabalho & Hierarquia da `muri`. **Aplicar junto com essa aba**".

O caminho é o do repositório: mover **os dois arquivos** para `supabase/migrations/` e pôr
**só a migration** no **LOTE ATUAL** do `.github/workflows/canonical-migrations.yml` — o loop do
workflow deriva o sidecar sozinho (`sidecar="${migration%.sql}.verify.sql"`, `:171-175`), então
listar o `.verify.sql` junto o trataria como migration. Depois rodar
`validate` → `apply` → `verify` a partir da `main`. É DDL em produção: decisão do dono (regra 8 do
fluxo Git).

### O sidecar já existe, e foi executado

Ele passou por revisão e **três asserções minhas estavam fracas** — aprovavam estados que violam a
regra. Os dois revisores convergiram nos mesmos pontos, e os três foram corrigidos e testados:

| estado ruim                                             | antes                                                               | agora                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| índice com `WHERE principal = false`                    | **passava** — era único, parcial e o predicado continha "principal" | reprova: o predicado é comparado com `(principal = true)`                         |
| `DISABLE TRIGGER` no trigger de tenant                  | **passava** — desabilitar não altera `tgname` nem `tgtype`          | reprova: exige `tgenabled IN ('O','A')`                                           |
| policy com `rls_tenant_or_admin(get_auth_empresa_id())` | **passava** — só se procurava o nome do helper                      | reprova: a expressão tem de ser `rls_tenant_or_admin(empresa_id)` nas duas pontas |
| índice com chave `(colaborador_id, lotacao_id)`         | **passava** — a chave não era checada                               | reprova: a chave tem de ser exatamente `colaborador_id`                           |

O primeiro não era teórico. Com o índice invertido, o banco **aceitou 2 lotações principais** para o
mesmo colaborador (verificado com dados) — exatamente a regra ao contrário. E como a migration usa
`CREATE UNIQUE INDEX IF NOT EXISTS`, um índice homônimo preexistente com o predicado invertido
seria **preservado**, não corrigido: por isso a verificação olha o efeito, não só a existência.

`20260929120000_colaborador_lotacoes.verify.sql` foi escrito nesta auditoria — a migration da
`muri` vinha sem ele, e sem sidecar o lote não entra no workflow. São **12 asserções** de catálogo,
somente leitura, no mesmo contrato dos outros sidecars (toda linha não-vazia da saída tem de ser
exatamente `ok`): tabela, RLS ligada, a policy usando `rls_tenant_or_admin` nas duas pontas, o
índice único **parcial** (existe + é unique + tem predicado), a constraint de vínculo único, as 3 FKs
com `ON DELETE CASCADE`, o trigger (BEFORE, FOR EACH ROW, cobrindo INSERT e UPDATE), a função
validando as duas pontas e com `search_path` fixo, os 3 índices de leitura e o `COMMENT` de
depreciação.

Não foi só escrito: **rodou num PostgreSQL 16 local e descartável**, com stubs mínimos de
`empresas`, `colaboradores`, `lotacoes` e `rls_tenant_or_admin`. Resultado:

- a migration aplica limpa (`ON_ERROR_STOP=1`, exit 0);
- o sidecar devolve **12 linhas `ok` e nenhuma diferente**;
- e ele **pega regressão** nos seis estados testados: trigger derrubado, trigger desabilitado,
  policy `USING (true)`, policy com `get_auth_empresa_id()`, predicado do índice invertido e chave
  do índice com coluna a mais.

As quatro regras de negócio que a migration entrega também foram exercitadas com dados:

| caso                                                   | resultado                                              |
| ------------------------------------------------------ | ------------------------------------------------------ |
| lotação de **outra** empresa                           | **barrada** pelo trigger, citando as duas `empresa_id` |
| referência pendurada (lotação inexistente)             | **barrada** pelo trigger                               |
| segunda lotação **principal** para o mesmo colaborador | **barrada** pelo índice único parcial                  |
| segunda lotação **não principal**                      | aceita — estado final: 2 lotações, 1 principal         |

Isso é verificação em banco descartável, **não** em produção: o banco canônico continua sem a
tabela (`42P01`).
