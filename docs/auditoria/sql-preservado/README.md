# SQL preservado da branch `muri`

DDL que a `muri` tinha e a `main` não, **guardado aqui para não se perder quando a branch for
apagada**, e deliberadamente **fora de `supabase/migrations/`**.

Por que fora: o `canonical-migrations.yml` copia de `supabase/migrations/$migration` no ref em que
roda. Um arquivo solto lá, sem estar no LOTE ATUAL, é DDL que ninguém aplica e que o
`audit-migration-style` passa a cobrar — e, pior, confunde quem for montar o próximo lote. Aqui o
SQL fica legível e rastreável sem entrar no fluxo de aplicação.

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
