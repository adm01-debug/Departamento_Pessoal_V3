# Inventário do resgate da muri — o que falta, o que já entrou, o que foi descartado com razão

**Data:** 2026-11-19 · **`main` medida:** `26629deb` · **PR #546 ("Muri"), fechada SEM merge em 2026-11-16:**
`5d7f6e2fcfeda2843e0afe9dd72beed162958707`

Este arquivo existe porque não havia nenhum. A `main` registrava os resgates já feitos (#611 e as branches
`*-muri-*`), mas em nenhum documento havia a lista do que **ainda não** foi resgatado — e sem essa lista o
resto da #546 se perde por esquecimento, não por decisão.

## 1. Correção de método da auditoria anterior

`VEREDITO_MURI_2026-11-17.md` §7/§7b concluiu **"zero função perdida"**. A medição por trás daquela frase
extraía os símbolos exportados das **186 cabeças das branches locais apagadas** e comparava com a superfície
de exports da `main`: sobraram 14 símbolos, 13 incorporados. O número está certo para aquele conjunto.

**O erro foi apresentar aquilo como cobertura geral.** Refeita a mesma medição sobre as **650 cabeças de PR**
(`refs/remotes/pr/*`), sobram **163 símbolos exportados** que não existem em nenhum arquivo da `main` de hoje,
em **52 arquivos**. Dois furos adicionais do método original, agora tapados:

1. a extração só pegava `export function|const|let|class|type|interface|enum` — um componente exportado
   apenas como `export default` era invisível. Corrigido medindo também **caminho a caminho**: 2 030 caminhos
   não-teste nas 650 cabeças contra 1 933 na `main` → **74 caminhos fora da `main`**;
2. o critério "blob nunca esteve em nenhum ponto da história da `main`" **exclui por construção** o que foi
   mergeado e depois apagado. Era o caso de `src/mocks/admissoesMock.ts`, que por isso não aparecia nos
   "3 caminhos" da §7b.

Dos 163 símbolos, a origem é inteiramente de dois conjuntos: arquivos apagados da `main` de propósito
(seção 2) e a PR #546 (seção 3). **Nenhuma outra PR fechada guarda contrato exportado exclusivo.**

## 2. Apagados da `main` de propósito — capacidade conferida viva

20 arquivos. Cada deleção tem commit nomeado, e a capacidade foi reconferida na `main` atual:

| Arquivo apagado                                                                                                    | Apagado por                             | Onde a capacidade vive hoje                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/calculators/folhaCompleta.ts`                                                                                 | `8bc1418f3` (#311, "motores alinhados") | `src/calculators/{impostos,beneficios,trabalhistas,trabalhista-base,rescisao,tabelas}.ts` com testes, e o processamento no servidor: `supabase/functions/{calcular-folha,fechar-folha,reabrir-folha}` + `_shared/folhaIntegrity.ts` |
| `src/services/folha/provisoesService.ts`                                                                           | `7db8ba84a` (§8.3)                      | `src/calculators/trabalhistas.ts`, `src/components/folha/FolhaKPIs.tsx`, `RelatorioContabilDialog.tsx`                                                                                                                              |
| `src/services/cnabLayoutService.ts`                                                                                | `7db8ba84a` (§8.3)                      | `src/components/folha/{CNABDialog,PagamentoBancarioWizard}.tsx`, `src/components/integracoes/ConfigPanels.tsx`                                                                                                                      |
| `src/utils/esocialEventosPeriodicos.ts`, `esocialEventosSST.ts`                                                    | `7db8ba84a` (§8.3)                      | `src/services/esocialService.ts` + `src/schemas/esocial/` (6 módulos, 7 arquivos de teste, incl. `sstValidators`)                                                                                                                   |
| `src/services/{automacaoService,dominioService}.ts`, `src/hooks/{useActionStateHelper,useCalculoFeriasPreview}.ts` | `7db8ba84a` (§8.3)                      | declarados órfãos (sem consumidor) na própria limpeza; `dominio` segue como edge `supabase/functions/tabelas-dominio/`                                                                                                              |
| `src/lib/{tracedService,useTracing}.ts`, `getTraceId` de `src/lib/tracing.ts`                                      | `f737234db` (#201)                      | `src/lib/tracing.ts` + `supabase/functions/_shared/trace.ts`. Era trace **por aba** em `sessionStorage`; a coluna de telemetria é **por requisição** (`20260724120000`), e a versão por requisição é a que ficou                    |
| `src/hooks/useFeriasCursor.ts`, `src/types/pagination.ts`                                                          | `17417fadc` (#202)                      | código morto de hooks, removido com a onda de cobertura                                                                                                                                                                             |
| `src/schemas/ponto.ts`                                                                                             | `309679f19` (#169)                      | schemas órfãos ligados / substituídos na onda 5 de validação                                                                                                                                                                        |
| `src/components/folha/FGTSDigitalDashboard.tsx`                                                                    | `2acfce56c` (#210)                      | removido porque **mostrava sucesso falso**                                                                                                                                                                                          |
| `src/components/esocial/ESocialAIInsights.tsx`                                                                     | `cab34b8ec` (#471)                      | removido porque **mostrava dados inventados**                                                                                                                                                                                       |
| `src/components/premiacoes/RewardsApprovalHub.tsx`                                                                 | `34959e3cf` (#611)                      | renomeado: `PagamentosTab.tsx` + `PagamentosTabela.tsx` + `PagamentosDialogs.tsx`; o tipo `PagamentoComColaborador` virou `PagamentoHub` (`premiacoesComum.ts:75`); simulador de ROI em `RewardsSimulator.tsx`                      |
| `src/services/metabaseService.ts` (+ edge `metabase-embed/`, `MetabaseEmbed.tsx`)                                  | `f737234db` (#201)                      | **nada na `main`.** Ver seção 4                                                                                                                                                                                                     |
| `src/services/dominioAlterdataService.ts`                                                                          | `f737234db` (#201)                      | **nada na `main`.** Ver seção 4                                                                                                                                                                                                     |

## 3. PR #546 (muri) — 17 arquivos que nunca chegaram à `main`

Todos os 17 vêm desta única PR. Veredito por bloco, com a evidência medida:

### 3.1 Sem perda (11 arquivos)

| Arquivo                                                 | Veredito                                                                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/functionsUrl.ts`                               | absorvido em `src/integrations/supabase/client.ts` (`functionsAwareFetch`), que cobre **todo** `functions.invoke()` de uma vez — objetivo declarado no próprio arquivo original — com teste do caso negativo que o original não tinha |
| `src/components/dashboard/HeadcountOverviewCard.tsx`    | série de 6 meses está em `src/pages/DashboardExecutivoPage.tsx:235-262`, mesmo hook (`useExecutiveDashboard.ts:125,196`)                                                                                                              |
| `src/components/dashboard/DepartmentsCard.tsx`          | `src/components/dashboard/AnalyticsSection.tsx:728-751` (card "Departamentos", mesmo `DonutChart`, mesma fonte)                                                                                                                       |
| `src/components/dashboard/QuickActionsMenu.tsx`         | `src/components/dashboard/QuickActionsGrid.tsx` — os 10 destinos conciliados um a um; 2 descartados com razão escrita no código (`:46-50`)                                                                                            |
| `src/components/dashboard/SaudeResumoCard.tsx`          | **órfão na própria muri** (nenhuma página importava); era invólucro de `WorkforceHealthScore` + `ResumoOperacionalCard`, ambos montados na `main`                                                                                     |
| `src/components/dashboard/AlertasProximasCard.tsx`      | **órfão na própria muri**; invólucro de `AlertasRHWidget` + `ProximasAtividadesCard`, ambos montados na `main`                                                                                                                        |
| `src/components/colaborador-detalhes/ComplianceTab.tsx` | `DocumentosComplianceResumoTab.tsx:77,82` usa os **mesmos dois hooks**, e `documentos/StatusComplianceCard.tsx` acrescenta treinamentos e EPIs com detalhe registro-a-registro                                                        |
| `src/components/colaborador-detalhes/CampoInfo.tsx`     | `DadosPessoaisTab.tsx:26` tem a mesma função **e mascara PII** (CPF/RG/e-mail) — a versão da muri imprimia o CPF cru                                                                                                                  |
| `src/components/colaboradores/AnimatedDossieTabs.tsx`   | mecanismo extraído para `src/components/ui/animated-tabs.tsx:70,119`; falta só aplicar a skin em 2 telas (Dossiê e Admissões) — zero impacto funcional                                                                                |
| `src/components/ponto/EditarEscalaDialog.tsx`           | `EditarJornadaDialog.tsx:208-219,274,283` edita escala de **qualquer dia**, com UPDATE×INSERT decidido na hora, observações e remoção. A muri cobria só "hoje" — resgatar seria **regressão**                                         |
| `src/components/premiacoes/PainelAuditoriaRoi.tsx`      | **órfão na muri** e com os 3 filtros `<option>` hardcoded; o equivalente real na `main` é `PremiacoesPage.tsx:413-418` (período derivado de dados) + export CSV/PDF + `PagamentosTabela.tsx`                                          |

### 3.2 Resgatado nesta sessão (2 capacidades)

`src/components/calculadoraRescisao/{rescisaoView.ts,FormularioRescisao.tsx,ResultadoRescisao.tsx}` — dos 19
símbolos, a maior parte já era coberta pela `main`, que é **maior** em 5 pontos (7 tipos de rescisão contra 3;
Art. 479/480 e multa do 477 §8º; INSS e IRRF em parcelas separadas; histórico persistido em
`historico_rescisoes` com trilha LGPD contra histórico de sessão; validação de fim de contrato). Dois itens
eram perda real de **rastreabilidade** e entraram na PR #727:

- data/hora do cálculo e assinatura digital, que o motor já produzia (`src/utils/rescisaoCalc.ts:150-151,465,476`)
  e a tela descartava;
- qual motor (Local × Servidor) produziu o número em cena.

Deliberadamente **não** trazidos da muri, porque a versão dela era pior: ela perdia `validateTablePayload`,
`registrarAcessoPII`, `mapTipoDesligamentoDB` e a guarda que zera o resultado a cada edição do formulário.

### 3.3 Em aberto — depende de decisão do dono (4 arquivos)

**(a) Aba Auditoria de Admissões** — `src/components/admissoes/{auditoriaComum.ts,auditoriaDerivacoes.ts}` e os
consumidores `AuditoriaAdmissoesContent.tsx` / `OnboardingPageContent.tsx`.

Hoje, na `main`, Admissões → Auditoria é `src/pages/AdmissoesPage.tsx:217-234`: um ícone cinza, a frase "O
monitoramento de auditoria eSocial e admissão digital está ativo." e um botão que leva a `/auditoria`, onde a
trilha aparece como INSERT/UPDATE/DELETE por tabela (`AuditoriaPage.tsx:25-29`), sem nome de candidato, sem
etapa e sem status. **12 capacidades de usuário ausentes**, todas prontas e integradas na muri: trilha de
eventos por candidato/cargo/responsável/protocolo, filtro por período (7/30/90 dias, 12 meses), 4 ordenações
(incl. "atenção primeiro"), cards Eventos/Sucesso/Pendentes/Falhas com percentual, chips rápidos exclusivos,
contagem de eventos por etapa, selo/ícone/rótulo de status em vocabulário de RH, lista de tipos de evento por
frequência, busca livre, filtro "só com recibo do eSocial" + intervalo de datas, e "limpar filtros".

**O bloqueio não é de tela, é de fonte de dado.** Em `pr/546:AuditoriaAdmissoesContent.tsx:408` a lista vem de
`isAdmissoesMockEnabled() ? getMockAuditoria() : []` — em produção renderizava **lista vazia**, e
`src/mocks/admissoesMock.ts` nem existe na `main`. Reaproveitar exige decidir antes de onde vêm os eventos:
mapear `audit_logs` para o formato `EventoAuditoria` via `auditoriaService`, ou criar a trilha própria de
admissões. É a maior peça ainda não resgatada da #546.

**(b) `src/hooks/use-stagger-cards.ts`** — entrada em cascata genérica dos `Card`. Na `main` todo `Card` leva
`.animate-squash` (`src/components/ui/card.tsx:27`) mas o CSS não tem `animation-delay` por índice
(`src/index.css:652-667`), então os cards de uma tela surgem todos juntos. Puramente cosmético, hook de DOM,
nenhuma tabela nova.

**(c) Resíduos de UX da calculadora de rescisão**, medidos e não trazidos por serem de conveniência:
combobox com busca digitável (a `main` usa `<Select>` com rolagem pura), máscara R$ nos campos monetários
(`src/components/ui/currency-input.tsx` já existe), botão de remover o colaborador importado, cartão de
confirmação do import com foto/matrícula/departamento, e painel em abas com estado de aguardo explicativo.

**(d) Descartes corretos registrados**, para não voltarem a ser levantados: `src/mocks/layoutMock/` (emulador
que interceptava o `fetch` do cliente Supabase real — o próprio `index.ts:21` manda apagar a pasta),
`src/mocks/dashboardMockData.ts` e os outros 7 mocks, `src/pages/__MeasureTestPage.tsx`,
`supabase/functions/external-db-bridge/debug-test.ts` (arquivo de debug no gateway de produção),
`src/validators/esocialValidators.ts` (2 exports contra a suíte completa de `src/schemas/esocial/`),
`supabase/functions/enviar-esocial/signer.ts` (a `main` tem `utils/signer.ts`, que é a **mesma simulação** mas
nomeada honestamente, `assinarXmlSandboxNaoHomologado`, e `index.ts:150` recusa transmissão produtiva sem
certificado homologado), e `src/assets/banks/` (13 arquivos, 304 KB; decisão registrada em
`src/lib/bankBrand.ts:16`).

## 4. Duas integrações fora do sistema, por decisão de negócio

- **Domínio/Alterdata** (integração contábil). Removida na #201 como código morto — `ESTADO_ATUAL.md:181`
  registra "tem `fetch`, zero consumidores". Já está no backlog do repo: `BACKLOG_11_ITEMS.md:15,41,44`
  (P5-084, `dominioAlterdataService.ts` "a recriar", ~2 dias), **travada em credenciais de API de produção**.
  Não é decisão técnica.
- **Metabase** (BI embarcado). Removida na #201, junto com a edge `metabase-embed/`. `ESTADO_ATUAL.md:246`
  confirma o código morto, inclusive transitivamente. Nada na `main` depende dela.

## 5. Rede de segurança: nada pode ser perdido

- **678** refs `refs/pull/*/head` no remoto — a cabeça de **toda** PR do repositório, incluindo as fechadas sem
  merge, segue recuperável indefinidamente;
- **21** tags `arquivo/*`, todas resolvendo, nenhuma pendente. `arquivo/muri-2026-11-16` aponta exatamente
  para `5d7f6e2f`, a cabeça da #546;
- as 36 branches locais desta sessão foram conferidas por conteúdo contra a `main`: **todo** diff
  `main → branch` resultou `+0 -N`, isto é, a `main` é superconjunto estrito de cada uma. O caso que mais
  parecia perda, `scripts/audit-migration-style.mjs` (35 linhas fora da `main`), é o inverso: a branch tem o
  tokenizador antigo de 3 passadas e a `main` tem o de passada única, com 14 casos de teste contra 7.

## 6. Como refazer esta medição

```sh
# 0. PRIMEIRO: popular refs/remotes/pr/*. Um clone normal NÃO traz esse
# namespace — o refspec padrão é só `+refs/heads/*:refs/remotes/origin/*`, e sem
# este passo os laços abaixo não examinam PR nenhuma e devolvem zero em
# silêncio. Uma PR de cada vez, ou todas:
git fetch origin '+refs/pull/*/head:refs/remotes/pr/*'
git for-each-ref --format='%(refname)' refs/remotes/pr | wc -l   # confere: >0

# superfície de exports da main
git grep -hE '^[[:space:]]*export ' origin/main -- 'src/**' \
  | grep -oE 'export (async )?(function|const|let|class|type|interface|enum) [A-Za-z_][A-Za-z0-9_]*' \
  | awk '{print $NF}' | sort -u > /tmp/main_exports.txt

# símbolos das cabeças de PR (exclui testes e mocks)
for r in $(git for-each-ref --format='%(refname)' refs/remotes/pr); do
  git grep -nE '^[[:space:]]*export (async )?(function|const|let|class|type|interface|enum) [A-Za-z_]' \
    "$r" -- 'src/**' 2>/dev/null | grep -v '__tests__\|/test/\|\.test\.\|\.spec\.\|/mocks/'
done | sed -E 's/.*export (async )?(function|const|let|class|type|interface|enum) ([A-Za-z_][A-Za-z0-9_]*).*/\3/' \
  | sort -u > /tmp/pr_exports.txt

comm -23 /tmp/pr_exports.txt /tmp/main_exports.txt   # o que falta na main

# e o corte por caminho, que pega também `export default` (invisível ao corte
# por símbolo acima)
git ls-tree -r --name-only origin/main -- src supabase/functions | sort > /tmp/main_paths.txt

: > /tmp/pr_paths.txt
for r in $(git for-each-ref --format='%(refname)' refs/remotes/pr); do
  git ls-tree -r --name-only "$r" -- src supabase/functions 2>/dev/null >> /tmp/pr_paths.txt
done
sort -u /tmp/pr_paths.txt -o /tmp/pr_paths.txt

# caminhos que existem em alguma cabeça de PR e não existem na main de hoje
comm -23 /tmp/pr_paths.txt /tmp/main_paths.txt \
  | grep -v '__tests__\|/test/\|\.test\.\|\.spec\.'
```

Para cada símbolo que sobrar, o corte que decide é: o **arquivo** existe na `main`? Se existe, é renomeação ou
absorção — compare o conteúdo. Se não existe, `git log origin/main -- <arquivo>` separa "foi mergeado e
apagado de propósito" (leia a mensagem do commit de deleção) de "nunca chegou" (aí vale abrir o arquivo na
cabeça da PR e medir capacidade por capacidade, como na seção 3).

## 7. Por que a aba Auditoria de Admissões NÃO é um port de UI (medido no canônico, 2026-11-19)

A §3.3(a) disse que a aba depende de "decidir a fonte do dado". Medido o banco, a resposta é mais dura:
**o dado não existe ainda**, e portá-la agora entregaria a tela vazia — exatamente o que a #210 e a #471
removeram deste sistema ("telas que mostravam sucesso falso", "card que mostrava dados inventados").

Os três fatos, lidos do `frjbfeamybqsejlvmqbl`:

| medição                | resultado                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `audit_log` por tabela | `folhas_pagamento` 273, `registros_ponto` 120, `desligamentos` 69, `ferias` 28, `colaboradores` 21 … **`admissoes` 8**; **zero** linhas de `onboarding_colaborador`, `onboarding_tarefas` ou `esocial_eventos`                                                                                                           |
| triggers de auditoria  | `admissoes` tem `audit_admissoes` → `log_audit_change` e `trigger_auditoria_admissao` → `registrar_auditoria_contratual`; `esocial_eventos` tem `tr_audit_esocial_transmission` → `log_esocial_transmission`. **`onboarding_colaborador` e `onboarding_tarefas` têm apenas trigger de `updated_at` — nenhuma auditoria** |
| volume nos destinos    | `auditoria_logs` 317, **`auditoria_contratual` 0**, **`esocial_eventos` 0**, `admissoes` 8, `onboarding_colaborador` 6, `onboarding_tarefas` 27                                                                                                                                                                          |

E há um quarto fato, que é o que realmente trava a tela:

- `public.log_audit_change` **nunca preenche `empresa_id`** (`INSERT INTO public.audit_log (tabela,
registro_id, acao, …, user_id, user_email)` — a coluna não entra em nenhum dos três ramos), então todas as
  linhas nascem com tenant nulo;
- e `audit_log` só tem leitura para **admin** (`is_admin(auth.uid())`) ou para **o próprio autor da ação**
  (`user_id = auth.uid()`). Não existe leitura por empresa para RH ou gestor.

Ou seja: mesmo que a trilha de admissões fosse gravada, o RH não conseguiria ler a trilha dos outros. A aba
da muri não é uma camada de apresentação faltando — é a ponta visível de três lacunas de back end.

**Sequência correta, nesta ordem:**

1. **passar a gravar** — trigger de auditoria em `onboarding_colaborador` e `onboarding_tarefas` usando o
   `log_audit_change` que já existe. Não muda acesso de ninguém, e o dado começa a acumular;
2. **dar tenant ao registro** — preencher `empresa_id` em `log_audit_change` (ou um variante tenant-aware) e
   abrir leitura por empresa para RH/gestor em `audit_log`. **Isto é decisão do dono, não minha:** mexe na
   regra de leitura de uma tabela que carrega PII e que já teve policy `USING (true)` no passado
   (`AUDITORIA.md:85`);
3. **só então** portar a camada da muri (`auditoriaComum.ts` + `auditoriaDerivacoes.ts` +
   `AuditoriaAdmissoesContent.tsx`), mapeando `audit_log` → `EventoAuditoria`.

Enquanto o passo 2 não for decidido, portar a tela produz uma lista vazia com filtros bonitos. Fica parada
de propósito, registrada aqui.
