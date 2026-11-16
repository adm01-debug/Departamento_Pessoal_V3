# Desligamentos, organograma e dashboards

A muri reconstruiu visualmente três áreas que na main ainda são telas simples: o Organograma ganhou busca que funciona de verdade (na main a caixa de busca existe mas não filtra nada), Desligamentos ganhou uma aba de Trilha de Auditoria rica e uma tela de Gestão com filtros e cards, e o Dashboard foi reorganizado em cards de uma única tela. Em troca, a muri parou em 26/out e não tem as correções funcionais que a main recebeu depois: o cálculo de rescisão com as modalidades da CLT (arts. 479/480, 487 §2º, 477 §8º), o filtro por empresa no briefing matinal, o mascaramento de CPF/e-mail exigido pela LGPD e o roteamento obrigatório pelo gateway do banco. Além disso, boa parte do trabalho da muri usa nomes de tipo de desligamento que não existem no banco de produção, o que faria gravação e gráficos falharem.

| decisão             | esforço | arq. | grupo                                                                   |
| ------------------- | ------- | ---- | ----------------------------------------------------------------------- |
| RECUPERAR_COM_MERGE | medio   | 12   | Organograma navegável (árvore + busca + expandir/recolher)              |
| RECUPERAR_COM_MERGE | alto    | 10   | Desligamentos: vocabulário, derivações puras, Gestão e faixa de atenção |
| RECUPERAR_COM_MERGE | alto    | 4    | Trilha de Auditoria de Desligamentos (painel completo)                  |
| RECUPERAR_COM_MERGE | alto    | 2    | Drawer de detalhes + checklist do desligamento                          |
| RECUPERAR_COM_MERGE | medio   | 8    | MetricCard e primitivos do dashboard (base compartilhada)               |
| RECUPERAR_COM_MERGE | alto    | 10   | Cards de composição do Dashboard (uma tela só)                          |
| OBSOLETO            | baixo   | 1    | AnalyticsSection — manter a da main                                     |
| OBSOLETO            | baixo   | 1    | MorningBriefing — manter a da main (vazamento entre empresas)           |
| OBSOLETO            | baixo   | 1    | EventTimeline — manter a da main (coluna inexistente)                   |
| OBSOLETO            | baixo   | 1    | Novo Desligamento — manter o da main, portar só a carga ao abrir        |
| RECUPERAR_COM_MERGE | alto    | 7    | Colaboradores: diretório em tabela/grade com KPIs e chips               |
| RECUPERAR           | baixo   | 1    | AnimatedDossieTabs (abas animadas do dossiê)                            |
| RECUPERAR_COM_MERGE | medio   | 1    | Diálogo de recontratação de colaborador                                 |

## Organograma navegável (árvore + busca + expandir/recolher)

`RECUPERAR_COM_MERGE` · esforço medio · 12 arquivos

**Valor para o negócio.** O RH passa a achar uma pessoa ou um departamento no organograma digitando o nome (hoje a caixa de busca não faz nada), vê quantos níveis a estrutura tem e abre/fecha ramos em vez de rolar a árvore inteira.

**Risco de regressão.** Se o EmployeeRow entrar como está, o e-mail corporativo de todo colaborador fica visível (e clicável) para qualquer usuário que abra o organograma, inclusive quem não tem permissão de ver PII — hoje a main bloqueia isso em OrganogramaNode.tsx:102. Se o `useOrganograma` da muri vier junto, volta-se à versão sem tipos (`const departamentosMap = new Map()`, `rootDepartamentos: any[]`, `.eq('status','ativo' as any)`) e com injeção de mock, quebrando o gate `audit:ratchet-any` do `ci:verify`.

**Evidência.** main `src/pages/OrganogramaPage.tsx`: `grep -n search` devolve só as linhas 15 (useState) e 78 (value do Input) — a busca não alimenta nenhum filtro; a árvore é `dados.map(node => <OrganogramaNode node={node} />)`. muri `src/pages/OrganogramaPage.tsx:41`: `const { nodes: filteredNodes, matchedIds } = useMemo(() => filterTree(nodes, search), ...)`. muri `src/lib/organogramaTree.ts` exporta countTree/maxDepth/collectAllIds/getDefaultExpandedIds/buildCascadeIndex/buildRevealWave/buildCollapseStages/filterTree/pluralize, com 307 linhas de teste em `src/lib/__tests__/organogramaTree.test.ts`. Nenhum arquivo do grupo importa `@/mocks` nem `supabaseBase` (grep confirmou zero ocorrências em src/components/organograma e src/lib/organogramaTree.ts). REGRESSÃO: main `src/components/organograma/OrganogramaNode.tsx:30,102` usa `const pii = usePiiMask()` e só mostra o mailto com `pii.canViewPii`; muri `src/components/organograma/EmployeeRow.tsx:40,42,46` renderiza `colaborador.email` e o `mailto:` sem nenhuma checagem.

**Plano.** 1) Copiar da muri, sem alterar: src/lib/organogramaTree.ts, src/lib/**tests**/organogramaTree.test.ts e os três módulos puros de animação (organogramaCascade.ts, organogramaReveal.ts, organogramaHeaderReveal.ts) — são constantes e matemática, sem import de dados; `cardVariants` que OrganogramaStats usa já é exportado em main src/components/dashboard/MetricCard.tsx. 2) Copiar OrganogramaTree.tsx, OrganogramaRevealBlock.tsx, DepartmentRow.tsx, OrganogramaStats.tsx, OrganogramaToolbar.tsx como estão. 3) Em EmployeeRow.tsx, antes de copiar: adicionar `import { usePiiMask } from '@/hooks/usePiiMask'`, `const pii = usePiiMask()` e envolver o bloco do e-mail (linhas 40-48) em `colaborador.email && pii.canViewPii ? (...) : <span />`, replicando a regra de main OrganogramaNode.tsx:102. 4) Substituir main src/components/organograma/OrganogramaNode.tsx pela versão da muri (ela delega as linhas para DepartmentRow/EmployeeRow). 5) NÃO trazer src/hooks/useOrganograma.ts da muri: manter o da main (tipado, com `OrganogramaNodeData`) e, em `OrgDepartamento`/`OrgColaborador` de organogramaTree.ts, conferir que `OrganogramaNodeData` da main é atribuível (id/nome/colaboradores/sub_departamentos existem; os campos extras de `Tables<'departamentos'>` não atrapalham). 6) Reescrever src/pages/OrganogramaPage.tsx com a versão da muri, trocando apenas `useOrganograma` para o da main e mantendo `SyncErrorState` + `Spinner` como já estão. 7) Trazer os testes irmãos da muri: src/components/**tests**/OrganogramaNode.test.tsx (atualizado), OrganogramaRevealBlock.test.tsx, OrganogramaStats.test.tsx, OrganogramaToolbar.test.tsx, OrganogramaHeaderReveal.test.tsx e src/pages/**tests**/OrganogramaPage.test.tsx. 8) Verificar: `npm run typecheck && npm run lint:ci && npx vitest run src/lib/__tests__/organogramaTree.test.ts src/components/__tests__/Organograma*.test.tsx src/pages/__tests__/OrganogramaPage.test.tsx` e abrir /organograma com um usuário sem permissão de PII para confirmar que o e-mail não aparece.

<details><summary>Arquivos (12)</summary>

- `src/lib/organogramaTree.ts`
- `src/lib/__tests__/organogramaTree.test.ts`
- `src/components/organograma/OrganogramaTree.tsx`
- `src/components/organograma/OrganogramaNode.tsx`
- `src/components/organograma/OrganogramaRevealBlock.tsx`
- `src/components/organograma/DepartmentRow.tsx`
- `src/components/organograma/EmployeeRow.tsx`
- `src/components/organograma/OrganogramaStats.tsx`
- `src/components/organograma/OrganogramaToolbar.tsx`
- `src/components/organograma/organogramaCascade.ts`
- `src/components/organograma/organogramaHeaderReveal.ts`
- `src/components/organograma/organogramaReveal.ts`

</details>

## Desligamentos: vocabulário, derivações puras, Gestão e faixa de atenção

`RECUPERAR_COM_MERGE` · esforço alto · 10 arquivos

**Valor para o negócio.** Desligamentos deixa de ser uma tabela plana: ganha filtros por status/tipo/departamento/período, próxima ação por etapa, faixa de atenção com o prazo legal de 10 dias do art. 477 e KPIs com tendência 30 dias vs. 30 anteriores. E o gráfico de turnover passa a contar o mês certo para quem foi desligado no dia 1º.

**Risco de regressão.** Trazido como está, o gráfico de turnover zera as faixas de Justa Causa, Acordo e Término de Contrato (os nomes não batem com o banco) e joga Sem Justa Causa em 'Outros'; os selos mostram o texto cru 'pago'; e todo desligamento já pago continua contado como 'em aberto' na faixa de atenção e nos KPIs, inflando a lista de pendências do RH para sempre.

**Evidência.** Enum real em produção (`supabase_db_list_enums`): `tipo_desligamento = [sem_justa_causa, justa_causa, pedido_demissao, acordo, fim_contrato, falecimento]`. muri `desligamentosComum.ts:90-96` (TIPO_LABELS) e `desligamentosDerivacoes.ts:285-291` (construirSerieMensal) usam `com_justa_causa`, `acordo_mutuo`, `termino_contrato` — nenhum existe no enum; `sem_justa_causa` cai no `default: ponto.outros += 1` (linha ~294), ou seja o tipo mais comum deixa de ter faixa própria no gráfico. main `TurnoverChart.tsx:37-40` ainda separa `sem_justa_causa` e usa `'justa_causa'` (valor correto). Status 'pago' é gravado em produção por main `src/services/rescisaoService.ts:341` (`dados_novos: { status: 'pago', etapa: 'finalizado' }`) e main `DesligamentoDetailSheet.tsx:207` já o trata; na muri `desligamentosComum.ts:66-86` (STATUS_LABELS/STATUS_BADGE) e `desligamentosDerivacoes.ts:139` (`STATUS_TERMINAIS = ['finalizado','concluido','cancelado']`) 'pago' não aparece. GANHO: main `TurnoverChart.tsx:33` faz `new Date(d.data_desligamento)` sobre coluna `date` (day-shift em UTC-3); muri `desligamentosDerivacoes.ts:276` usa `dataValida()`, que chama `parseDateLocalISO` para `YYYY-MM-DD`. `entradaCards.tsx` é reexport puro de `@/components/ui/entrada-cards`, que a main já tem com os 4 mesmos exports (linhas 67,75,79,94). GestaoDesligamentos.tsx não toca banco: só recebe callbacks (`interface GestaoDesligamentosProps` linha 521, `onExcluir` linha 526).

**Plano.** 1) Copiar desligamentosComum.ts e desligamentosDerivacoes.ts da muri e, antes de qualquer outra coisa, alinhar o vocabulário ao enum real: em TIPO_LABELS e TIPO_BADGE renomear as chaves `com_justa_causa`→`justa_causa`, `acordo_mutuo`→`acordo`, `termino_contrato`→`fim_contrato` e acrescentar `falecimento: 'Falecimento'` (classe neutra, igual a fim_contrato). 2) Em `construirSerieMensal` (desligamentosDerivacoes.ts ~linha 266): acrescentar o campo `semJusta` ao tipo `PontoSerieMensal` e ao objeto inicializado na linha 272, e trocar os `case` para `'pedido_demissao'`, `'acordo'`, `'justa_causa'`, `'fim_contrato'`, `'sem_justa_causa'` → semJusta, mantendo `falecimento` no default/outros. 3) Em desligamentosComum.ts acrescentar `pago: 'Pago'` a STATUS_LABELS e `pago: 'bg-success/15 text-success border-success/30'` a STATUS_BADGE; em desligamentosDerivacoes.ts acrescentar `'pago'` ao array STATUS_TERMINAIS (linha 139) e à condição de `concluido()` (linha 146-148). 4) Copiar entradaCards.tsx, DesligamentoStatusBadge.tsx, DesligamentoFilters.tsx, DesligamentoAtencaoBanner.tsx, GestaoDesligamentos.tsx e TurnoverChart.tsx da muri sem outras mudanças. 5) Substituir DesligamentoKPIs.tsx pela versão da muri — ela usa `tone`, `dense`, `vividRed`, `decimals` e `className`, que só existem no MetricCard do grupo 'MetricCard e primitivos do dashboard': este grupo NÃO compila sem aquele. 6) Em src/components/desligamentos/index.ts acrescentar os três exports novos (DesligamentoAtencaoBanner, GestaoDesligamentos, TrilhaAuditoriaDesligamentos) SEM remover nenhum dos atuais. 7) Reescrever src/pages/DesligamentosPage.tsx a partir da versão da muri, mas obrigatoriamente: (a) manter `import { registrarAcessoPII } from '@/services/piiAccessLogService'` e a chamada `void registrarAcessoPII('desligamentos','export',{ empresaId, registroCount })` antes de `exportarDesligamentosExcel(filtered)` — está em main DesligamentosPage.tsx:25,105-109 e a muri não tem; (b) remover os imports de `@/mocks/desligamentosMock` e a chamada `bloquearEscritaDesligamento`; (c) manter `EmptyList` da main no estado vazio. 8) Atualizar src/components/**tests**/TurnoverChart.test.tsx, DesligamentoKPIs.test.tsx e DesligamentoStatusBadge.test.tsx usando as versões da muri como base, mas sem reintroduzir `any` (ver o gate do item 9). 9) Verificar: `npm run typecheck && npm run lint:ci && npm run audit:ratchet-any && npx vitest run src/components/__tests__/Desligamento*.test.tsx src/components/__tests__/TurnoverChart.test.tsx` e abrir /desligamentos conferindo que um registro `tipo = justa_causa` aparece com selo 'Justa Causa' e entra na faixa própria do gráfico.

<details><summary>Arquivos (10)</summary>

- `src/components/desligamentos/desligamentosComum.ts`
- `src/components/desligamentos/desligamentosDerivacoes.ts`
- `src/components/desligamentos/entradaCards.tsx`
- `src/components/desligamentos/GestaoDesligamentos.tsx`
- `src/components/desligamentos/DesligamentoAtencaoBanner.tsx`
- `src/components/desligamentos/DesligamentoFilters.tsx`
- `src/components/desligamentos/DesligamentoStatusBadge.tsx`
- `src/components/desligamentos/DesligamentoKPIs.tsx`
- `src/components/desligamentos/TurnoverChart.tsx`
- `src/components/desligamentos/index.ts`

</details>

## Trilha de Auditoria de Desligamentos (painel completo)

`RECUPERAR_COM_MERGE` · esforço alto · 4 arquivos

**Valor para o negócio.** Auditoria e contabilidade conseguem reconstruir quem mexeu em qual desligamento, quando e o que mudou, com filtro por período, usuário, categoria e nível, resumo em linguagem humana e exportação — hoje a aba mostra uma lista curta com o JSON cru.

**Risco de regressão.** Trazido como está, a aba abre bonita e sempre vazia (o gateway recusa `audit_log` e o componente engole o erro), e o `(supabase as any)` quebra o gate `audit:ratchet-any` do `ci:verify`. Sem o `.scroll-interno` no index.css a barra de filtros vaza horizontalmente a página em telas estreitas.

**Evidência.** `supabase/functions/external-db-bridge/validation.ts:64-65`: "Estas tabelas nunca podem ser acessadas via bridge (nem leitura)" e linha 82 lista `"audit_log"` na TABLE_DENYLIST. muri `TrilhaAuditoriaDesligamentos.tsx:232-241` faz `await (supabase as any).from('audit_log').select('*')...` e, quando é recusado, `console.warn('[TrilhaAuditoriaDesligamentos] audit_log access denied:', ...); return []` — a aba fica permanentemente vazia em produção. O caminho correto já está na main: `src/services/auditoriaService.ts:73` chama `supabase.rpc('get_audit_trail', { p_empresa_id, p_tabela, ... })`, e `get_audit_trail` está na RPC_ALLOWLIST (validation.ts:137); main `src/components/ponto/PontoAuditTimeline.tsx:29` já consome esse serviço e é o que main `DesligamentosPage.tsx:358` renderiza hoje (`<PontoAuditTimeline filterTabela="desligamentos" />`). A query da muri também não filtra empresa (só `.eq('tabela', tabela)`), enquanto `get_audit_trail` exige `p_empresa_id`. Classe CSS `.scroll-interno`, usada pela barra de filtros, existe em muri src/index.css:428-447 e tem 0 ocorrências em main src/index.css.

**Plano.** 1) Copiar trilhaComum.ts, trilhaDerivacoes.ts e trilhaReveal.ts da muri sem alteração (são mapas de ícone/tinta e derivações puras; trilhaReveal reexporta de organogramaReveal, que vem no grupo do Organograma — este grupo depende daquele). 2) Copiar TrilhaAuditoriaDesligamentos.tsx e substituir o bloco de dados (linhas ~224-250): trocar o `(supabase as any).from('audit_log')` por `await auditoriaService.listarTrilha({ empresa_id: empresaAtual.id, tabela: 'desligamentos', limite: 200 })`, importando `auditoriaService` de '@/services/auditoriaService'; usar a mesma `queryKey: ['ponto-audit-logs', empresaAtual?.id, 'desligamentos']` de main PontoAuditTimeline.tsx:27 para a assinatura realtime continuar invalidando os dois consumidores; deixar o erro subir (ou tratar com `SyncErrorState`) em vez de `console.warn` + `return []`, porque a main não tem nenhum `console.log/warn` em src/components (grep: 0). 3) Remover do arquivo o import e os dois usos de `@/mocks/desligamentosMock` (`getMockTrilhaAuditoriaDesligamentos`, `isDesligamentosMockEnabled`) e o ramo `if (mockAtivo)`. 4) Conferir o shape: `auditoriaService.listarTrilha` devolve `TrilhaAuditoriaRegistro[]` com `created_at`; ajustar `trilhaDerivacoes.ts` para ler `created_at` (a tabela `audit_log` NÃO tem coluna `timestamp` — a lista de colunas em produção é id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email, ip_address, user_agent, created_at, empresa_id, justificativa, status_anterior, status_posterior). 5) Copiar o bloco `.scroll-interno` (muri src/index.css:428-447) para a camada de utilitários do main src/index.css. 6) Em src/pages/DesligamentosPage.tsx, trocar `<PontoAuditTimeline filterTabela="desligamentos" />` (main linha 358) por `<TrilhaAuditoriaDesligamentos />`, mantendo PontoAuditTimeline intacto para a área de Ponto. 7) Trazer src/components/**tests**/TrilhaAuditoriaDesligamentos.test.tsx, trilhaDerivacoes.test.ts e trilhaReveal.test.ts da muri, mockando `auditoriaService` em vez de `supabase`. 8) Verificar: `npm run typecheck && npm run lint:ci && npm run audit:ratchet-any && npm run audit:bridge-contract && npx vitest run src/components/__tests__/Trilha*.test.* ` e abrir /desligamentos → aba Trilha com uma empresa selecionada, confirmando que vêm linhas reais.

<details><summary>Arquivos (4)</summary>

- `src/components/desligamentos/TrilhaAuditoriaDesligamentos.tsx`
- `src/components/desligamentos/trilhaComum.ts`
- `src/components/desligamentos/trilhaDerivacoes.ts`
- `src/components/desligamentos/trilhaReveal.ts`

</details>

## Drawer de detalhes + checklist do desligamento

`RECUPERAR_COM_MERGE` · esforço alto · 2 arquivos

**Valor para o negócio.** O drawer da muri é muito melhor de usar: stepper de etapas, blocos de proventos/descontos, documentos vinculados, e o checklist ganha barra de progresso, filtros Pendentes/Concluídas e um botão para concluir tudo de uma vez.

**Risco de regressão.** Substituir o drawer da main pelo da muri desfaz o fix de 31/out: a rescisão volta a ser calculada com aviso prévio sempre indenizado, férias vencidas sempre simples, FGTS zero, sem desconto de aviso não cumprido (art. 487 §2º), sem indenização dos arts. 479/480 e sem multa do art. 477 §8º — ou seja, valores pagos errados ao colaborador desligado. O `any` no checklist também quebra o gate `audit:ratchet-any`.

**Evidência.** main `DesligamentoDetailSheet.tsx` tem o card 'Parâmetros do Cálculo' e passa ao motor `aviso_trabalhado`, `ferias_vencidas`, `saldo_fgts`, `dias_aviso_nao_cumpridos`, `data_fim_contrato`, `termino_iniciativa`, `indenizacao_art_480_prejuizo` e `data_pagamento`, persistindo em `detalhes_calculo._parametros` (commit de 2026-10-31 'fix(rescisao): modalidades de desligamento no fluxo real'). Contagem no arquivo: `_parametros` main=4 / muri=0; `normalizarTipoRescisao` main=2 / muri=0; `indenizacao_art_480_prejuizo` main=4 / muri=0; `dias_aviso_nao_cumpridos` main=4 / muri=0; `termino_iniciativa` main=6 / muri=0; `data_pagamento` main=2 / muri=0. muri `DesligamentoDetailSheet.tsx:229-231` chama `rescisaoService.calcularESalvar` lendo `(d as Record<string, unknown>).aviso_trabalhado`, `.ferias_vencidas_check` e `.saldo_fgts` — nenhuma dessas é coluna de `desligamentos` (lista de 49 colunas em produção confirmada via MCP), logo todas resolvem `undefined`. main `src/utils/rescisaoCalc.ts:214-216` lança 'Informe a data prevista de fim do contrato (arts. 479/480 CLT)' quando o parâmetro falta. No checklist, muri trocou `desligamento: Tables<'desligamentos'>` (main linha 18) por `desligamento: any` (muri linha 45) e manteve exatamente os mesmos 8 itens `checklist_*`.

**Plano.** 1) Começar da versão da muri de DesligamentoDetailSheet.tsx (953 linhas). 2) Reintroduzir, copiando literalmente da main: os imports `Checkbox`, `Input`, `Label`, `Select*` de @/components/ui e `normalizarTipoRescisao` de '@/utils/rescisaoCalc'; a interface `ParametrosCalculo`; o estado `const [params, setParams] = useState<ParametrosCalculo>(salvos ?? {})` com o `paramsLoaded` que recarrega `detalhes_calculo._parametros` ao trocar de registro; `const tipoNormalizado = normalizarTipoRescisao(d.tipo \|\| 'sem_justa_causa')`; e o Card 'Parâmetros do Cálculo' inteiro (condicionado a `d.status !== 'homologado' && !== 'finalizado' && !== 'pago'`), inserido no topo do `TabsContent value="rescisao"` da muri. 3) Trocar a chamada da muri (linhas 222-234) pelo payload da main: `aviso_trabalhado: params.aviso_trabalhado ?? false`, `ferias_vencidas: params.ferias_vencidas ?? false`, `saldo_fgts: params.saldo_fgts ?? 0`, `dias_aviso_nao_cumpridos`, `data_fim_contrato`, `termino_iniciativa`, `indenizacao_art_480_prejuizo`, `data_pagamento: d.data_pagamento ?? undefined`. 4) Remover o import e os usos de `bloquearEscritaDesligamento` de '@/mocks/desligamentosMock' (muri linha 41). 5) Em DesligamentoChecklist.tsx, copiar a versão da muri trocando `desligamento: any` por `desligamento: Tables<'desligamentos'>` (import de '@/integrations/supabase/types', como na main linha 1) e tipando os acessos `desligamento?.[item.key]`; manter o contador no formato `X/8`, que os testes verificam. 6) Nos testes: partir dos de main (`src/components/__tests__/DesligamentoDetailSheet.test.tsx`, `DesligamentoChecklist.test.tsx`), que já são tipados, e alterar SÓ as asserções de texto que mudaram — por exemplo 'Etapa Atual' → 'Andamento do processo'. NÃO copiar os testes da muri: eles substituem `{ children?: ReactNode }` por `: any` em todos os mocks, revertendo o endurecimento de tipos da main. 7) Verificar: `npm run typecheck && npm run lint:ci && npm run audit:ratchet-any && npx vitest run src/components/__tests__/DesligamentoDetailSheet.test.tsx src/components/__tests__/DesligamentoChecklist.test.tsx` e, na tela, calcular uma rescisão de 'Término de Contrato' sem data de fim e confirmar que o erro dos arts. 479/480 continua aparecendo.

<details><summary>Arquivos (2)</summary>

- `src/components/desligamentos/DesligamentoDetailSheet.tsx`
- `src/components/desligamentos/DesligamentoChecklist.tsx`

</details>

## MetricCard e primitivos do dashboard (base compartilhada)

`RECUPERAR_COM_MERGE` · esforço medio · 8 arquivos

**Valor para o negócio.** É a peça que todas as outras faixas de KPI (Desligamentos, Colaboradores, Dashboard) reutilizam: um cartão único com ícone semântico, tooltip explicativo do indicador, contagem animada com centavos e variante compacta para faixas de 5 colunas.

**Risco de regressão.** É o grupo de maior alcance visual: muda a aparência de todos os KPIs do Dashboard de uma vez (a faixa de gradiente e o raio 2xl saem). Trazer o DonutChart com `(seg: any, i: number)` quebra o gate `audit:ratchet-any`. E `gradient` virar opcional silencia, sem erro de compilação, qualquer call site que ainda o passe — a cor passa a vir só de `tone`.

**Evidência.** main `src/components/dashboard/MetricCard.tsx:22-33` (interface MetricCardProps) tem só title/value/rawValue/icon/trend/description/gradient(obrigatório)/sparkline/index/formatFn. A versão da muri acrescenta `tone` (com o tipo `MetricTone`), `route`, `tooltip`, `className`, `vividRed`, `dense` e `decimals`, e torna `gradient` opcional/deprecado. `DesligamentoKPIs` da muri usa `tone`, `vividRed`, `dense`, `decimals` e `className` — não compila contra o MetricCard da main. O token `--destructive-vivid`, exigido por `vividRed`, JÁ existe em main src/index.css:28 e :128. `src/constants/tooltips.ts` (214 linhas), usado pelo prop `tooltip`, existe só na muri. Na main o MetricCard só é renderizado por `src/pages/DashboardPage.tsx` (`grep -rln MetricCard` em mainsrc: avaliacao/entradaCards.tsx e ui/entrada-cards.tsx usam apenas `cardVariants`), então o alcance visual da troca é limitado. muri `DonutChart.tsx` introduz `segmentsWithOffsets.map((seg: any, i: number) => ...)`.

**Plano.** 1) Substituir MetricCard.tsx pela versão da muri (API é aditiva: `gradient` fica opcional, `tone` default 'primary', `dense`/`vividRed` default false, `decimals` default 0 — nenhum call site existente deixa de compilar). 2) Copiar src/constants/tooltips.ts da muri (arquivo novo, sem dependências). 3) Copiar AnimatedNumber.tsx (acrescenta `decimals`), MiniSparkline.tsx, SectionHeader.tsx, BarChartWidget.tsx, DashboardHeader.tsx (acrescenta `userName` e `actionsSlot`) e WorkforceHealthScore.tsx (acrescenta `variant` e `bare`) — todos são props aditivos com default, nenhum remove comportamento. 4) Em DonutChart.tsx, antes de copiar, tipar o `.map`: trocar `(seg: any, i: number)` pelo tipo do elemento de `segmentsWithOffsets` (derivar de `DonutChartProps['segments'][number]` mais os campos de offset calculados) — o gate `audit:ratchet-any` não aceita o `any`. 5) Atualizar src/components/**tests**/MetricCard.test.tsx e DashboardHeader.test.tsx partindo dos arquivos da main (tipados) e só ajustando as asserções de texto/estrutura que mudaram; não importar as versões da muri, que trocam `{ children?: ReactNode }` por `: any`. 6) Verificar: `npm run typecheck && npm run lint:ci && npm run audit:ratchet-any && npx vitest run src/components/__tests__/MetricCard.test.tsx src/components/__tests__/DashboardHeader.test.tsx src/components/__tests__/BarChartWidget.test.tsx src/components/__tests__/DesempenhoEntradaCascade.test.tsx` e abrir /dashboard e /avaliacao para conferir que as faixas de KPI continuam legíveis em tema claro e escuro. 7) Este grupo é pré-requisito dos grupos 'Desligamentos: vocabulário...' (DesligamentoKPIs) e 'Cards de composição do Dashboard'.

<details><summary>Arquivos (8)</summary>

- `src/components/dashboard/MetricCard.tsx`
- `src/components/dashboard/AnimatedNumber.tsx`
- `src/components/dashboard/DonutChart.tsx`
- `src/components/dashboard/MiniSparkline.tsx`
- `src/components/dashboard/SectionHeader.tsx`
- `src/components/dashboard/BarChartWidget.tsx`
- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/dashboard/WorkforceHealthScore.tsx`

</details>

## Cards de composição do Dashboard (uma tela só)

`RECUPERAR_COM_MERGE` · esforço alto · 10 arquivos

**Valor para o negócio.** O Dashboard cabe em uma tela: headcount com evolução, departamentos, resumo operacional, próximas atividades, alertas de RH e status do sistema lado a lado, em vez de uma página longa de rolagem.

**Risco de regressão.** Se o DashboardPage da muri vier inteiro: (a) todas as consultas do dashboard passam a fugir do gateway `external-db-bridge` (JWT, CSRF, rate limit, escopo de tenant) — exatamente o controle que a regra 6 do AGENTS.md proíbe afrouxar; (b) perde-se `useRealtimeDashboard` e o `HealthTrendCard`, que a main renderiza hoje; (c) perde-se a variação da folha (`folhaVariacao`). Se `dashboard/index.ts` vier como está, o export de `QuickActionsGrid` desaparece.

**Evidência.** Os oito cards são puramente de apresentação: `grep -nE "supabase\|useQuery\|mocks/\|: any\|as any\|empresa"` nos oito arquivos da muri só acusa SystemStatusCard.tsx:16-17 (import do mock de dev). SystemStatusCard consome `useSystemHealth()`, que a main já tem (src/hooks/useSystemHealth.ts existe nas duas pontas). AlertasProximasCard.tsx:23 chama `<AlertasRHWidget maxItems={3} compact />`, mas main `analytics/widgets.tsx:184` declara `export function AlertasRHWidget()` sem props — o card só funciona com o widgets.tsx da muri (que na linha 259 aceita `{ maxItems, compact }`). O diff de widgets.tsx não altera nenhuma linha de acesso a dados: o único `+/-` com `useQuery` é a renomeação `alertas`→`alertasReal` para encaixar o mock. muri `dashboard/index.ts` troca `QuickActionsGrid` por `QuickActionsMenu` e main `src/components/dashboard/QuickActionsGrid.tsx` existe só na main. main `src/pages/DashboardPage.tsx:4` importa `supabase`; muri `DashboardPage.tsx:4` importa `supabaseBase`, que main `src/integrations/supabase/client.ts:44-46` documenta como o cliente "onde o proxy de bridge não deve mediar" (o `supabase` da linha 436 é o Proxy que leva tudo pelo gateway). muri `DashboardStats` também perdeu o campo `folhaVariacao` que a main tem (main DashboardPage.tsx:28).

**Plano.** 1) Depende do grupo 'MetricCard e primitivos do dashboard' — aplicar aquele primeiro. 2) Copiar os oito cards da muri; em SystemStatusCard.tsx remover o import de '@/mocks/dashboardMockData' e a linha `isDashboardMockEnabled() ? mockSystemHealth : realHealth`, ficando só `const { latency, status, metrics } = useSystemHealth()`. 3) Copiar analytics/widgets.tsx da muri (ganha `MiniStat` e os props `maxItems`/`compact` em AlertasRHWidget), removendo o import de mock da linha 25 e o ramo que o usa dentro de AlertasRHWidget; manter as interfaces nomeadas que a main já extraiu (`PendenciaSummary` e as props de IndicatorRow/QuickStat/PendenciaItem) em vez das assinaturas inline da muri, para não perder tipagem. 4) Em src/components/dashboard/index.ts: ACRESCENTAR QuickActionsMenu, HeadcountOverviewCard, DepartmentsCard e SystemStatusCard, mantendo `QuickActionsGrid` exportado (src/components/dashboard/QuickActionsGrid.tsx continua no repositório). 5) Reescrever src/pages/DashboardPage.tsx a partir do layout da muri, mas obrigatoriamente: (a) `import { supabase } from '@/integrations/supabase/client'` — nunca `supabaseBase` — e manter todas as queries com `.eq('empresa_id', empresaAtual.id)`; (b) manter `useRealtimeDashboard` e `HealthTrendCard` da main; (c) manter o campo `folhaVariacao` em `DashboardStats` e o cálculo que o alimenta; (d) não importar '@/mocks/dashboardMockData'. 6) Atualizar src/components/**tests**/DashboardWidgets.test.tsx partindo do arquivo da main, só ajustando as asserções de texto que mudaram. 7) Verificar: `npm run typecheck && npm run lint:ci && npm run audit:ratchet-any && npm run audit:bridge-contract && npx vitest run src/components/__tests__/DashboardWidgets.test.tsx` e abrir /dashboard com duas empresas diferentes para confirmar que os números mudam junto com a empresa selecionada.

<details><summary>Arquivos (10)</summary>

- `src/components/dashboard/AlertasProximasCard.tsx`
- `src/components/dashboard/DepartmentsCard.tsx`
- `src/components/dashboard/HeadcountOverviewCard.tsx`
- `src/components/dashboard/ProximasAtividadesCard.tsx`
- `src/components/dashboard/QuickActionsMenu.tsx`
- `src/components/dashboard/ResumoOperacionalCard.tsx`
- `src/components/dashboard/SaudeResumoCard.tsx`
- `src/components/dashboard/SystemStatusCard.tsx`
- `src/components/dashboard/analytics/widgets.tsx`
- `src/components/dashboard/index.ts`

</details>

## Colaboradores: diretório em tabela/grade com KPIs e chips

`RECUPERAR_COM_MERGE` · esforço alto · 7 arquivos

**Valor para o negócio.** A lista de colaboradores ganha KPIs no topo, alternância entre tabela e grade de cartões, chips mostrando quais filtros estão ativos com um clique para limpar, e o filtro de status passa a oferecer 'Pendente', que é um status que existe de verdade no banco (hoje a opção 'Inativo' não devolve ninguém).

**Risco de regressão.** Trazido como está, CPF e e-mail de todos os colaboradores aparecem sem máscara para qualquer usuário com acesso à tela, desfazendo o mascaramento de PII da main, e as exportações Excel/PDF deixam de registrar o acesso a PII. O index.ts da muri também derruba o export de ColaboradorHistory, quebrando colaborador-detalhes/index.ts e o teste correspondente. E a tela não compila sem `vinculoService`, que pertence a outra área.

**Evidência.** REGRESSÃO LGPD: muri `ColaboradorTable.tsx:151` renderiza `{c.email \|\| 'Sem e-mail cadastrado'}` e `:157` renderiza `CPF: {c.cpf}` sem máscara; muri `ColaboradorDirectoryGrid.tsx:72` idem para o e-mail. Na main a mesma listagem passa por `usePiiMask`: `src/pages/ColaboradoresPage.tsx:16` importa o hook, `:39` instancia, `:327` usa `pii.email(c.email)` e `:334` `pii.cpf(c.cpf)`; e as exportações passam por `pii.deep(r)` (`:138` e `:181`) mais `registrarAcessoPII` (`:17`). `grep -c usePiiMask` em muri src/pages/ColaboradoresPage.tsx = 0. REGRESSÃO DE EXPORT: muri `src/components/colaboradores/index.ts` remove a linha `export * from './ColaboradorHistory'`, que main `src/components/colaborador-detalhes/index.ts:16` consome (`export { ColaboradorHistory } from '../colaboradores/ColaboradorHistory'`) e que `src/components/__tests__/ColaboradorHistory.test.tsx` testa. DEPENDÊNCIA EXTERNA: `ColaboradorTable.tsx:15` e `ColaboradorDirectoryGrid.tsx:12` importam `VinculosResumo` de '@/services/vinculoService', arquivo que não existe na main (`grep -rln vinculoService` em mainsrc = 0 arquivos). GANHO REAL: muri ColaboradorFilters troca a opção de status `inativo` por `pendente`; o enum em produção é `status_colaborador = [ativo, ferias, afastado, desligado, pendente]` — não existe 'inativo', e main `src/pages/ColaboradoresPage.tsx:104` ainda oferece `{ value: 'inativo', label: 'Inativos' }`. MUDANÇA DE CONTRATO: muri ColaboradorFilters troca `departamentos?: Pick<Departamento,'id'\|'nome'>[]` por `departamentos?: string[]` e adiciona `viewMode`/`onViewModeChange` como props OBRIGATÓRIOS, enquanto main ColaboradoresPage.tsx:292-293 passa os objetos de `useDepartamentos()`/`useCargos()`.

**Plano.** 1) Este grupo depende de duas outras entregas: o grupo 'MetricCard e primitivos do dashboard' (os componentes usam `cardVariants`, que já existe, mas a página usa MetricCard) e, principalmente, do subsistema `src/services/vinculoService.ts` + `src/hooks/useVinculos.ts` da muri, que é da área de vínculos/colaborador-detalhes. Se aquele grupo não entrar, trocar `VinculosResumo` por um tipo local mínimo (`{ passagens: number }` ou equivalente ao que a tabela realmente exibe) e remover a coluna de passagens — NÃO deixar o import pendurado. 2) Copiar ColaboradorActiveFilterChips.tsx, ColaboradorViewSwitcher.tsx e ColaboradorKpiCards.tsx da muri sem alteração (só usam Badge/Button/cn/cardVariants/StatCardSkeleton, todos presentes na main). 3) Copiar ColaboradorTable.tsx e ColaboradorDirectoryGrid.tsx e, ANTES de considerar pronto, aplicar o mascaramento: `import { usePiiMask } from '@/hooks/usePiiMask'`, `const pii = usePiiMask()` e trocar `{c.email \|\| ...}` por `{c.email ? pii.email(c.email) : 'Sem e-mail cadastrado'}` (ColaboradorTable.tsx:151 e ColaboradorDirectoryGrid.tsx:72) e `CPF: {c.cpf}` por `CPF: {c.cpf ? pii.cpf(c.cpf) : '—'}` (ColaboradorTable.tsx:157), espelhando main ColaboradoresPage.tsx:327,334. 4) Copiar ColaboradorFilters.tsx da muri (mantendo a troca `inativo`→`pendente`, que é o fix). 5) Em src/components/colaboradores/index.ts, MANTER `export * from './ColaboradorHistory'` e apenas acrescentar os novos exports — o arquivo da muri não pode ser copiado como está. 6) Reescrever src/pages/ColaboradoresPage.tsx a partir da versão da muri, mas obrigatoriamente: (a) manter `usePiiMask`, `registrarAcessoPII` e os `pii.deep(r)` nas exportações Excel/PDF (main linhas 16,17,138,181); (b) remover a opção `inativo` do seletor da linha 104 e colocar `pendente`; (c) adaptar as listas de departamento/cargo ao novo contrato `string[]` (derivar do resultado de `useColaboradores()` ou mapear `useDepartamentos().departamentos.map(d => d.nome)`); (d) não importar '@/mocks/colaboradoresMock'; (e) manter o `SyncErrorState` que a muri acrescentou. 7) Trazer src/pages/**tests**/ColaboradoresPage.test.tsx da muri e atualizar src/components/**tests**/ColaboradorFilters.test.tsx com as 37 linhas novas da muri. 8) Verificar: `npm run typecheck && npm run lint:ci && npm run audit:ratchet-any && npx vitest run src/components/__tests__/ColaboradorFilters.test.tsx src/components/__tests__/ColaboradorHistory.test.tsx src/pages/__tests__/ColaboradoresPage.test.tsx` e abrir /colaboradores com um usuário sem permissão de PII para confirmar CPF e e-mail mascarados nas duas visualizações.

<details><summary>Arquivos (7)</summary>

- `src/components/colaboradores/ColaboradorTable.tsx`
- `src/components/colaboradores/ColaboradorDirectoryGrid.tsx`
- `src/components/colaboradores/ColaboradorKpiCards.tsx`
- `src/components/colaboradores/ColaboradorActiveFilterChips.tsx`
- `src/components/colaboradores/ColaboradorViewSwitcher.tsx`
- `src/components/colaboradores/ColaboradorFilters.tsx`
- `src/components/colaboradores/index.ts`

</details>

## AnimatedDossieTabs (abas animadas do dossiê)

`RECUPERAR` · esforço baixo · 1 arquivos

**Valor para o negócio.** Dá ao dossiê do colaborador e à ficha de admissão o mesmo indicador deslizante de abas já usado na Jornada de Onboarding, em vez de abas estáticas.

**Risco de regressão.** Nenhum para a main se entrar isolado: nada hoje importa este arquivo, então ele não altera comportamento existente. O risco é o oposto — entrar e ficar sem nenhum importador, virando código morto.

**Evidência.** 110 linhas; os únicos imports são `react`, `cn` e `{ AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs'` — e `src/components/ui/animated-tabs.tsx` existe nas duas pontas. Zero acesso a banco, zero mock, zero `any`. Na muri é consumido por src/pages/ColaboradorDetalhesPage.tsx:29, src/pages/AdmissoesPage.tsx e src/pages/ColaboradorFormPage.tsx; na main essas páginas ainda usam `TabsList`/`TabsTrigger` crus (main ColaboradorDetalhesPage.tsx:10,195-207).

**Plano.** Só traga este arquivo junto com a conversão de pelo menos uma das páginas que o consomem (ColaboradorDetalhesPage, ColaboradorFormPage ou AdmissoesPage), que são de outra área — se nenhuma delas for convertida nesta onda, deixe o arquivo fora para não criar código morto. Quando for: 1) copiar src/components/colaboradores/AnimatedDossieTabs.tsx da muri sem alteração; 2) na página escolhida, trocar `TabsList`/`TabsTrigger` por `AnimatedDossieTabsList`/`AnimatedDossieTabsTrigger`, preservando os mesmos `value` de cada aba; 3) verificar com `npm run typecheck && npm run lint:ci && npx vitest run src/components/__tests__/AnimatedTabs.test.tsx` e navegar pelas abas do dossiê.

<details><summary>Arquivos (1)</summary>

- `src/components/colaboradores/AnimatedDossieTabs.tsx`

</details>

## Diálogo de recontratação de colaborador

`RECUPERAR_COM_MERGE` · esforço medio · 1 arquivos

**Valor para o negócio.** Permite readmitir um ex-colaborador reaproveitando o mesmo cadastro (o CPF é único, não dá para criar um segundo registro) e registrando uma nova linha de vínculo em vez de sobrescrever o histórico — hoje a main não tem caminho de recontratação na tela.

**Risco de regressão.** Trazido isolado, não compila: falta `useVinculos`, `vinculoService` e o método `colaboradorService.recontratar`. Se o `colaboradorService` da muri vier inteiro para resolver isso, entra o risco de desfazer outras correções que a main fez nesse serviço depois de 30/jul — ele precisa ser avaliado pela área de colaborador/vínculos, não aqui.

**Evidência.** O componente (97 linhas) importa `useRecontratarColaborador` de '@/hooks/useVinculos' (linha 10) — arquivo que não existe na main (`src/hooks/useVinculos.ts`: main=NAO, muri=SIM) — e o fluxo depende de `colaboradorService.recontratar`, presente só na muri (src/services/colaboradorService.ts:214-232), que por sua vez chama `vinculoService.criarVinculoInicial`; `grep -rln vinculoService` em mainsrc devolve 0 arquivos. A tabela de destino EXISTE em produção: `vinculos` tem id, colaborador_id, tipo, categoria, data_inicio, data_fim, matricula, status, created_at (consulta MCP). Na muri o componente é consumido por src/pages/ColaboradorDetalhesPage.tsx:28.

**Plano.** NÃO traga este arquivo nesta onda a menos que o grupo de vínculos entre junto. Quando entrar: 1) confirmar que `src/services/vinculoService.ts`, `src/hooks/useVinculos.ts` e o método `recontratar` de `src/services/colaboradorService.ts` foram integrados sobre a versão da MAIN do colaboradorService (não substituindo-a), com `empresaId` obrigatório como a muri já faz (linha 219: `if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant')`); 2) copiar src/components/colaboradores/RecontratarColaboradorDialog.tsx da muri sem alteração (usa FormField/FormSelect de @/components/forms, CurrencyInput, useDepartamentos, useCargos e todayLocalISO — todos presentes na main); 3) ligá-lo em src/pages/ColaboradorDetalhesPage.tsx como na muri (linha 28), com o botão aparecendo só para colaborador em status `desligado`; 4) trazer src/services/**tests**/colaboradorService.recontratacao.test.ts e vinculoService.test.ts da muri; 5) conferir no banco se `vinculos` tem RLS por empresa — a tabela não tem coluna `empresa_id`, o isolamento depende de `colaborador_id`; se não houver policy, isso é item da regra 8 (chamar o dono antes de mergear); 6) verificar com `npm run typecheck && npm run lint:ci && npx vitest run src/services/__tests__/colaboradorService.recontratacao.test.ts src/services/__tests__/vinculoService.test.ts` e recontratar um colaborador desligado em homologação, confirmando a nova linha em `vinculos` e o histórico anterior intacto.

<details><summary>Arquivos (1)</summary>

- `src/components/colaboradores/RecontratarColaboradorDialog.tsx`

</details>

## Descartado nesta área

- **AnalyticsSection — manter a da main** (`OBSOLETO`) — A main refatorou o arquivo: main `AnalyticsSection.tsx:55-56` importa `PendenciasDetailDialog` (549 linhas em src/components/dashboard/analytics/PendenciasDetailDialog.tsx) e `NotificationsDialog` (115 linhas), renderizados nas linhas 745 e 768. Nenhum dos dois arquivos existe na muri (`git ls-tree origin/muri -- src/components/dashboard/analytics/` lista só widgets.tsx), e o AnalyticsSection da muri é o monolito pré-refatoração (1217 linhas, com Dialog/DropdownMenu/Checkbox/AppPagination/exportPortaria671PDF/exportPontoCSV inline — contagens: exportPortaria671PDF main=0 muri=2, DropdownMenu main=0 muri=13, todos migrados para PendenciasDetailDialog.tsx, onde o grep dos quatro símbolos devolve 17 ocorrências).
- **MorningBriefing — manter a da main (vazamento entre empresas)** (`OBSOLETO`) — `grep -c 'empresa_id\\|empresaId'` em muri src/components/dashboard/MorningBriefing.tsx devolve 0; a assinatura é `export function useMorningBriefing()` (linha 34) com `queryKey: ['morning-briefing']` (linha 36). Na main o mesmo hook é `useMorningBriefing(empresaId?: string)` (linha 45) com `enabled: Boolean(empresaId)` (48), `queryKey: ['morning-briefing', empresaId]` (47) e `.eq('empresa_id', empresaId)` em todas as oito consultas (linhas 62, 68, 75, 79, 83, 89, 94, 96) — é o fix de 24/09 'fecha gaps de empresaId achados em auditoria adversarial (cross-tenant leak)'. A muri também consulta com `supabaseBase` (linhas 55-62), que main src/integrations/supabase/client.ts:44-46 identifica como o cliente que ignora o proxy do bridge. E a main tem a ação `edgeFunctionsService.dispararAlertasDP(empresaId)` (linha 217), ausente na muri.
- **EventTimeline — manter a da main (coluna inexistente)** (`OBSOLETO`) — A tabela `audit_log` em produção não tem coluna `timestamp` (lista completa de 16 colunas via MCP: id, tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email, ip_address, user_agent, created_at, empresa_id, justificativa, status_anterior, status_posterior). A muri ordena por `.order('timestamp', { ascending: false })` e lê `log.timestamp` em dois lugares; a main usa `auditoriaService.listarTrilha` e `log.created_at`. `audit_log` também está na TABLE_DENYLIST do gateway (supabase/functions/external-db-bridge/validation.ts:82, com a nota das linhas 64-65 de que nem leitura é permitida), enquanto `get_audit_trail` — a RPC que o auditoriaService usa — está na RPC_ALLOWLIST (linha 137). A muri ainda emite duas consultas a `audit_log` (uma solta e outra dentro do `Promise.all`) e usa `(supabase.from('audit_log') as any)` e `(supabase as any)`, perdendo também o `refetchInterval: 30_000`, o `error` e o `refetch` que a main expõe.
- **Novo Desligamento — manter o da main, portar só a carga ao abrir** (`OBSOLETO`) — A tabela `desligamentos` tem 49 colunas em produção (lista via MCP) e NÃO tem `aviso_trabalhado` nem `saldo_fgts`; a muri reintroduz as duas no INSERT (`aviso_trabalhado: form.aviso_trabalhado`, `saldo_fgts: Number(form.saldo_fgts) \|\| 0`), apagando o comentário da main que explica por que foram removidas: 'Enviá-los aqui fazia o PostgREST rejeitar o INSERT inteiro por coluna inexistente: criar um desligamento por este diálogo sempre falhava'. A muri também troca os valores do select de tipo para `com_justa_causa`, `acordo_mutuo` e `termino_contrato` e remove `falecimento`, enquanto o enum real é `tipo_desligamento = [sem_justa_causa, justa_causa, pedido_demissao, acordo, fim_contrato, falecimento]`. E troca `tipo: 'sem_justa_causa' as TipoDesligamento` por `as string` e `set = (k: string, v: unknown)` por `v: any`. GANHO REAL: main `NovoDesligamentoDialog.tsx:67` tem `handleOpenChange = (v) => { if (v) loadColaboradores(); ... }` ligado ao `onOpenChange` do Radix (linha 121), mas `open` é controlado pelo pai (main DesligamentosPage.tsx:128 `onClick={() => setShowNovo(true)}`, linha 370 `<NovoDesligamentoDialog open={showNovo} .../>`), então abrir pelo botão nunca dispara `onOpenChange(true)` e o select abre vazio; a muri corrige com um `useEffect` em `open`.

## Perda se a área for descartada inteira

Perde-se a única versão navegável do Organograma (busca, expandir/recolher, contagem de níveis — hoje a caixa de busca da main é decorativa: `src/pages/OrganogramaPage.tsx:15` declara `search` e `:78` só a liga ao Input, sem nenhum filtro), a aba de Trilha de Auditoria de Desligamentos com filtros por período/usuário/categoria e exportação, a tela de Gestão de Desligamentos com faixa de atenção por prazo do art. 477 (10 dias), o diretório de Colaboradores em tabela/grade com KPIs e chips de filtro ativo, e ~2.000 linhas de derivações puras já cobertas por testes (`src/lib/__tests__/organogramaTree.test.ts`, 307 linhas). Perdem-se também três correções reais: o filtro de status de colaborador que hoje oferece "inativo" (valor que não existe no enum `status_colaborador` do banco: ativo/ferias/afastado/desligado/pendente), o gráfico de turnover que hoje joga desligamentos do dia 1º para o mês anterior por ler a data em UTC, e o diálogo de Novo Desligamento que abre com a lista de colaboradores vazia.
