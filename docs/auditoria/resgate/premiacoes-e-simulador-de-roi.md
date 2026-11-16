# Premiacoes e simulador de ROI

A main tem o miolo funcional certo (grava campanha, aprova pagamento, salva cenario de ROI, exporta com trilha LGPD e barra quem nao e RH/admin), mas a tela ainda e a antiga: quatro cartoes, uma tabela simples de campanhas, um quadro de aprovacao em colunas e uma trilha de auditoria em tabela crua. A muri tem o Hub inteiro redesenhado nas quatro abas (Campanhas, Pagamentos, Simulador ROI, Auditoria) com toda a regra de apresentacao extraida em 4 modulos de funcoes puras e ~1.900 linhas de teste que a main nao tem. O conflito e de data: a muri foi escrita em outubro e nao tem as correcoes funcionais que a main recebeu em 12 e 13 de novembro (#485 e #511), entao o caminho e trazer a casca nova da muri por cima do miolo corrigido da main, nunca o contrario.

| decisão             | esforço | arq. | grupo                                                                                                                        |
| ------------------- | ------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| JA_EM_MAIN          | baixo   | 5    | Correcoes funcionais de novembro no miolo de Premiacoes (nada a recuperar da muri)                                           |
| RECUPERAR_COM_MERGE | alto    | 9    | Aba Campanhas: motor puro + tabela + lateral + dialogo de detalhes + cartao de KPI (exige reescrever a pagina sobre a main)  |
| RECUPERAR_COM_MERGE | alto    | 8    | Aba Pagamentos completa (fluxo, KPIs financeiros, tabela, lateral, dialogos) — substitui o quadro RewardsApprovalHub         |
| RECUPERAR_COM_MERGE | alto    | 9    | Aba Auditoria em timeline (central de eventos com categorias, filtros, agrupamento e dialogo de detalhe) + bateria de testes |
| RECUPERAR_COM_MERGE | alto    | 6    | Simulador de ROI redesenhado (4 regioes, 4 visoes analiticas, comparacao de 2 cenarios) sobre o motor extraido               |
| RECUPERAR_COM_MERGE | baixo   | 1    | Moldura em cascata do dialogo de nova campanha (so a casca visual do CampaignWizard)                                         |
| RECUPERAR           | baixo   | 1    | Mock visual do Hub de Premiacoes (modo demonstracao, so em dev)                                                              |
| OBSOLETO            | baixo   | 2    | Sobras do merge-base que a main ja removeu de proposito (painel com filtros ficticios e sincronizacao de folha falsa)        |

## Aba Campanhas: motor puro + tabela + lateral + dialogo de detalhes + cartao de KPI (exige reescrever a pagina sobre a main)

`RECUPERAR_COM_MERGE` · esforço alto · 9 arquivos

**Valor para o negócio.** A aba Campanhas deixa de ser uma lista e passa a ser um painel operavel: busca, filtro por status e periodo, ordenacao, paginacao, pendencias reais ('o que esta travado e onde resolver') e atividade recente da trilha de auditoria.

**Risco de regressão.** A pagina da muri (src/pages/PremiacoesPage.tsx) nao tem NADA disto que a main tem, e sobrescreve-la crua derruba 5 testes e 4 funcionalidades: `hasRole('admin')\|\|hasRole('rh')` (main:54-55) que esconde as acoes de rascunho de quem nao e RH; `registrarAcessoPII` na exportacao (main:164) exigido pela onda LGPD; a exportacao que de fato baixa arquivo via `exportPontoCSV`/`exportPontoPDF` (main:169-171) — a muri so chama `exportarRelatorio` com toast e nao gera arquivo; `PERIODO_SEM_DATA` (main:97) que torna visivel o pagamento sem data; e as mutations `lancarRascunhoCampanha`/`excluirRascunhoCampanha` com AlertDialog de confirmacao (main:121-131,654-663). O dropdown da tabela da muri so oferece 'Ver pagamentos' e 'Exportar' (CampanhaTabela.tsx:404-409), nao tem onde pendurar Lancar/Excluir rascunho. A muri tambem perde o rodape '<N> colaboradores premiados' (main stats.colaboradoresPremiados, so status 'pago'), que o teste src/pages/**tests**/PremiacoesPage.test.tsx:69 verifica literalmente.

**Evidência.** premiacoesComum.ts tem 742 linhas, 46 exports, zero React e zero I/O, com as regras documentadas e amarradas ao schema real (cabecalho linhas 11-28: status restrito a rascunho\|ativo\|suspenso\|finalizado da migration 20260520131308; divisao por zero devolve null). Tem teste proprio: src/components/**tests**/PremiacoesComum.test.ts (431 linhas), ausente na main. A tabela e paginada/ordenavel/filtravel (CampanhaTabela.tsx:58-68, 468-516) contra a lista simples da main. Unica dependencia externa que falta na main: src/lib/avatarTons.ts (30 linhas, funcao pura `tomDoAvatar`), usada so por CampanhaTabela.tsx — todas as outras (ui/animated-tabs, ui/cascade-dialog, ui/entrada-cards, ui/app-pagination, dashboard/MetricCard, avaliacao/chipFiltroComum, lib/motionMode) ja existem na main, verificado com `git cat-file -e origin/main:<path>`.

**Plano.** 1) Copiar da muri, sem alterar: premiacoesComum.ts, premiacoesEntrada.ts, IndicadorPremiacoes.tsx, CampanhaTabela.tsx, CampanhaLateral.tsx, CampanhaDetalhesDialog.tsx, src/lib/avatarTons.ts, src/components/**tests**/PremiacoesComum.test.ts. 2) Reescrever src/pages/PremiacoesPage.tsx partindo da versao da MAIN (nao da muri): manter os imports/linhas 36-46 da main (premiacoesService + PERIODO_SEM_DATA, useAuth, formatDate/formatDateTime, todayLocalISO, exportPontoCSV/PDF, registrarAcessoPII) e manter intactos `podeGerirCampanhas`, `periodosDisponiveis`/`periodoEfetivo`, `handleExport` completo, as mutations `lancarRascunho`/`excluirRascunho` e o AlertDialog de exclusao. 3) Trocar so a CAMADA VISUAL: TabsList -> AnimatedTabsList/AnimatedTabsTrigger com o array ABAS e CLASSE_ABA da muri (muri:78-105), e o bloco dos 4 Cards de KPI -> <Indicador> alimentado por `montarMetricas`/`contarPorStatus`/`calcularVariacaoMensal` de premiacoesComum. 4) No KPI 'Campanhas Ativas', manter o rodape `${stats.colaboradoresPremiados} colaboradores premiados` com a conta da main (Set de colaborador_id com status==='pago'). 5) Trocar a tabela pelo par CampanhaTabela + CampanhaLateral + CampanhaDetalhesDialog, e ACRESCENTAR ao DropdownMenu de CampanhaTabela.tsx (apos a linha 409) dois itens novos — 'Lancar campanha' e 'Excluir rascunho' — visiveis so quando `linha.campanha.status === 'rascunho'` e so quando a prop nova `podeGerir` for true, ligados a callbacks `onLancarRascunho(id)`/`onExcluirRascunho(id)` passados pela pagina. 6) NAO copiar `handleSyncFolha` (ver grupo OBSOLETO). 7) Rodar `npx vitest run src/pages/__tests__/PremiacoesPage.test.tsx src/components/__tests__/PremiacoesComum.test.ts` e exigir os 5 casos existentes verdes (variacao negativa/positiva, '2 colaboradores premiados', Lancar, Excluir com confirmacao, 'sem papel RH/admin nao mostra as acoes do rascunho'), depois `npm run typecheck` e `npm run lint:ci`.

<details><summary>Arquivos (9)</summary>

- `src/components/premiacoes/premiacoesComum.ts`
- `src/components/premiacoes/premiacoesEntrada.ts`
- `src/components/premiacoes/IndicadorPremiacoes.tsx`
- `src/components/premiacoes/CampanhaTabela.tsx`
- `src/components/premiacoes/CampanhaLateral.tsx`
- `src/components/premiacoes/CampanhaDetalhesDialog.tsx`
- `src/lib/avatarTons.ts`
- `src/components/__tests__/PremiacoesComum.test.ts`
- `src/pages/PremiacoesPage.tsx`

</details>

## Aba Pagamentos completa (fluxo, KPIs financeiros, tabela, lateral, dialogos) — substitui o quadro RewardsApprovalHub

`RECUPERAR_COM_MERGE` · esforço alto · 8 arquivos

**Valor para o negócio.** A aba Pagamentos passa a ter o fluxo horizontal das 5 etapas com contadores, 4 KPIs financeiros (aprovado, aguardando, divergencias em R$, pago no periodo), tabela filtravel/paginada, aprovacao em LOTE e conciliacao com folha num dialogo com valor e justificativa. Hoje a main tem so colunas de cards por etapa.

**Risco de regressão.** Se os 8 arquivos entrarem como estao: erro de typecheck imediato em PagamentosTab.tsx:224 (metodo inexistente) e, se alguem 'resolver' recriando `autoConciliarComFolha`, volta o botao Auto que sempre dava erro ao usuario. Se a aba Pagamentos passar a renderizar PagamentosTab, o RewardsApprovalHub fica sem nenhum importador (orfao) e o teste src/components/**tests**/RewardsApprovalHub.test.tsx continua importando-o — foi exatamente o estado quebrado em que a muri ficou: lá o componente nao existe (`git cat-file -e origin/muri:src/components/premiacoes/RewardsApprovalHub.tsx` falha) e o teste ainda o importa na linha 36, ou seja a suite da muri esta vermelha.

**Evidência.** pagamentosComum.ts (643 linhas, 42 exports, puro) preserva a maquina de estados exata: `proximoStatusPagamento` em pagamentosComum.ts:580-588 devolve o MESMO mapa do RewardsApprovalHub da main (calculado->revisando->aprovado_gestor->aprovado_rh->aprovado_financeiro, cf. main RewardsApprovalHub.tsx:154-159), e acrescenta `podeRejeitarPagamento` (594-596), `podeConciliarPagamento` (599-600) e `STATUS_REINICIO_PAGAMENTO` (591). PagamentosTab.tsx chama os mesmos servicos que a main ainda tem (`atualizarStatusPagamento` em :190 e :304, `reconciliarFolha` em :210) e acrescenta aprovacao em lote (:298-304). Tem teste proprio: src/components/**tests**/PagamentosComum.test.ts (347 linhas), ausente na main. PROBLEMA UNICO: PagamentosTab.tsx:224 chama `premiacoesService.autoConciliarComFolha`, metodo que a main DELETOU — `git show origin/main:src/services/premiacoesService.ts \| grep autoConciliar` nao retorna nada, enquanto na muri existe em premiacoesService.ts:130. Ele sempre falhou: na linha final (muri premiacoesService.ts:154) faz `this.reconciliarFolha(pagamentoId, valorEncontrado, "Conciliacao automatica via integracao eSocial/Folha")`, passando a justificativa na posicao do 3o parametro, que e `empresaId` (assinatura em muri premiacoesService.ts:83), e o filtro `.eq('campanha.empresa_id', <texto>)` nunca acha linha. Foi exatamente isso que o commit fc7669973 (#485, 2026-11-12) removeu: 'tira o botao Auto que sempre falhava'.

**Plano.** Depende do grupo da aba Campanhas (usa os tipos PagamentoHub/CampanhaHub/AuditoriaHub de premiacoesComum e a pagina reescrita). 1) Copiar os 8 arquivos da muri. 2) Em PagamentosTab.tsx REMOVER a mutation `autoConciliar` (linhas 221-227 na versao da muri), remover o ramo `else if (tipo === 'auto-conciliar') autoConciliar.mutate(pagamento.id)` (linha 253), remover 'auto-conciliar' da uniao de tipo no parametro de `executarAcao` (linha 251) e tirar o item 'Auto'/'Auto-conciliar' do menu de acoes da tabela (grep por 'auto' em PagamentosTabela.tsx e pagamentosComum.ts e apagar a entrada correspondente da lista de acoes). Corrigir tambem as mencoes a `autoConciliarComFolha` nos cabecalhos de PagamentosTab.tsx:20 e PagamentosDialogs.tsx:7. NAO recriar o metodo no servico. 3) Na pagina, trocar `<RewardsApprovalHub pagamentos={pagamentos} />` (main:449) por `<PagamentosTab pagamentos={pagamentos as PagamentoHub[]} auditoria={auditoria as AuditoriaHub[]} campanhas={campanhas as CampanhaHub[]} onNavegar={irParaAba} />`, mantendo no mesmo TabsContent o bloco do seletor de periodo real e os botoes CSV/PDF da main (main:460-480) ligados ao `handleExport` da main. 4) Como PagamentosTab cobre tudo que o hub fazia (mesma cadeia + rejeitar + reiniciar + conciliar + lote) e o hub fica orfao, apagar NO MESMO PR src/components/premiacoes/RewardsApprovalHub.tsx e src/components/**tests**/RewardsApprovalHub.test.tsx, movendo antes o tipo `PagamentoComColaborador` (exportado pelo hub) para src/components/premiacoes/premiacoesComum.ts ou para o servico, e conferindo com `git grep -l 'RewardsApprovalHub\\|PagamentoComColaborador' -- src e2e` que nao resta importador. Esse apagamento retira uma tela existente: confirmar com o dono antes de mergear. 5) Rodar `npx vitest run src/components/__tests__/PagamentosComum.test.ts src/pages/__tests__/PremiacoesPage.test.tsx` + `npm run typecheck` + `npm run lint:ci`.

<details><summary>Arquivos (8)</summary>

- `src/components/premiacoes/pagamentosComum.ts`
- `src/components/premiacoes/PagamentosTab.tsx`
- `src/components/premiacoes/PagamentosFluxo.tsx`
- `src/components/premiacoes/PagamentosKpis.tsx`
- `src/components/premiacoes/PagamentosTabela.tsx`
- `src/components/premiacoes/PagamentosLateral.tsx`
- `src/components/premiacoes/PagamentosDialogs.tsx`
- `src/components/__tests__/PagamentosComum.test.ts`

</details>

## Aba Auditoria em timeline (central de eventos com categorias, filtros, agrupamento e dialogo de detalhe) + bateria de testes

`RECUPERAR_COM_MERGE` · esforço alto · 9 arquivos

**Valor para o negócio.** Auditoria deixa de ser uma tabela de linhas e passa a ser uma central navegavel: 'o que mudou, quem mudou, de quanto para quanto', filtravel por categoria e periodo, com detalhe por evento e exportacao CSV/PDF. E a aba que o dono usa quando precisa justificar um pagamento.

**Risco de regressão.** Dois pontos. (a) `onExportar` nao e implementado pelo componente; se a pagina ligar esse callback no `handleExport` da muri, a exportacao volta a so emitir toast sem baixar arquivo e sem registrar acesso a dado pessoal — tem de ser ligado ao `handleExport` da MAIN (exportPontoCSV/exportPontoPDF + registrarAcessoPII, main:143-183). (b) O spec e2e depende de `VITE_PREMIACOES_MOCK=true` (comentario no proprio arquivo) e so passa com o grupo do mock visual; sem ele a suite Playwright fica vermelha. (c) AuditoriaTab.tsx:33 importa `useAuth` de '@/contexts/AuthContext' enquanto a pagina da main usa '@/hooks/useAuth' — conferir qual e o caminho valido na main antes de copiar.

**Evidência.** auditoriaComum.ts (602 linhas, 31 exports, puro) declara explicitamente que nao inventa dado: 'valores e objetos sao resolvidos SOMENTE quando existem nos snapshots ou nos pagamentos/campanhas ja carregados... campos ausentes continuam ausentes' (cabecalho linhas 5-12). AuditoriaTab.tsx e 100% dirigido por props (interface em AuditoriaTab.tsx:78-86: auditoria, pagamentos, campanhas, carregando, erro, onTentarNovamente, onExportar) — nao faz I/O proprio, logo a exportacao fica com a implementacao da pagina. Tem 7 categorias reais (campanhas, pagamentos, regras, conciliacao, integracoes, aprovacoes) com filtro, busca, periodo e paginacao (AuditoriaTab.tsx:738,797,448-482). Traz 4 arquivos de teste (~870 linhas) e 1 spec Playwright que a main nao tem — todos verificados ausentes na main com `git cat-file -e origin/main:<path>`. Hoje a main mostra so uma tabela crua (origin/main:src/pages/PremiacoesPage.tsx, TabsContent 'auditoria', cabecalho 'Trilha de Auditoria de Premiacoes' com <th> Usuario/Acao).

**Plano.** Depende do grupo da aba Campanhas (importa AuditoriaHub/CampanhaHub/PagamentoHub de premiacoesComum) e do grupo do mock visual (so para o spec e2e). 1) Copiar os 4 arquivos de src/components/premiacoes/ e os 4 testes unitarios; copiar o spec e2e somente junto com o mock. NAO copiar src/components/**tests**/AuditoriaChips.test.tsx nem AuditoriaDerivacoes.test.tsx — eles testam '@/components/avaliacao/*' (verificado nos imports), sao de outra area. 2) Conferir `git cat-file -e origin/main:src/contexts/AuthContext.tsx`; se nao existir, trocar o import de AuditoriaTab.tsx:33 por `import { useAuth } from '@/hooks/useAuth'` mantendo o uso de `user` na linha 503. 3) Na pagina, substituir o TabsContent 'auditoria' inteiro da main por `<AuditoriaTab auditoria={auditoria as AuditoriaHub[]} pagamentos={pagamentos as PagamentoHub[]} campanhas={campanhas as CampanhaHub[]} carregando={loadAuditoria} erro={erroAuditoria} onTentarNovamente={recarregarAuditoria} onExportar={handleExport} />`, acrescentando `isError` e `refetch` ao useQuery de auditoria da main (main:74-77) e usando o `handleExport` da MAIN sem alteracao. 4) Rodar `npx vitest run src/components/__tests__/AuditoriaComum.test.ts src/components/__tests__/AuditoriaTab.test.tsx src/components/__tests__/AuditoriaEventoDialog.test.tsx src/components/__tests__/AuditoriaAnimacao.test.tsx` + typecheck + lint:ci; o spec e2e so depois do mock.

<details><summary>Arquivos (9)</summary>

- `src/components/premiacoes/auditoriaComum.ts`
- `src/components/premiacoes/auditoriaEntrada.ts`
- `src/components/premiacoes/AuditoriaTab.tsx`
- `src/components/premiacoes/AuditoriaEventoDialog.tsx`
- `src/components/__tests__/AuditoriaComum.test.ts`
- `src/components/__tests__/AuditoriaTab.test.tsx`
- `src/components/__tests__/AuditoriaEventoDialog.test.tsx`
- `src/components/__tests__/AuditoriaAnimacao.test.tsx`
- `e2e/authenticated/premiacoes-auditoria.spec.ts`

</details>

## Simulador de ROI redesenhado (4 regioes, 4 visoes analiticas, comparacao de 2 cenarios) sobre o motor extraido

`RECUPERAR_COM_MERGE` · esforço alto · 6 arquivos

**Valor para o negócio.** O dono passa a conseguir comparar dois cenarios de premiacao lado a lado, digitar o valor exato de cada parametro (nao so arrastar o slider) e ver o impacto por quatro angulos, incluindo resultado liquido (economia menos payout), que a main nem mostra.

**Risco de regressão.** Tres pontos concretos. (a) Trocar o arquivo crua apaga Copiar e Excluir snapshot, implementados na main em novembro, e com eles o unico caminho para limpar a lista de cenarios. (b) RewardsSimulator.tsx:1100 passa `cenario: Record<string, unknown>` para `salvarCenarioROI`, que na main exige `CenarioROIInput` (premiacoesService.ts:18-28) e ainda valida por Zod (`validateInput(cenarioRoiInputSchema, ...)`): sem tipar, da erro de typecheck no TS strict. (c) RewardsSimulator.tsx:93-107 redeclara um `CenarioRoi` local com `configuracoes` de campos obrigatorios, enquanto a main ja exporta `CenarioROI` com `CenarioROIConfig` de campos OPCIONAIS (premiacoesService.ts:30-47) — atribuir um ao outro nao compila, e o `s.name \|\| s.nome` de RewardsSimulator.tsx:169 nao existe no tipo da main (a coluna e `nome`).

**Evidência.** O simulador da muri tem 1.952 linhas contra 384 da main, e extrai o calculo para simuladorRoiComum.ts (145 linhas, puro) que declara as formulas preservadas e as premissas explicitas (cabecalho linhas 9-26: payout, custo de reposicao 3 salarios x 15%, economia, ROI, resultado liquido) e promete nao inventar projecao ('Evolucao temporal usa SOMENTE dados reais: cada cenario salvo e um ponto na data de criacao, e o ultimo ponto e a configuracao atual'). Os cinco parametros e os limites dos sliders sao identicos aos da main (LIMITES em RewardsSimulator.tsx:131-137 vs os sliders da main: employees max 1000 step 10, avgSalary 1500-30000 step 500, bonusPercent max 100, performanceLevel max 150 step 5, retentionImpact max 20 step 0.5). Ganhos reais: comparacao lado a lado de dois cenarios (ComparacaoCenarios.tsx, 98 linhas, com `alternarComparado` limitando a 2 em RewardsSimulator.tsx), card de parametro com edicao manual alem do slider (ScenarioParameterCard.tsx, 282 linhas) e 4 visoes (financeira\|retencao\|temporal\|colaborador). Tem teste proprio: src/components/**tests**/SimuladorRoiComum.test.ts (90 linhas), ausente na main. PERDA DECLARADA pelo proprio autor em RewardsSimulator.tsx:22-23: 'os botoes Copiar e Excluir, que nao tinham implementacao (nao foram recriados como fachada)' — eram stubs no merge-base, mas a main os IMPLEMENTOU (grupo JA_EM_MAIN): `deleteMutation` sobre `premiacoesService.excluirCenariosROI` e o botao de copia chamando `saveMutation` com `buildCenarioInput`.

**Plano.** 1) Copiar simuladorRoiComum.ts, simuladorEntrada.ts, ScenarioParameterCard.tsx, ComparacaoCenarios.tsx e src/components/**tests**/SimuladorRoiComum.test.ts sem alterar. 2) Copiar RewardsSimulator.tsx da muri e aplicar 4 ajustes: (i) apagar a interface local `CenarioRoi` (linhas 93-107) e passar a importar `import { premiacoesService, type CenarioROI, type CenarioROIInput } from '@/services/premiacoesService'`, usando `CenarioROI` em todos os pontos onde estava `CenarioRoi` (useQuery da linha 1087, `aplicarCenario`, `cenariosSelecionados`, `valorDoCenario`); (ii) simplificar `nomeDoCenario` (linha 169) para `(s: CenarioROI) => s.nome ?? 'Cenario'` e usar `?? 0` ao ler `s.configuracoes.*` e `s.resultados.*`, que sao opcionais no tipo da main; (iii) tipar a mutation da linha 1100 como `mutationFn: (cenario: CenarioROIInput) => ...` e manter o objeto de `saveScenario` (linhas 1184-1194), que ja tem exatamente os 9 campos de CenarioROIInput; (iv) RE-ADICIONAR Copiar e Excluir snapshot, portando da main (origin/main:src/components/premiacoes/RewardsSimulator.tsx) o helper `buildCenarioInput`, a `deleteMutation` sobre `premiacoesService.excluirCenariosROI` e o handler de copia, ligados ao DropdownMenu/`MoreVertical` que a secao 'Cenarios salvos' da muri ja desenha — nao deixar nenhum botao sem handler. 3) Manter o token de sessao `dp-premiacoes-roi-kpi-acesso` que a pagina publica (`selecionarAba`, muri PremiacoesPage.tsx:128-138) e que o simulador le (CHAVE_ACESSO_KPI, RewardsSimulator.tsx:160-161), senao a animacao de entrada dos KPIs nunca roda. 4) Rodar `npx vitest run src/components/__tests__/SimuladorRoiComum.test.ts` + `npm run typecheck` + `npm run lint:ci`.

<details><summary>Arquivos (6)</summary>

- `src/components/premiacoes/simuladorRoiComum.ts`
- `src/components/premiacoes/simuladorEntrada.ts`
- `src/components/premiacoes/ScenarioParameterCard.tsx`
- `src/components/premiacoes/ComparacaoCenarios.tsx`
- `src/components/premiacoes/RewardsSimulator.tsx`
- `src/components/__tests__/SimuladorRoiComum.test.ts`

</details>

## Moldura em cascata do dialogo de nova campanha (so a casca visual do CampaignWizard)

`RECUPERAR_COM_MERGE` · esforço baixo · 1 arquivos

**Valor para o negócio.** O dialogo de nova campanha passa a abrir com a mesma coreografia das outras janelas do sistema (padrao 'Pendencias'), em vez de ser o unico popup com animacao diferente.

**Risco de regressão.** Copiar o arquivo da muri inteiro reintroduz os 3 bugs do merge-base ja corrigidos na main: regra gravada com `nome`/`condicao_metrica` (colunas que nao existem; `titulo` e obrigatorio), 'Salvar Rascunho' publicando como ativa, e ausencia de validacao/guard de clique duplo.

**Evidência.** `git diff 5ddbe25 origin/muri -- src/components/premiacoes/CampaignWizard.tsx` tem 29 insercoes / 9 remocoes e e inteiramente cosmetico: troca `Dialog`+`DialogContent` por `CascadeDialogFrame` com `blocks={3}` e envolve cabecalho/corpo/rodape em `motion.div variants={cascadeItemVariants}`, mais `font-bold`->`font-medium` e o guard de mock. Nenhuma mudanca de dado. As duas dependencias existem na main: `git cat-file -e origin/main:src/components/ui/cascade-dialog.tsx` e `:src/components/ui/cascade-motion.ts` passam, e framer-motion esta em origin/main:package.json:128.

**Plano.** NAO copiar o arquivo. Partir do CampaignWizard.tsx da MAIN e aplicar apenas a troca de moldura: substituir os imports `Dialog, DialogContent` por `import { CascadeDialogFrame } from '@/components/ui/cascade-dialog'` + `import { cascadeItemVariants } from '@/components/ui/cascade-motion'` + `import { motion } from 'framer-motion'`; trocar `<Dialog open={isOpen} onOpenChange={(open)=>!open && fechar()}><DialogContent className="sm:max-w-[600px] rounded-2xl">` por `<CascadeDialogFrame open={isOpen} onOpenChange={(aberto)=>!aberto && fechar()} blocks={3} className="sm:max-w-[600px]">`; envolver os tres blocos existentes (DialogHeader, a div `grid gap-6 py-4`, DialogFooter) cada um em `<motion.div variants={cascadeItemVariants}>`; fechar com `</CascadeDialogFrame>`. Preservar sem tocar: `handleSave('rascunho'\|'ativo')`, as validacoes, o estado `saving`, `fechar()` e os campos `titulo`/`configuracao` das regras. Verificar que o dialogo ainda fecha pelo ESC/veu e que 'Salvar Rascunho' grava status 'rascunho' (log do insert ou leitura da campanha criada).

<details><summary>Arquivos (1)</summary>

- `src/components/premiacoes/CampaignWizard.tsx`

</details>

## Mock visual do Hub de Premiacoes (modo demonstracao, so em dev)

`RECUPERAR` · esforço baixo · 1 arquivos

**Valor para o negócio.** Permite o dono abrir a tela cheia de dados e aprovar o layout sem empresa configurada e sem gravar nada — e o que o spec e2e de auditoria usa para rodar.

**Risco de regressão.** Nenhum em producao (gate de dev + env var). Só nao deve entrar sozinho: sem os grupos das abas, nada o importa e ele fica morto. O cabecalho do arquivo cita 'RewardsApprovalHub.tsx' na lista de lugares marcados com MOCK VISUAL, o que ficara incorreto se o hub for apagado no grupo da aba Pagamentos — corrigir o comentario no mesmo PR.

**Evidência.** 275 linhas, com gate de duas condicoes na propria funcao: `isPremiacoesMockEnabled()` exige `import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_PREMIACOES_MOCK === 'true'` (premiacoesMock.ts, logo apos o cabecalho) — nunca liga em producao nem no Vitest. Toda escrita e barrada por `bloquearEscritaPremiacoes()` e a exportacao e simulada por `simularExportacaoPremiacoes()` (cabecalho, bloco de aviso). Depende so de `MOCK_COLABORADORES, MOCK_EMPRESA` de './colaboradoresMock', que existem na main (origin/main:src/mocks/colaboradoresMock.ts:42 e :101, com `salario_base` em 21 ocorrencias e ids mock-1..mock-13; o mock de premiacoes referencia mock-1..mock-12).

**Plano.** Entra junto com os grupos das abas (Campanhas/Pagamentos/Auditoria/Simulador), nao antes. 1) Copiar src/mocks/premiacoesMock.ts da muri. 2) Conferir com `git show origin/main:src/mocks/colaboradoresMock.ts \| grep -n "MOCK_EMPRESA\\|MOCK_COLABORADORES"` que os dois exports existem (ja verificado: linhas 42 e 101). 3) Manter os pontos de uso tal como a muri os escreveu: os `useQuery` da pagina (`getMockCampanhas()/getMockPagamentos()/getMockAuditoriaPremiacoes() ?? await premiacoesService...` e `enabled: !!empresaAtual?.id \|\| mockAtivo`), `getMockCenariosRoi()` no simulador, e `bloquearEscritaPremiacoes()` nas mutations de PagamentosTab e do CampaignWizard — mas NAO trocar o `handleExport` da main pelo `simularExportacaoPremiacoes` fora do modo mock: guardar a simulacao atras do `if (totalFicticio !== undefined) return;` e deixar o caminho real (exportPontoCSV/PDF + registrarAcessoPII) intacto. 4) Atualizar o cabecalho do arquivo (lista 'PARA REMOVER DE VEZ') para refletir os arquivos que de fato ficarem marcados. 5) Confirmar que `npm run test` passa sem a env var (o mock fica desligado por `MODE !== 'test'`).

<details><summary>Arquivos (1)</summary>

- `src/mocks/premiacoesMock.ts`

</details>

## Descartado nesta área

- **Correcoes funcionais de novembro no miolo de Premiacoes (nada a recuperar da muri)** (`JA_EM_MAIN`) — `git diff 5ddbe25 origin/muri -- src/services/premiacoesService.ts` sai VAZIO (a muri nunca tocou o servico) enquanto `git diff 5ddbe25 origin/main` no mesmo arquivo da 283 insercoes / 106 remocoes. Schema: src/integrations/supabase/types.ts:15873-15882 (main) mostra que `premiacoes_regras` tem `titulo` (obrigatorio) e `configuracao` (Json) e NAO tem `nome` nem `condicao_metrica`; a muri ainda grava os campos errados em src/components/premiacoes/CampaignWizard.tsx:37,120-121,131,156. Rascunho: muri CampaignWizard.tsx:173-174 faz `setFormData({...formData, status:'rascunho'}); handleSave();` — handleSave le o estado velho e grava 'ativo'; a main passa o status por argumento (`handleSave('rascunho')`). Cenario de ROI: a main le `s.nome` (coluna real) e implementou Copiar/Excluir snapshot, que no merge-base eram `onClick={() => {}}` e botao sem handler.
- **Sobras do merge-base que a main ja removeu de proposito (painel com filtros ficticios e sincronizacao de folha falsa)** (`OBSOLETO`) — PainelAuditoriaRoi.tsx tem os filtros HARDCODED que a main substituiu por dados reais: `<option>Maio 2026</option>` e `<option>Abril 2026</option>` (linhas 73-74), `<option>Matriz</option>` e `<option>Filial Sul</option>` (85-86) e `<option>Meta > 100%</option>` (97-98). A main deriva as opcoes de periodo dos proprios pagamentos (`periodosDisponiveis` a partir de `data_pagamento`, com `PERIODO_SEM_DATA` para os sem data, src/pages/PremiacoesPage.tsx:83-99) e eliminou unidade/faixa de meta — correcoes dos commits ec4565d9e (#182, 'filtros reais no export e rotulos corretos no PDF') e 25bbce60b (#184, "opcao 'Sem data' no export"). Alem disso, na pagina da muri sobrevive `handleSyncFolha` (muri src/pages/PremiacoesPage.tsx:221-229), que so faz `setTimeout` e anuncia `toast.success('Sincronizacao concluida!', { description: '12 registros foram enviados para a folha de Maio/2026' })` sem chamar nada — sucesso falso. Na main nao existe (`grep SyncFolha` em origin/main:src/pages/PremiacoesPage.tsx nao retorna nada) e no merge-base existia (5ddbe25:src/pages/PremiacoesPage.tsx:81), ou seja a main removeu de proposito (commits 2acfce56c #210 e fc7669973 #485, 'telas que mostravam sucesso falso'). Na propria muri ele e codigo morto: definido na 221 e nunca chamado (as duas chamadas de exportacao, linhas 609 e 652, apontam para `handleExport`), o que da erro de variavel nao usada no lint:ci da main.

## Perda se a área for descartada inteira

Se esta area for descartada inteira, a main continua com o Hub de Premiacoes funcionando mas com a tela antiga, e perde: (1) toda a regra de apresentacao extraida em 4 modulos de funcoes puras — premiacoesComum 742 linhas, pagamentosComum 643, auditoriaComum 602, simuladorRoiComum 145 — que hoje esta espalhada dentro do JSX da pagina; (2) ~1.900 linhas de teste que a main nao tem (PremiacoesComum 431, PagamentosComum 347, AuditoriaComum 203, AuditoriaTab 218, AuditoriaEventoDialog 196, AuditoriaAnimacao 256, SimuladorRoiComum 90 e 1 spec Playwright de 66), verificadas ausentes na main arquivo por arquivo; (3) na pratica, 4 abas inteiras de operacao: busca/filtro/ordenacao/paginacao e painel de pendencias em Campanhas, fluxo de 5 etapas com contadores + 4 KPIs financeiros + aprovacao em LOTE + conciliacao com justificativa em Pagamentos, central de auditoria navegavel por categoria e periodo com detalhe por evento em lugar da tabela crua, e comparacao de dois cenarios lado a lado com entrada manual de parametros e resultado liquido no Simulador de ROI. Nada disso exige mudanca de banco: os 24 arquivos chamam apenas metodos que a main ja tem (atualizarStatusPagamento, reconciliarFolha, criarCampanha, criarRegra, exportarRelatorio, listarCenariosROI, salvarCenarioROI); a unica chamada incompativel e autoConciliarComFolha, que a main apagou porque sempre falhava.
