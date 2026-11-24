# Recrutamento e selecao

A main tem a tela funcionando de verdade desde 12/11 (PR #477, commit 4fa4b7e3c): cria, edita e exclui vaga, inscreve candidato em vaga, valida os dados antes de gravar e esconde e-mail/telefone de quem nao e admin/RH. A muri, parada em 26/10, tem uma tela muito melhor de usar — kanban com arrastar-e-soltar, busca, painel de vagas e de candidatos com filtros, e uma aba Analytics inteira (funil, evolucao mensal, origens, tempo por etapa, pontos de atencao) — mais 1.900 linhas de teste automatizado. Mas a muri nasceu antes das duas correcoes de novembro e de outubro: nela nao existe editar vaga, nao existe inscrever candidato, e o e-mail e o telefone do candidato aparecem abertos para qualquer usuario. O caminho e trazer a casca da muri por cima do motor da main, nunca no lugar dele.

| decisão             | esforço | arq. | grupo                                                                         |
| ------------------- | ------- | ---- | ----------------------------------------------------------------------------- |
| RECUPERAR           | baixo   | 3    | G0 — Infra de entrada do kanban (pre-requisito de G1)                         |
| RECUPERAR_COM_MERGE | alto    | 10   | G1 — Nucleo do pipeline: kanban com arrastar-e-soltar e etapas compartilhadas |
| RECUPERAR           | medio   | 12   | G2 — Aba Analytics derivada dos dados reais                                   |
| RECUPERAR_COM_MERGE | medio   | 10   | G3 — Painel de Vagas com indicadores e filtros                                |
| RECUPERAR_COM_MERGE | alto    | 6    | G4 — Painel de Candidatos: tabela, filtros, selecao e paginacao               |
| RECUPERAR_COM_MERGE | medio   | 3    | G5 — Dossie do candidato: janela de detalhes e timeline honesta               |
| RECUPERAR_COM_MERGE | alto    | 1    | G6 — RecrutamentoPage.tsx: a orquestracao (ponto de colisao)                  |
| RECUPERAR           | baixo   | 1    | G7 — Mock visual de demonstracao do recrutamento                              |
| RECUPERAR_COM_MERGE | alto    | 2    | G8 — Testes e2e Playwright do pipeline                                        |
| JA_EM_MAIN          | baixo   | 3    | G9 — Servico, schemas e testes de servico do recrutamento                     |
| OBSOLETO            | baixo   | 1    | G10 — Pasta de trabalho tmp-recrutamento/                                     |

## G0 — Infra de entrada do kanban (pre-requisito de G1)

`RECUPERAR` · esforço baixo · 3 arquivos

**Valor para o negócio.** Sem este grupo o kanban da muri monta sem altura e sem a coreografia de entrada: colunas colapsadas, conteudo invisivel. E o alicerce, nao enfeite.

**Risco de regressão.** O arquivo entradaKanban.ts e compartilhado com a area de Admissoes (origin/muri:src/components/admissoes/KanbanColumn.tsx tambem o importa) e src/index.css e arquivo global de todas as areas. Se outro agente trouxer o mesmo bloco CSS na mesma janela, ha conflito de merge em src/index.css. Nenhum risco funcional: as regras sao todas prefixadas kanban-/kb- e nao existem na main, entao nao sobrescrevem nada.

**Evidência.** git ls-tree origin/main \| grep components/kanban -> NONE. PipelineColumn.tsx:23 importa useEntradaKanbanColuna de '@/components/kanban/entradaKanban'. Classes usadas por PipelineColumn (kanban-column-visual, kanban-lane-slot, kanban-em-entrada, kanban-coluna-concluida, kb-header, kb-gradient, kb-footer) so existem em origin/muri:src/index.css:693-812; git show origin/main:src/index.css \| grep kanban -> 0 resultados. main index.css = 331 linhas, muri = 944.

**Plano.** 1. Copiar integralmente src/components/kanban/entradaKanban.ts e src/components/kanban/**tests**/entradaKanban.test.ts de origin/muri (git show origin/muri:<path>); nao ha dependencia externa alem de react. 2. Anexar ao FINAL de src/index.css da main o bloco de origin/muri:src/index.css linhas 669 a 812 (comeca no comentario '/* ===== KANBAN (Admissoes) — ENTRADA DAS COLUNAS EM CSS PURO' e termina imediatamente antes de '/* ─── Compare cenarios'); inclui @keyframes kanban-column-grow/gradient-in/header-in/card-in/footer-in, as regras .kanban-* /.kb-* e a variante reduzida dentro do @media prefers-reduced-motion ja existente no bloco. NAO copiar o resto do index.css da muri. 3. Verificar: npm run typecheck e npm run test -- src/components/kanban. 4. Antes de abrir PR, checar PRs abertas tocando src/index.css (regra 3 do Fluxo Git) — e arquivo disputado.

<details><summary>Arquivos (3)</summary>

- `src/components/kanban/entradaKanban.ts`
- `src/components/kanban/__tests__/entradaKanban.test.ts`
- `src/index.css (bloco KANBAN, linhas 669-812 da muri)`

</details>

## G1 — Nucleo do pipeline: kanban com arrastar-e-soltar e etapas compartilhadas

`RECUPERAR_COM_MERGE` · esforço alto · 10 arquivos

**Valor para o negócio.** Mover candidato de etapa deixa de depender de um menu escondido no hover: arrasta-se o cartao entre as cinco colunas, com desfazer automatico se a gravacao falhar. Acessivel por teclado pelo menu 'Mover para' que continua existindo (PipelineCard.tsx:141).

**Risco de regressão.** (a) Os dois botoes de fachada (onSimular) entram em producao sem funcao — viola a regra de 'sem mock/hardcode' do AGENTS.md secao 3. (b) onContatar na muri vai para simularAcaoRecrutamento, enquanto a main abre mailto real (RecrutamentoPage.tsx:376-384): perda de uma acao que hoje funciona. (c) pipelineEtapas.ts:81 le cand.vaga?.requisitos, que o join da main nao traz (recrutamentoService.ts:106 seleciona apenas 'vaga:vagas(titulo, departamento)') — sem o enriquecimento no cliente as tags de habilidade nascem vazias.

**Evidência.** origin/main:src/pages/RecrutamentoPage.tsx:383-401 move etapa por um <Select> dentro de um bloco 'opacity-0 group-hover:opacity-100' — sem arraste e invisivel sem mouse. origin/muri:PipelineBoard.tsx:1-130 traz DndContext/DragOverlay (@dnd-kit/core, ja em origin/main:package.json 6.3.1), override otimista em etapasLocais e rollback no insucesso. pipelineDragDrop.ts:30-35 bloqueia arraste de status arquivado/rejeitado/cancelado. PipelineBoard.tsx:218 e 265, porem, chamam onSimular('adicionar candidato em ...') e onSimular('ver etapas arquivadas'), e origin/muri:src/mocks/recrutamentoMock.ts:485-489 mostra que simularAcaoRecrutamento retorna false e NAO faz nada quando o mock esta desligado — ou seja, dois botoes de fachada em producao.

**Plano.** 1. Copiar os 6 arquivos de codigo e os 3 de teste de origin/muri como estao. 2. Em src/types/recrutamento.ts aplicar o unico delta da muri: adicionar 'requisitos?: string \| null;' em VagaResumo (2 linhas) — NAO reverter o resto do arquivo, a main tem a versao mais nova do comentario. 3. NAO alterar recrutamentoService.listarCandidaturas: manter o join da main e resolver requisitos no cliente, exatamente como origin/muri:RecrutamentoPage.tsx faz no useMemo candidaturasPipeline (constroi requisitosPorVaga a partir da lista de vagas ja carregada). 4. Em PipelineBoard.tsx remover a prop onSimular e os dois controles de fachada: apagar o <footer> botao 'Ver etapas arquivadas' (linhas ~263-273) e trocar a prop onAdicionar da PipelineColumn (linha 218) por uma callback real onAdicionarCandidato(etapa) que a pagina liga ao fluxo criarCandidatura da main (ver G4); se o esforco nao couber, remover a prop onAdicionar tambem, nunca deixar o onSimular. 5. Em PipelineCard, manter onContatar, mas na pagina liga-lo ao mailto da main (window.location.href = `mailto:${email}`, desabilitado quando nao ha e-mail) em vez de simularAcaoRecrutamento. 6. Ajustar **tests**/PipelineBoard.test.tsx: o caso da linha 133 ('aciona adicionar candidato, arquivadas e contatar pelos controles existentes') cobre os controles removidos — reescrever para cobrir somente contatar e, se mantido, adicionar-candidato real. 7. Verificar: npm run typecheck, npm run lint:ci, npm run test -- src/components/recrutamento. Depende de G0.

<details><summary>Arquivos (10)</summary>

- `src/components/recrutamento/pipelineEtapas.ts`
- `src/components/recrutamento/pipelineDragDrop.ts`
- `src/components/recrutamento/pipelineVisual.ts`
- `src/components/recrutamento/PipelineBoard.tsx`
- `src/components/recrutamento/PipelineColumn.tsx`
- `src/components/recrutamento/PipelineCard.tsx`
- `src/components/recrutamento/__tests__/pipelineEtapas.test.ts`
- `src/components/recrutamento/__tests__/pipelineDragDrop.test.ts`
- `src/components/recrutamento/__tests__/PipelineBoard.test.tsx`
- `src/types/recrutamento.ts`

</details>

## G2 — Aba Analytics derivada dos dados reais

`RECUPERAR` · esforço medio · 12 arquivos

**Valor para o negócio.** O RH passa a ver funil por etapa com conversao, evolucao mes a mes, ranking de origem dos candidatos, tempo medio em cada etapa, alertas de vaga parada e taxa de aceitacao de proposta. Hoje a tela nao responde nenhuma dessas perguntas.

**Risco de regressão.** Nenhuma perda: e puramente aditivo sobre a aba que a main tem hoje. Um defeito de precisao a corrigir na integracao: analyticsComum.ts:455-463 calcula o 'tempo medio de contratacao' de created_at ate a data de referencia (o timestamp mais novo da base), nao ate a data da contratacao — para um contratado antigo o numero cresce indefinidamente.

**Evidência.** origin/main:src/pages/RecrutamentoPage.tsx:623-686 = a aba Analytics inteira da main: 4 cartoes de contagem e um grafico de barras feito com <div style={{height}}>. origin/muri:analyticsComum.ts tem 677 linhas de funcoes puras (construirFunil, construirEvolucao, construirOrigens, construirTempos, construirDesempenhoVagas, construirPontosDeAtencao, construirIndicadores, construirKpis) cobertas por 215 linhas de teste. Honestidade verificada: analyticsComum.ts:474/480/492 devolvem '—' quando a amostra e nula, e analyticsComum.ts:307 devolve dias: null sem amostra — nada e inventado. recharts ja esta em origin/main:package.json (^3.10.1).

**Plano.** 1. Copiar os 10 arquivos de codigo e os 2 de teste de origin/muri sem alteracao; todas as dependencias externas existem na main (verificado: AnimatedNumber em src/components/dashboard/AnimatedNumber.tsx:11, InfoTooltip em src/components/ui/info-tooltip.tsx:28, MotionCard/entradaCard em src/components/ui/entrada-cards.tsx:67/79, formatCurrency/formatNumber em src/utils/format.ts:118/142, tokens --chart-4/--chart-5/--aqua/destructive-vivid em src/index.css). 2. Corrigir construirIndicadores em analyticsComum.ts: para contratados, usar dataValida(candidatura.updated_at) ?? referencia como fim do intervalo, em vez da referencia global; atualizar o caso correspondente em **tests**/analyticsComum.test.ts. 3. Na pagina (G6), substituir o bloco 623-686 por <AnalyticsRecrutamento candidaturas={candidaturasTodas} vagas={vagas} candidatos={candidatos} />. Depende de G1 (analyticsComum importa ETAPAS de pipelineEtapas) e de G6 para ficar visivel.

<details><summary>Arquivos (12)</summary>

- `src/components/recrutamento/analyticsComum.ts`
- `src/components/recrutamento/AnalyticsRecrutamento.tsx`
- `src/components/recrutamento/AnalyticsPainel.tsx`
- `src/components/recrutamento/AnalyticsFunil.tsx`
- `src/components/recrutamento/AnalyticsEvolucao.tsx`
- `src/components/recrutamento/AnalyticsOrigens.tsx`
- `src/components/recrutamento/AnalyticsTempo.tsx`
- `src/components/recrutamento/AnalyticsAtencao.tsx`
- `src/components/recrutamento/AnalyticsVagas.tsx`
- `src/components/recrutamento/AnalyticsIndicadores.tsx`
- `src/components/recrutamento/__tests__/AnalyticsRecrutamento.test.tsx`
- `src/components/recrutamento/__tests__/analyticsComum.test.ts`

</details>

## G3 — Painel de Vagas com indicadores e filtros

`RECUPERAR_COM_MERGE` · esforço medio · 10 arquivos

**Valor para o negócio.** Vagas deixam de ser uma grade solta: 3 indicadores que funcionam como filtro rapido, status, tags de competencia com cor estavel por nome e estado vazio explicado.

**Risco de regressão.** (1) Perda da EDICAO de vaga, a entrega central do PR #477 — se o painel da muri entrar como esta, o dono perde a capacidade de corrigir titulo, departamento, modalidade, quantidade e requisitos de uma vaga publicada. (2) Perda da validacao de quantidade: a main calcula Number.parseInt e so habilita o botao com Number.isInteger(q) && q >= 1 (RecrutamentoPage.tsx:101-102), enquanto origin/muri:RecrutamentoPage.tsx usa Number(e.target.value), que manda 0 num campo vazio e e rejeitado por origin/main:src/schemas/recrutamento.ts:20 (quantidade: z.number().int().min(1)) — o salvar falharia sem explicacao. (3) O cartao 'Criar Nova Vaga' da grade foi removido na muri (VagasPainel.tsx:30); sobra apenas o botao do cabecalho.

**Evidência.** REGRESSAO CONFIRMADA: origin/main:src/pages/RecrutamentoPage.tsx:111-120 define abrirEdicaoVaga(vaga) e a linha 509 liga o botao 'Gerenciar Vaga' a ela, chamando recrutamentoService.atualizarVaga (linhas 131-134) — foi exatamente o que o PR #477 (4fa4b7e3c, 12/11, 'passa a criar, editar e excluir vagas') adicionou. Na muri, VagaCard.tsx:285 liga 'Gerenciar Vaga' a onGerenciar, e origin/muri:RecrutamentoPage.tsx wira onGerenciar para setSelectedVagaId + setActiveTab('pipeline'): NAO existe edicao de vaga na muri. Confirmacao de que a confirmacao de exclusao sobrevive: VagaCard.tsx:294-315 tem AlertDialog proprio. Campos lidos por vagasComum.ts (titulo, cargo, departamento, modalidade, status, data_abertura, data_encerramento, created_at) todos existem em origin/main:src/integrations/supabase/types.ts (bloco vagas).

**Plano.** 1. Copiar os 5 arquivos de codigo e os 5 de teste de origin/muri. 2. Em VagasPainelProps/VagaCardProps acrescentar uma prop onEditar: (vaga: VagaRow) => void. 3. Em VagaCard.tsx, adicionar um DropdownMenuItem 'Editar vaga' no menu contextual (ao lado dos atuais 'Ver analises' e 'Excluir vaga', linhas 156-177) chamando onEditar(vaga); manter 'Gerenciar Vaga' (linha 285) abrindo o Pipeline filtrado — sao acoes diferentes e as duas tem valor. 4. Na pagina (G6), ligar onEditar ao abrirEdicaoVaga da main, que ja preenche vagaForm e abre o mesmo Dialog de vaga; manter 100% do formulario e da validacao da main (VAGA_FORM_VAZIO, quantidadeVaga com parseInt, vagaFormValido, titulo de dialogo condicional 'Editar Vaga'/'Anunciar Nova Vaga', mutation salvarVaga que escolhe atualizarVaga ou criarVaga). 5. Descartar o formulario de vaga da muri (quantidade com Number(), sem validacao, sem edicao). 6. Acrescentar um caso em **tests**/VagaCard.test.tsx cobrindo o item 'Editar vaga'. 7. Verificar: npm run typecheck, npm run test -- src/components/recrutamento. Depende de G1 (vagasComum importa de pipelineEtapas).

<details><summary>Arquivos (10)</summary>

- `src/components/recrutamento/VagasPainel.tsx`
- `src/components/recrutamento/VagaCard.tsx`
- `src/components/recrutamento/vagasComum.ts`
- `src/components/recrutamento/vagasGradients.ts`
- `src/components/recrutamento/competenciasComum.ts`
- `src/components/recrutamento/__tests__/VagasPainel.test.tsx`
- `src/components/recrutamento/__tests__/VagaCard.test.tsx`
- `src/components/recrutamento/__tests__/vagasComum.test.ts`
- `src/components/recrutamento/__tests__/vagasGradients.test.ts`
- `src/components/recrutamento/__tests__/competenciasComum.test.ts`

</details>

## G4 — Painel de Candidatos: tabela, filtros, selecao e paginacao

`RECUPERAR_COM_MERGE` · esforço alto · 6 arquivos

**Valor para o negócio.** Filtros por situacao/vaga/origem, ordenacao por 6 critérios, selecao com agregados, paginacao e um estado de erro que oferece recarregar em vez de tela branca. A main hoje mostra uma tabela unica, sem filtro, sem paginacao e sem tratamento de erro.

**Risco de regressão.** Se o painel da muri substituir a aba da main: (1) candidatos sem candidatura somem do sistema (ninguem mais os ve nem consegue inscreve-los); (2) desaparece a unica porta de criacao de candidatura. Os dois juntos quebram o inicio do processo seletivo: so e possivel trabalhar quem ja estava inscrito.

**Evidência.** REGRESSAO CONFIRMADA, DUAS PONTAS: (a) origin/main:src/pages/RecrutamentoPage.tsx:566 itera 'candidatos.map((cand: CandidatoRow) => ...)' — a aba lista o CADASTRO de candidatos; origin/muri:CandidatosPainel.tsx:59-60 recebe 'candidaturas' e 'vagas', nunca candidatos, logo candidato sem nenhuma candidatura desaparece da tela. (b) O botao 'Adicionar' da linha (origin/main:RecrutamentoPage.tsx:601-614) abre o dialogo que chama adicionarAVaga -> recrutamentoService.criarCandidatura (linhas 156-166) e `git grep -n criarCandidatura origin/main -- src` devolve UMA unica chamada de UI: src/pages/RecrutamentoPage.tsx:158. Sem ela, nao existe nenhuma forma de inscrever candidato em vaga no sistema inteiro. Cobertura da muri verificada: CandidatosPainel.test.tsx tem 14 casos (contagens reais, filtros, selecao, paginacao, erro com 'tentar novamente'). PII: TabelaCandidatos nao tem coluna de contato (cabecalhos em TabelaCandidatos.tsx:99-108: Candidato, Vaga/Processo, Etapa atual, Experiencia, Pretensao, Avaliacao, Ultima atividade, Acoes), entao aqui nao ha exposicao nova.

**Plano.** 1. Copiar os 3 arquivos de codigo e os 3 de teste de origin/muri. 2. NAO substituir a aba 'Candidatos' da main pelo painel da muri; dividir a aba em duas sub-visoes: usar CandidatosPainel (candidaturas) como visao 'Em processo' e PRESERVAR, lado a lado, a listagem de candidatos do cadastro que a main tem hoje (RecrutamentoPage.tsx:544-620) com o botao 'Adicionar' e o Dialog 'Adicionar <nome> a uma vaga' (linhas 813-855) intactos, incluindo a mutation adicionarAVaga e o estado candidatoParaVaga/vagaDaCandidatura. Alternativa de menor diff: manter a aba da main como esta e registrar CandidatosPainel como quinta aba ('Processos'). 3. Opcao melhor, se couber no escopo: acrescentar a CandidatosPainel uma prop onInscrever + a lista candidatos, e disparar dali o mesmo Dialog da main — assim nada fica em duplicata. Decidir isto antes de codar; nao fazer os dois. 4. Conservar as mensagens de erro da main via safeErrorMessage (origin/main:RecrutamentoPage.tsx:161 usa safeErrorMessage(e, ...); a muri trocou por texto fixo). 5. Verificar: npm run typecheck, npm run test -- src/components/recrutamento, e manualmente que um candidato sem candidatura continua visivel e inscritivel. Depende de G1.

<details><summary>Arquivos (6)</summary>

- `src/components/recrutamento/CandidatosPainel.tsx`
- `src/components/recrutamento/TabelaCandidatos.tsx`
- `src/components/recrutamento/candidatosComum.ts`
- `src/components/recrutamento/__tests__/CandidatosPainel.test.tsx`
- `src/components/recrutamento/__tests__/candidatosComum.test.ts`
- `src/components/recrutamento/__tests__/candidatosFixture.ts`

</details>

## G5 — Dossie do candidato: janela de detalhes e timeline honesta

`RECUPERAR_COM_MERGE` · esforço medio · 3 arquivos

**Valor para o negócio.** Dossie em faixas, com etapa, nota, contato e historico na mesma tela, e um historico que nao finge ter dado que nao tem. Fecha sem descartar os dados, para a animacao de saida nao piscar.

**Risco de regressão.** Expor e-mail e telefone de candidato a usuario sem papel admin/rh — regressao direta do PR #173 e risco de LGPD. Secundario: CandidatoTimeline.tsx da muri importa getMockTimeline de '@/mocks/recrutamentoMock'; se G7 nao entrar, o import nao resolve e o build quebra.

**Evidência.** REGRESSAO DE LGPD CONFIRMADA: o commit 8e93c355a (05/10, 'PII mascarada/logada em 15+ pontos', PR #173) introduziu usePiiMask nesta pagina — o diff mostra '-{selectedCandidatura.candidato?.email}' virando '+pii.email(...)' e o mesmo para telefone. A muri saiu do merge-base em 30/07 e nunca recebeu esse commit: `git ls-tree origin/muri -- src/hooks/usePiiMask.ts` nao retorna nada (o arquivo nao existe na muri) e origin/muri:CandidatoDetalhesDialog.tsx:71-72 le candidato.email/telefone cru, exibindo-os em 153-164. origin/main:src/hooks/usePiiMask.ts:9 mostra a regra: so admin/rh veem PII completo. Melhoria real da muri na timeline: origin/main:CandidatoTimeline.tsx:120-122 imprime o rotulo fixo 'Entrevistador' sem nenhum dado por tras; a versao da muri so mostra o que o registro traz (funcoes texto()/notaValida() e o estado vazio compacto). O unico trabalho da main nesse arquivo desde o merge-base foi reformatacao e remocao de `any` (git diff 5ddbe25 origin/main -- CandidatoTimeline.tsx: nenhuma mudanca de comportamento).

**Plano.** 1. Copiar os 3 arquivos de origin/muri (CascadeDialogFrame existe em origin/main:src/components/ui/cascade-dialog.tsx:54 e cascadeItemVariants em src/components/ui/cascade-motion.ts:36 — verificado identico nas duas pontas). 2. OBRIGATORIO: em CandidatoDetalhesDialog.tsx importar usePiiMask de '@/hooks/usePiiMask', chamar const pii = usePiiMask() no corpo do componente e trocar as linhas 71-72 por const email = limpar(pii.email(exibida?.candidato?.email)) e const telefone = limpar(pii.phone(exibida?.candidato?.telefone)); nao alterar a renderizacao em 153-164. 3. Se G7 nao entrar: em CandidatoTimeline.tsx remover o import de getMockTimeline e as 2 linhas do inicio do queryFn que o consultam (marcadas 'MOCK VISUAL'); o restante do arquivo nao depende do mock. 4. Acrescentar um caso em **tests**/CandidatoDetalhesDialog.test.tsx que renderiza sem papel admin/rh e afirma que o e-mail aparece mascarado. 5. Verificar: npm run typecheck, npm run test -- src/components/recrutamento. Depende de G1 (importa etapaPorId/estiloAvatar/iniciaisDoNome de pipelineEtapas e tons de pipelineVisual).

<details><summary>Arquivos (3)</summary>

- `src/components/recrutamento/CandidatoDetalhesDialog.tsx`
- `src/components/recrutamento/CandidatoTimeline.tsx`
- `src/components/recrutamento/__tests__/CandidatoDetalhesDialog.test.tsx`

</details>

## G6 — RecrutamentoPage.tsx: a orquestracao (ponto de colisao)

`RECUPERAR_COM_MERGE` · esforço alto · 1 arquivos

**Valor para o negócio.** E a peca que faz G1-G5 aparecerem na tela. Sozinha nao entrega nada; sem ela, G1-G5 ficam codigo morto.

**Risco de regressão.** Substituir o arquivo da main pelo da muri apaga, de uma vez, as quatro entregas de novembro e outubro: editar vaga, inscrever candidato, mascarar PII e validar quantidade. E o falso positivo central desta area — o arquivo da muri parece mais limpo e e 332 linhas menor, mas foi escrito 17 dias antes do PR #477.

**Evidência.** As duas pontas reescreveram o mesmo arquivo: `git diff --stat 5ddbe25 origin/main -- src/pages/RecrutamentoPage.tsx` = 680 linhas alteradas (hoje 860 linhas); `git diff --stat 5ddbe25 origin/muri` = 804 linhas alteradas (hoje 528 linhas). A muri e MENOR porque delega aos componentes — nao porque faz menos; mas tambem nao faz: nela nao ha abrirEdicaoVaga, nao ha atualizarVaga, nao ha criarCandidatura, nao ha usePiiMask e nao ha safeErrorMessage. O que a muri adiciona e real: query separada 'candidaturas-todas' (para o filtro do kanban nao contaminar os KPIs das outras abas), busca com atalho Cmd/Ctrl+K, moverEtapa async que devolve false para o board desfazer o movimento otimista, e MotionConfig com MOTION_REDUCED_MODE (existe em origin/main:src/lib/motionMode.ts:58).

**Plano.** Partir do arquivo da MAIN e editar, nunca copiar o da muri. 1. PRESERVAR intactos: const pii = usePiiMask(); VAGA_FORM_VAZIO e todo o estado de vaga (vagaEditandoId, vagaForm, vagaParaExcluir); quantidadeVaga/vagaFormValido; abrirNovaVaga/abrirEdicaoVaga; as mutations salvarVaga, excluirVaga, adicionarAVaga, updateEtapa com safeErrorMessage; o Dialog de vaga com titulo condicional; o AlertDialog de exclusao; o Dialog 'Adicionar <nome> a uma vaga'; os estados candidatoParaVaga/vagaDaCandidatura. 2. ADICIONAR da muri: a query 'candidaturas-todas' (sem filtro de vaga, com isError/refetch) para alimentar Vagas/Candidatos/Analytics; os estados busca/buscaRef e o useEffect do atalho Cmd/Ctrl+K; a barra de ferramentas do pipeline (busca + filtro por vaga) renderizada so quando activeTab === 'pipeline'; o useMemo candidaturasPipeline que enriquece cand.vaga.requisitos a partir da lista de vagas e aplica filtrarCandidaturas; a funcao async moverEtapa que retorna boolean; o par selectedCandidatura + detalhesAbertos; <MotionConfig reducedMotion={MOTION_REDUCED_MODE}> e <EntradaPresenca> em lugar do AnimatePresence mode="wait". 3. SUBSTITUIR o corpo de cada TabsContent: pipeline -> <PipelineBoard candidaturas={candidaturasPipeline} isActive onAbrir onMoverEtapa onContatar={mailto real} />; vagas -> <VagasPainel ... onEditar={abrirEdicaoVaga} onExcluir={(v) => setVagaParaExcluir(v)} /> (passar pelo AlertDialog da main, nao excluir direto); candidatos -> conforme a decisao tomada em G4; analytics -> <AnalyticsRecrutamento candidaturas={candidaturasTodas} vagas={vagas} candidatos={candidatos} />. 4. Substituir o Dialog de detalhes inline (linhas 688-779 da main) por <CandidatoDetalhesDialog> e a logica de proximaEtapa por avancarEtapa. 5. Nao mexer em rota nem em menu: a rota /recrutamento ja existe nas duas pontas, entao npm run inventario:rotas nao e necessario. 6. Verificar: npm run typecheck, npm run lint:ci, npm run test, e manualmente os 6 fluxos: criar vaga, editar vaga, excluir vaga, inscrever candidato, arrastar cartao entre colunas, e abrir o dossie como usuario sem papel rh/admin (e-mail deve sair mascarado).

<details><summary>Arquivos (1)</summary>

- `src/pages/RecrutamentoPage.tsx`

</details>

## G7 — Mock visual de demonstracao do recrutamento

`RECUPERAR` · esforço baixo · 1 arquivos

**Valor para o negócio.** Permite ao dono ver a tela inteira funcionando (12 candidaturas nas 5 etapas, 5 vagas, 10 candidatos, timeline de todos) sem semear o banco de producao — foi com ela que o layout foi aprovado.

**Risco de regressão.** Nenhum em producao: o gate e duplo (build DEV + variavel de ambiente) e nunca liga em build de producao nem no Vitest. Risco real e outro: usar o mock como desculpa para deixar botao de fachada na tela (ver G1, simularAcaoRecrutamento). Nada em src/mocks/colaboradoresMock.ts deve ser trocado pela versao da muri (ela e 1.193 linhas MENOR que a da main — e outra area, nao mexer).

**Evidência.** Gate verificado linha a linha: origin/muri:src/mocks/recrutamentoMock.ts:51-53 exige import.meta.env.DEV && MODE !== 'test' && VITE_RECRUTAMENTO_MOCK === 'true'. TODA funcao de escrita confere o gate antes de agir: moverCandidaturaMock:362, avancarEtapaCandidaturaMock:386, publicarVagaMock:431, excluirVagaMock:464, getMockTimeline:322, simularAcaoRecrutamento:486. A main ja usa esse mesmo padrao: src/mocks/colaboradoresMock.ts:34 (isColaboradoresMockEnabled) e src/mocks/desempenhoMock.ts. A dependencia MOCK_EMPRESA existe na main em src/mocks/colaboradoresMock.ts:42.

**Plano.** 1. Copiar src/mocks/recrutamentoMock.ts de origin/muri sem alteracao; ele importa somente 'sonner' e MOCK_EMPRESA de './colaboradoresMock', ambos presentes na main. 2. Manter, na pagina e em CandidatoTimeline, apenas os ganchos de LEITURA (getMockVagas/getMockCandidaturas/getMockCandidatos/getMockTimeline) e de ESCRITA sobre registros do proprio mock (moverCandidaturaMock, avancarEtapaCandidaturaMock, publicarVagaMock, excluirVagaMock), cada um com o fallback para o recrutamentoService como na muri. 3. NAO importar simularAcaoRecrutamento em nenhum componente: ela e o que sustenta os botoes de fachada removidos em G1. 4. Documentar VITE_RECRUTAMENTO_MOCK onde as outras variaveis de mock estao documentadas. 5. Verificar: npm run test (o gate MODE !== 'test' precisa manter os testes imunes) e npm run build (o mock nao pode entrar no bundle de producao — conferir o orcamento de bundle do deploy.yml). Se este grupo for recusado, aplicar o passo 3 de G5 e remover os ganchos de mock de G6.

<details><summary>Arquivos (1)</summary>

- `src/mocks/recrutamentoMock.ts`

</details>

## G8 — Testes e2e Playwright do pipeline

`RECUPERAR_COM_MERGE` · esforço alto · 2 arquivos

**Valor para o negócio.** Codificam os criterios de aceite que o dono aprovou para o board: largura de coluna, colunas de mesma altura, rolagem horizontal da faixa com encadeamento para a pagina, cancelar arraste com Escape, e arraste por toque no mobile. E a unica cobertura desses criterios.

**Risco de regressão.** Soltar os dois arquivos em e2e/authenticated/ como estao: (a) entra no projeto 'authenticated' e fica vermelho ou instavel quando a base de teste nao tem candidatura; (b) muda etapa de candidaturas reais da base de teste a cada execucao; (c) a asserção de 272px quebra a cada ajuste de layout. ci.yml roda apenas npm run typecheck:e2e nos 10 checks obrigatorios, mas npm run test:e2e e o gate manual do dono e ficaria falho.

**Evidência.** origin/main:playwright.config.ts:72-73 define o projeto 'authenticated' com testMatch /authenticated\/.*\.spec\.ts/ — qualquer arquivo colocado nessa pasta entra automaticamente na suite. Os specs nao sao seguros nessa pasta: recrutamento-pipeline.spec.ts:26-33 exige '[data-candidato-card]' visivel e exatamente 5 '.kanban-coluna-concluida' antes de qualquer asserção (falha em base sem candidatura); a linha 124 afirma new Set(larguras) === new Set([272]) (geometria em pixel); o cabecalho declara 'contadores coerentes no modo demonstracao' (linha 14); e test.describe.configure({ mode: 'serial' }) com o comentario da linha 20 ('a ordem dos testes move cards de verdade') confirma que os testes GRAVAM mudanca de etapa — contra a sessao autenticada real.

**Plano.** 1. NAO colocar em e2e/authenticated/. Criar e2e/visual/ e registrar em playwright.config.ts um projeto novo 'visual' com testMatch /visual\/.*\.spec\.ts/, fora da lista que o gate executa por padrao (rodado sob demanda). 2. Em abrirPipeline, trocar o expect de '[data-candidato-card]' por uma checagem que chama test.skip() quando a base nao tem candidatura, em lugar de falhar. 3. Remover ou marcar com test.fixme as asserções que dependem de dado de demonstracao (contadores) e a de largura exata 272px — substituir por uma faixa (ex.: entre 260 e 290) para nao quebrar a cada ajuste. 4. Isolar os casos que GRAVAM: mover para um describe proprio, rodado so com a base de demonstracao (VITE_RECRUTAMENTO_MOCK=true, G7), nunca contra a base de teste compartilhada. 5. Garantir npm run typecheck:e2e verde. So faz sentido com G1 e G6 (os specs dependem de data-pipeline-board, data-pipeline-coluna, data-candidato-card, que vem de PipelineBoard/PipelineColumn/PipelineCard).

<details><summary>Arquivos (2)</summary>

- `e2e/authenticated/recrutamento-pipeline.spec.ts`
- `e2e/authenticated/recrutamento-pipeline-animacao.spec.ts`

</details>

## Descartado nesta área

- **G9 — Servico, schemas e testes de servico do recrutamento** (`JA_EM_MAIN`) — `git diff --stat 5ddbe25856a7c22ad7c80052f7536b5bc4e544b2 origin/muri -- src/services/recrutamentoService.ts src/services/__tests__/recrutamentoService.test.ts` devolve VAZIO: a muri nao tocou nenhum dos dois; sao identicos ao merge-base de 30/07. src/schemas/recrutamento.ts nao existe na muri (`git show origin/muri:src/schemas/recrutamento.ts \| wc -l` = 0) e tem 59 linhas na main. A main, por sua vez, avancou 133 linhas no servico e 175 no teste, acrescentando validateInput com zod em toda operacao, 'empresa_id obrigatorio para isolamento de tenant' em cada metodo e o tratamento do codigo 23505 ('Candidato ja inscrito nesta vaga', recrutamentoService.ts:126).
- **G10 — Pasta de trabalho tmp-recrutamento/** (`OBSOLETO`) — `git ls-tree -r -l origin/muri -- tmp-recrutamento` : 144 arquivos, 24.041.666 bytes (22,9 MB), compostos de capturas de tela (.png/.jpg), dois videos .webm e scripts ad-hoc de Playwright (ajuste.mjs, capturas.mjs, diag-_.mjs, validar-_.mjs, crop*.mjs). Nenhum arquivo de src/ ou e2e/ da muri os referencia: `git grep -l tmp-recrutamento origin/muri -- src e2e` nao retorna nada.

## Perda se a área for descartada inteira

Perde-se a unica parte do sistema onde o RH consegue trabalhar o processo seletivo visualmente: hoje a main tem um kanban que so move candidato por um select escondido no hover (RecrutamentoPage.tsx:383-401), nenhuma busca, e a aba Analytics e quatro contadores mais uma barra em div (linhas 623-686). A muri entrega arrastar-e-soltar com rollback, busca com atalho, 5 indicadores por painel, funil de conversao, tempo medio por etapa, alertas de vaga parada e taxa de aceitacao de proposta — todos derivados das linhas reais, sem numero chumbado. Tambem se perdem 1.903 linhas de teste unitario (14 arquivos) sobre codigo que a main hoje nao testa de forma alguma, e a timeline do dossie deixa de corrigir um texto falso que a main ainda exibe ("Entrevistador" fixo, sem dado, em CandidatoTimeline.tsx:120-122).
