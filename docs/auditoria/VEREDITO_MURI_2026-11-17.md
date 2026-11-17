# Veredito da branch `muri` — 2026-11-17

Fecha a pergunta "a `muri` pode ser apagada?". **Resposta: ainda não.**

Base: `origin/main` em `40b2c416` × `origin/muri`. Critério do dono: só se apaga o que está
**comprovadamente na `main`** ou é **comprovadamente obsoleto**.

## 1. Números

`git ls-tree` nos dois lados: **2 526** caminhos existem só na `muri`. Deles:

| grupo                                               | arquivos | veredito                                                                                                   |
| --------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `tmp-*/`, `anim-out/` (sessões de auditoria visual) | 1 982    | descartável — PNG, JSON e scripts de inspeção de uma sessão                                                |
| `scripts/` de auditoria pontual                     | 154      | descartável                                                                                                |
| `docs/api/`                                         | 37       | avaliar                                                                                                    |
| `supabase/.temp/`                                   | 8        | descartável — cache local do CLI                                                                           |
| **`src/` (código de produção)**                     | **111**  | **triado abaixo**                                                                                          |
| `e2e/`                                              | 9        | 5 na PR #661; 4 (`audit-checklist`, `fuzz-testing`, `ninebox-aprovacao`, `premiacoes-auditoria`) a avaliar |

## 2. Os 111 arquivos de `src/`

### 2.1 Não é perda (65)

- **`src/mocks/*` (15)** — dados fictícios de apresentação. `AGENTS.md` §3 proíbe mock em produção.
- **`src/assets/banks/*` (14 imagens)** — só fazem sentido com `src/lib/bankBrand.ts` (ver 2.3).
- **Testes de componentes que a `main` não tem (19)** — `RewardsApprovalHub.test`, `FGTSDigitalDashboard.test`,
  `AuditoriaAdmissoesContent.test`, etc. Sem o componente, o teste não tem o que testar.
- **Órfãos na própria `muri`** (nenhum arquivo os importa, nem lá):
  `components/metabase/MetabaseEmbed.tsx`, `services/metabaseService.ts`,
  `services/dominioService.ts`, `services/dominioAlterdataService.ts`,
  `hooks/useFeriasCursor.ts`, `components/premiacoes/PainelAuditoriaRoi.tsx`,
  `components/dashboard/AlertasProximasCard.tsx`, `components/dashboard/SaudeResumoCard.tsx`,
  `pages/__MeasureTestPage.tsx`.
- **Já resolvido de outra forma na `main`:**
  - `calculators/folhaCompleta.ts` — apagado de propósito em `8bc1418f3` (PR #311): "órfão, removido junto com seus testes".
  - `validators/esocialValidators.ts` — shim de 9 linhas marcado `@deprecated`; a `main` tem os validadores reais em `src/schemas/esocial/`.
  - `utils/esocialEventosPeriodicos.ts`, `utils/esocialEventosSST.ts` — a `main` tem `schemas/esocial/periodicosValidators.ts` e `sstValidators.ts`.
  - `components/colaborador-detalhes/ComplianceTab.tsx` — a `main` tem `DocumentosComplianceResumoTab.tsx`.
  - `components/folha/FGTSDigitalDashboard.tsx` — mockup da `muri` (valores fixos), não existe na `main`.

### 2.2 Mockup — não trazer como está (4)

`components/admissoes/AuditoriaAdmissoesContent.tsx` (1 114 linhas), `admissoes/auditoriaComum.ts`,
`admissoes/auditoriaDerivacoes.ts`, `services/colaboradorLotacaoService.ts`.

Evidência: `AuditoriaAdmissoesContent.tsx:408` — `isAdmissoesMockEnabled() ? getMockAuditoria() : []`.
Sem o mock ligado a aba fica **vazia**. A ideia (trilha de auditoria de admissões) é boa; a implementação
precisa ler o banco, não `src/mocks/admissoesMock.ts`.

### 2.3 Merece resgate — a avaliar um a um (42)

Nenhum destes é mock nem órfão; cada um precisa de uma sessão própria, com a mesma régua das PRs
#657–#660 (tipado, com teste, sem PII crua):

| bloco                        | arquivos                                                                                                          | linhas | o que entrega                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| Calculadora de rescisão      | `calculadoraRescisao/{FormularioRescisao,ResultadoRescisao,rescisaoView}`                                         | 1 492  | a `main` tem `CalculadoraRescisaoPage.tsx`; comparar antes de mexer |
| Gestão de desligamentos      | `desligamentos/{GestaoDesligamentos,DesligamentoAtencaoBanner}`                                                   | 965    | a `main` tem a pasta `desligamentos/`; comparar                     |
| Dossiê — dados pessoais      | `colaborador-detalhes/{DadosPessoaisTab,CampoInfo}`                                                               | 312    | aba que a `main` não tem                                            |
| Cards do dashboard           | `dashboard/{HeadcountOverviewCard,ResumoOperacionalCard,ProximasAtividadesCard,DepartmentsCard,QuickActionsMenu}` | 637    | 5 cards                                                             |
| Observabilidade              | `lib/{tracing,tracedService,useTracing}`                                                                          | 330    | rastreio de chamadas                                                |
| Logo do banco                | `lib/bankBrand.ts` + 14 imagens                                                                                   | 195    | logo na conta bancária (casa com a PR #659)                         |
| Paginação                    | `types/pagination.ts`                                                                                             | 83     | contrato de paginação                                               |
| Ponto                        | `schemas/ponto.ts` (13 linhas, **14 importadores na `muri`**), `ponto/EditarEscalaDialog.tsx`                     | 143    | schema muito usado lá                                               |
| Provisões / automação / CNAB | `services/{folha/provisoesService,automacaoService,cnabLayoutService}`                                            | 220    |                                                                     |
| Hooks                        | `hooks/{useActionStateHelper,useCalculoFeriasPreview,use-stagger-cards,useColaboradorLotacao}`                    | 295    | `useColaboradorLotacao` depende de DDL (ver abaixo)                 |
| Diversos                     | `AnimatedDossieTabs`, `esocial/ESocialAIInsights`, `lib/functionsUrl`                                             | 224    |                                                                     |

## 3. Decisões que são do dono

1. **`colaborador_lotacoes`** — a tabela não existe no banco canônico. `services/colaboradorLotacaoService.ts` e
   `hooks/useColaboradorLotacao.ts` dependem dela. Precisa de DDL via `canonical-migrations.yml` (regra 8).
2. **PR #656** — 8 DDL aplicadas em produção sem arquivo no repositório, e `main` com 2 arquivos sem versão no
   ledger. Divergência nos dois sentidos.
3. **PR #661** — 24 testes de navegador que não consigo executar: `e2e/auth-non-admin.setup.ts:9` exige
   `E2E_NON_ADMIN_PASSWORD`, que por desenho não está no repositório.

## 4. Conclusão

A `muri` **não pode ser apagada**. 2 047 dos 2 526 caminhos são descartáveis e 69 dos 111 arquivos de `src/`
estão resolvidos (incorporados, obsoletos, órfãos ou mockup) — mas sobram **42 arquivos de produção**, nenhum
deles mock, que ainda não foram avaliados um a um.

As branches `contexto` e `computador_local` também ficam: não são trabalho pendente, são infraestrutura.
