# Admissoes, onboarding e kanban

A muri refez por completo a cara do modulo de Admissoes e da Jornada de Onboarding: onde a main tem uma grade de cards simples e um dashboard de 4 KPIs, a muri tem um painel operacional com tabela filtravel/paginada, dashboard analitico com funil e widgets, kanban redesenhado com animacao de entrada, modal de detalhe em painel unico, Gestao de Kits (tabela onboarding_kits que hoje nao tem NENHUM consumidor na main) e uma camada de servico/hook de dominio para o onboarding. O ganho de interface e de organizacao e grande e real. O problema e que a muri foi escrita ANTES das correcoes funcionais de outubro/novembro da main, e carrega de volta tres bugs que a main ja consertou: arrastar para "Concluida" no kanban nao cria mais o colaborador, o botao de transmitir o S-2200 volta a mandar o id da admissao no lugar do id do evento (erro que a main documenta como "falhava sempre"), e o envio do link ao candidato volta a dizer "enviado com sucesso" sem enviar e-mail nenhum. Nada da muri pode ser copiado por cima da main nesta area: tudo que vale a pena entra como camada de apresentacao em cima dos handlers e services que a main ja corrigiu.

| decisão             | esforço | arq. | grupo                                                                      |
| ------------------- | ------- | ---- | -------------------------------------------------------------------------- |
| RECUPERAR           | baixo   | 5    | Regua de dominio de Admissoes (modulos puros compartilhados)               |
| RECUPERAR_COM_MERGE | alto    | 1    | Gestao de Candidatos (aba Gestao do modulo de Admissoes)                   |
| RECUPERAR_COM_MERGE | alto    | 2    | Dashboard analitico de Admissoes                                           |
| RECUPERAR_COM_MERGE | alto    | 5    | Kanban redesenhado (colunas, cards e animacao de entrada)                  |
| RECUPERAR_COM_MERGE | alto    | 5    | Jornada de Onboarding consolidada (pagina /onboarding + camada de dominio) |
| RECUPERAR           | medio   | 2    | Gestao de Kits de Onboarding                                               |
| RECUPERAR_COM_MERGE | medio   | 1    | NovaAdmissaoDialog: modo controlado e edicao                               |
| RECUPERAR_COM_MERGE | alto    | 1    | DetalhesAdmissaoDialog redesenhado (painel unico)                          |
| RECUPERAR_COM_MERGE | medio   | 1    | Casca da AdmissoesPage (abas com estado e atalho para a Jornada)           |
| RECUPERAR_COM_MERGE | alto    | 3    | Trilha de Auditoria de Admissoes                                           |
| RECUPERAR           | baixo   | 2    | Ajuste de tom do checklist e da assinatura (cosmetico)                     |
| OBSOLETO            | baixo   | 3    | useAdmissoes e contratacaoService da muri                                  |
| OBSOLETO            | baixo   | 2    | Ruido de formatacao em componentes de UI compartilhados                    |

## Regua de dominio de Admissoes (modulos puros compartilhados)

`RECUPERAR` · esforço baixo · 5 arquivos

**Valor para o negócio.** Fonte unica dos rotulos de etapa, cores de selo, checklist obrigatorio, calculo de prazo/atraso/progresso e situacao da jornada. Hoje a main repete rotulos de etapa em cada tela (ex.: `etapaLabels` em origin/main:src/pages/AdmissoesPage.tsx:43-53 e `COLUMNS` em origin/main:src/components/admissoes/AdmissoesKanban.tsx:31-42), o que faz card, tabela e kanban poderem discordar do mesmo candidato.

**Risco de regressão.** Nenhum por si: sao arquivos novos, nenhum arquivo da main e tocado. O risco e o oposto - se entrarem sozinhos, ficam codigo morto.

**Evidência.** `git show origin/muri:src/components/admissoes/admissoesComum.ts \| grep -nE "^import"` nao retorna nada (zero imports: so constantes de rotulo/selo/checklist). admissoesDerivacoes.ts:14 importa apenas `./admissoesComum`; onboardingDerivacoes.ts:18-19 importa `./admissoesDerivacoes` e `@/utils/format`; kanbanComum.ts:47 so `@/utils/format`. A unica mencao a mock em kanbanComum.ts:51 e onboardingDerivacoes.ts:32 e texto de comentario, nao import.

**Plano.** 1) Trazer os 5 arquivos de origin/muri para src/components/admissoes/ sem alteracao de conteudo. 2) Rodar `npx prettier --write` nos 5 (a muri tem arquivos com virgula final em argumento de funcao, que o .prettierrc compartilhado proibe - `trailingComma: es5`, identico nas duas pontas). 3) Rodar `npm run typecheck`. 4) NAO abrir PR isolada: este grupo tem de entrar na MESMA PR do grupo "Gestao de Candidatos" (ou do Kanban), senao e codigo sem consumidor. Nao trazer `src/mocks/admissoesMock.ts`.

<details><summary>Arquivos (5)</summary>

- `src/components/admissoes/admissoesComum.ts`
- `src/components/admissoes/admissoesDerivacoes.ts`
- `src/components/admissoes/kanbanComum.ts`
- `src/components/admissoes/onboardingComum.ts`
- `src/components/admissoes/onboardingDerivacoes.ts`

</details>

## Gestao de Candidatos (aba Gestao do modulo de Admissoes)

`RECUPERAR_COM_MERGE` · esforço alto · 1 arquivos

**Valor para o negócio.** Troca a grade de cards por painel operacional: KPIs, busca, filtros por etapa/departamento/responsavel/faixa salarial, alternancia tabela/cards, ordenacao e paginacao. Em base com dezenas de admissoes a tela atual da main nao tem como ser operada.

**Risco de regressão.** Dois pontos concretos. (a) Os handlers: se vierem os da muri, o envio de link volta a mentir - origin/muri:src/pages/AdmissoesPage.tsx:124-137 chama `enviarLinkCandidato` e ja dispara `toast.success('Link de contratacao enviado com sucesso!')` sem chamar e-mail nenhum, enquanto origin/main:src/pages/AdmissoesPage.tsx:77-108 chama `enviarEmailLinkCandidato`, confere `empresa_id` e, sem provedor configurado, copia o link e avisa (`email_provider_not_configured`). (b) A coluna de checkbox e UI morta: `selecionados` aparece em GestaoCandidatos.tsx:653,664,672-673,706,1154,1786 e em nenhum lugar alimenta acao em massa.

**Evidência.** origin/muri:src/components/admissoes/GestaoCandidatos.tsx tem 83273 bytes e ZERO referencia a mock (`grep -cE "mock\|Mock" = 0`); le so o prop `admissoes` e colunas que existem de verdade no schema da main (`salario_proposto`, `metadata.responsavel` - ver origin/main:src/integrations/supabase/types.ts:163-195). Props em :203-210 recebem os tres handlers da pagina. A main hoje faz isso com uma grade de cards inline em origin/main:src/pages/AdmissoesPage.tsx:211-350.

**Plano.** 1) Copiar GestaoCandidatos.tsx de origin/muri; depende do grupo "Regua de dominio" (importa ETAPA_BADGE de ./admissoesComum e derivacoes de ./admissoesDerivacoes). 2) Em src/pages/AdmissoesPage.tsx trocar o bloco `<TabsContent value="gestao">` (origin/main:src/pages/AdmissoesPage.tsx:211-350) por `<GestaoCandidatos admissoes={admissoes} isLoading={isLoading} sendingLink={sendingLink} onEnviarLink={handleEnviarLink} onEnviarWhatsApp={handleEnviarWhatsApp} onOpenDetalhes={setSelectedAdmissao} />`, MANTENDO os handlers da main como estao (nao copiar os da muri). 3) Remover a coluna de checkbox e o estado `selecionados`, OU implementar uma acao em massa real (reenviar link para os marcados) - nao deixar checkbox sem efeito. 4) MetricCard: GestaoCandidatos.tsx:1444-1455 passa `tone`, `vividRed` e `className`, que a MetricCard da main (origin/main:src/components/dashboard/MetricCard.tsx:22-33) nao aceita e com `gradient` obrigatorio; ou o grupo da MetricCard da muri entra antes, ou mapear `tone` -> `gradient` e apagar `tone`/`vividRed`/`className` na chamada. 5) Apagar os imports/estados que sobrarem na pagina (Search, Input, EmptyList, EmptySearch, etapaFilters, etapaCounts, filtered) para nao deixar codigo morto. 6) `npm run typecheck && npm run lint:ci && npm run test`.

<details><summary>Arquivos (1)</summary>

- `src/components/admissoes/GestaoCandidatos.tsx`

</details>

## Dashboard analitico de Admissoes

`RECUPERAR_COM_MERGE` · esforço alto · 2 arquivos

**Valor para o negócio.** Substitui 4 KPIs e dois graficos por um painel com funil por etapa, acoes prioritarias, proximas admissoes, distribuicao por area e SLA/alertas, cada widget com modal detalhando a lista por tras do numero. E a tela que diz ao RH o que precisa de acao hoje.

**Risco de regressão.** Trocar um grafico de tempo medio CALCULADO do banco por quatro meses inventados e hardcoded. Seria perda de funcionalidade e dado falso na tela do dono.

**Evidência.** origin/muri:src/components/admissoes/AdmissoesDashboard.tsx:84-107 declara que le colunas reais (checklist_*, status_esocial, protocolo_esocial, metadata) - todas existem em origin/main:src/integrations/supabase/types.ts:165-195. Mas :528-534 define `TEMPO_MEDIO_FALLBACK = [{Jan,12},{Fev,10},{Mar,15},{Abr,9}]` e :881 usa esse array fixo quando o mock esta desligado, isto e, EM PRODUCAO. A main calcula a mesma metrica de dado real em origin/main:src/components/admissoes/OnboardingDashboard.tsx:27-43 (created_at -> updated_at das concluidas, agrupado por mes, vazio quando nao ha dado).

**Plano.** 1) Copiar os dois arquivos de origin/muri (admissoesDashboardModais usa `@/components/ui/animated-cascade-dialog`, que e byte-identico nas duas pontas - `git diff origin/main origin/muri -- src/components/ui/animated-cascade-dialog.tsx` vazio). 2) Apagar o import de `@/mocks/admissoesMock` (linha 57), o `mockAtivo` (:667-668) e a constante TEMPO_MEDIO_FALLBACK (:528-534). 3) No lugar, portar o calculo de `timeToHire` de origin/main:src/components/admissoes/OnboardingDashboard.tsx:27-43 para dentro do `useMemo` de `serieTempo` (:877-884), mantendo o recorte por periodo e exibindo estado vazio quando nao houver concluida com created_at/updated_at. 4) Em src/pages/AdmissoesPage.tsx trocar `<OnboardingDashboard admissoes={...} />` (origin/main:src/pages/AdmissoesPage.tsx:197-203) por `<AdmissoesDashboard admissoes={admissoes \|\| []} onAbrirAba={setActiveTab} />` - isso exige o grupo "Casca da AdmissoesPage" (estado activeTab) para os botoes "Resolver agora" terem destino. 5) Mesma pendencia de MetricCard do grupo anterior (AdmissoesDashboard.tsx:930-941 usa tone/vividRed/className). 6) Depois de verificar que nada mais importa OnboardingDashboard.tsx, remove-lo; enquanto houver import, deixar. 7) typecheck + lint:ci + test.

<details><summary>Arquivos (2)</summary>

- `src/components/admissoes/AdmissoesDashboard.tsx`
- `src/components/admissoes/admissoesDashboardModais.tsx`

</details>

## Kanban redesenhado (colunas, cards e animacao de entrada)

`RECUPERAR_COM_MERGE` · esforço alto · 5 arquivos

**Valor para o negócio.** Colunas com descricao da etapa, cards com avatar/responsavel/prazo/status contextual, menu de acoes por card, botao "+ Adicionar candidato" no rodape de cada coluna e animacao de entrada em CSS puro. O board da main e so titulo + contador + nome/cargo.

**Risco de regressão.** Alto e grave se copiado como esta: admissao arrastada para "Concluida" passaria a mudar so a coluna `etapa`, sem criar o colaborador e sem as travas de etapa terminal de origin/main:src/services/admissaoService.ts:62-68 e :136-142. Os testes atuais nao pegam isso - nem origin/main:src/components/**tests**/AdmissoesKanban.test.tsx nem a versao da muri exercitam o drop.

**Evidência.** REGRESSAO 1: origin/main:src/components/admissoes/AdmissoesKanban.tsx:169-172 ramifica o drop - `admissaoService.concluir(id, empresaAtual.id)` para 'concluida' (cria o colaborador) e `cancelar` para 'cancelada'; origin/muri:src/components/admissoes/AdmissoesKanban.tsx:112 faz SEMPRE `admissaoService.atualizar(id, { etapa: target }, empresaAtual?.id)`. REGRESSAO 2: origin/main:...:81-82 bloqueia o arraste das etapas terminais (`useDraggable({ id, disabled: terminal })`, com o comentario "concluida ja criou colaborador e cancelada e definitiva"); origin/muri:src/components/admissoes/KanbanCard.tsx:260 e `useDraggable({ id: item.id })`, sem disabled. REGRESSAO 3: a assinatura da main e `atualizar(id, d, empresaId: string)` (origin/main:src/services/admissaoService.ts:21) - `empresaAtual?.id` da muri e `string \| undefined` e nao compila em TS strict.

**Plano.** 1) Trazer KanbanCard.tsx, KanbanColumn.tsx e src/components/kanban/entradaKanban.ts (+ o teste) de origin/muri; depende de kanbanComum.ts (grupo "Regua de dominio"). 2) Portar o CSS de entrada: copiar o bloco `KANBAN (Admissoes) - ENTRADA DAS COLUNAS EM CSS PURO` de origin/muri:src/index.css:670-812 (inclui o `@media (prefers-reduced-motion: reduce)` em :787) para src/index.css da main - `git grep -c kanban-index origin/main -- src/index.css` nao retorna nada, o bloco nao existe la. 3) Em AdmissoesKanban.tsx NAO substituir o arquivo: aplicar so a casca da muri (COLUNAS_KANBAN, KanbanColumn, DragOverlay em createPortal, NovaAdmissaoDialog sob demanda, props isActive/acoes) e PRESERVAR integralmente o `handleDragEnd` da main (origin/main:...:153-192), incluindo o guard `if (!empresaAtual?.id)`, os ramos concluir/cancelar e a invalidacao de ['colaboradores'] e ['colaboradores-summary']. 4) Em KanbanCard.tsx:260 restaurar `const terminal = item.etapa === 'concluida' \|\| item.etapa === 'cancelada';` e `useDraggable({ id: item.id, disabled: terminal })`. 5) O botao "+ Adicionar candidato" exige o modo controlado do grupo "NovaAdmissaoDialog" - sem ele, remover o botao ou travar este grupo atras dele. 6) typecheck + lint:ci + `npm run test -- AdmissoesKanban entradaKanban`.

<details><summary>Arquivos (5)</summary>

- `src/components/admissoes/KanbanCard.tsx`
- `src/components/admissoes/KanbanColumn.tsx`
- `src/components/admissoes/AdmissoesKanban.tsx`
- `src/components/kanban/entradaKanban.ts`
- `src/components/kanban/__tests__/entradaKanban.test.ts`

</details>

## Jornada de Onboarding consolidada (pagina /onboarding + camada de dominio)

`RECUPERAR_COM_MERGE` · esforço alto · 5 arquivos

**Valor para o negócio.** Uma unica tela de jornada, com busca, filtros, ordenacao, paginacao, chips de risco, detalhe com checklist e conclusao de tarefa, e o nome do responsavel resolvido de verdade (hoje `responsavel_id` nunca e traduzido em nome em lugar nenhum da main). Elimina a duplicata de codigo que faz Admissoes e /onboarding divergirem.

**Risco de regressão.** origin/muri:src/services/onboardingJornadaService.ts:166-171 grava `tarefas_onboarding` sem `validateTablePayload`, que a main adicionou nos dois call sites (origin/main:src/pages/OnboardingPage.tsx:41-48 e origin/main:src/components/admissoes/OnboardingPageContent.tsx:38-46). Perder isso e perder a validacao de payload no unico write do onboarding. Segundo ponto: remover a aba Onboarding de Admissoes antes de /onboarding ter paridade deixaria o RH sem a tela.

**Evidência.** A main tem a MESMA tela duplicada em dois lugares: origin/main:src/pages/OnboardingPage.tsx:21-56 e origin/main:src/components/admissoes/OnboardingPageContent.tsx:15-53 repetem query (`admissoes` + `tarefas:tarefas_onboarding(*)`, chave ['onboarding-list']) e mutation de concluir tarefa, palavra por palavra. A muri centraliza isso em origin/muri:src/services/onboardingJornadaService.ts (supabase real, tabelas reais, resolve `tarefas_onboarding.responsavel_id` -> `profiles.nome`, ordenacao deterministica) consumido por origin/muri:src/hooks/useJornadaOnboarding.ts:50-67. O mock e so um ramo com guarda de env (`isAdmissoesMockEnabled` em origin/muri:src/mocks/admissoesMock.ts:156-158 exige DEV + VITE_ADMISSOES_MOCK=true), removivel sem tocar no caminho real.

**Plano.** 1) Trazer onboardingJornadaService.ts e useJornadaOnboarding.ts; depende de onboardingComum.ts/onboardingDerivacoes.ts (grupo "Regua de dominio"). 2) Em onboardingJornadaService.ts:166-171 envolver o update com `validateTablePayload('tarefas_onboarding', { concluida: true, concluida_em: ... }, 'onboardingJornadaService:tarefas_onboarding')`, importando de '@/schemas/validate' como a main faz. 3) Em useJornadaOnboarding.ts apagar o import de '@/mocks/admissoesMock' e os ramos `if (isAdmissoesMockEnabled())` (:52, :64, :81-84, :119-121, :136) e a funcao `kitDoMock`, deixando so o caminho real; apagar tambem o export `jornadaEmModoDemonstracao` e seu uso na pagina. 4) Trazer OnboardingCard.tsx, OnboardingDetalheDialog.tsx e a nova src/pages/OnboardingPage.tsx de origin/muri (deps `@/components/ui/filter-chip`, `sliding-indicator`, `app-pagination`, `cascade-motion` ja existem na main). 5) So DEPOIS de abrir /onboarding e confirmar no navegador que lista, filtra, abre o detalhe e conclui tarefa: remover a aba "onboarding" de src/pages/AdmissoesPage.tsx e o arquivo OnboardingPageContent.tsx, e acrescentar no cabecalho de Admissoes o botao "Jornada de Onboarding" (origin/muri:src/pages/AdmissoesPage.tsx:181-195). 6) Trazer os testes origin/muri:src/pages/**tests**/OnboardingJornada.test.tsx e OnboardingParidade.test.tsx. 7) typecheck + lint:ci + test.

<details><summary>Arquivos (5)</summary>

- `src/components/admissoes/OnboardingCard.tsx`
- `src/components/admissoes/OnboardingDetalheDialog.tsx`
- `src/pages/OnboardingPage.tsx`
- `src/services/onboardingJornadaService.ts`
- `src/hooks/useJornadaOnboarding.ts`

</details>

## Gestao de Kits de Onboarding

`RECUPERAR` · esforço medio · 2 arquivos

**Valor para o negócio.** Funcionalidade que hoje simplesmente nao existe no produto: cadastrar e editar kits de equipamentos/acessos por perfil, com filtro por status e itens detalhados. Zero risco de regressao porque nao substitui nada.

**Risco de regressão.** Nenhuma perda para a main. Ressalva de honestidade: o seletor de imagem do kit nao persiste - origin/muri:src/components/admissoes/KitOnboardingDialog.tsx:13-16 e o `KitOnboardingInput.imagem_url` do service declaram que a coluna nao existe e que o campo e ignorado na gravacao. Entregar assim significa uma imagem que desaparece ao recarregar.

**Evidência.** `git grep -ln onboarding_kits origin/main -- src` retorna apenas src/integrations/supabase/types.ts e src/schemas/tableColumns.ts: a tabela existe no banco (origin/main:src/integrations/supabase/types.ts:13452-13478, com empresa_id) e NENHUMA tela da main a usa. A muri a opera de verdade em origin/muri:src/services/onboardingJornadaService.ts (COLUNAS_KIT = 'id, nome, itens, ativo, created_at') via useCriarKit/useAtualizarKit.

**Plano.** 1) Entra junto com o grupo "Jornada de Onboarding" (os dois componentes sao montados por src/pages/OnboardingPage.tsx:78,82 e dependem de useKits/useCriarKit/useAtualizarKit do mesmo service) - nao faz sentido isolado. 2) Copiar GestaoKits.tsx e KitOnboardingDialog.tsx de origin/muri. 3) Decidir uma das duas com o dono: remover a area de imagem do dialogo (resolve em ~20 linhas, nada de meia-funcionalidade), ou abrir tarefa separada de migration + Storage para persistir `imagem_url`. Nao mergear com a imagem sem persistencia silenciosa. 4) Trazer o teste origin/muri:src/components/**tests**/KitOnboardingDialog.test.tsx. 5) typecheck + lint:ci + test.

<details><summary>Arquivos (2)</summary>

- `src/components/admissoes/GestaoKits.tsx`
- `src/components/admissoes/KitOnboardingDialog.tsx`

</details>

## NovaAdmissaoDialog: modo controlado e edicao

`RECUPERAR_COM_MERGE` · esforço medio · 1 arquivos

**Valor para o negócio.** Habilita "+ Adicionar candidato" no rodape das colunas do kanban e o botao "Editar" dentro do modal de detalhe, sem um segundo caminho de escrita. E pre-requisito dos grupos Kanban e DetalhesAdmissaoDialog.

**Risco de regressão.** Se o arquivo da muri for copiado inteiro, o formulario de admissao para de coletar nome da mae, data de nascimento e sexo - exatamente os dados cadastrais que o evento S-2200 exige. O RH passaria a cadastrar admissao incompleta sem aviso.

**Evidência.** Ganho: origin/muri:src/components/admissoes/NovaAdmissaoDialog.tsx passa a aceitar `admissao` (modo edicao, gravando por `useAdmissoes().atualizar`), `open`/`onOpenChange` (modo controlado, sem trigger proprio) e `onSaved`. Perda: `git show origin/muri:src/components/admissoes/NovaAdmissaoDialog.tsx \| grep -c 'nome_mae\|data_nascimento\|sexo'` = 0, contra origin/main:src/components/admissoes/NovaAdmissaoDialog.tsx:43,69,83 que capturam `nome_mae`, `data_nascimento` e `sexo` - colunas reais (origin/main:src/integrations/supabase/types.ts:176,185,190).

**Plano.** 1) NAO substituir o arquivo. Partir do arquivo da main e aplicar so o que e ganho: (a) trocar Dialog/DialogTrigger por DialogPrimitive + as variants de '@/components/ui/cascade-motion' (identico nas duas pontas); (b) adicionar as props `admissao`, `open`, `onOpenChange`, `onSaved` e o `formDe()` de origin/muri:...:50-62; (c) adicionar o ramo `if (editando) await atualizar({ id: admissao.id, data: dados })`; (d) adicionar `opcoesDepartamento` para departamento fora da lista fixa. 2) MANTER os tres campos `data_nascimento`, `nome_mae`, `sexo` no form, no payload de criacao e no `formDe()`. 3) Conferir que o trigger default continua renderizando quando `open` nao e passado (chamada atual em origin/main:src/pages/AdmissoesPage.tsx:165). 4) typecheck + lint:ci + `npm run test -- NovaAdmissao`.

<details><summary>Arquivos (1)</summary>

- `src/components/admissoes/NovaAdmissaoDialog.tsx`

</details>

## DetalhesAdmissaoDialog redesenhado (painel unico)

`RECUPERAR_COM_MERGE` · esforço alto · 1 arquivos

**Valor para o negócio.** Modal de 70KB contra 23KB da main: timeline de etapas com datas reais, painel unico com Dados/Documentos/eSocial/Historico, "Ir para acao" que rola ate a secao da proxima pendencia, validar/rejeitar documento e cancelar admissao no mesmo lugar. Reduz o numero de cliques do analista de RH no dia a dia.

**Risco de regressão.** Copiado como esta, quebra a transmissao do S-2200 - a correcao de 31/10 da main seria revertida e o evento voltaria a falhar sempre no lookup de esocial_eventos. Tambem perde a invalidacao de ['esocial-eventos'] (origin/main:...:119).

**Evidência.** origin/muri:src/components/admissoes/DetalhesAdmissaoDialog.tsx:629 faz `enviarEvento({ eventoId: a.id, empresaId: empresaAtual.id })` - manda o id da ADMISSAO como id do evento. origin/main:src/components/admissoes/DetalhesAdmissaoDialog.tsx:108-116 documenta esse exato bug e o conserto: "claim_admission_esocial_event cria/reutiliza o evento S-2200 vinculado a admissao e devolve o evento_id real... O botao antigo enviava admissao.id como eventoId e o lookup em esocial_eventos falhava sempre", e chama `contratacaoService.transmitirESocial(admissao.id, empresaAtual.id)`.

**Plano.** 1) Copiar o arquivo de origin/muri; depende de admissoesComum.ts/admissoesDerivacoes.ts (grupo "Regua de dominio") e do modo controlado de NovaAdmissaoDialog (o botao Editar). 2) Substituir `useESocial()` (:504) e `handleTransmitir` (:626-630) pelo bloco da main: estado `enviandoESocial`, `await contratacaoService.transmitirESocial(a.id, empresaAtual.id)`, toast 'Evento S-2200 transmitido e confirmado.', e `invalidateQueries` de ['admissoes'] E ['esocial-eventos'], mais o invalidate de ['admissoes'] no catch (origin/main:...:106-126). 3) Conferir que o segundo call site continua compilando: origin/main:src/pages/AssinaturasPage.tsx:29 importa esse mesmo modal - manter a assinatura `{ admissao, open, onOpenChange }`. 4) Rodar `npm run test -- DetalhesAdmissaoDialog` (o teste existe nas duas pontas) e abrir a tela para transmitir um S-2200 de teste antes de mergear.

<details><summary>Arquivos (1)</summary>

- `src/components/admissoes/DetalhesAdmissaoDialog.tsx`

</details>

## Casca da AdmissoesPage (abas com estado e atalho para a Jornada)

`RECUPERAR_COM_MERGE` · esforço medio · 1 arquivos

**Valor para o negócio.** Sem o `activeTab` controlado, os botoes "Resolver agora" dos modais do dashboard nao tem destino e a animacao de entrada do kanban nao dispara. E a costura que faz os grupos 2, 3 e 4 funcionarem como uma tela so.

**Risco de regressão.** Copiar a pagina da muri reverte o envio de e-mail pre-admissao da main (PR de 13/11) e introduz um erro de runtime garantido no envio por WhatsApp.

**Evidência.** Ganho: origin/muri:src/pages/AdmissoesPage.tsx usa `const [activeTab, setActiveTab] = useState('dashboard')` (necessario para `onAbrirAba` do dashboard e para `isActive` do kanban), guarda `admissaoDoModal` separado de `selectedAdmissao` para o modal animar a saida, e poe um botao "Jornada de Onboarding" no cabecalho. Perdas a evitar: :137 da o toast de sucesso sem enviar e-mail; :158 faz `if (!tokenDataRes.ok) throw new Error(tokenDataRes.error.message)` sobre um retorno que NAO e Result - origin/muri:src/services/contratacaoService.ts:125-149 devolve a linha crua (`Promise<any>`), logo `.ok` e undefined e o caminho WhatsApp estoura sempre; :34-35 importa `AnimatedDossieTabs`, que nao existe na main (`git ls-tree origin/main -- src/components/colaboradores/AnimatedDossieTabs.tsx` vazio).

**Plano.** 1) NAO substituir o arquivo. Partir do arquivo da main e aplicar so: (a) `const [activeTab, setActiveTab] = useState('dashboard')` e passar `value={activeTab} onValueChange={setActiveTab}` ao `<Tabs>`, mantendo a `TabsList` atual da main (origin/main:...:168-187) - nao importar AnimatedDossieTabs, que e item da area de Colaboradores; (b) o estado `admissaoDoModal` e o `key={admissaoDoModal?.id ?? 'sem-admissao'}` no DetalhesAdmissaoDialog; (c) o botao "Jornada de Onboarding" com `navigate('/onboarding')` no `actions` do PageLayout. 2) Manter `handleEnviarLink` e `handleEnviarWhatsApp` da main INTACTOS; nao trazer `isMockId` nem o `tokenDataRes.ok`. 3) A remocao da aba "onboarding" e da aba "auditoria" placeholder sai nos grupos 5 e 10 respectivamente, nao aqui. 4) Trazer origin/muri:src/pages/**tests**/AdmissoesConsolidacao.test.tsx adaptado as abas que de fato existirem ao final. 5) typecheck + lint:ci + test.

<details><summary>Arquivos (1)</summary>

- `src/pages/AdmissoesPage.tsx`

</details>

## Trilha de Auditoria de Admissoes

`RECUPERAR_COM_MERGE` · esforço alto · 3 arquivos

**Valor para o negócio.** Trilha de auditoria do processo admissional dentro do proprio modulo (quem fez o que, quando, em que etapa, com protocolo do eSocial), com busca, filtros e resumo - em vez de empurrar o usuario para o log global.

**Risco de regressão.** Entrar como esta troca um link honesto por uma tabela bonita e permanentemente vazia em producao. Alem disso auditoriaComum.ts:24 e auditoriaDerivacoes.ts:22 importam os tipos `StatusAuditoria`/`EtapaAdmissao` de '@/mocks/admissoesMock', arrastando o arquivo de mock para a main.

**Evidência.** origin/muri:src/components/admissoes/AuditoriaAdmissoesContent.tsx:408: `const eventos = useMemo(() => (isAdmissoesMockEnabled() ? getMockAuditoria() : []), [])` - fora do modo demonstracao a lista e SEMPRE vazia. Sao 54KB de tela sem fonte de dado em producao. A main tem fonte real nao usada por essa area: origin/main:src/services/auditoriaService.ts:63-86 (`listarTrilha({ empresa_id, tabelas, registro_id, limite })` sobre audit_log). A aba de auditoria da main hoje e um card que manda o usuario para /auditoria (origin/main:src/pages/AdmissoesPage.tsx:353-370).

**Plano.** Grupo de MENOR prioridade: so vale com adaptador. 1) Copiar os tres arquivos e mover as definicoes `export type StatusAuditoria = 'sucesso' \| 'pendente' \| 'falha'` e `EtapaAdmissao` (origin/muri:src/mocks/admissoesMock.ts:46-60) para dentro de auditoriaComum.ts, apagando os imports de '@/mocks/admissoesMock'. 2) Escrever o adaptador em um service novo (ex.: src/services/auditoriaAdmissoesService.ts) que chame `auditoriaService.listarTrilha({ empresa_id: empresaAtual.id, tabelas: ['admissoes','tarefas_onboarding','admissao_tokens'], limite: 200 })` e projete cada registro no formato que a tela consome (hoje `MockAuditoriaAdmissao`: data_hora, candidato, cargo, departamento, acao, etapa, evento_esocial, protocolo, status, responsavel, detalhe). Os campos candidato/cargo/departamento saem de um join com `admissoes` pelo registro_id; `responsavel_cargo` e `detalhe` nao existem no audit_log - decidir com o dono se saem da coluna ou ficam derivados da acao. 3) Substituir a linha 408 pela leitura via React Query desse service, com estados de loading/erro/vazio reais. 4) So depois trocar o card placeholder da aba auditoria em src/pages/AdmissoesPage.tsx:353-370. 5) Se o dono nao quiser pagar o adaptador, o veredito vira OBSOLETO: nao mergear a tela vazia.

<details><summary>Arquivos (3)</summary>

- `src/components/admissoes/AuditoriaAdmissoesContent.tsx`
- `src/components/admissoes/auditoriaComum.ts`
- `src/components/admissoes/auditoriaDerivacoes.ts`

</details>

## Ajuste de tom do checklist e da assinatura (cosmetico)

`RECUPERAR` · esforço baixo · 2 arquivos

**Valor para o negócio.** Vermelho legivel no tema escuro no checklist de documentos (o `--destructive` do tema fica com contraste baixo sobre o navy) e peso de fonte alinhado ao resto do produto.

**Risco de regressão.** Nenhum - sem logica, sem props, e o token de cor ja esta na main.

**Evidência.** `git diff origin/main origin/muri -- src/components/admissao/` contem apenas: `font-bold` -> `font-medium` e `destructive` -> `destructive-vivid` no AdmissaoChecklist, e `font-bold` -> `font-medium` no SignaturePad. Nenhuma linha de logica muda. O token ja existe na main: origin/main:src/index.css:28 (`--destructive-vivid: 0 72% 51%`) e :128 (dark, `0 84% 60%`).

**Plano.** 1) Aplicar so as substituicoes de classe: no AdmissaoChecklist trocar `destructive` por `destructive-vivid` nas 5 ocorrencias de cor de erro e `font-bold` por `font-medium` nos 4 rotulos; no SignaturePad trocar `font-bold` por `font-medium` no selo "Assinatura valida". 2) NAO copiar os arquivos inteiros: a versao da muri do SignaturePad colapsou o `<Button variant="ghost" ...>` numa linha acima de 120 colunas, o que reprova no `lint:ci` (printWidth 120 no .prettierrc, identico nas duas pontas). 3) `npx prettier --check` nos dois arquivos + `npm run lint:ci`. 4) Pode viajar de carona na PR de qualquer outro grupo desta area.

<details><summary>Arquivos (2)</summary>

- `src/components/admissao/AdmissaoChecklist.tsx`
- `src/components/admissao/SignaturePad.tsx`

</details>

## Descartado nesta área

- **useAdmissoes e contratacaoService da muri** (`OBSOLETO`) — origin/muri:src/hooks/useAdmissoes.ts:15 usa `useQuery<any[]>` e `mutationFn: (data: any)`, contra os tipos de origin/main:src/hooks/useAdmissoes.ts:2,13,23 (`Tables<'admissoes'>`, `Insertable`, `Updatable`). origin/muri:src/services/contratacaoService.ts:125-149 declara `Promise<any>` e insere em `admissao_tokens` sem validacao, contra origin/main:src/services/contratacaoService.ts:168-192, que tipa `Promise<Tables<'admissao_tokens'>>` e envolve o payload em `validateTablePayload('admissao_tokens', ..., 'contratacaoService:admissao_tokens')`. A muri tambem nao tem `enviarEmailLinkCandidato`, que e o que a main usa para o e-mail pre-admissao.
- **Ruido de formatacao em componentes de UI compartilhados** (`OBSOLETO`) — `git diff origin/main origin/muri -- src/components/ui/sliding-indicator.tsx src/components/ui/filter-chip.tsx`: no filter-chip, uma linha em branco no fim do arquivo; no sliding-indicator, a chamada `cn(...)` quebrada em tres linhas com virgula final. O .prettierrc das duas pontas tem `"trailingComma": "es5"`, que proibe essa virgula.

## Perda se a área for descartada inteira

Se esta area for descartada inteira, o RH fica com: (1) uma Gestao de Candidatos que e grade de cards sem filtro util, sem ordenacao e sem paginacao - inoperavel acima de algumas dezenas de admissoes (origin/main:src/pages/AdmissoesPage.tsx:211-350); (2) um dashboard de admissoes com 4 contadores e dois graficos, sem funil por etapa, sem lista de acoes prioritarias e sem painel de SLA/atraso, isto e, sem a tela que diz o que precisa de acao hoje; (3) a tabela public.onboarding_kits continua existindo no banco com ZERO consumidor no codigo (`git grep -ln onboarding_kits origin/main -- src` so acha types.ts e tableColumns.ts) - o cadastro de kits de equipamento/acesso simplesmente nao existe no produto; (4) a mesma tela de onboarding permanece duplicada palavra por palavra em src/pages/OnboardingPage.tsx e src/components/admissoes/OnboardingPageContent.tsx, com o dobro do custo de manutencao e divergindo na primeira correcao que for feita em so uma delas; (5) `tarefas_onboarding.responsavel_id` continua sem nunca ser traduzido em nome de pessoa em nenhuma tela; (6) a aba Auditoria de Admissoes continua sendo um card que empurra o usuario para o log global. Nada disso e perda de dado nem de regra de negocio - e perda de usabilidade e de uma funcionalidade inteira (kits). Em contrapartida, e igualmente importante NAO trazer esta area no atacado: tres correcoes funcionais da main de outubro/novembro (criacao do colaborador ao concluir admissao no kanban, id correto do evento no S-2200, e-mail pre-admissao com fallback honesto) seriam revertidas, o que seria regressao de verdade, com efeito legal no eSocial.
