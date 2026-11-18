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

### Medido: 38 é o conjunto COMPLETO, não uma amostra

Dizer "38 PRs fechadas" não provava que não havia uma 39ª fora da varredura. Contagem completa
do repositório, via GraphQL (`pullRequests(states:…){ totalCount }`), em 2026-11-18:

| estado                 | total   |
| ---------------------- | ------- |
| **total de PRs**       | **632** |
| mergeadas              | 592     |
| abertas                | 2       |
| **fechadas sem merge** | **38**  |

592 + 2 + 38 = 632. A soma fecha: **não existe PR fora de uma dessas três categorias.** As 592
mergeadas estão na `main` por definição; as 2 abertas são as desta sessão; as 38 são exatamente
as auditadas abaixo. O conjunto de PRs do projeto está integralmente coberto.

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

## 7. A prova byte a byte, depois de as branches terem sido apagadas

As 91 branches locais eram **só locais**: não tinham contraparte no remoto e viviam num container
efêmero. A verificação por linha e por conjunto de arquivos rodou **antes** de apagá-las. Mas os
objetos continuam no repositório, então foi possível fazer depois a verificação mais forte — e é
esta que sustenta a frase "nenhum trabalho foi perdido". Cinco etapas, cada uma mecânica:

| #   | o que foi medido                                                                                                    | número        | resultado                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | commits **exclusivos** das branches (`rev-list <tip> --not origin/main`, sobre os 186 tips)                         | **471**       | base da varredura                                                                                                                                                                          |
| 2   | pares (caminho, blob) nesses commits                                                                                | **1 565 552** | —                                                                                                                                                                                          |
| 3   | caminhos cujo blob **nunca** esteve em nenhum ponto da história da `main` **e** que não existem na `main` hoje      | **7**         | 4 são arquivos meus, removidos de propósito (a `main` já tem aquele SQL como `20261117170000-170300`); 2 são `src/mocks/` (proibido em produção, AGENTS §3); 1 é `src/lib/functionsUrl.ts` |
| 4   | caminhos de código cuja versão da branch nunca chegou à `main`, com alguma linha fora de todo o conteúdo atual dela | **192**       | não é perda por si: a `main` evoluiu depois do merge, e linha ausente não distingue "perdido" de "superado"                                                                                |
| 5   | **símbolos exportados** por essas 192 versões que não existem em **nenhum** arquivo da `main`                       | **14**        | verificados um a um, abaixo                                                                                                                                                                |

A etapa 5 é a que decide. Linha some por prettier, por rename de variável e por reescrita; **export
que desaparece é contrato que desaparece.** Extraí todo `export function|const|type|interface|class`
e todo `export { … }` de cada versão das branches e comparei com a superfície de exports inteira da
`main`. Sobraram 14:

| símbolo                                                                             | de onde                                          | veredito                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FUNCTIONS_BASE`, `ABSOLUTE_FUNCTIONS_BASE`, `functionUrl`, `rewriteFunctionsUrl`   | `src/lib/functionsUrl.ts`                        | **absorvidos** em `src/integrations/supabase/client.ts:34-38`, como constantes privadas do módulo, dentro do `functionsAwareFetch` — que cobre **todo** `functions.invoke()` de uma vez, que era o objetivo declarado no comentário do próprio arquivo original. Com 2 testes, inclusive o caso negativo (URL de `auth` **não** reescrita) que o original não tinha |
| `getTraceId`                                                                        | `src/lib/tracing.ts`                             | **removido de propósito** na #666: era um id por aba em `sessionStorage`, e a migration `20260724120000_p3_064_query_telemetry_trace_id.sql` define a coluna como **da requisição**. A versão por requisição é a que entrou                                                                                                                                         |
| `DOCUMENTOS_COLABORADORES_BUCKET`, `DOCUMENTO_MAX_SIZE_MB`, `UploadDocumentOptions` | `src/services/documentUploadService.ts`          | viraram **parâmetros** em `uploadDocumentFile(file, { bucket, empresaId, colaboradorId, categoria, maxSizeMB })` (`:23`). Mesma capacidade, escolhida por quem chama                                                                                                                                                                                                |
| `EscalaComTurno`                                                                    | `src/services/turnoService.ts`                   | a `main` tem `EscalaComColaboradorETurno` (`:5`) e `EscalaDoDia` (`:10`) — mesmo conceito, renomeado                                                                                                                                                                                                                                                                |
| `StatusPapeis`                                                                      | `src/hooks/usePermissions.ts`                    | `type StatusPapeis = 'loading'                                                                                                                                                                                                                                                                                                                                      | 'success'` — alias de uma linha, sem comportamento |
| `jornadaEmModoDemonstracao`                                                         | `src/hooks/useJornadaOnboarding.ts`              | era `return isAdmissoesMockEnabled()` — **modo mock**, que o AGENTS §3 proíbe em produção. Correto estar ausente                                                                                                                                                                                                                                                    |
| `useAlternarKit`                                                                    | `src/hooks/useJornadaOnboarding.ts`              | **o fluxo existe na `main`**: o `KitOnboardingDialog` tem o `Switch` "Perfil ativo" (`:184`), inicializa de `kit?.ativo` (`:86`), envia `ativo` no payload (`:96`) e `atualizarKit` persiste (`onboardingJornadaService.ts:229`). O hook era atalho para não abrir o formulário                                                                                     |
| `candidatosSemCandidatura`                                                          | `src/components/recrutamento/candidatosComum.ts` | aparece **uma vez** no blob da branch: a própria definição. **Zero consumidores até lá** — era órfão quando foi escrito, e trazê-lo criaria código morto. A `main` trata "nenhuma candidatura" no analytics, com estado vazio honesto (`analyticsComum.ts:489,514`)                                                                                                 |
| `listarLotacoes`                                                                    | `src/services/colaboradorDetalhesService.ts`     | depende de `colaborador_lotacoes`, a tabela que **não** foi aplicada. É o item 1 da seção 6 — o único ponto realmente aberto, e é decisão de negócio                                                                                                                                                                                                                |

**Conclusão: dos 14, treze estão incorporados, renomeados, absorvidos ou descartados com razão
registrada. O décimo quarto depende da única decisão que não é técnica.**

### Etapa 6: descendo de símbolo exportado para identificador e literal

O corpo de função não tem oráculo que separe "reescrito" de "perdido", mas dá para descer um nível
abaixo do export: **todo identificador com 4+ caracteres e todo literal de texto com 4+ caracteres**
de cada versão das branches, comparado com o conjunto inteiro de tokens da `main` (**172 611**
distintos).

Resultado: **288 tokens distintos, em 69 dos 192 caminhos.** Classificados:

| classe                              | exemplos                                                                                                                              | veredito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| maquinaria de **mock**              | `getMockOnboarding`, `getMockKitsOnboarding`, `VITE_DESLIGAMENTOS_MOCK`, `moverCandidaturaMock`, `@/mocks/premiacoesMock`, `mockLogs` | proibido em produção (AGENTS §3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `trace_id` **por aba**              | `TRACE_ID_KEY`, "o mesmo trace_id na aba inteira", "sessionStorage indisponível"                                                      | substituído de propósito na #666 pela semântica por requisição, que é a da coluna                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| já resolvidos nas etapas anteriores | `functionUrl`, `rewriteFunctionsUrl`, `candidatosSemCandidatura`, `DOCUMENTOS_COLABORADORES_BUCKET`                                   | ver tabela dos 14                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| classes CSS e textos de UI          | `grid-cols-[minmax(0,1fr)_130px_70px_28px]`, "Sem imagem", "Volume, retenção e conversão entre as etapas"                             | variantes de arquivos que a `main` reescreveu; não são função                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| query keys renomeadas               | `"transferencias-timeline"`, `"afastamentos-timeline"`                                                                                | mesma consulta, chave de cache com outro nome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| imagem de kit                       | `MAX_IMAGEM_MB`, `ImagePlus`, `RETRATO`                                                                                               | a `main` mantém o campo no contrato e **ignora de propósito**: não existe coluna, e o serviço documenta isso (`onboardingJornadaService.ts:66-76`) — nada de persistência falsa                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **seleção de candidatos**           | `toggleTodos`, `toggleLinha`, `idsPagina`, `algumMarcado`                                                                             | **são duas coisas diferentes, e eu as confundi.** No **recrutamento** o recurso está inteiro na `main`: `CandidatosPainel.tsx` tem o estado (`:114`), chama `resumoSelecao` (`:129`), tem selecionar-todos (`:149-150`), renderiza quantidade, avaliação média e pretensão média (`:309-325`) e os checkboxes de cabeçalho e linha (`:471,480`), com `resumoSelecao` testado em `candidatosComum.test.ts:179,184`. Nas **admissões** (`GestaoCandidatos.tsx`) a branch tinha seleção cujo `Set` era lido só para marcar o próprio checkbox, sem ação em lote nem resumo — essa parte sim é inerte, e a `main` não a tem |

**Nenhum dos 288 tokens é função de negócio ausente.** O único que exigia leitura nova era a
seleção de candidatos — e a primeira leitura que fiz dela estava errada, conforme a linha acima.

Com isso a verificação desceu quatro níveis — blob, linha, símbolo exportado, identificador e
literal — e cada nível fechou.

### Um limite honesto desta prova

Export que desaparece é contrato que desaparece, mas o contrário não vale: duas implementações com o
mesmo export podem divergir por dentro. Para esse resto, o que existe é a verificação por linha
(§2) mais a leitura caso a caso dos 8 arquivos de `src/` que divergiam. Não há oráculo mecânico que
separe "reescrito" de "perdido" dentro de um corpo de função — e afirmar o contrário seria o mesmo
tipo de excesso de confiança que produziu os erros corrigidos neste documento.

### 7b. Refeito em 2026-11-18 sobre TODAS as 564 cabeças de PR (não só as branches apagadas)

A varredura da §7 cobriu os 186 tips pendurados das branches apagadas. Isso deixava uma lacuna de
método: uma PR **mergeada** cujo arquivo a `main` removeu depois não estava no conjunto. Refeita
sobre `refs/remotes/pr/*` — a cabeça de **toda PR que já existiu**, conjunto cuja completude a §5b
prova (632 = 592 + 2 + 38).

| etapa                                                                       | número  |
| --------------------------------------------------------------------------- | ------- |
| refs `pr/*` varridos (todos com árvore local completa, > 100 arquivos cada) | **564** |
| pares blob/caminho únicos na união das 564 árvores                          | 10 592  |
| ... ausentes da árvore ATUAL da `main` (3 617 pares)                        | 7 370   |
| ... cujo blob nunca existiu em TODA a história da `main` (187 646 objetos)  | 3 242   |
| caminhos distintos correspondentes                                          | 3 120   |
| ... que a `main` não tem hoje                                               | 2 361   |
| ... em `src/`, `supabase/`, `e2e/` (resto é `tmp-*/`, `anim-out/`, scripts) | 57      |
| ... componentes/libs, fora testes e itens já resolvidos                     | 24      |
| **com símbolo exportado sem equivalente na `main`**                         | **15**  |

A história completa veio de `git rev-list --objects origin/main` (uma passada sobre os 31 922
commits), não de amostra: a primeira tentativa usou os 4 000 commits mais recentes e foi descartada
por ser amostra. Os 187 646 objetos batem com os 187 586 blobs da §7, o que valida o método.

### O resultado que importa: os 15 vêm de UM único ref

Todos os 15 estão em `pr/546` — a branch `muri` — e **em nenhum outro**. Ou seja: **nenhuma das
outras 563 PRs deixou código fora da `main`.** Os 15 caem dentro dos 111 arquivos `src/` da `muri`
já triados na §4; abaixo, a resolução individual conferida no código da `main`, não pelo nome:

| símbolo da `muri`                                         | o que a `main` tem                                                                                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EditarEscalaDialog`                                      | `EditarJornadaDialog.tsx:187-190` — `EscalaDoDiaSection` edita `escalas_trabalho` via `turnoService` **e** a jornada contratual: superconjunto, com teste                  |
| `PainelAuditoriaRoi`                                      | subsistema inteiro: `premiacoes/AuditoriaTab.tsx`, `AuditoriaEventoDialog.tsx`, `auditoriaComum.ts`, `auditoriaEntrada.ts`, `simuladorRoiComum.ts`, `RewardsSimulator.tsx` |
| `ComplianceTab`                                           | `colaborador-detalhes/documentos/StatusComplianceCard.tsx` (linhagem no comentário)                                                                                        |
| `SaudeResumoCard`                                         | `dashboard/WorkforceHealthScore.tsx`                                                                                                                                       |
| `GestaoDesligamentos`                                     | `desligamentos/entradaCards.tsx` + `avaliacao/TodosCiclosTable.tsx`                                                                                                        |
| `FGTSDigitalDashboard`, `DepartmentsCard`                 | `admissoes/AdmissoesDashboard.tsx`                                                                                                                                         |
| `HeadcountOverviewCard` / `EvolucaoPonto`                 | `ui/entrada-cards.tsx` + `colaborador-detalhes/historico/HistoryEventRow.tsx`                                                                                              |
| `QuickActionsMenu`                                        | `ui/dropdown-menu.tsx` + `ui/motion-presets.ts`                                                                                                                            |
| `AuditoriaAdmissoesContent` + `auditoriaComum/Derivacoes` | substituídos pela Jornada de Onboarding; a peça reutilizável virou `ui/filter-chip.tsx:4`, que registra a origem                                                           |
| `FormularioRescisao`, `ResultadoRescisao`, `rescisaoView` | `pages/CalculadoraRescisaoPage.tsx` — 669 linhas, autocontida, com aviso prévio trabalhado/indenizado, saldo FGTS e multa do art. 477 §8º                                  |
| `AnimatedDossieTabs`, `useStaggerCards`                   | `dashboard/MetricCard.tsx` (`cardVariants`) e `ui/motion-presets.ts`                                                                                                       |
| `ESocialAIInsights`                                       | **removido de propósito**, com trava: `__tests__/ESocialSemDadosFicticios.test.tsx`                                                                                        |
| `bankBrand` + 13 logos de banco                           | não recuperado — ativo visual, sem regra de negócio                                                                                                                        |
| `MeasureTestPage`                                         | andaime de medição de uma sessão                                                                                                                                           |

### Nota de método: um falso "OK" meu, pego e corrigido

A primeira passada marcou 9 dos 24 como "símbolo existe na `main`" usando `grep -rE "\bSimbolo\b" src/`.
Isso é **errado**: casa **comentário**. `AuditoriaAdmissoesContent` "existia" só porque
`ui/filter-chip.tsx:4` menciona o nome em prosa. Refeito exigindo definição
(`export (function|const|type|interface|class) <Simbolo>`), e cada caso restante conferido abrindo o
arquivo sucessor na `main`. Terceira vez nesta sessão que contagem/grep solto produziu um verde
falso — as outras duas foram `head -N` e `npm run --silent` de script inexistente.

## Três lições de método, registradas para não repetir

1. **Não concluir de busca truncada.** Três erros desta auditoria vieram de `| head -N`: o
   `20261117170300` ficou fora dos 8 primeiros resultados; o `FOR DELETE` foi procurado no arquivo
   errado; e o `definirAtivoKit` existia na `main` mas o `head -8` cortou antes. Em varredura de
   verificação, contar o total **antes** de olhar a amostra.
2. **Procurar o consumidor no arquivo errado.** Concluí que a seleção de candidatos era UI inerte
   depois de contar os usos de `selecionados` **dentro de `GestaoCandidatos.tsx`**. O recurso de
   recrutamento vive em `CandidatosPainel.tsx` e está completo na `main`. Quando a pergunta é "alguém
   consome isto?", a busca é no repositório inteiro, nunca num arquivo.
3. **Ausência num artefato gerado não prova ausência no banco.** `storage_path` não estava em
   `database.types.ts` e isso foi lido como "a coluna não existe". O arquivo é gerado e pode estar
   velho; quem responde é `supabase_db_count`, `list_columns` ou `to_regclass`.

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
