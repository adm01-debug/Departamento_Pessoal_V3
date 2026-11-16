# Resgate das branches remotas — inventário e decisões (2026-11-16)

Registro do que foi recuperado das branches que não a `main`, com a evidência de
cada decisão. Regra do dono: **nenhum trabalho pode ser perdido** e **o sistema
não pode sofrer regressão nem perder funcionalidade**. Quando os dois colidem, o
caminho é aplicar o ganho em cima da `main`, nunca substituir a `main`.

## 1. Estado das branches remotas

| branch                         | commits próprios | último commit | veredito                                                       |
| ------------------------------ | ---------------- | ------------- | -------------------------------------------------------------- |
| `muri`                         | 54               | 2026-10-26    | redesenho de layout + features; resgate em andamento (seção 3) |
| `contexto`                     | 271              | gerada        | branch de contexto gerado; sem merge-base com a `main`         |
| `automation/inventario-estado` | —                | —             | 3 arquivos byte-a-byte idênticos à `main`; nada a perder       |
| `computador_local`             | 0                | —             | zero commits próprios; nada a perder                           |

Merge-base de `main` e `muri`: `5ddbe25856a7c22ad7c80052f7536b5bc4e544b2`
(2026-07-30). Desde então a `main` avançou **582 commits** e a `muri` **54**.

## 2. Por que a `muri` não pode ser mergeada inteira

As duas pontas evoluíram em direções diferentes sobre os mesmos arquivos:

- a **`main`** ganhou **funcionalidade real** — por exemplo
  `src/pages/RecrutamentoPage.tsx` passou a criar, editar e excluir vagas e a
  inscrever candidatos (2026-11-12), `src/pages/TreinamentosPage.tsx` passou a
  alterar status de inscrição e editar curso (2026-11-13),
  `src/pages/ColaboradorDetalhesPage.tsx` ganhou exportação da ficha em PDF
  (2026-11-12);
- a **`muri`** ganhou **layout** — 471 arquivos que a `main` não tem,
  concentrados em treinamentos, dossiê do colaborador, recrutamento, premiações
  e admissões, com as páginas reescritas sobre o estado de julho.

Adotar as páginas da `muri` inteiras devolveria o sistema para antes das
correções de novembro. Por isso o resgate é **por área, com merge**, não por
substituição.

Os mocks visuais da `muri` (`src/mocks/layoutMock/gate.ts` e os
`*Mock.ts` por área) **não** são risco de produção: ligam apenas com
`import.meta.env.DEV` **e** `MODE !== 'test'` **e** a variável
`VITE_<AREA>_MOCK=true`, e a escrita é bloqueada por guard próprio.

## 3. O que já foi recuperado

### 3.1 Capas de treinamento — camada de aplicação

O achado mais caro da auditoria: a infraestrutura de banco está **aplicada e
ativa em produção** e a `main` não tinha **nenhuma linha** de código que a
usasse.

Verificado no projeto canônico `frjbfeamybqsejlvmqbl`:

| objeto                                                                                              | estado                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------ |
| `public.training_images` (25 colunas)                                                               | existe                         |
| trigger `enqueue_training_image_course` em `catalogo_cursos`                                        | existe                         |
| trigger `enqueue_training_image_learning_path` em `trilhas_aprendizado`                             | existe                         |
| trigger `track_training_images_outcomes`                                                            | existe                         |
| RPCs `claim_training_image`, `claim_training_image_requests`, `finish_training_image_request`       | existem, assinatura compatível |
| RPCs `reconcile_training_image`, `set_training_image_autoqueue`, `backfill_training_image_requests` | existem                        |
| versões `20261023120000` e `20261023130000` no ledger                                               | registradas                    |
| job de dispatch em `cron.job`                                                                       | **ausente**                    |
| código na `main`                                                                                    | **ausente**                    |

Recuperado: 2 edge functions, 13 módulos compartilhados, 10 serviços, 9 arquivos
de teste (144 testes), 1 hook, scripts local e de homologação, spec e2e.
Geração **desligada por padrão**, custo zero até ser habilitada.

Descartado de propósito: o `supabase/config.toml` da `muri`, que era anterior ao
hardening da `main` e tinha perdido todos os blocos `verify_jwt` documentados
(`auth-login`, `auth-gov-br`, `healthcheck`, `metrics`, `admissao-publica`,
`webhook`). A `main` recebeu só o bloco de `training-image-dispatch`.

### 3.2 Rollbacks das migrations ninebox

Dez scripts de reversão de migrations que **estão na `main` e aplicadas em
produção** (`20261015090000`, `20261016090000`, `20261017090000`,
`20261020090000`, `20261021090000`, `20261022090000`, `20261025090000`,
`20261027090000`, `20261028090000`). A pasta `supabase/rollback` não existia na
`main`: sem eles, um problema nessas migrations não tinha caminho de volta
documentado. Nada executa automaticamente — o `canonical-migrations.yml` não
enxerga a pasta.

### 3.3 Documentação

30 arquivos, a maioria documentação operacional do Nine-Box — cuja migration
correspondente está na `main` e aplicada —, mais 4 documentos das fases das
capas de treinamento e o baseline do layout protegido de Gestão de Desempenho.

## 4. Migrations órfãs da `muri` — pendentes de decisão

Dez migrations da `muri` **não estão no ledger de produção nem na `main`**.
Conferido por consulta direta a `supabase_migrations.schema_migrations`: zero
linhas para estas versões.

| versão           | arquivo                                  |
| ---------------- | ---------------------------------------- |
| `20260819000000` | `p0_fix_user_empresa_id_rls`             |
| `20260820000000` | `p0_fix_auditoria_rpc`                   |
| `20260821000000` | `p0_rls_dashboard_audit`                 |
| `20260925120000` | `document_upload_storage_columns`        |
| `20260925130000` | `storage_documentos_delete_tenant_scope` |
| `20260929120000` | `colaborador_lotacoes`                   |
| `20261005000000` | `onboarding_kits_rls_additive`           |
| `20261005010000` | `onboarding_audit_trigger`               |
| `20261005020000` | `onboarding_modelo_b_convergencia`       |
| `20261026090000` | `ciclos_exclusao_autorizada`             |

Cada uma precisa ser classificada objeto por objeto contra o banco real antes de
qualquer canonização: **já em produção sob outro nome**, **obsoleta** ou
**faltando**. Enquanto isso não estiver decidido, nenhum documento deste
repositório deve tratá-las como aplicadas — os quatro documentos que as citam
receberam nota explícita no topo.

## 5. Regra de exclusão de branch

Nenhuma branch é apagada sem: (a) prova por conteúdo de que tudo que ela tem
está na `main` ou é comprovadamente obsoleto, e (b) uma tag anotada `arquivo/*`
preservando o estado. Nome de branch, de commit ou de PR não prova nada.
