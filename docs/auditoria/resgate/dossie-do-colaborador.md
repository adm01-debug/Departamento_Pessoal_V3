# Dossiê do colaborador

O dossiê da main tem 7 abas e 462 linhas de página; o da muri tem 9 abas e 1047 linhas, com Resumo executivo (pendências, próximos eventos, banco de horas, completude de cadastro), timeline única de histórico, abas novas de Hierarquia/Vínculos, Jornada & Ponto, Férias, Desenvolvimento e upload real de arquivo nos documentos — tudo apoiado em tabelas que já existem em produção com RLS ligada. Em contrapartida, a muri foi escrita antes das correções de outubro/novembro da main: a página dela ainda tem o botão "Exportar Ficha (PDF)" sem ação e o item morto "Outras Ações" que a main corrigiu em 12/11 (PR #476), e ela expõe CPF, RG, e-mail, telefone, conta bancária e chave PIX sem o controle de papel que a main implantou em 05/10 (PR #173). O caminho certo é trazer as abas e o Resumo da muri reescrevendo em cima da main, nunca substituindo os arquivos — e aproveitar que a main já absorveu, via PR #569 (15/11), toda a infraestrutura visual e de mock que essas telas usam.

| decisão             | esforço | arq. | grupo                                                                              |
| ------------------- | ------- | ---- | ---------------------------------------------------------------------------------- |
| RECUPERAR_COM_MERGE | alto    | 8    | Casca da página + aba Resumo (shell, abas animadas, pendências e próximos eventos) |
| RECUPERAR_COM_MERGE | medio   | 17   | Timeline única do histórico (substitui 4 sub-abas)                                 |
| RECUPERAR           | medio   | 4    | Aba Trabalho & Hierarquia + recontratação                                          |
| RECUPERAR           | medio   | 5    | Aba Jornada & Ponto                                                                |
| RECUPERAR           | medio   | 1    | Aba Férias (resumo com prazos legais)                                              |
| RECUPERAR_COM_MERGE | alto    | 4    | Aba Financeiro (KPIs, remuneração, holerites, dados bancários com edição)          |
| RECUPERAR           | alto    | 15   | Aba Documentos & Compliance com anexo real de arquivo                              |
| RECUPERAR           | medio   | 6    | Aba Desenvolvimento (formação, treinamentos, PDI, jornada interna)                 |
| RECUPERAR_COM_MERGE | medio   | 2    | Campos customizados por colaborador (fecha fluxo pela metade na main)              |
| RECUPERAR_COM_MERGE | baixo   | 2    | Edição inline de contato de emergência e de formação                               |
| OBSOLETO            | baixo   | 4    | Arquivos da muri sem consumidor — não trazer                                       |

## Casca da página + aba Resumo (shell, abas animadas, pendências e próximos eventos)

`RECUPERAR_COM_MERGE` · esforço alto · 8 arquivos

**Valor para o negócio.** O RH abre o dossiê e já vê o que exige ação: pendências com severidade e link direto, próximos prazos legais com contagem de dias e a explicação do risco (férias em dobro pelo art. 137, ASO/PCMSO vencendo, fim de experiência), banco de horas, afastamento ativo e quanto do cadastro falta preencher. Hoje o Resumo da main mostra dois cartões com texto fixo ("Período vence em 45 dias", "ASO em conformidade") que não vêm de dado nenhum. De quebra conserta o botão Editar Perfil, quebrado em produção.

**Risco de regressão.** Substituir o arquivo da main pelo da muri: (1) mata a exportação da ficha em PDF e devolve o item morto 'Outras Ações' (volta atrás na PR #476, de 4 dias atrás); (2) remove o mascaramento por papel de CPF e e-mail no cabeçalho (main usa pii.cpf/pii.email, PR #173); (3) deixa três abas com CRUD órfãs — em origin/muri nada importa ASOTab, AquisitivosTab nem EstagiarioTab fora dos próprios testes (git grep), e EstagiarioTab tem gravação real (useSalvarDadosEstagiario) e ASOTab tem useCriarASO; (4) o index.ts da muri apaga os exports HistoricoSalarialTab, HistoricoContratosTab e ColaboradorHistory, que a página da main importa.

**Evidência.** git show origin/muri:src/pages/ColaboradorDetalhesPage.tsx linhas 599-609: <DropdownMenuItem className="gap-2 cursor-pointer"><FileText/> Exportar Ficha (PDF)</DropdownMenuItem> SEM onSelect, e <DropdownMenuItem ...>Outras Ações</DropdownMenuItem> sem handler — exatamente os dois defeitos que `git show e3f108d06 --stat` (PR #476, 2026-11-12, "'Exportar Ficha (PDF)' não tinha onSelect... 'Outras Ações' não tinha operação definida e foi removido") corrigiu na main. Em contrapartida, main src/pages/ColaboradorDetalhesPage.tsx:100 faz navigate(`/colaboradores/${id}/editar`) e src/App.tsx:209 registra `colaboradores/editar/:id` — rota inexistente, cai no catch-all src/App.tsx:491 (NotFoundPage); a muri usa a rota certa (`/colaboradores/editar/${id}`). A muri não importa usePiiMask nem usePDFExport (grep na página: só useDataAccessLog na linha 4 e 318); mostra e-mail cru na linha 692. useProximosEventos.ts é só agregação de hooks existentes, sem tabela nova. Infra já na main e byte-idêntica: diff de src/components/ui/animated-tabs.tsx e src/components/ui/animated-cascade-dialog.tsx entre as pontas = IDENTICOS; src/components/animate-ui/primitives/animate/tabs.tsx existe na main.

**Plano.** 1) Não copiar a página da muri: reescrever src/pages/ColaboradorDetalhesPage.tsx partindo da versão da main. 2) Trazer da muri as linhas 1-520 (helpers formatTempoCasa/formatarDataBR/diasDesde/diasAte/formatarDataExtensoBR/quandoLabel/contextoEvento/iconeEvento, CampoResumo, GestorResumo, MiniStat, DonutProgress) e todo o bloco do TabsContent value="geral" (cabeçalho, Situação Atual, Resumo de Vínculo, Cadastro do Colaborador, Pendências, Próximos Eventos, Ações Rápidas), além do cálculo de `pendencias` e `eventosDetalhados`. 3) MANTER da main, intactos: o import de usePiiMask e usePDFExport, o DropdownMenuItem 'Exportar Ficha (PDF)' com o onSelect completo (main linhas 108-147) e o useDataAccessLog. 4) NÃO trazer o item 'Outras Ações'. 5) Trazer o item 'Recontratar Colaborador' (condicionado a status==='desligado') junto com o grupo Hierarquia. 6) Trocar o navigate de 'Editar Perfil' para `/colaboradores/editar/${id}`, batendo com src/App.tsx:209. 7) Aplicar pii.email() no CampoResumo de e-mail profissional. 8) Abas: adotar a lista da muri (resumo, pessoal, hierarquia, jornada, ferias, financeiro, desenvolvimento, documentos, timeline) via AnimatedDossieTabsList, e acrescentar ponto de entrada para ASOTab, AquisitivosTab e EstagiarioTab (sugestão: sub-abas dentro de 'documentos' ou de 'pessoal') para não perder CRUD. 9) index.ts: unir — adicionar os exports da muri SEM remover HistoricoSalarialTab, HistoricoContratosTab e ColaboradorHistory. 10) eslint.config.js: acrescentar 'src/components/colaborador-detalhes/**/*.{ts,tsx}' e 'src/pages/ColaboradorDetalhesPage.tsx' ao bloco de exceção que já existe nas linhas 110-125 ('Área Avaliação/NineBox portada da branch muri (W1)', no-explicit-any: off) — os arquivos da muri desta área somam 125 ocorrências de any contra 0 nos da main, e lint:ci roda com --max-warnings=1. 11) Verificar: abrir o dossiê, clicar Editar Perfil (deve abrir o formulário, não NotFound), exportar a ficha em PDF, conferir CPF/e-mail mascarados com usuário sem papel admin/rh, e rodar npm run typecheck && npm run lint:ci.

<details><summary>Arquivos (8)</summary>

- `src/pages/ColaboradorDetalhesPage.tsx`
- `src/components/colaborador-detalhes/index.ts`
- `src/components/colaborador-detalhes/CampoInfo.tsx`
- `src/components/colaborador-detalhes/PendenciasDialog.tsx`
- `src/components/colaborador-detalhes/ProximosEventosDialog.tsx`
- `src/components/colaboradores/AnimatedDossieTabs.tsx`
- `src/hooks/useProximosEventos.ts`
- `eslint.config.js`

</details>

## Timeline única do histórico (substitui 4 sub-abas)

`RECUPERAR_COM_MERGE` · esforço medio · 17 arquivos

**Valor para o negócio.** Uma única linha do tempo pesquisável, filtrável por tipo e por ano, com a vida funcional inteira do colaborador — inclusive a trilha de auditoria — em vez de quatro tabelas separadas que o RH tem de cruzar de cabeça. Serve direto para defesa em reclamação trabalhista e para auditoria.

**Risco de regressão.** origin/muri:HistoricoColaborador.tsx linha 27 desestrutura apenas { events, isLoading, colaborador, criarSalario, criandoSalario, criarContrato } — o `excluirContrato` que o hook devolve (useHistoricoColaborador.ts:57) nunca é exposto na UI, enquanto main src/components/colaborador-detalhes/HistoricoContratosTab.tsx:151 tem botão Excluir funcionando. Adotar a timeline e apagar as abas antigas perderia a exclusão de registro contratual.

**Evidência.** origin/muri:src/hooks/useHistoricoColaborador.ts linhas 18, 54-57 reutiliza exatamente os hooks que as abas da main já usam (useHistoricoSalarial, useCriarRegistroSalarial, useHistoricoContratos com criar/excluir) e nas linhas 150-329 agrega 13 fontes de evento: vinculos, historico_salarial, historico_contratos, historico_cargo, promocoes, transferencias, ferias, afastamentos, treinamento_participantes, feedbacks_360, onboarding, medidas_disciplinares, desligamentos e audit_log. Todas essas tabelas existem em produção com rls_enabled=true (supabase_db_list_tables, 390 tabelas: audit_log 904 kB/458 linhas, afastamentos, ferias, historico_salarial, contratos, medidas_disciplinares, onboarding_tarefas, treinamentos, vinculos). O comentário em HistoricoColaborador.tsx declara: 'Substitui as 4 sub-abas antigas (Timeline Funcional / Histórico Salarial / Contratos / Auditoria) por uma única linha do tempo'. A main só tem src/components/colaboradores/ColaboradorHistory.tsx com 138 linhas.

**Plano.** 1) Copiar os 17 arquivos como estão (não há equivalente na main; não há conflito de conteúdo). 2) Expor excluirContrato: passar a mutation de HistoricoColaborador para HistoryEventRow e mostrar a ação de excluir nas linhas de type==='contrato', OU manter HistoricoContratosTab acessível por uma sub-aba. 3) NÃO apagar src/components/colaborador-detalhes/HistoricoSalarialTab.tsx, HistoricoContratosTab.tsx nem src/components/colaboradores/ColaboradorHistory.tsx nesta PR, e manter os três exports no index.ts: só remover depois de conferir em produção que a timeline cobre os mesmos registros. 4) Depende do grupo da casca da página (sem ele a aba 'timeline' não existe e o componente fica morto). 5) Verificar: npm run test -- src/components/colaborador-detalhes/historico, abrir a aba, filtrar por tipo e por ano, criar uma alteração salarial e uma contratual pelos dois diálogos e conferir que aparecem na timeline e nas tabelas historico_salarial/contratos.

<details><summary>Arquivos (17)</summary>

- `src/components/colaborador-detalhes/historico/HistoricoColaborador.tsx`
- `src/components/colaborador-detalhes/historico/HistoryTimeline.tsx`
- `src/components/colaborador-detalhes/historico/HistoryToolbar.tsx`
- `src/components/colaborador-detalhes/historico/HistoryYearGroup.tsx`
- `src/components/colaborador-detalhes/historico/HistoryEventRow.tsx`
- `src/components/colaborador-detalhes/historico/HistorySidebar.tsx`
- `src/components/colaborador-detalhes/historico/EventTypesSummary.tsx`
- `src/components/colaborador-detalhes/historico/JourneySummary.tsx`
- `src/components/colaborador-detalhes/historico/LastUpdate.tsx`
- `src/components/colaborador-detalhes/historico/UpcomingEvents.tsx`
- `src/components/colaborador-detalhes/historico/eventTypeConfig.tsx`
- `src/components/colaborador-detalhes/historico/HistoryAuditDetailDialog.tsx`
- `src/components/colaborador-detalhes/historico/HistoryCreateSalaryDialog.tsx`
- `src/components/colaborador-detalhes/historico/HistoryCreateContractDialog.tsx`
- `src/components/colaborador-detalhes/historico/__tests__/HistoricoColaborador.test.tsx`
- `src/hooks/useHistoricoColaborador.ts`
- `src/types/timelineEvent.ts`

</details>

## Aba Trabalho & Hierarquia + recontratação

> **Bloqueio não registrado na primeira versão deste plano.** Esta aba usa
> `useLotacaoPrincipal`, cujo serviço consulta `public.colaborador_lotacoes` —
> tabela que **não existe no banco de produção** (conferido: zero linhas em
> `information_schema.tables`). A criação dela depende da migration
> `20260929120000_colaborador_lotacoes`, classificada em
> `docs/auditoria/MIGRATIONS_ORFAS_MURI_2026-11-16.md` como "falta, sem
> consumidor na main" e que exige autorização do dono por ser DDL em produção.
> Logo este grupo **não é adição sem risco**: ou entra junto com essa migration,
> ou entra com a lotação principal desligada. Decidir antes de começar.

`RECUPERAR` · esforço medio · 4 arquivos

**Valor para o negócio.** Mostra onde o colaborador está de fato alocado (cargo, CBO, local de trabalho, centro de custo, time, gestor, lotação principal) e todo o histórico de vínculos com a empresa. Permite recontratar um desligado sem recadastrar tudo — ganho direto de tempo no RH e fim do risco de cadastro duplicado da mesma pessoa.

**Risco de regressão.** Nenhum: é adição pura, a main não tem nada nessa aba. O único cuidado é que o item 'Recontratar Colaborador' do menu só aparece com status==='desligado' (origin/muri:ColaboradorDetalhesPage.tsx:603) — manter essa condição para não oferecer a ação a quem está ativo.

**Evidência.** git diff --stat origin/main origin/muri: TrabalhoHierarquiaTab.tsx 614 linhas novas, nenhum arquivo equivalente na main (git ls-tree origin/main -- src/components/colaborador-detalhes/ não lista nada de hierarquia/vínculo). As dependências useVinculos.ts e useColaboradorLotacao.ts não existem na main (git cat-file -e falha nas duas). As tabelas `vinculos` e `lotacoes` existem em produção com rls_enabled=true. RecontratarColaboradorDialog.tsx (97 linhas) linhas 10/28/39 usa useRecontratarColaborador de @/hooks/useVinculos e chama recontratar.mutateAsync — é fluxo real, não maquete. Os nomes useLotacaoPrincipal e useVinculosColaborador estão ausentes da main (git grep 'export function' em origin/main).

**Plano.** 1) Copiar os 4 arquivos. 2) Registrar a aba 'hierarquia' na página (grupo da casca) com <TrabalhoHierarquiaTab colaboradorId={id!} />. 3) Montar <RecontratarColaboradorDialog> no fim da página e ligar ao item de menu condicionado a status==='desligado'. 4) Checar que as dependências já existem na main: src/services/cargoService.ts, src/services/localTrabalhoService.ts, src/hooks/useTabelasReferencia.ts (useCentrosCusto), src/hooks/useColaboradorDetalhes.ts (useTimes) e src/components/ui/status-badge.tsx — todas confirmadas presentes. 5) Verificar: abrir a aba num colaborador com lotação e vínculo cadastrados; executar uma recontratação num colaborador de teste desligado e conferir a linha nova em `vinculos` por consulta de leitura.

<details><summary>Arquivos (4)</summary>

- `src/components/colaborador-detalhes/TrabalhoHierarquiaTab.tsx`
- `src/components/colaboradores/RecontratarColaboradorDialog.tsx`
- `src/hooks/useVinculos.ts`
- `src/hooks/useColaboradorLotacao.ts`

</details>

## Aba Jornada & Ponto

`RECUPERAR` · esforço medio · 5 arquivos

**Valor para o negócio.** O RH passa a ver, dentro do dossiê, a jornada contratada, o ponto do dia, o resumo da semana, as ocorrências e os ajustes do colaborador, e consegue corrigir a jornada ali mesmo. Hoje isso exige sair do dossiê e ir ao módulo de Ponto filtrando pela pessoa.

**Risco de regressão.** Nenhum na main (adição). Atenção a um ponto de integração: useSaldoBancoHoras em useNovasTabelas.ts:251-257 chama bancoHorasService.getSaldo(colaboradorId, empresaAtual.id) com curto-circuito mockOr() antes — o mock é inofensivo porque isColaboradoresMockEnabled() exige import.meta.env.DEV && MODE!=='test' && VITE_COLABORADORES_MOCK==='true' (src/mocks/colaboradoresMock.ts:34-36, já presente na main), ou seja nunca liga em produção.

**Evidência.** JornadaPontoTab.tsx (191 linhas) e EditarJornadaDialog.tsx (112) não existem na main. Suas dependências src/components/ponto/PontoOcorrenciasCard.tsx, PontoAjustesCard.tsx e src/services/jornadaService.ts (49 linhas) também não (git cat-file -e origin/main falha nas três), mas PontoTodayCard.tsx, PontoWeekSummary.tsx, src/hooks/usePonto.ts e src/hooks/usePontoMelhorado.ts já estão na main. Os hooks useSaldoBancoHoras e useRegistrosPontoSemana vivem em origin/muri:src/hooks/useNovasTabelas.ts e estão ausentes da main. Tabelas `banco_horas`, `banco_horas_config` e `ajustes_ponto` existem em produção com rls_enabled=true.

**Plano.** 1) Copiar os 5 arquivos. 2) Acrescentar em src/hooks/useNovasTabelas.ts da main as funções useSaldoBancoHoras e useRegistrosPontoSemana copiadas da muri (adição; não reescrever o arquivo) e exportá-las em src/hooks/index.ts. 3) Registrar a aba 'jornada' na página com <JornadaPontoTab colaboradorId={id!} />. 4) Conferir que src/services/bancoHorasService.ts da main expõe getSaldo com a mesma assinatura (colaboradorId, empresaId); se não, ajustar o hook à assinatura da main, nunca o contrário. 5) Verificar: abrir a aba num colaborador com registros de ponto, editar a jornada pelo diálogo e conferir a gravação; npm run typecheck.

<details><summary>Arquivos (5)</summary>

- `src/components/colaborador-detalhes/JornadaPontoTab.tsx`
- `src/components/colaborador-detalhes/EditarJornadaDialog.tsx`
- `src/components/ponto/PontoOcorrenciasCard.tsx`
- `src/components/ponto/PontoAjustesCard.tsx`
- `src/services/jornadaService.ts`

</details>

## Aba Férias (resumo com prazos legais)

`RECUPERAR` · esforço medio · 1 arquivos

**Valor para o negócio.** Reúne num lugar o saldo e os períodos aquisitivos, as férias programadas, o risco de vencimento do período concessivo (pagamento em dobro, art. 137 da CLT) e os afastamentos recentes. É a informação que hoje obriga o RH a abrir o módulo de Férias e cruzar com o de Afastamentos.

**Risco de regressão.** Baixo. A aba 'Períodos Aquisitivos' da main (src/components/colaborador-detalhes/AquisitivosTab.tsx) é só leitura — não tem mutation nenhuma (git show origin/main confirma: só usePeriodosAquisitivos) — então não há CRUD a perder. Ainda assim, não remover AquisitivosTab: conferir primeiro se FeriasResumoTab mostra as mesmas cinco colunas (período aquisitivo, concessivo, saldo, faltas, status).

**Evidência.** FeriasResumoTab.tsx tem 701 linhas novas (git diff --stat) e não existe na main. Consome useFeriasResumoColaborador e useAfastamentosRecentes de @/hooks e usePeriodosAquisitivos de @/hooks/useColaboradorDetalhes (linhas 18-19); os dois primeiros estão ausentes da main (git grep 'export function' em origin/main não acha nenhum dos dois) e vivem em origin/muri:src/hooks/useColaboradorDetalhes.ts e src/hooks/useAfastamentos.ts. Tabelas `ferias`, `periodos_aquisitivos` e `afastamentos` existem em produção com rls_enabled=true. O componente é só leitura (nenhum mutateAsync no arquivo).

**Plano.** 1) Copiar FeriasResumoTab.tsx. 2) Acrescentar useFeriasResumoColaborador em src/hooks/useColaboradorDetalhes.ts da main (adição ao arquivo existente, copiada da muri) e useAfastamentosRecentes em src/hooks/useAfastamentos.ts; exportar as duas em src/hooks/index.ts. 3) Registrar a aba 'ferias' com <FeriasResumoTab colaboradorId={id!} onVerTodosMarcos={() => setActiveMainTab('timeline')} /> — o callback só faz sentido com o grupo da timeline aplicado; sem ele, passar um no-op ou apontar para a aba de histórico atual. 4) Manter AquisitivosTab acessível. 5) NÃO copiar src/components/colaborador-detalhes/AfastamentosTab.tsx (ver grupo de descarte). 6) Verificar: abrir a aba num colaborador com período aquisitivo vencendo e conferir o alerta; npm run typecheck.

<details><summary>Arquivos (1)</summary>

- `src/components/colaborador-detalhes/FeriasResumoTab.tsx`

</details>

## Aba Financeiro (KPIs, remuneração, holerites, dados bancários com edição)

`RECUPERAR_COM_MERGE` · esforço alto · 4 arquivos

**Valor para o negócio.** A aba Financeiro da main tem duas sub-abas (Contas Bancárias e Períodos Aquisitivos). A da muri mostra em uma tela os KPIs financeiros, o resumo da remuneração, os benefícios, os holerites recentes com lista completa em popup e as pendências financeiras — e permite corrigir uma conta bancária errada em vez de excluir e recadastrar, que é a causa mais comum de pagamento devolvido.

**Risco de regressão.** Copiar ContasBancariasTab.tsx da muri abre dado bancário e chave PIX de todo colaborador a qualquer usuário que consiga abrir o dossiê, desfazendo o controle por papel da PR #173 (8e93c355a, 2026-10-05, 'PII mascarada/logada em 15+ pontos'). A muri também perdeu a máscara de e-mail e telefone em outros pontos da mesma onda.

**Evidência.** FinanceiroResumoCards.tsx (422 linhas, exporta FinanceiroKpiRow, ResumoRemuneracaoCard, HoleritesPreviewCard, FinanceiroPendenciasCard), HoleritesTab.tsx (72) e src/lib/bankBrand.ts (195) não existem na main. useHoleritesColaborador está ausente da main e vive em origin/muri:src/hooks/useColaboradorDetalhes.ts; a tabela `holerites` existe em produção com rls_enabled=true. Em ContasBancariasTab (611 linhas de diferença) a muri ganha useAtualizarContaBancaria (edição; a main só tem useCriarContaBancaria/useExcluirContaBancaria) — e useAtualizarContaBancaria já existe em src/hooks/useTabelasReferencia.ts da main. PORÉM origin/muri:ContasBancariasTab.tsx linhas 150-151, 187-196 e 241-244 implementam um botão de olho (`revelado`/`toggleRevelado`) que mostra agência, conta e chave PIX por inteiro sem checagem de papel nenhuma, enquanto main:14,20,189-192 usa pii.bankAccount() e pii.pix() do hook usePiiMask, que libera o valor cheio só para admin/rh (src/hooks/usePiiMask.ts).

**Plano.** 1) Copiar FinanceiroResumoCards.tsx, HoleritesTab.tsx e src/lib/bankBrand.ts como estão. 2) Acrescentar useHoleritesColaborador em src/hooks/useColaboradorDetalhes.ts da main e exportar em src/hooks/index.ts. 3) ContasBancariasTab.tsx: NÃO substituir o arquivo. Partir da versão da main e trazer da muri (a) o layout com cartão de conta principal e a prop `capHeight`, (b) a marca do banco via src/lib/bankBrand.ts, (c) o caminho de edição usando useAtualizarContaBancaria de @/hooks/useTabelasReferencia. 4) Obrigatório: o botão de olho só pode existir quando pii.canViewPii for verdadeiro — trocar `revelado ? conta.agencia : maskBankAccount(conta.agencia)` por `pii.bankAccount(conta.agencia)` quando !pii.canViewPii, e renderizar o <button> de revelar apenas sob pii.canViewPii. Mesma regra para a chave PIX (usar pii.pix(conta.pix_tipo, conta.pix_chave)). 5) Montar a aba 'financeiro' conforme origin/muri:ColaboradorDetalhesPage.tsx (4 linhas: KPIs; contas + resumo da remuneração; benefícios + prévia de holerites; pendências) e o AnimatedCascadeDialog com a lista completa de holerites. 6) Verificar com dois usuários: um com papel rh (vê conta e PIX completos) e um sem (vê sempre mascarado, sem botão de revelar).

<details><summary>Arquivos (4)</summary>

- `src/components/colaborador-detalhes/FinanceiroResumoCards.tsx`
- `src/components/colaborador-detalhes/HoleritesTab.tsx`
- `src/components/colaborador-detalhes/ContasBancariasTab.tsx`
- `src/lib/bankBrand.ts`

</details>

## Aba Documentos & Compliance com anexo real de arquivo

`RECUPERAR` · esforço alto · 15 arquivos

**Valor para o negócio.** Fecha o furo mais visível da área: hoje o RH cadastra o número do documento mas não consegue anexar a cópia dele. Passa a existir arraste-e-solte com validação de tipo e tamanho, arquivo em bucket privado isolado por empresa, painel de status de compliance, anotações internas e prazos/alertas de vencimento — material de auditoria e de fiscalização.

**Risco de regressão.** Nenhum em funcionalidade: é adição, e o upload reaproveita a validação da main. Cuidado de escopo: os cards reconstroem a visão de DocumentosPessoaisTab e ColaboradorDocuments (comentário em DocumentosComplianceResumoTab.tsx:106-107), então não apagar esses dois arquivos da main nesta PR.

**Evidência.** Nenhum desses arquivos existe na main. A main NÃO tem upload de arquivo nessa área: grep por 'upload\|storage\|File' em origin/main:src/components/colaborador-detalhes/DocumentosPessoaisTab.tsx não retorna nada, e em ColaboradorDocuments.tsx só retorna o ícone FileText (linhas 11 e 166). origin/muri:src/services/documentUploadService.ts envia para bucket privado com caminho `${empresaId}/${colaboradorId}/${categoria}/${crypto.randomUUID()}.${ext}`, upsert:false, passando por validateUploadFile e sanitizeFileName de @/utils/uploadValidation — arquivo que JÁ existe na main. O bucket usado é `documentos` (DocumentosDigitaisCard.tsx:35,58 e DocumentosPessoaisCard.tsx:33,59) e ele existe em produção com public=false (supabase_storage_list_buckets). Os cards reusam as mutations que a main já tem: DocumentosPessoaisCard.tsx:14 importa useCriarDocumentoPessoal/useExcluirDocumentoPessoal e AnotacoesInternasCard.tsx:14 importa useAnotacoes/useCriarAnotacao — presentes na main. Vem com teste: documentos/**tests**/FileUploadField.test.tsx, 84 linhas, testando o próprio FileUploadField.

**Plano.** 1) Copiar os 15 arquivos. 2) Acrescentar o hook useConsentimentosColaborador (de src/hooks/useComplianceColaborador.ts) e confirmar que useMedidasDisciplinaresColaborador, useDocumentos, useDocumentosPessoais, useAnotacoes, useCriarAnotacao, useCriarDocumentoPessoal e useExcluirDocumentoPessoal já estão exportados em src/hooks/index.ts da main — todos confirmados presentes. 3) Registrar a aba 'documentos' com <DocumentosComplianceResumoTab colaboradorId={id!} />. 4) Não apagar DocumentosPessoaisTab.tsx nem ColaboradorDocuments.tsx. 5) Conferir que as políticas RLS do bucket `documentos` aceitam o caminho empresaId/colaboradorId/... para o papel do usuário logado — se bloquear, é item da regra 8 do Fluxo Git (DDL/policy em produção): parar e chamar o dono, não afrouxar o controle. 6) Verificar: npm run test -- FileUploadField; anexar um PDF a um documento pessoal de teste, reabrir e baixar pela URL assinada, excluir e conferir que o arquivo saiu do bucket.

<details><summary>Arquivos (15)</summary>

- `src/components/colaborador-detalhes/DocumentosComplianceResumoTab.tsx`
- `src/components/colaborador-detalhes/documentos/DocumentosPessoaisCard.tsx`
- `src/components/colaborador-detalhes/documentos/DocumentosDigitaisCard.tsx`
- `src/components/colaborador-detalhes/documentos/StatusComplianceCard.tsx`
- `src/components/colaborador-detalhes/documentos/StatusComplianceDialog.tsx`
- `src/components/colaborador-detalhes/documentos/AnotacoesInternasCard.tsx`
- `src/components/colaborador-detalhes/documentos/AnotacoesInternasDialog.tsx`
- `src/components/colaborador-detalhes/documentos/PrazosAlertasCard.tsx`
- `src/components/colaborador-detalhes/documentos/PrazosAlertasDialog.tsx`
- `src/components/colaborador-detalhes/documentos/FileUploadField.tsx`
- `src/components/colaborador-detalhes/documentos/FileTypeIcon.tsx`
- `src/components/colaborador-detalhes/documentos/__tests__/FileUploadField.test.tsx`
- `src/services/documentUploadService.ts`
- `src/utils/documentFileType.ts`
- `src/hooks/useComplianceColaborador.ts`

</details>

## Aba Desenvolvimento (formação, treinamentos, PDI, jornada interna)

`RECUPERAR` · esforço medio · 6 arquivos

**Valor para o negócio.** Dá ao RH a visão de carreira do colaborador: formação e certificados, treinamentos feitos e pendentes, competências, metas, PDI e o andamento do onboarding. A main hoje só tem duas tabelas soltas (Experiência Anterior e Formação) dentro da aba Carreira.

**Risco de regressão.** Nenhum: adição, e os dois CRUDs antigos (FormacaoTab, ExperienciaTab) continuam acessíveis por dentro dos cards, com as mesmas mutations.

**Evidência.** Os 6 arquivos não existem na main (git cat-file -e falha). src/hooks/useDesenvolvimentoColaborador.ts (137 linhas) concentra useCertificadosColaborador, useCompetenciasColaborador, useFeedbacksColaborador, useMetasColaborador, useOnboardingColaborador, usePDIsColaborador e useTreinamentosColaborador — os sete estão ausentes da main (git grep 'export function' em origin/main não acha nenhum). Tabelas `treinamentos`, `treinamento_participantes`, `treinamento_certificados`, `onboarding_tarefas`, `onboarding_colaborador` e `onboarding_templates` existem em produção com rls_enabled=true. Os cards não são telas paralelas: FormacaoQualificacoesCard.tsx:15,222 abre o próprio FormacaoTab dentro de um AnimatedCascadeDialog e JornadaInternaCard.tsx:12,125 abre o ExperienciaTab — reaproveitam o CRUD existente em vez de duplicá-lo.

**Plano.** 1) Copiar os 6 arquivos. 2) Exportar os 7 hooks de useDesenvolvimentoColaborador.ts em src/hooks/index.ts. 3) Registrar a aba 'desenvolvimento' com <DesenvolvimentoResumoTab colaboradorId={id!} />. 4) Confirmar que FormacaoTab e ExperienciaTab da main aceitam a prop `hideHeader` que os cards passam (FormacaoQualificacoesCard.tsx:222, JornadaInternaCard.tsx:125); se não aceitarem, acrescentar a prop opcional nos dois — mudança de poucas linhas, sem alterar comportamento padrão. 5) Verificar: abrir a aba num colaborador com treinamento e onboarding cadastrados, abrir os diálogos de Formação e de Experiência e gravar uma alteração em cada; npm run typecheck.

<details><summary>Arquivos (6)</summary>

- `src/components/colaborador-detalhes/DesenvolvimentoResumoTab.tsx`
- `src/components/colaborador-detalhes/desenvolvimento/FormacaoQualificacoesCard.tsx`
- `src/components/colaborador-detalhes/desenvolvimento/TreinamentosCard.tsx`
- `src/components/colaborador-detalhes/desenvolvimento/DesenvolvimentoProfissionalCard.tsx`
- `src/components/colaborador-detalhes/desenvolvimento/JornadaInternaCard.tsx`
- `src/hooks/useDesenvolvimentoColaborador.ts`

</details>

## Campos customizados por colaborador (fecha fluxo pela metade na main)

`RECUPERAR_COM_MERGE` · esforço medio · 2 arquivos

**Valor para o negócio.** Hoje o cliente consegue criar um campo customizado em Configurações e nunca preenchê-lo em colaborador nenhum — o recurso existe só no papel. Esta tela fecha o fluxo. A DadosPessoaisTab também consolida numa aba só os dados pessoais, dependentes, contatos de emergência, PCD e estrangeiro, que na main são quatro sub-abas separadas.

**Risco de regressão.** Copiar DadosPessoaisTab.tsx como está expõe CPF, RG e e-mail pessoal de todo colaborador a qualquer papel, desfazendo o mascaramento por papel da PR #173 (8e93c355a). Também é preciso garantir que as sub-abas embutidas (DependentesTab, EmergenciaTab, PCDTab, EstrangeiroTab) continuem sendo as versões da main, que mascaram.

**Evidência.** A main já tem o lado de configuração (src/components/settings/CamposCustomizadosTab.tsx, referenciado em src/pages/ConfiguracoesPage.tsx) e já tem o service pronto e endurecido: origin/main:src/services/colaboradorDetalhesService.ts linhas 523 obterValoresCamposCustomizados e 534 salvarValorCampoCustomizado, esta usando validateTablePayload (Zod, PR #165). O que falta na main são só os hooks e a tela: useValoresCamposCustomizados e useSalvarValorCampoCustomizado estão ausentes (git grep em origin/main) e existem em origin/muri:src/hooks/useColaboradorDetalhes.ts; src/components/colaborador-detalhes/CamposCustomizadosTab.tsx (140 linhas) não existe na main. Tabelas `campos_customizados` e `valores_campos_customizados` existem em produção com rls_enabled=true. RISCO: origin/muri:DadosPessoaisTab.tsx linha 16 importa formatCPF de @/utils/format e as linhas 211, 214 e 225 mostram CPF, RG e e-mail pessoal sem máscara nenhuma e sem checagem de papel.

**Plano.** 1) Copiar CamposCustomizadosTab.tsx. 2) Acrescentar useValoresCamposCustomizados e useSalvarValorCampoCustomizado em src/hooks/useColaboradorDetalhes.ts da main, apontando para as funções que a main JÁ tem no service (obterValoresCamposCustomizados e salvarValorCampoCustomizado) — não copiar a versão da muri do service, que não passa por validateTablePayload. 3) Copiar DadosPessoaisTab.tsx e, antes de commitar, trocar formatCPF por pii.cpf do hook usePiiMask nas linhas 211, 214 (RG) e 225 (e-mail pessoal), com const pii = usePiiMask() no topo. 4) Garantir que os imports internos (./DependentesTab, ./EmergenciaTab, ./PCDTab, ./EstrangeiroTab) resolvem para os arquivos da main. 5) Registrar a aba 'pessoal' com <DadosPessoaisTab colaboradorId={id!} colaborador={colaborador} />. 6) Verificar com usuário sem papel admin/rh que CPF, RG e e-mail aparecem mascarados; preencher um campo customizado e conferir a linha nova em valores_campos_customizados por consulta de leitura.

<details><summary>Arquivos (2)</summary>

- `src/components/colaborador-detalhes/CamposCustomizadosTab.tsx`
- `src/components/colaborador-detalhes/DadosPessoaisTab.tsx`

</details>

## Edição inline de contato de emergência e de formação

`RECUPERAR_COM_MERGE` · esforço baixo · 2 arquivos

**Valor para o negócio.** Corrigir um telefone de emergência digitado errado hoje exige excluir o contato e recadastrar — e o registro excluído sai da trilha. Mesmo caso na formação acadêmica. É o fluxo 'cria sem editar' que a regra do dono trata como entrega pela metade.

**Risco de regressão.** Substituir os dois arquivos pelos da muri apaga o mascaramento de telefone, celular e e-mail do contato de emergência (três chamadas pii.* em main:129-131). Dado pessoal de terceiro (familiar), não do colaborador — exposição mais sensível ainda.

**Evidência.** origin/main:EmergenciaTab.tsx usa só useCriarContatoEmergencia e useExcluirContatoEmergencia; origin/muri acrescenta useAtualizarContatoEmergencia. origin/main:FormacaoTab.tsx usa só useCriarFormacao e useExcluirFormacao; origin/muri acrescenta useAtualizarFormacao. Os dois hooks novos estão ausentes da main e existem em origin/muri:src/hooks/useColaboradorDetalhes.ts (diff dos 'export function' entre as pontas lista useAtualizarContatoEmergencia e useAtualizarFormacao como adições). RISCO: origin/muri:EmergenciaTab.tsx não tem máscara nenhuma (grep por 'mask\|piiMask' no arquivo: nenhum resultado), enquanto origin/main:EmergenciaTab.tsx linhas 17, 28 e 129-131 aplica pii.phone(c.telefone), pii.phone(c.celular) e pii.email(c.email).

**Plano.** 1) NÃO substituir os arquivos. 2) Acrescentar useAtualizarContatoEmergencia e useAtualizarFormacao em src/hooks/useColaboradorDetalhes.ts da main (copiados da muri) e exportá-los se o barrel os expuser. 3) Em src/components/colaborador-detalhes/EmergenciaTab.tsx da main, trazer da muri apenas o caminho de edição (estado do formulário em modo edição, botão de lápis por linha, chamada da mutation de atualizar), preservando intactas as linhas que usam pii.phone/pii.email. 4) Mesmo procedimento em FormacaoTab.tsx com useAtualizarFormacao. 5) Trazer também a prop opcional `hideHeader` que os cards do grupo Desenvolvimento esperam em FormacaoTab. 6) Verificar: editar um contato de emergência e uma formação, conferir a gravação, e confirmar com usuário sem papel admin/rh que telefone e e-mail seguem mascarados.

<details><summary>Arquivos (2)</summary>

- `src/components/colaborador-detalhes/EmergenciaTab.tsx`
- `src/components/colaborador-detalhes/FormacaoTab.tsx`

</details>

## Descartado nesta área

- **Arquivos da muri sem consumidor — não trazer** (`OBSOLETO`) — Nenhum dos três componentes é importado por arquivo algum em origin/muri fora do index.ts: `git grep -l '\bAfastamentosTab\b' origin/muri -- src/` (excluindo o próprio arquivo e o index) não retorna nada; para SSTResumoTab e ComplianceTab os únicos resultados são MENÇÕES EM COMENTÁRIO em src/components/colaborador-detalhes/documentos/StatusComplianceCard.tsx linhas 36-37 ('mesmas query keys de ComplianceTab; ... mesma de SSTResumoTab'), não imports. A página da muri não os importa (lista de imports de @/components/colaborador-detalhes em ColaboradorDetalhesPage.tsx linhas 32-39). Os dados que eles mostrariam já chegam por outro caminho: FeriasResumoTab.tsx:18 consome useAfastamentosRecentes direto, e StatusComplianceCard (grupo Documentos) cobre medidas disciplinares e consentimentos LGPD.

## Perda se a área for descartada inteira

Descartar esta área inteira mantém o dossiê como uma ficha de cadastro: o RH continua sem ver, num só lugar, pendências do colaborador, próximos prazos legais (fim de experiência, vencimento do período concessivo de férias com risco de pagamento em dobro pelo art. 137 da CLT, ASO vencendo, documento expirando, tarefa de onboarding atrasada), saldo de banco de horas, afastamento ativo, vínculos/lotações, histórico de ponto e trilha única de vida funcional. Também ficam pela metade três fluxos: campos customizados podem ser definidos em Configurações mas nunca preenchidos no colaborador (main tem src/components/settings/CamposCustomizadosTab.tsx e o service, mas não a tela de preenchimento); contato de emergência e formação só podem ser criados e excluídos, nunca corrigidos; e documento pessoal/digital não aceita anexo de arquivo nenhum (nenhuma referência a upload ou storage em src/components/colaborador-detalhes/DocumentosPessoaisTab.tsx e ColaboradorDocuments.tsx na main). Soma ~8.500 linhas de trabalho entregue. Perde-se ainda a correção de um bug que está em produção hoje: o botão "Editar Perfil" do dossiê não funciona.
