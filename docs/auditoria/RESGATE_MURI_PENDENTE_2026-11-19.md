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

> **Corrigido na seção 8:** esta contagem mediu só a #546 e só por arquivo adicionado. O número real de paths
> originais da #546 ausentes da `main` é 69 (+14 em `src/assets/banks/`), e há 15 paths em outras 7 refs de PR.

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

> **Corrigido na seção 8:** esta rede não cobria as 621 refs de PR não-ancestrais, as 21 tags `arquivo/*` nem o
> `stash`, que contém trabalho de outro agente (seção 8.1, item 5).

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

## 8. Reauditoria de 2026-11-19 (depois da #738) — a lista das seções 3 e 5 NÃO estava fechada

A medição das seções 3 e 5 foi submetida a três refutadores independentes e **caiu por 3 votos a 0**. Os dois
defeitos de método:

- **a seção 3 mediu só a PR #546 e só por arquivo adicionado.** Das 650 refs `refs/remotes/pr/*`, **621 não
  são ancestrais da `main`** e **539 têm paths ausentes dela**; só a #546 havia sido classificada. Reaplicando
  o teste de originalidade (path inexistente no próprio merge-base da ref, restrito a
  `src|supabase|scripts|e2e|docs`), restam **84 paths**, dos quais **15 fora da #546** — em pr/100, pr/137,
  pr/199, pr/200, pr/251, pr/394 e pr/533, nenhuma delas citada antes. Da própria #546 o número real de paths
  originais ainda ausentes é **69** de código/doc (+14 em `src/assets/banks/`), não 17;
- **a seção 5 declarou "nada pode ser perdido" sem varrer dois namespaces**: as 21 tags `arquivo/*` (varridas
  agora: só espelham a #546 e a #533, `comm -23` = 0 paths novos) e o **stash**, que não é vazio.

Método cego por construção, registrado para quem repetir: `--diff-filter=A` não vê trabalho feito em arquivo
**modificado**. A PR #564 está 8 commits à frente da `main` e produz **0** paths novos — foi invisível à
varredura, e seu conteúdo (32 migrations NineBox + rota `ninebox-preview` em `src/App.tsx`) está na `main`.

### 8.1 Lacunas abertas de verdade (nenhuma estava registrada)

| #   | Pendência                                                               | Evidência                                                                                                                                                                                                                                                                                                                                                             | Por que importa                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~Sidecar da `20261107203000`~~ — **conferido e descartado**, ver 8.6   | —                                                                                                                                                                                                                                                                                                                                                                     | portar o sidecar da `pr/394` criaria duas verificações contraditórias                                                                                                                         |
| 2   | 3º resíduo de UX da rescisão: busca por **CPF e matrícula** no combobox | `pr/546:src/components/calculadoraRescisao/FormularioRescisao.tsx:319` usa `value={\`${c.nome_completo} ${c.cpf ?? ''} ${c.matricula ?? ''}\`}`; a `main` (`src/pages/CalculadoraRescisaoPage.tsx:379`, entregue na #738) usa `value={c.nome_completo}`                                                                                                               | homônimos: com dois "José Silva" o RH não tem como desambiguar na tela de rescisão                                                                                                            |
| 3   | ~~2 specs e2e da #546~~ — **conferidos e descartados**, ver 8.7         | —                                                                                                                                                                                                                                                                                                                                                                     | contrato coberto por 48 casos unitarios na main; o de Premiacoes esta quebrado na premissa                                                                                                    |
| 4   | Aba Auditoria de Admissões (5 arquivos)                                 | `git ls-tree --name-only origin/main src/components/admissoes/ \| grep -i auditoria` → vazio                                                                                                                                                                                                                                                                          | §7 explica por que estava parada. **O bloqueio caiu**: a trilha passou a ser gravada em 2026-11-19 (migration `20261119150000`, aplicada e verificada). Falta o passo 2 (leitura por empresa) |
| 5   | ~~`stash@{0}`~~ — **conferido e fechado**, ver 8.5                      | —                                                                                                                                                                                                                                                                                                                                                                     | o stash foi varrido byte a byte: nada pendente                                                                                                                                                |
| 6   | ~69 paths originais restantes da #546                                   | `git cat-file -e origin/main:<path>` sobre a lista; inclui `PainelAuditoriaRoi.tsx`, `ComplianceTab.tsx`, `CampoInfo.tsx`, `AnimatedDossieTabs.tsx`, `EditarEscalaDialog.tsx`, `QuickActionsMenu.tsx`, 4 cards de dashboard, `functionsUrl.ts`, `rescisaoView.ts`, `FormularioRescisao.tsx`, `ResultadoRescisao.tsx`, ~10 arquivos de teste e 14 `src/assets/banks/*` | a seção 3.1 dá o veredito "capacidade viva em outro arquivo" para parte deles, **conferida por existência de arquivo/capacidade, não por paridade linha a linha** — o que falta é a paridade  |

### 8.2 `folhas_gestor_update` (PR #726) — rejeição correta, não trabalho perdido

A #726 propunha policy de UPDATE para gestor em **duas** tabelas. A metade `ferias` foi incorporada
(`20261119130000`, aplicada) e a escalada que ela abriu foi fechada (`20261119140000`, guarda de coluna). A
metade **`folhas_pagamento` fica fora de propósito**, e isto foi submetido aos mesmos três refutadores:
**0 refutações em 3**. Evidência:

- a matriz canônica de permissões **em produção** (`public.permissions`) dá ao gestor apenas
  `folha` + `read` — admin tem create/read/update/delete;
- `docs/seguranca/MATRIZ_PAPEIS.md:11`: fechar/reabrir folha = admin ✅, **gestor —**, rh ✅;
- **nenhuma** função do schema `public` escreve em `folhas_pagamento` (varredura em `pg_get_functiondef` → 0
  linhas): não existe caminho indireto por trigger/RPC que dependa de RLS de gestor;
- as três Edge Functions que escrevem (`calcular-folha:616/589`, `fechar-folha:157`, `reabrir-folha:189`)
  gravam com cliente **service_role** e são barradas por `requireRh`
  (`supabase/functions/_shared/authz.ts:109-121`, 403 "Ação restrita a RH ou administrador"): a policy não
  destravaria nada nesses fluxos;
- `folha_itens`, par obrigatório de qualquer lançamento, é exclusiva de RH (`folha_itens_rh_manage`): o gestor
  não conseguiria produzir os itens cujo total atualizaria;
- a tabela **não tem** coluna de aprovação de gestor (26 colunas: totais, fechamento, reabertura, hash), logo
  não há o análogo de `ferias`, onde o gestor aprova de fato.

Conceder UPDATE sem guarda de coluna deixaria `total_proventos`, `total_descontos`, `total_liquido` e
`total_fgts` graváveis por gestor. **Decisão: não aplicar.** O achado colateral que vale ação está em 8.3.

### 8.3 Achado colateral desta reauditoria (fora do escopo de resgate, registrado)

As rotas `/folha` (`src/App.tsx:240`) e `/folha/calcular` (`src/App.tsx:241`) ficam só sob `ProtectedRoute`,
que valida sessão e MFA e **não** papel; o item "Folha de Pagamento" do menu
(`src/components/layout/AppSidebar.tsx:165`) não usa a flag `adminOnly` que já existe ali
(`AppSidebar.tsx:78-79`), e a ação rápida "Calcular Folha" (`src/components/layout/MobileQuickActions.tsx:41-45`)
não usa a flag `somenteRh` que já existe (`MobileQuickActions.tsx:28`). O gestor **não** escreve — a RLS
barra — mas enxerga a tela e os botões e recebe um erro genérico ao clicar. É falha de UX e de clareza de
permissão, não de segurança.

### 8.4 Descartes confirmados nesta rodada

| Ref      | Path original                                                                        | Veredito                                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pr/533` | `20261114000700_eh_feriado_fixo_br_consciencia_negra.sql` + sidecar                  | capacidade já na `main` com outro nome: `20261114000000_remediate_ferias_art145_11_20.sql:24` traz `'11-20'` (commit `28e9d0cf5`, #461)                                          |
| `pr/100` | `MetabaseEmbed.test.tsx`, `metabase-embed/{availability,dashboardAccess}{,.test}.ts` | apagados da `main` de propósito em `7db8ba84a` — descarte já registrado na seção 2                                                                                               |
| `pr/251` | `20261018160000_default_privs_revoke_execute_public.verify.sql`                      | a `main` tem `20261018170000_*.sql` **com** sidecar, 1h depois                                                                                                                   |
| `pr/328` | `.github/workflows/main.yml`                                                         | PR "Create main.yml", fechada sem merge; workflow genérico, nada do sistema                                                                                                      |
| `pr/564` | —                                                                                    | 0 paths novos; conteúdo NineBox na `main` (32 migrations + rota)                                                                                                                 |
| #546     | SQL de diagnóstico do NineBox                                                        | **não** é pendência: foi publicado na #595 e **removido de propósito** na #599 (`2b50f152e`) porque continha `user_id` e e-mail pessoais. Repositório público — não reintroduzir |

### 8.5 `stash@{0}` — varrido byte a byte, nada pendente

O `stash` era o único namespace do repositório que nenhuma auditoria havia aberto, e é o mais frágil: não é
branch nem PR, ninguém olha, e um `git stash clear` apaga sem deixar `reflog` útil. Varrido agora:

`git stash list` → `stash@{0}: WIP on claude/feat-treinamentos-turmas-nucleo-261116-1600: bbe691193`
(commit `63e2c7097`, pais `bbe691193 b05dca58c 5e12af39f`).

- **conteúdo real:** `git diff --stat bbe691193 stash@{0}` → **33 arquivos, 7.204 linhas** da área de
  Treinamentos/Turmas (o diff "4 arquivos novos" que aparece contra a `main` é artefato: a `main` **apagou**
  `OnboardingPageContent.tsx`/`RewardsApprovalHub.tsx` + 2 testes de propósito, em `576c7f482` (#609) e
  `34959e3cf` (#611), que são justamente resgates da muri — e o stash **não** os modificou, diff vazio);
- **os 33 estão todos na `main`** (`git cat-file -e origin/main:<path>` → 33/33);
- **23 são byte-idênticos** à `main`;
- **10 divergem e a `main` está à frente em 8**: `TreinamentosKpis.tsx` 161→**194**, `TurmasPainel.tsx`
  410→**456**, `NovaTurmaDialog.tsx` 219→**230**, `TrainingCover.tsx` 265→**271**,
  `treinamentosDerivacoes.ts` 744→**747**, `treinamentosMock.ts` 727→**729**, `premiacoesEntrada.ts` 102 vs 103
  (a linha extra do stash é **linha vazia**), `MaisTurmasCard.tsx` 80/80 (as linhas só do stash são
  **comentário**);
- **a única asserção de teste "só do stash"** é a mesma linha da `main`, apenas reformatada pelo prettier:
  `turmasDerivacoes.test.ts:198` → `expect(referenciaTemporalTurma(new Date(2026, 1, 5), 'concluidas', '2026-02-20', REF)).toBe('Concluída em 20/02')`.

Nenhuma linha do stash tem comportamento ausente da `main`. **Veredito: incorporado, pode ser descartado** — e
mesmo assim não há pressa, porque os paths também vivem em 565+ refs `refs/pull/*/head`, que o GitHub guarda
indefinidamente.

### 8.6 Sidecar da `20261107203000` (pr/394) — descartado, e o motivo é importante

O sidecar que falta na `main` afirma que a policy `configuracoes_ponto_tenant_manage` **existe**:

```sql
SELECT 'ok' WHERE EXISTS (SELECT 1 FROM pg_policies WHERE ... policyname = 'configuracoes_ponto_tenant_manage' AND cmd = 'ALL');
```

Essa policy **não existe mais, de propósito** — e duas migrations posteriores, ambas na `main` e no ledger,
a removem:

- `20261109000000_configuracoes_ponto_insert_policy.sql:9` → `DROP POLICY IF EXISTS "configuracoes_ponto_tenant_manage"`;
- `20261112010000_configuracoes_ponto_corrige_policies_prod.sql:12` → o mesmo `DROP`, e troca a policy única
  `FOR ALL` por quatro policies por papel, com o helper `pode_gerir_config_ponto`.

E a `20261112010000` **já tem sidecar forte**, que assere exatamente o contrário:
`... AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE ... cmd IN ('ALL','DELETE') ...)`.

Portar o sidecar da `pr/394` colocaria no repositório duas asserções contraditórias sobre a mesma tabela, e um
`mode=verify` da `20261107203000` **reprovaria por projeto**.

Estado real em produção, lido agora (`supabase_db_list_policies`, tabela `configuracoes_ponto`): **4 policies**
— `Admins podem inserir configurações de ponto` (INSERT), `Configurações de ponto visíveis por membros da
empresa` (SELECT), `Supervisor ou coordenador inserem configurações de ponto` (INSERT) e `Supervisor ou
coordenador alteram configurações de ponto` (UPDATE). **Nenhuma** `ALL` ou `DELETE`, e
`configuracoes_ponto_tenant_manage` ausente. Ou seja: o estado do banco é o que a `20261112010000` manda, e
esse elo **está** provado por sidecar.

**Veredito: descarte correto.** A regra do `AGENTS.md` §5 segue honrada pelo sidecar da migration que de fato
governa a tabela hoje; a `20261107203000` é um elo intermediário cuja pós-condição foi substituída 5 dias
depois.

### 8.7 Os 2 specs e2e da #546 — descartados, com a cobertura provada na `main`

O spec de **Premiações** está quebrado na própria premissa. Seu cabeçalho diz "usa o mock visual aprovado
(`VITE_PREMIACOES_MOCK=true`)", e essa variável **não existe mais na `main`**
(`grep -rl VITE_PREMIACOES_MOCK src/` → nada); o heading que ele espera, `Hub de Premiações`, também não está
em nenhuma página de Premiações. A aba foi reescrita para ler dado real, e as frases que o spec assere
(`Divergência identificada na conciliação`, `Campanha criada`, `Campanhas 2`) só existem hoje como fixture de
teste. Portá-lo colocaria um teste **vermelho** na suíte autenticada da `main`.

O spec de **Nine-Box** tem todos os seletores vivos na `main`, mas o contrato que ele prova já está coberto
por teste unitário, caso a caso:

| Contrato do spec (T1–T7)                               | Onde está na `main`                                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| T1/T2 gestor aprova a avaliação consolidada            | `src/components/__tests__/AprovacaoLocal.test.ts:151` "aprovacao nao guarda justificativa…"                       |
| T3/T4 a aprovação classifica **direto** o Nine-Box     | `AprovacaoLocal.test.ts:371` "aprovacao com nota valida classifica o quadrante" (`aguardandoAprovacao === false`) |
| T5 a pessoa aparece no quadrante                       | `src/components/__tests__/NineBoxMatrix.test.tsx` (7 casos)                                                       |
| T6 F5 mantém a classificação                           | `AprovacaoLocal.test.ts:74` "gravar e ler round-trip (com storage global)"                                        |
| nota inválida / versão divergente invalida a aprovação | `AprovacaoLocal.test.ts:385` e `:399`                                                                             |

Cobertura equivalente do spec de Premiações: `src/components/__tests__/AuditoriaTab.test.tsx` (8 casos — sem
tabela HTML, busca, filtro por categoria, exportação, skeleton e erro), `AuditoriaEventoDialog.test.tsx` (5) e
`AuditoriaAnimacao.test.tsx` (3).

Restrição que fecha a decisão: a suíte `authenticated` **não roda em PR**. Ela só roda por
`workflow_dispatch` a partir da `main` — `.github/workflows/e2e.yml:167-174`: "Dispatch restrito a main:
credenciais de escrita do canônico não podem rodar código de outra branch". Ou seja, um spec autenticado novo
**não pode ser validado antes do merge**: entraria na `main` sem nunca ter rodado, e só seria exercitado com
credencial real contra o canônico.

**Veredito: descarte correto.** Somar um teste de navegador não verificável ao portão da `main`, para um
contrato que 48 casos unitários já provam, é risco sem ganho. Se o dono quiser cobertura de navegador nessas
duas áreas, é decisão com custo (dispatch a partir da `main`, credencial real) e vira tarefa própria.

## 9. Varredura exaustiva por SÍMBOLO (2026-11-19, depois da #746) — o universo de branches fechado

As seções 3 e 8 compararam a muri com a `main` por **caminho de arquivo**. Isso subestima e superestima ao
mesmo tempo: a `main` reaproveitou a muri renomeando arquivos, então caminho diferente não significa
funcionalidade ausente — e `git diff` de três pontos marca como "adicionado na muri" o que a `main` também
adicionou por conta própria (foi o que inflou uma contagem anterior de 117 para 577).

Esta seção fecha o universo por um critério que renomeação não quebra: **símbolo exportado**.

### 9.1 Método (reproduzível)

```sh
# arvore da muri extraida para fora do repo
git archive pr/546 src supabase/functions | tar -x -C /tmp/muri
# extrai `export (function|const|class|interface|type|enum) <nome>` dos dois lados
# e subtrai; mock, teste e asset nao contam como funcionalidade
```

| Medida                                                                                | Valor                   |
| ------------------------------------------------------------------------------------- | ----------------------- |
| Símbolos exportados na muri (produção, sem mock/teste)                                | 3.331                   |
| Símbolos exportados na `main` (inclusive teste e edge)                                | 3.651                   |
| **Ausentes da `main` por nome**                                                       | **224**, em 58 arquivos |
| Descartados por regra já estabelecida (mock: PRs #210/#471) + resolvidos nesta sessão | 185                     |
| **Triados um a um**                                                                   | **39**                  |

Arquivo × árvore (não três pontos): **117** caminhos existem só na muri — 31 componentes, 14 assets,
13 migrations, 13 mocks, 9 serviços, 5 utils, 5 hooks, 4 edge, 3 lib, 2 calculators, 4 specs e avulsos.

### 9.2 Resultado da triagem dos 39 símbolos de produção

**Zero funcionalidade perdida.** 14 incorporados sob outro nome, 25 obsoletos — e **11 destes já eram código
morto dentro da própria muri** (nenhum importador lá). Em dois casos a `main` é melhor: a provisão da muri
usava alíquota fixa 0,348 (`provisoesService.ts:13`) contra cálculo por regime tributário em
`supabase/functions/calcular-provisoes/index.ts:22-54`; e `metabaseService.ts:69` lia
`VITE_METABASE_SECRET_KEY` **no browser**.

Amostra dos vereditos com evidência:

| Símbolo da muri           | Veredito    | Onde está / por quê                                                                                       |
| ------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `calcularFolhaCompleta`   | INCORPORADO | `supabase/functions/calcular-folha/index.ts:451-556`, com INSS/IRRF por competência em `_shared/`         |
| `cnabLayoutService`       | INCORPORADO | era wrapper puro; `CNABDialog.tsx:150` chama `cnabService.ts:225` direto                                  |
| `maskPixKey`              | INCORPORADO | virou `maskGeneric` (`piiMask.ts:38-42`) + despacho por tipo em `usePiiMask.ts:25-31`, com gate por papel |
| `gerarEventosMensais`     | INCORPORADO | era stub (`dados: {}`); real em `esocialService.ts:303-398`, ligado ao botão em `ESocialPage.tsx:238`     |
| `HeadcountOverviewCard`   | INCORPORADO | resgatado nome a nome em `useExecutiveDashboard.ts:34,54` (o próprio arquivo cita a muri)                 |
| `FGTSDigitalDashboard`    | OBSOLETO    | números hardcoded (`:65-73`); real em `ObrigacoesFiscaisPage.tsx:208-252` + `gerar-guias`                 |
| `ESocialAIInsights`       | OBSOLETO    | conteúdo inventado; remoção travada por teste em `ESocialSemDadosFicticios.test.tsx:67-80`                |
| `dominioAlterdataService` | OBSOLETO    | client HTTP no browser com `clientSecret`; nunca integrado nem na muri                                    |
| `useStableCallback`       | OBSOLETO    | `useCallback(cb, [])` ignorando as deps recebidas — helper com bug                                        |
| `pontoSchema`             | OBSOLETO    | `main` valida por allowlist (`GestaoRegistrosPonto.tsx:96` + `tableColumns.ts`)                           |

Os 3 arquivos de backend exclusivos da muri: `enviar-esocial/signer.ts` era **mock** (`assinaturaMock`,
`CERTIFICADO_MOCK`) e já era morto lá (o `index.ts` importava `./utils/signer.ts`), e a `main` tem o
equivalente honestamente nomeado `assinarXmlSandboxNaoHomologado`; `metabase-embed/index.ts` nunca foi
registrada no `config.toml` nem na muri; `esocialValidators.ts` era shim `@deprecated` de 9 linhas.

### 9.3 Migrations da muri sem arquivo na `main` (13)

6 estão aplicadas sob **outro número** (`atomic_rate_limit_rpc` → `20260724120001`,
`codex_p1_function_overload_and_auth_gap` → `20260724130004`, `p2_037_deprecate_legacy_tables` →
`20260818000001`, `document_upload_storage_columns` → `20261117170300`,
`storage_documentos_delete_tenant_scope` → `20261117170000`, `onboarding_audit_trigger` →
`20261117170100`). Das 7 restantes, nenhuma está no ledger, e o estado foi conferido objeto por objeto:

| Versão da muri                                    | Veredito                                                                                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `20260724140000_t007_backup_logs_rls`             | OBSOLETO — `public.backup_logs` **não existe** (391 tabelas, sem truncamento)                                                            |
| `20260819000000_p0_fix_user_empresa_id_rls`       | ESTADO PRESENTE — `user_empresa_id()` existe; `main` chega mais estrito em `20260912190000:51-64`, **sem** o fallback de `user_metadata` |
| `20260820000000_p0_fix_auditoria_rpc`             | ESTADO PRESENTE — e a policy `audit_log_all` (`USING(true)`) da muri **não** existe, corretamente: abriria a trilha de todas as empresas |
| `20260821000000_p0_rls_dashboard_audit`           | ESTADO PRESENTE — 10 das 13 policies verbatim; 3 substituídas por versão **mais estreita** (`*_rh_manage`)                               |
| `20261005000000_onboarding_kits_rls_additive`     | ESTADO PRESENTE — rejeição documentada na issue #628: as 3 policies da muri **ampliariam** o escopo                                      |
| `20261005020000_onboarding_modelo_b_convergencia` | **ESTADO AUSENTE** — resgatada na PR #747                                                                                                |
| `20261026090000_ciclos_exclusao_autorizada`       | ESTADO PRESENTE — trigger, função e policies vivos via `20261027090000`                                                                  |

**Conclusão que inverte a intuição:** aplicar hoje as versões da muri para `audit_log`, para as 13
`*_tenant_select` e para os kits de onboarding seria **afrouxar** isolamento multi-tenant, não corrigir.
A versão da muri de `20260821000000` somava `OR empresa_id IS NULL OR auth.jwt()->>'role' IN (...)`, e
policies permissivas combinam por **OR**.

### 9.4 Universo de branches — fechado

| Branch             | Veredito              | Prova                                                                                                      |
| ------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `computador_local` | zero conteúdo próprio | `git merge-base --is-ancestor` passa; aponta para o merge da #744                                          |
| `contexto`         | zero código           | órfã, sem base comum; 859 arquivos = 857 docs gerados + `vercel.json`/`README` **reduzidos**. Nunca fechar |
| `pr/546` (muri)    | triada por símbolo    | 9.1–9.3                                                                                                    |

### 9.5 O que esta sessão ainda NÃO provou

- **Corpo de função e ACL**: nenhuma ferramenta MCP devolve `prosrc` ou privilégio de função, e
  `supabase_db_query` está quebrado (vazio até para `select 1`); `pg_policies` não passa pelo PostgREST.
  Mitigação real, não promessa: o job "Integridade do banco canônico (live)" (`ci.yml:478`) roda em **toda PR
  interna** com role somente-leitura e inclui `audit-rls-tenant-open.mjs` (lê a expressão das policies e marca
  o padrão traiçoeiro `empresa_id IS NOT NULL`, `:53`) e `audit-secdef-authz.mjs` (lê `prosecdef`, `prosrc` e
  `has_function_privilege` para anon/authenticated, `:162-165`). Verde no merge da #746.
- **Comportamento com dado real na tela**: a aba de Auditoria foi confirmada em produção por requisição HTTP
  ao bundle servido (placeholder antigo com 0 ocorrências, `get_audit_trail` presente, zero
  `from('audit_log')`), mas ninguém a abriu autenticado.
