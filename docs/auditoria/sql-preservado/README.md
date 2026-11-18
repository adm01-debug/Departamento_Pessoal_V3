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
