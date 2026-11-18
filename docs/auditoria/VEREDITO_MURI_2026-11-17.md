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

| motivo da divergência                        | branches | é perda?                                                                         |
| -------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| só `scripts/.bundle-budget.json`             | 15       | não — teto elevado à mão várias vezes; vale o maior                              |
| `.github/workflows/canonical-migrations.yml` | 3        | não — o LOTE ATUAL é hardcoded e rotaciona a cada lote; nenhuma salvaguarda saiu |
| sidecars `.verify.sql`                       | 3        | não — versões já aplicadas; a `main` tem a corrigida (#647)                      |
| `docs/*` reeditados                          | 3        | não                                                                              |
| PRs abertas no momento da medição            | 2        | não                                                                              |
| **arquivos de `src/`**                       | **8**    | **não — verificados um a um**                                                    |

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
| `docs/api/`                     | 37       | avaliar (documentação)                                        |
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

## 6. O que fica para o dono

1. **Tabelas declaradas e ausentes do banco** — `query_telemetry` está em
   `integrations/supabase/types.ts:16471` e em `schemas/tableColumns.ts:3280`, e **não existe** no
   banco canônico (`information_schema`). Por isso o `trace_id` da #666 correlaciona em **log**, não
   em tabela. `colaborador_lotacoes` é o mesmo caso e bloqueia 2 arquivos da `muri`.
2. **`docs/api/`** — 37 arquivos só na `muri`, ainda não avaliados.
3. **A `muri` em si** — pode ser apagada depois da #669. Tudo o que sobrou dela está acima, com a razão.
