# Veredito da auditoria de branches — fechado em 2026-11-18

Responde: **o que de cada branch ainda não está na `main`, e o que pode ser apagado.**
Critério do dono: só se apaga o que está **comprovadamente na `main`** ou é **comprovadamente obsoleto**.

## 1. Veredito

| branch                            | veredito                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| **90 branches locais `claude/*`** | **podem ser apagadas** — nada a recuperar (§2)                                              |
| **`muri`**                        | **pode ser apagada** depois da PR da aba Identificação — resíduo triado e decidido (§3, §4) |
| `contexto`, `computador_local`    | **ficam** — infraestrutura, não trabalho pendente                                           |

As branches remotas das PRs mergeadas já foram apagadas no squash-merge. As `refs/remotes/origin/pr/*`
não são branches do repositório, e sim refs de PR criadas por fetch: não entram nesta conta.

## 2. As 90 branches locais — verificação byte a byte, e por função

Verificação literal (`scripts` de sessão): para cada branch, toda linha que ela **acrescentou**
em relação ao merge-base foi procurada no conteúdo **atual** da `main`.

| resultado                  | branches |
| -------------------------- | -------- |
| incorporadas byte a byte   | **55**   |
| vazias (só arquivo gerado) | 1        |
| divergem literalmente      | 34       |

**O byte a byte literal gera falso positivo.** Código reescrito, prettier, variável renomeada e
comentário reeditado depois do merge fazem a linha literal desaparecer, embora a função esteja lá.
Confirmado num caso concreto: `supabase/functions/calcular-provisoes/index.ts` acusou 10 linhas
ausentes e a `main` tem a regra inteira em `:155-182` (a alíquota gravada na competência manda
sobre o cadastro) — só com o comentário reescrito.

Por isso as 34 foram triadas por **função**, não por linha:

Todos os grupos foram verificados **por conteúdo**, não classificados por hipótese:

| grupo                                                   | branches    | perda?  | o que a verificação provou                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ----------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/.bundle-budget.json`                           | 15          | **não** | a união das chaves de todas as branches + `main` dá exatamente 3 — `js_total_kb`, `js_max_chunk_kb`, `css_total_kb`. **Nenhuma chave desapareceu**, então nenhum gate deixou de existir, e a `main` é teto maior ou igual nas três                                                                                                                                                                                   |
| `canonical-migrations.yml` + `canonical-invariants.sql` | 3           | **não** | só a descrição do input, a lista do LOTE ATUAL e o `ledger_count` esperado. Nenhum step, `if` ou invariante saiu — e a `main` é **estritamente mais protegida**: a branch usava o glob ingênuo `migrations=("$stage_dir"/supabase/migrations/*.sql)`, a `main` separa migration de sidecar (`:196-207`)                                                                                                              |
| sidecars `*.verify.sql`                                 | 3           | **não** | os 6 arquivos (3 `.sql` + 3 `.verify.sql`) estão na `main`. Asserções branch × main: ninebox 3×3, permissions 8×7, storage 10×9 — a única que saiu é a **de ledger**, removida de propósito na #647 porque não pode passar em `validate` (que termina em `ROLLBACK`). E o sidecar do ninebox na `main` é **mais forte**: trocou subconsulta escalar por `bool_and(...)`, valendo para todas as assinaturas da função |
| `docs/*` reeditados                                     | 4           | **não** | `docs/ninebox-aprovacao-gestor-vinculo-abner.sql` **não está ausente: foi renomeado** para `…-conta-homologacao.sql`. O arquivo da branch trazia **e-mail e `user_id` reais em claro**; a `main` tem o mesmo SQL íntegro e **sanitizado** — 16 linhas alteradas, **0 removidas**. A ausência do nome antigo é correta e **não deve ser resgatada**                                                                   |
| `docs/api/` só da `muri`                                | 37 arquivos | **não** | 32 KB em 37 arquivos de 805–923 bytes. Normalizados em tokens de estrutura, restam **2 formas distintas**: é preenchimento de template, e o único texto que varia é o nome do módulo. Descrevem uma API REST `/api/<modulo>` que **não existe** neste sistema — trazê-los criaria documentação falsa concorrendo com `docs/MAPA_API.md`. **Não resgatar**                                                            |
| PRs abertas no momento da medição                       | 2           | **não** | mergeadas depois                                                                                                                                                                                                                                                                                                                                                                                                     |
| **arquivos de `src/`**                                  | **8**       | **não** | verificados um a um, abaixo                                                                                                                                                                                                                                                                                                                                                                                          |

### Os 8 arquivos de `src/`, verificados por função

| arquivo                                    | conclusão                                                                                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `documentos/DocumentosDigitaisCard.tsx`    | `main` é a versão **mais nova** (#653). O campo de texto livre "Link do arquivo" saiu **de propósito**, trocado por `FileUploadField` (upload em bucket privado); linha legada continua abrindo via `resolveDocumentUrl` |
| `documentos/DocumentosPessoaisCard.tsx`    | `main` é **superconjunto**. Mesma troca, documentada em `:48-52`                                                                                                                                                         |
| `eslint.config.js`                         | **zero** literais da branch ausentes; a `main` é superset estrito (+3 entradas de treinamentos). Nenhuma regra ligada ou desligada a mais ou a menos                                                                     |
| `desligamentos/desligamentosDerivacoes.ts` | vocabulário **intacto**: `STATUS_TERMINAIS` com `'pago'` em `:147` — era a suspeita grave, e não se confirmou                                                                                                            |
| `dashboard/MetricCard.tsx`                 | `cardVariants` continua exportado e equivalente (`:11-19`)                                                                                                                                                               |
| `index.css` (2 branches)                   | **nenhum token** de design nem classe declarada pelas branches está ausente                                                                                                                                              |
| `pages/ColaboradoresPage.tsx` (2 branches) | o `renderRow` inline foi **extraído** para `ColaboradorTable.tsx`; selo de recontratação na `main` em `:198-201`, mesma regra (`>= 2`)                                                                                   |
| `public/sw-custom.js`                      | a `main` é **mais forte**: `CACHE_VERSION` v5 onde a branch tinha v4                                                                                                                                                     |
| `services/onboardingJornadaService.ts`     | as 7 linhas são versões antigas que a `main` substituiu por versões mais completas                                                                                                                                       |

**Resultado: nenhuma perda de função em nenhuma das 90 branches locais.**

## 3. A `muri` — 2 526 caminhos só dela

| grupo                           | arquivos | veredito                                                      |
| ------------------------------- | -------- | ------------------------------------------------------------- |
| `tmp-*/`, `anim-out/`           | 1 982    | descartável — PNG/JSON/scripts de sessões de auditoria visual |
| `scripts/` de auditoria pontual | 154      | descartável                                                   |
| `docs/api/`                     | 37       | **não resgatar** — veredito na §2                             |
| `supabase/.temp/`               | 8        | descartável — cache do CLI                                    |
| **`src/`**                      | **111**  | triado em §4                                                  |
| `e2e/`                          | 9        | 5 resgatados (#661); 4 decididos em §4                        |

## 4. Os 111 arquivos de `src/` da `muri`

### Recuperados nesta auditoria

| o que                                                           | PR   |
| --------------------------------------------------------------- | ---- |
| upload real de arquivo nos 4 formulários de documento           | #653 |
| resumo financeiro no dossiê, com CPF mascarado no PDF           | #655 |
| permissões por funcionalidade, lendo a matriz do banco          | #651 |
| calendário pt-BR com navegação por mês/ano em 90 campos de data | #657 |
| 33 testes das regras de pagamento e auditoria de premiações     | #658 |
| editar conta bancária                                           | #659 |
| débito de horas no card de ponto                                | #660 |
| 24 testes de navegador                                          | #661 |
| memória de cálculo da rescisão (3 bases corrigidas)             | #663 |
| faixa de atenção dos desligamentos                              | #664 |
| `trace_id` do frontend ligado ao bridge                         | #666 |
| coluna "Próxima Ação" + filtros de departamento/período         | #668 |
| aba Identificação no dossiê, com PII mascarada                  | #669 |

### Descartados, com a razão

- **Mocks** (15 arquivos de `src/mocks/`) — dados fictícios de apresentação.
- **Órfãos na própria `muri`** (nada os importa nem lá): Metabase (`MetabaseEmbed`, `metabaseService`),
  Domínio/Alterdata, `useFeriasCursor`, `PainelAuditoriaRoi`, `AlertasProximasCard`,
  `SaudeResumoCard`, `__MeasureTestPage`.
- **Já resolvido de outra forma:** `calculators/folhaCompleta.ts` apagado de propósito em `8bc1418f3`
  (PR #311) · `validators/esocialValidators.ts` → `src/schemas/esocial/` · `utils/esocialEventos*` →
  `schemas/esocial/{periodicos,sst}Validators.ts` · `ComplianceTab` → `DocumentosComplianceResumoTab`
  · `ponto/EditarEscalaDialog` → `EditarJornadaDialog.tsx` (`EscalaDoDiaSection:190`), integrado e testado.
- **Mockup** (aba fica vazia sem o mock): `AuditoriaAdmissoesContent.tsx:408` é
  `isAdmissoesMockEnabled() ? getMockAuditoria() : []`, com `admissoes/auditoriaComum.ts` e
  `auditoriaDerivacoes.ts`.
- **`main` à frente:** `services/folha/provisoesService.ts`, `automacaoService.ts`,
  `cnabLayoutService.ts` (8 `any`, e a `main` tem `provisaoService.ts` + a Edge `calcular-provisoes`)
  · `QuickActionsMenu` → `QuickActionsGrid.tsx:46`, que documenta por que recusou 2 dos 4 atalhos (um
  aponta para rota inexistente) · `DepartmentsCard` → `AnalyticsSection.tsx:618-652`
  · `ResumoOperacionalCard` → números já em `MorningBriefing.tsx:274,285`.
- **Criaria código morto na `main`:** 6 hooks e tipos (`useActionStateHelper`,
  `useCalculoFeriasPreview`, `use-stagger-cards`, `useColaboradorLotacao`, `types/pagination.ts`,
  `schemas/ponto.ts`) — 5 dos 6 são órfãos até na `muri`.
- **Defeito confirmado, descartados por decisão:**
  - `dashboard/ProximasAtividadesCard.tsx:34` — `date: a.tipo` em `Afastamento — ${nome}` põe o
    **motivo do afastamento** (dado de saúde) na tela inicial. Contradiz a #643, que fez a aba de
    Afastamentos **sem** dado de saúde.
  - `dashboard/HeadcountOverviewCard.tsx:78-80` — `Math.max(totalAtivos - saldoPosterior, 0)`
    reconstrói o quadro de pessoal misturando duas queries de bases diferentes, e o `Math.max`
    esconde quando a conta dá negativo.
  - `lib/bankBrand.ts` — bug de marca trocada: `('107','Banco BBM')` e `('999','BBVA')` resolvem
    como **Banco do Brasil**, e `banco_codigo` é texto livre no formulário. Mostraria o logo errado
    na conta do colaborador. (Também havia questão de marca registrada em repositório público.)
  - `e2e/audit-checklist.spec.ts` e `e2e/fuzz-testing.spec.ts` — duplicatas dos de
    `e2e/authenticated/` **com regressão de seletor**, e na raiz `e2e/` nenhum `testMatch` do
    `playwright.config.ts` as coleta.
  - `e2e/authenticated/{ninebox-aprovacao,premiacoes-auditoria}.spec.ts` — dependem de mock que não
    existe na `main`, e asseram botões "CSV"/"PDF" quando na `main` são "Pagamentos CSV"/"Pagamentos PDF"
    (`AuditoriaTab.tsx:829,839`).
- **Observabilidade:** `lib/tracing.ts` recuperado em #666 **com a semântica corrigida** (um
  `trace_id` por requisição, não por aba — a migration
  `20260724120000_p3_064_query_telemetry_trace_id.sql` define a coluna como "da requisição").
  `tracedFetch`, `withTrace`, `tracedService.ts` e `useTracing.ts` ficaram fora: sem consumidor, e o
  `tracedFetch` põe body em toda requisição, o que quebra GET.

## 5. O padrão que explicava a maior parte do "trabalho perdido"

Quase nunca era código que faltava: era **código pronto na `main` que ninguém chamava**, com a peça
consumidora na `muri`.

| pronto e sem consumidor na `main`                                     | chamadas           | ligado em |
| --------------------------------------------------------------------- | ------------------ | --------- |
| `useAtualizarContaBancaria` (`useTabelasReferencia.ts:111`)           | 0                  | #659      |
| `resumoAtencao` (`desligamentosDerivacoes.ts:223`)                    | só o próprio teste | #664      |
| contrato de `trace_id` (3 pontos no backend)                          | 0 no frontend      | #666      |
| `proximaAcaoDesligamento` (`:183`) + 7 props de `DesligamentoFilters` | 0                  | #668      |

## 5b. As PRs fechadas sem merge — 38, verificadas uma a uma

O objetivo cobre PRs, não só branches. São **38** PRs fechadas sem merge no repositório. Importante:
**fechar branch não apaga PR** — o diff de uma PR fechada fica no GitHub indefinidamente, então nada
aqui se perde ao apagar a `muri` ou as branches locais. Mesmo assim, cada uma foi verificada.

**25 são bumps do dependabot** (`build(deps)`), substituídos por bumps posteriores já na `main`.
Das 13 restantes:

| PR          | o que era                             | veredito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #546 `Muri` | a branch inteira                      | triada na seção 3 e 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| #592        | canonização de 8 migrations           | **os 8 arquivos são byte a byte idênticos aos da `main`** — mesmo blob SHA em cada um (`git hash-object` do conteúdo em `pr/592` × `origin/main`): `20260912142449_p0_hash_trigger_search_path.sql`, `…142506_p0_auth_lockout_contract`, `…142520_p0_payroll_upsert_contract`, `…143019_p0_views_revoke_public`, `…143239_p0_secdef_search_path`, `…143344_p1_function_search_path`, `…144208_p0_pgcrypto_routine_search_path` e `20261107203000_fix_rls_insert_configuracoes_ponto.sql`. O título dizia o mesmo, mas título não é evidência |
| #564        | integra Avaliação/NineBox da `muri`   | **incorporada**: 34 113 linhas acrescentadas, **100** ausentes — e as 100 são o comentário do `eslint.config.js`. A exceção em si está na `main` (`:117` e `:122`), e os 83 arquivos de `src/components/avaliacao/` estão lá                                                                                                                                                                                                                                                                                                                 |
| #533        | feriado de 20/11 no prazo do Art. 145 | **incorporada sob outro nome.** A PR propunha `20261114000700_eh_feriado_fixo_br_consciencia_negra.sql`; a `main` tem `20261114000000_remediate_ferias_art145_11_20.sql`, que inclui `'11-20'` em `eh_feriado_fixo_br` (`:24`) e cujo sidecar **assere o comportamento** — `prosrc ILIKE '%11-20%'` **e** `eh_feriado_fixo_br(DATE '2026-11-20') IS TRUE`                                                                                                                                                                                    |
| #209        | 4 rotinas agendadas que falhavam      | **as duas migrations estão na `main`**. As 26 linhas ausentes são a lista do LOTE ATUAL e dois invariantes (`cron_routines_ok`, `ferias_status_job_ok`) — o mesmo padrão de lote que rotaciona, não regra de negócio                                                                                                                                                                                                                                                                                                                         |
| #358        | bypass de MFA para E2E                | **na `main`, mais amplo**: `VITE_E2E_BYPASS_MFA` aparece em `ProtectedRoute.tsx`, `AdminRoute.tsx` e `MfaGate.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                           |
| #370        | reprovar dependência ausente          | **na `main`** (`check-dependencies.js:131`), com mensagem melhor                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| #371        | fail-fast nos geradores               | **a `main` está à frente**: `generate-component.js:11` já usa `path.join(import.meta.dirname, …)` em ESM; a PR era CommonJS com `require`                                                                                                                                                                                                                                                                                                                                                                                                    |
| #372        | fail-fast nos scripts de shell        | **na `main`**: `backup.sh` tem `set -euo pipefail` (`:5`), `error() … exit 1` (`:26`) e `if ! … pg_dump` (`:35`)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| #361        | estabilizar cleanup do E2E            | comentários e um `const initialis =` (nome com erro de digitação). Nada de função                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| #256        | notas de sessão no `CLAUDE.md`        | histórico; o `CLAUDE.md` da `main` hoje é só `@AGENTS.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| #328        | `Create main.yml`                     | 1 linha, stub                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

**Única melhoria não incorporada em toda a varredura de PRs:** a #391 embrulha a leitura dos
arquivos de entrada do `scripts/build-rebaseline.mjs` em `try/catch` com mensagem clara; a `main`
lê direto em `:21`. É mensagem de erro em script de build, e o head da própria PR tem os
comentários com UTF-8 duplamente codificado (`correÃ§Ãµes`), que voltariam para o repositório.
Fica anotado, não resgatado.

## 6. O que fica para o dono

1. **`colaborador_lotacoes`** — a tabela não existe no banco canônico (`42P01`), e a migration que a
   cria, `20260929120000_colaborador_lotacoes.sql`, existe **só na `muri`**. Com ela vão embora
   quatro coisas que a `main` não tem: a tabela de associação N:N colaborador↔lotação; o índice
   único **parcial** que garante no máximo uma lotação principal por colaborador; o trigger
   `colaborador_lotacoes_valida_tenant`, que valida que linha, colaborador e lotação são da **mesma
   empresa** (a RLS sozinha não valida o tenant da FK); e o `COMMENT` que deprecia
   `lotacoes.colaborador_id`.

   **Efeito hoje: nenhum.** Nada na `main` lê ou escreve essa tabela (as duas menções em
   `src/mocks/colaboradoresMock.ts:1679,1686` são comentários), e `public.lotacoes` tem **0 linhas**
   em produção. A `main` cobre "unidade de lotação" por outro caminho —
   `colaboradores.local_trabalho_id` → `locais_trabalho`, em `TrabalhoHierarquiaTab.tsx:306-308` —
   mas isso é uma unidade por colaborador, só leitura, não o N:N com flag `principal`.

   A decisão já estava registrada: `docs/auditoria/MIGRATIONS_ORFAS_MURI_2026-11-16.md:146-156` diz
   "nenhum código consulta a tabela; quem consulta é a aba Trabalho & Hierarquia da `muri`.
   **Aplicar junto com essa aba**". Então o risco não é dado perdido: é o **SQL se perder** se a
   `muri` for apagada antes de a aba ser decidida.

2. **O `apply` do `canonical-migrations.yml` confirma o lote errado.** O LOTE ATUAL do workflow
   (`:161-163`) tem **2** migrations — `20261117190000_permissions_matriz_seed.sql` e
   `20261117193000_storage_documentos_tenant_scope.sql`. Mas `scripts/canonical-invariants.sql:8-13`
   ainda lista as **4** versões do lote **anterior** (`20261117170000`..`170300`), e o passo
   **"Verificar objetos e ledger"** (`.github/workflows/canonical-migrations.yml:317-334`, com
   `if: inputs.mode == 'apply'`) exige `Number(r.ledger_count) === 4`.

   O passo roda **logo depois** de escrever a DDL em produção e registrar no ledger. Como conta as 4
   versões antigas, ele passa sem nunca confirmar que o lote atual entrou. O próprio comentário do
   arquivo avisa: "se ficar na versão do lote anterior, a asserção aprova por um registro ANTIGO e
   não prova nada do lote novo".

   **Correção de um diagnóstico anterior deste documento:** uma versão desta seção atribuía a falha
   ao `mode=verify`. Estava errado e apontaria o modo errado. O `verify` (`:469-553`,
   `if: inputs.mode == 'verify'`) não lê `canonical-invariants.sql` nem `ledger_count`: ele roda, em
   sessão read-only, os sidecars listados em `migration_files` e exige que cada linha de saída seja
   literalmente `ok`. Quem está cego é o `apply`.

   Não corrigi junto: mexer no workflow que aplica DDL em produção é item da **regra 8** do fluxo
   Git. Vai em PR própria, para o dono aprovar.

3. **A `muri` em si** — pode ser apagada depois de preservado o SQL do item 1. Os `docs/api/` dela
   **não devem ser resgatados** (seção 2: preenchimento de template descrevendo uma API que não
   existe).

### Correção de uma afirmação anterior deste documento

Uma versão anterior desta seção dizia que `public.query_telemetry` **não existia** no banco e que,
por isso, o `trace_id` da #666 correlacionaria "em log, não em tabela". **As duas afirmações eram
falsas.** A tabela existe: 322 linhas, RLS ligada com 3 policies, e a coluna `trace_id` (criada por
`20260724120000_p3_064_query_telemetry_trace_id.sql`, versão no ledger) com 57 linhas preenchidas. A
criação está em `20260323120607_*.sql` e `20260522142643_*.sql`, ambas aplicadas. O `trace_id`
correlaciona **em tabela**.

A causa do erro foi de método, e vale registrar: consultas `SELECT` em `information_schema` feitas
pelo MCP `supabase_db_query` voltaram `{"rows": [], "affected": true}` — vazio, sem erro. Isso foi
lido como "a tabela não existe". `supabase_db_count` e `supabase_db_list_columns` respondem
corretamente nos mesmos objetos. **Ausência de linhas num `SELECT` por essa via não prova ausência
do objeto**; confirme com `count`/`list_columns`, ou com `to_regclass`.
