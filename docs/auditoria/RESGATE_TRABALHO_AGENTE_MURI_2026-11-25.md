# Resgate do trabalho do agente Muri — 2026-11-25

> Escopo: garantir que nenhum trabalho do agente Muri — nem das tentativas de integração feitas por outros agentes — se perca, e registrar a regra de resgate que impede regressão. **Nenhuma branch foi apagada.** Tudo o que existia apenas no disco local agora está no `origin`.

## 1. O risco que existia

O port do Muri vivia em 4 branches **locais** mais 1 entrada de `git stash` compartilhada pelos worktrees do repo. Nenhuma dessas refs existia no `origin`. Um `git reset --hard`, um `git clean -fdx` — ou a simples perda do disco/WSL — apagava o trabalho inteiro: 1.381 a 1.971 arquivos por estado.

## 2. O que foi preservado (todas agora no `origin`)

| Ref                                                  | SHA         | Conteúdo                                                          | Papel                                                                                              |
| ---------------------------------------------------- | ----------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `claude/feat-resgata-trabalho-muri-261124-1400`      | `296a01873` | 1.381 arquivos — 535 novos, 844 modificados, 2 removidos          | **port conservador**: só arquivos que não existem na main + os marcados `SO_MURI`. Base do resgate |
| `claude/feat-integracao-muri-3way-261125-0030`       | `fd7f3ccee` | 1.971 arquivos (merge Muri × main "preservando a lógica da main") | variante agressiva; fica para consulta arquivo a arquivo                                           |
| `claude/chore-preserva-stash-muri-261124`            | `22aef52b3` | `stash` de 1.381 arquivos (+114.009/−47.684)                      | 59 arquivos acima do `296a01873`: 58 docs + `src/assets/banks/SOURCES.md`                          |
| `claude/feat-integracao-trabalho-muri-261124-1501`   | `c1fc5a6cb` | 383 arquivos                                                      | snapshot de medição: docs, e2e NineBox/Premiações e ~60 `scripts/_tmp-*.mjs`                       |
| `claude/feat-resgata-ui-muri-261124-1246`            | `fbc3dc010` | 224 arquivos (198 novos em `src/`)                                | snapshot de UI; 135 dos 289 arquivos novos são importados por outro arquivo (não é código morto)   |
| `claude/chore-preserva-wip-medicao-muri-261124-1715` | `8ed98aaca` | 493 arquivos (+92.630/−31.313)                                    | commit órfão recuperado por `git fsck --unreachable`                                               |

## 3. Regra de resgate: o Muri **não** é mais novo em tudo

O material do Muri foi construído sobre outra base e sobre outro projeto Supabase. Em vários arquivos ele está **atrás** da main, porque agentes posteriores endureceram segurança aqui. Portar um arquivo modificado inteiro é, nesses casos, **regressão**.

Três casos medidos (`git diff --numstat main 296a01873`):

| Arquivo                     | main → Muri   | O que se perde portando o Muri                                                                                                                                                            |
| --------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/piiMask.ts`      | +12 / **−48** | `maskPiiDeep` (mascaramento recursivo de PII em payloads de auditoria/export), `maskGeneric` e a regex `PII_KEY`. Consumidores atuais: `src/hooks/usePiiMask.ts`                          |
| `src/utils/safeUrl.ts`      | +8 / −3       | A allowlist da main aponta para o projeto canônico `frjbfeamybqsejlvmqbl.supabase.co`; a do Muri para `ciziytrrjjotlsjzshnm.supabase.co` (projeto dele) e abre `.supabase.co` como sufixo |
| `src/utils/sanitizeHtml.ts` | +20 / **−80** | A lista explícita de handlers `on*` cai de **77 para 12** atributos                                                                                                                       |

**Consequência prática:** só entra o que é **aditivo** (arquivo novo, ou função nova em arquivo existente) **e** tem consumidor na main. Arquivo modificado entra por recorte revisado, nunca "o arquivo do Muri por cima".

## 4. Comparação byte a byte Muri × main

Método: `git ls-tree -r --format='%(objectname) %(path)'` das duas árvores (hash do blob por caminho, independente de histórico) e junção por caminho. Muri: 5.320 entradas; main `252cc8071`: 4.085.

| Situação    | Arquivos |
| ----------- | -------- |
| Idênticos   | 1.203    |
| Divergentes | 1.574    |
| Só no Muri  | 2.543    |
| Só na main  | 1.308    |

Divergentes por pasta: 713 `src/components`, 163 `src/services`, 137 `src/hooks`, 114 `src/pages`, 104 `supabase/migrations`, 90 `supabase/functions`.

## 5. Resgatado até aqui

- **#870** — "Ver todos" dos Talentos em destaque abre a janela completa (aba Nine-Box). 11 arquivos: `NineBoxTalentosDialog` novo, `onVerTodos` no card, perfis de saída (`CASCADE_SAIDA_RAPIDA`) no `cascade-motion`, 4 arquivos de teste novos. Verificado: `tsc --noEmit` 0 erros, 322 testes em 18 arquivos verdes, `audit:ratchet-any-tests` e `audit:ratchet-warnings` sem regressão.
- **#875** — **Turnos**: `src/pages/TurnosPage.tsx` + `src/components/turnos/*` (30 arquivos) + `src/services/turnoService.ts`, com `main.tsx` e rota consumindo a página (fecho transitivo conferido, nenhum órfão). Orçamento de bundle medido no CI e ajustado em `scripts/.bundle-budget.json` (`js_total_kb 8073`, `js_max_chunk_kb 980`, `css_total_kb 366`). Mergeada em 25/11/2026 (`2a62b1124`); todos os checks verdes — o único vermelho é o `Integridade do banco canônico (live)`, que é o defeito de RLS de `provisoes_folha` (item 9) e não tem relação com esta feature.
- **#873** — **Banco de Horas** completo: `BancoHorasPage` reescrita (filtros de período, 5 KPIs, extrato paginado com busca/ordenação/tipo, cascata de detalhe, rosca de situação, barras de totais, alerta de saldo negativo, evolução do saldo e CSV) + 21 módulos do fecho transitivo que não existiam na main (11 `components/banco-horas`, `horasExtrasComum`, `FiltroSelectConteudo`, `tooltipGrafico`, `revelacaoGrafico`, `entradaGlobal`, `progressMotion`, `donutMotion`, `estruturaAnimacoes`, `linha-tabela-hover`, `useEntradaCardConcluida`) + `bancoHorasService.listarDaEmpresa` tipado. Verificado: `tsc 0`, `typecheck:tests 0`, eslint/prettier limpos, ratchets verdes, 60 testes vitest, build ok e `css_total_kb 359 ≤ 362` / `js_total_kb 7999 ≤ 8000`.

## 6. Fila de resgate (valor × risco)

1. **~~Ponto / geofencing~~ — RESGATADO na #883.** `src/utils/pontoGeofencing.ts`, `src/hooks/usePontoGeofencing.ts`, `PontoGeofencingPainel`, `PontoGeoMapa`, `PontoGeoRegistros` entraram com os consumidores (painel com mapa real na aba Ponto).
2. **~~Turnos~~ — RESGATADO na #875.** `src/components/turnos/*` (30 arquivos) + `turnoService`, página e rota.
3. **~~Banco de horas~~ — RESGATADO na #873.** `src/components/banco-horas/*` (11 arquivos) + `exportarBancoHoras` + os primitivos de UI do port que a página consome (`tooltipGrafico`, `revelacaoGrafico`, `entradaGlobal`, `progressMotion`, `donutMotion`, `estruturaAnimacoes`, `linha-tabela-hover`, `useEntradaCardConcluida`, `horasExtrasComum`, `FiltroSelectConteudo`).
4. **~~Horas extras~~ — RESGATADO na #884.** `horas-extras/*` (19 arquivos, 14 testes) com `HorasExtrasPage` revisada e não substituída; a tela de solicitações entrou inteira.
5. **~~Pesquisas de clima~~ — RESGATADO na #885.**
6. **`supabase/migrations` divergentes** — DDL: exige autorização explícita antes de qualquer `apply` (as 316 versões do ledger sem fonte local já têm placeholder no-op desde a #865). O lote curado de 17 arquivos foi aplicado e verificado no canônico em 25/11/2026 — ver item 9.

## 7. Auditoria das refs remotas

- `origin/pr/304` … `origin/pr/321` (9 refs): **todas as PRs estão `MERGED`**. O conteúdo está na main via _squash-merge_, por isso `git merge-base --is-ancestor` dá falso negativo. Provas por `git log origin/main --grep='(#N)'`: 304→`e8febd257`, 315→`57054a5ff`, 316→`231cdb74b`, 320→`a90a4feaf`, 321→`529a8d6c5`, 319→`e1a18efd7` (squash de #309+#313+#317+#319).
- `origin/automation/inventario-estado`: 1 commit de bot, só `inventario/estado/*.json`.
- `origin/contexto`: artefatos de bot (`chore(contexto): N fonte(s) regerada(s)`), sem código de aplicação.

## 8. Fecho transitivo — o método que fechou a conta

Contar arquivos e procurar consumidores por `grep` não responde "isto está vivo?". A pergunta certa é: **este arquivo é alcançável a partir de `src/main.tsx`?** Se não for, ele nunca é carregado em produção, por mais bem escrito que esteja.

Método (`/tmp/fecho5.py`): BFS nos imports a partir de `src/main.tsx`, lendo `from '...'` e `import('...')`, resolvendo `@/` → `src/` e caminhos relativos (`base`, `base.ts`, `base.tsx`, `base/index.*`), e comparando cada arquivo alcançado com `git ls-tree -r --name-only origin/main`.

Resultados:

| Árvore                            | Alcançáveis                       | Observação                                     |
| --------------------------------- | --------------------------------- | ---------------------------------------------- |
| `origin/main`                     | 1031 de 1892                      | baseline saudável                              |
| Port do Muri (`296a01873`)        | 1145 de 2047                      | 73 dos 170 arquivos da fila **estão vivos lá** |
| #872 (119 arquivos novos)         | 0 dos 119                         | tudo órfão na árvore da main                   |
| Fecho da `BancoHorasPage` na #873 | 261 no total, 21 ausentes na main | 21 portados, todos vivos                       |

Conclusão que mudou a estratégia: o Muri **reescreveu as páginas** (M, com remoções) para montar os componentes novos. Portar a fila isolada criaria código morto (foi o que a #872 fazia); portar as páginas inteiras, sem comparar, removia comportamento da main. O caminho correto é **portar por feature viva**: pegar a página que consome o conjunto, calcular o fecho transitivo dela e trazer exatamente os módulos que faltam na main — foi o que a #873 fez com Banco de Horas.

A #872 foi **fechada sem merge e sem apagar a branch**: os 119 arquivos ficam preservados no remoto (`8bdf70d5e`) para resgate incremental, um por feature. Nenhuma página de produção do port é superconjunto puro da main (todas têm deleções), então cada resgate restante exige comparação funcional — não substituição cega.

## 9. Banco canônico — lote aditivo aplicado (25/11/2026)

O `canonical-migrations.yml` roda em três modos (`validate` → `apply` → `verify`) e o "dry-run" do `validate`
**não era** dry-run: as migrations carregam `BEGIN;/COMMIT;` próprios, e o `COMMIT` interno fechava a
transação de teste. Isso derrubava a simulação com `relation "public.config_retencao" does not exist`
(a `p3_060` rodava duas vezes). Corrigido na #877, junto com os dois sidecars de índice que cobravam
objetos que o banco real não tem (#880) e com 4 defeitos de SQL da `p4_071` (#879).

Lote de 17 migrations aplicado no projeto `frjbfeamybqsejlvmqbl`:

| passo      | run         | resultado                                       |
| ---------- | ----------- | ----------------------------------------------- |
| `validate` | 45609683492 | SUCCESS (primeiro verde de todos os três modos) |
| `apply`    | 45610349420 | SUCCESS                                         |
| `verify`   | 45610901215 | SUCCESS                                         |

Confirmado por consulta read-only no canônico (run 45611331779): `backup_logs` existe com RLS e 1 policy,
6 materialized views presentes, `refresh_dashboard_views` **sem** EXECUTE para `anon`, 27 índices do top-20
e 17 versões novas no ledger. O único DDL não-aditivo do lote é `ALTER COLUMN empresa_id SET NOT NULL` em
`colaboradores`/`folhas_pagamento`/`despesas`, guardado por checagem de nulos.

### Pendência aberta: RLS de `provisoes_folha` e `historico_calculos_folha`

Com o `refresh_dashboard_views` fechado, o step 8 do job `Integridade do banco canônico (live)`
(`scripts/audit-rls-pii.mjs`) passou a reprovar seis policies que derivam o tenant de claim livre do JWT
(`app_metadata ->> 'empresa_id'`) — claim que o próprio usuário pode forjar contra o PostgREST:

- `provisoes_folha_insert` / `_update` / `_delete` (de `20260804000000_p0_010_write_policies_provisoes.sql`);
- `Acesso por empresa historico` / `Insercao por empresa historico` / `historico_calculos_delete`.

A correção está na **#881**, aberta e **sem merge**: migration aditiva `20261125130000` reescrevendo as seis
com `public.pertence_a_empresa(empresa_id)`, sem mudar regra de negócio (`is_admin`/`has_role` continuam
iguais). Provado em Postgres 16 descartável (auditor reprova 6 antes, OK depois; migration idempotente;
sidecar responde `ok`). Toca `canonical-migrations.yml`, então é regra 8 — aguarda autorização para
mergear e aplicar.

### Fila restante do port do Muri

1. **~~Ponto / geofencing~~ — RESGATADO na #883.** `src/utils/pontoGeofencing.ts`,
   `src/hooks/usePontoGeofencing.ts`, `PontoGeofencingPainel`, `PontoGeoMapa`, `PontoGeoRegistros`
   entraram com os consumidores.
2. **~~Horas extras~~ — RESGATADO na #884.** `horas-extras/*` (19 arquivos, 14 testes); a página foi
   revisada, não substituída.
3. **Demais páginas do port** — cada uma exige comparação funcional (todas têm deleções, nenhuma é
   superconjunto puro da main).

### Entregas do resgate (25/11, todas em `main` ou em PR)

| fatia                                                | PR                       | o que saiu do port e entrou na main                                                                                                                                                                                                                                                                                       | prova                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ponto / dashboard                                    | #886 (merge `58dd46c64`) | 5 cards de resumo (`PontoIndicadoresKpi`, `PontoEquipeStatusCard`, `PontoBancoHorasCard`, `PontoPendenciasCard`, `PontoFechamentoCard`), `indicadoresPonto`, `usePontoDashboard`, `pontoDuracao`, `pontoEquipe` + abas controladas na `PontoPage`                                                                         | 50 testes de `src/components/ponto`; suíte completa 8350; deploy Production `8063649559` success                                                                                                                                                                                     |
| Formulário de vaga                                   | #887 (merge `08dd398c3`) | a vaga criada pela UI passou a gravar cargo, tipo de contrato, faixa mín/máx, descrição e benefícios (antes só título/departamento/modalidade/quantidade/requisitos)                                                                                                                                                      | `RecrutamentoPage.vagaForm.test.tsx` (payload real completo + bloqueio de faixa invertida); deploy Production `8063907122` success                                                                                                                                                   |
| Janela "Ver todas" do desempenho por vaga            | #888 (merge `ced6c84aa`) | `DesempenhoVagasDialog` (36 KB, estava sem consumidor), `analyticsVisual`, `analyticsVagasFiltros`, `barraProgressoAnalytics`, `animacaoDetalheVaga`, `ui/interacao-cards` e `detalhes`/`SituacaoVaga`/`DetalheVaga`/`construirDetalheVagas`/`resumirDesempenhoVagas` em `analyticsComum`                                 | `desempenhoVagasModal.test.tsx` (do port: KPIs, filtros, ordem, teclado, foco) + 1 caso em `analyticsComum.test.ts`; suíte completa 8373 passed                                                                                                                                      |
| Recorte (período/vaga) e exportação CSV da Analytics | #891 (merge `c697595dd`) | `analyticsFiltros` (período `tudo/30/90/180/365` ancorado na data de referência da base + filtro por vaga), `analyticsRelatorio` (CSV com BOM) e `AnalyticsBarraFiltros` na aba Analytics; `--transition-duration-slower` no `@theme` do `index.css` e "Sincronizar" migrado para `FlowHoverButton` (paridade com o port) | `analyticsFiltros.test.ts` + `analyticsRelatorio.test.ts` + `analyticsExportarAnimacao.test.tsx` (do port) + `AnalyticsRecrutamento.recorte.test.tsx` (barra e CSV no nível da aba); suíte `recrutamento`+`dashboard` 159 passed; `tsc` limpo                                        |
| Editar a escala do dia pelo card Hoje                | #892 (merge `58eab8d32`) | `EditarEscalaDialog` (130 linhas, estava sem consumidor no port) ligado ao `PontoTodayCard` por um lápis; grava por `turnoService.criarEscala`/`atualizarEscala` conforme já exista escala do dia, com link para Turnos & Escalas quando a empresa não tem turno cadastrado                                               | `EditarEscalaDialog.test.tsx` (3 casos: sem turnos; INSERT com `{empresa_id, colaborador_id, turno_id, data, status:'agendado'}`; UPDATE sem duplicar) + 1 caso no `PontoTodayCard.test.tsx` (lápis só com colaborador e empresa); 364 testes em `ponto`/`pages` passed; `tsc` limpo |
| Feedbacks (ordem da coluna) e login                  | #894 (merge `7a0aee8ae`) | ordem aprovada da coluna de Feedbacks e os ajustes de login do port (detalhe no corpo da PR)                                                                                                                                                                                                                              | suíte completa verde no merge                                                                                                                                                                                                                                                        |
| Central de Ajustes e Auditoria do Ponto              | #895                     | `AuditoriaPonto` + `CentralAjustes*` (8) + `CentralAuditoria*` (5) + `centralAjustes.ts` + `centralAuditoria.ts` + `mocks/pontoAuditoriaMock.ts` + 8 suítes; nova aba **Registros**, aba **Auditoria** trocada, `MetricCard.compact` aditivo — ver §11                                                                    | `tsc` limpo, ratchets 1→1 / 0→0, `format:check:changed` 29 OK, `vitest src/components src/pages` 4475 passed, build OK, `js_total_kb 8507`                                                                                                                                           |

Descartes conferidos nesta rodada (trabalho parcial que **não** foi resgatado, por falta de consumidor real ou
por duplicar regra já existente): `NovaVagaDialog` (wizard de 1324 linhas + `novaVagaRascunho`) — o formulário
existente foi completado em vez de trocar o fluxo; `PROXIMOS_PASSOS_UI_RECRUTAMENTO`, `roadmap` de analytics e
os mocks `pontoFluxoMock`/`auditoriaMock`/`dashboardMockData`/`admissoesMock`/`desligamentosMock`.

## 10. Mapa final do port — o que continua fora da `main` e por quê (25/11/2026)

Depois das fatias #870, #873, #875, #881, #886, #887, #888, #890, #891 e #892, refiz a varredura
completa das três branches do port que ainda têm arquivos ausentes na `main`
(`feat-ponto-utils-resgate` `8bdf70d5e`, `feat-integracao-trabalho-muri` `c1fc5a6cb`,
`feat-resgata-ui-muri` `fbc3dc010`): **601 arquivos novos** que não existem na `main`. Destes,
**71 são de produção** (`src/**`, descontando `mocks/`, `__tests__/` e assets). Cada um passou por
três provas independentes:

1. **Vive no port?** `git grep -l <basename>` na árvore do port, ignorando o próprio arquivo e
   `__tests__/`. Zero consumidores significa que o arquivo nunca é carregado.
2. **Já existe na `main`?** `git grep -l <símbolo exportado>` na árvore de `origin/main`.
3. **É idêntico?** `git diff origin/main fbc3dc010 -- <path>`.

Resultado: **31 mortos no port** e **40 vivos** — e nenhum dos vivos é funcionalidade ausente:
todos têm equivalente na `main`, ou aparecem apenas em comentário (a `main` registra o que veio de
onde), ou são uma segunda redação da mesma tela.

### 10.1 Mortos no port — 31 arquivos (0 consumidores fora de teste)

`calculadoraRescisao/ResultadoRescisao.tsx` (641) · `calculadoraRescisao/rescisaoView.ts` (242) ·
`lib/detectorReactDuplicado.ts` (422) · `services/dominioAlterdataService.ts` (400) ·
`ponto/centralAuditoria.ts` (733, só consumido pelo próprio conjunto morto) ·
`metabase/MetabaseEmbed.tsx` (424) · `services/metabaseService.ts` (155) ·
`ui/timelineReveal.ts` (164) · `lib/useTracing.ts` (155) · `lib/tracedService.ts` (79) ·
`calculators/folhaCompleta.ts` (152) · `services/automacaoService.ts` (130) ·
`dashboard/anelDonut.tsx` (146) · `premiacoes/PainelAuditoriaRoi.tsx` (169) ·
`ponto/PontoHorasSemanaCard.tsx` (320) · `ponto/PontoUltimasBatidasCard.tsx` (258) ·
`ponto/CentralAjustesTabela.tsx` (344) · `ponto/CentralAjustesDetalhesDialog.tsx` (290) ·
`ponto/CentralAjustesKpis.tsx` (117) · `ponto/jornadaEtapas.ts` (61) ·
`ponto/PontoFluxoEntradasDica.tsx` (117) · `ponto/acoesCabecalhoPonto.ts` (174) ·
`recrutamento/analyticsFunilAnimacao.ts` (238) · `recrutamento/AnalyticsVariacao.tsx` (61) ·
`recrutamento/OrigemLogotipo.tsx` (76) · `admissoes/ChipFiltroAuditoria.tsx` (96) ·
`dashboard/AlertasProximasCard.tsx` (31) · `hooks/useFeriasCursor.ts` (107) ·
`hooks/useCalculoFeriasPreview.ts` (34) · `hooks/useActionStateHelper.ts` (114) ·
`utils/esocialEventosSST.ts` (43) · `utils/esocialEventosPeriodicos.ts` (22) ·
`validators/esocialValidators.ts` (9) · `services/cnabLayoutService.ts` (11) ·
`pages/__MeasureTestPage.tsx` (24).

Provas pontuais, para não repetir a varredura:

- `DicaFluxoEntradas` e `acoesCabecalhoPonto` só aparecem em **comentários** — `PontoGeoMapa.tsx:27,240`
  e `acoesCardsPonto.ts:43`.
- `analyticsFunilAnimacao`, `folhaCompleta`, `MetabaseEmbed`, `dominioAlterdataService` e
  `timelineReveal` têm como único consumidor o próprio arquivo de teste, fora da árvore de produção.
- `src/components/esocial/ESocialAIInsights.tsx` é **proibido** pela `main`:
  `src/components/__tests__/ESocialSemDadosFicticios.test.tsx:78` assere que o arquivo não existe.
- `calculadoraRescisao/FormularioRescisao.tsx` + `ResultadoRescisao.tsx` são o estado anterior da
  própria `CalculadoraRescisaoPage`: `git diff origin/main fbc3dc010 -- src/pages/CalculadoraRescisaoPage.tsx`
  é **vazio** (0 linhas), e a `main` cita os dois arquivos em `CalculadoraRescisaoPage.tsx:53,405`.

### 10.2 Vivos — onde a `main` já entrega a mesma coisa

| Conjunto do port                                                                                                                                                                                                         | Linhas      | Consumidor no port                | O que existe na `main` no lugar                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ponto/CentralAjustes*` (7) + `centralAjustes.ts`                                                                                                                                                                        | 1.563 + 456 | `PontoPage` do port               | `PontoAdjustmentRequests` (563 linhas): tabela, filtros, seleção múltipla, export Portaria 671 e log de PII, na aba **Ajustes**                                                                                                                                                                                                                  |
| `ponto/CentralAuditoria*` (5) + `AuditoriaPonto.tsx`                                                                                                                                                                     | 1.247 + 398 | `PontoPage` do port               | `PontoAuditTimeline` + a trilha `TrilhaAuditoriaPonto` dentro de `PontoAdjustmentRequests`, na aba **Auditoria**                                                                                                                                                                                                                                 |
| `dashboard/entradaDashboard.ts`                                                                                                                                                                                          | 596         | `ui/entradaGlobal.ts` (port)      | `src/components/ui/entradaGlobal.ts` + `entrada-cards.tsx` da `main` (orquestração de entrada própria)                                                                                                                                                                                                                                           |
| `recrutamento/NovaVagaDialog.tsx` + `novaVagaRascunho.ts`                                                                                                                                                                | 1.324 + 307 | o próprio diálogo                 | `RecrutamentoPage` + formulário completado na **#887** (o wizard não grava `nova_vagas` do schema atual)                                                                                                                                                                                                                                         |
| `dashboard/HeadcountOverviewCard.tsx` (298), `DepartmentsCard.tsx` (107), `TipoVinculoCard.tsx` (182), `MapaEstruturaCard.tsx` (182), `QuickActionsMenu.tsx` (74), `SaudeResumoCard.tsx` (48), `arcoDonutMotion.ts` (94) | 1.343       | `DashboardExecutivoPage` do port  | `AdmissoesDashboard` (1.581 linhas) cita `HeadcountOverviewCard`/`DepartmentsCard` como a **referência visual** já aplicada; `QuickActionsGrid.tsx:46` diz "atalhos resgatados do `QuickActionsMenu` da branch `muri`"; `estruturaAnimacoes.ts` e `ResumoOperacionalCard.tsx` absorveram `MapaEstruturaCard`/`TipoVinculoCard`/`SaudeResumoCard` |
| `colaboradores/AnimatedDossieTabs.tsx` (110), `colaborador-detalhes/ComplianceTab.tsx` (65), `CampoInfo.tsx` (22)                                                                                                        | 197         | `ColaboradorDetalhesPage` do port | `ColaboradorDetalhesPage.tsx:324` registra que "a muri trazia um componente NOVO; a main já" tinha o equivalente; `CampoInfo` existe em `DadosPessoaisTab.tsx:26`                                                                                                                                                                                |

> Conferido uma a uma: a **primeira** linha desta tabela (Central de Ajustes/Auditoria) foi resgatada na
> **#895** — ver §11. As demais seguem fora da `main` pelos motivos da coluna da direita.

### 10.3 Conclusão da rodada exaustiva

- **Não há mais arquivo do port que possa entrar na `main` sozinho.** Resgatar qualquer um dos 31
  mortos criaria código que nenhuma tela carrega; os 40 vivos são duplicatas de telas que já existem
  com mais recursos do que o port (export PDF, PII, RLS, testes).
- **~~O resgate de valor restante era o redesign da aba Ajustes/Auditoria do Ponto~~ — RESGATADO na
  #895** (§11), sem perder o export Portaria 671, o log de PII, o painel de batidas
  (`GestaoRegistrosPonto`) nem a aba "Espelhos em papel".
- As branches do port seguem preservadas no remoto (`296a01873`, `8bdf70d5e`, `c1fc5a6cb`, `fbc3dc010`,
  `8ed98aaca`, `22aef52b3`) e nenhuma foi apagada.

## 11. Central de Ajustes e Auditoria do Ponto resgatadas (25/11/2026, #895)

Era o último item de valor do port: 16 componentes, 2 módulos puros, 1 mock e 8 suítes de teste que o
agente do port escreveu em `296a01873` e **nunca ligou em tela nenhuma**.

### O que entrou

| Origem (port `296a01873`)                               | Destino na `main`                                    |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `ponto/AuditoriaPonto.tsx` (398 linhas)                 | aba **Auditoria** da `PontoPage`                     |
| `ponto/CentralAjustes*` (8 arquivos, 1.563 linhas)      | `PontoAdjustmentRequests`, na nova aba **Registros** |
| `ponto/CentralAuditoria*` (5 arquivos, 1.247 linhas)    | consumido por `AuditoriaPonto`                       |
| `ponto/centralAjustes.ts` (456) + `centralAuditoria.ts` | módulos puros de agregação                           |
| `mocks/pontoAuditoriaMock.ts`                           | mock das 8 suítes                                    |
| 8 suítes de teste                                       | `src/components/__tests__/`                          |

### Decisão de tela (nada foi removido)

O port trocava a aba **Ajustes** pela Central e deixava `GestaoRegistrosPonto` sem tela em lugar nenhum.
Aqui a Central ganhou aba própria (**Registros**), a aba **Ajustes** segue com `GestaoRegistrosPonto` — que
por sua vez segue montando `PontoAuditTimeline` — e a aba **Espelhos em papel** (feature só da `main`; o
port tem o arquivo e não o monta) ficou intacta. Cinco abas → seis, com `ClipboardList` na nova.

### Trabalho parcial do agente finalizado

1. **Bug real**: a aba "Auditoria" do diálogo de detalhes consultava
   `.from('trilha_auditoria_ponto').eq('registro_id', …)` e lia `user_email`. `trilha_auditoria_ponto`
   (`20260509125936_99c1492d…`) tem `ponto_id`/`usuario_id`/`dados_anteriores`/`dados_novos` e **não
   tem** `registro_id` nem `user_email`, e nenhum arquivo de `src/` ou `supabase/functions/` insere nela:
   o PostgREST devolvia 400 e a aba ficava sempre vazia. Passou a ler `audit_log`
   (`tabela='solicitacoes_ajuste_ponto'`, `registro_id` = id da solicitação), a mesma fonte da Central de
   Auditoria do próprio port.
2. `validateTablePayload('solicitacoes_ajuste_ponto', …)` reintegrado no `update` de status e
   `registrarAcessoPII('ponto_registros','export',…)` antes do PDF Portaria 671 — as duas proteções de
   15/out que o redesign tinha derrubado.
3. `MetricCard` ganhou a variante `compact` (só aditiva, default `false`) que os KPIs da Central usam. O
   `MetricCard` da `main` **não** foi substituído pelo do port: são linhagens diferentes.
4. Canal realtime de `AuditoriaPonto` tipificado sem `any`; `Portaria671Solicitacao.hora_original` e
   `hora_sugerida` alargados para `| null`, que é o que o banco devolve.

### Prova

`typecheck` e `typecheck:tests` limpos · `lint:ci` só com o warning pré-existente de `uiRecord.ts` ·
`ratchet-any` 1→1, `ratchet-any-tests` 0→0, `ratchet-warnings` OK · `format:check:changed` 29 arquivos OK ·
`vitest run src/components src/pages` **458 arquivos / 4475 testes verdes** · `build` OK ·
`js_total_kb 8460 → 8507`, `css_total_kb 401 → 404`, `js_max_chunk_kb 908` inalterado.

## 12. Re-auditoria exaustiva do port e dos resgates (26/11/2026)

Objetivo: provar, com evidência, que **nenhum** arquivo, PR ou branch do trabalho do agente Muri (e das
sessões paralelas) ficou para trás — antes de considerar qualquer item obsoleto.

### 12.1 Mapa do port (`296a01873`) contra a `main` (`1d76c0224`)

- 138 arquivos de `src/**` existiam no port e não na `main`: 71 de produção (triados no §10: 31 mortos,
  40 vivos/duplicatas) e 67 de mocks/testes/assets — esta fatia nunca havia sido triada.
- **Camada de mocks do port é código morto.** `src/mocks/layoutMock/**`, `src/mocks/gestaoMock/**` e
  `src/mocks/pontoFluxoMock.ts` são referenciados **apenas por si mesmos e pelos próprios testes**
  (`git grep -ln "layoutMock\|gestaoMock" 296a01873 -- src` devolve só `src/mocks/**`). A `main` tem
  outra camada de mocks — `colaboradoresMock`, `desempenhoMock`, `pesquisasClimaMock`, `pontoGeoMock`,
  `pontoAuditoriaMock`, `treinamentosMock` — e cada uma dessas tem consumidor real em `src/`.
- 1190 arquivos de produção **compartilhados** entre port e `main`: só 4 contêm símbolo exportado que
  existe só no port, todos inertes/superados — `maskPixKey` (a `main` cobre `pix_chave|chave_pix` no
  `PII_KEY` + `maskGeneric` e é mais estrita em `maskBankAccount`), `useOnMountWithDeps` e
  `useStableCallback` (sem consumidor em nenhuma árvore) e `parametrosFiscaisService` (só o barrel e o
  teste o citam) — além de `MiniStat`, cujo dado a `main` já renderiza com `QuickStat`
  (`AnalyticsSection.tsx:692`).

### 12.2 PRs fechadas sem merge

- **#868** (`claude/feat-lote-aditivo-observabilidade-261124-1215`): `git diff --diff-filter=A --name-status
origin/main <branch>` = **0 arquivos** — totalmente superada pela #869 (mergeada).
- **#872** (`claude/feat-ponto-utils-resgate-261125-0100`): 45 arquivos exclusivos, todos do lote "camada 2"
  do §10. Os dois únicos com valor real contra a `main` foram resgatados nesta rodada (§12.3); os outros 43
  são mortos, duplicatas do §10 ou versões antigas já superadas.

### 12.3 Testes do port que ainda faziam sentido na `main`

Dos 8 arquivos de teste do port cujos imports resolviam na `main`, **6 não são portáveis** — falham contra a
`main` por divergência real de implementação, não por detalhe de mock:

| Arquivo                               | Motivo (evidência)                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `NineBoxCicloUnico.test.tsx`          | `NineBoxFiltrosProps` da `main` não tem `ciclos/cicloId/onCicloId` (TS2739 em 3 pontos)   |
| `analyticsEvolucaoRevelacao.test.tsx` | `AnalyticsEvolucao` da `main` usa `Line` do recharts; o mock parcial do port não o define |
| `TooltipGraficoRegua.test.tsx`        | a régua da `main` não fecha a conta de "38 tooltips / nenhum primitivo cru"               |
| `HoleritesTab.test.tsx`               | 4/4 falham: markup e estados da `main` são outros                                         |
| `SSTResumoTab.test.tsx`               | 2/2 falham: seções e props divergentes                                                    |
| `TabelaCandidatosHover.test.tsx`      | 3/6 falham: a `main` não aplica a régua de hover do port no `<tr>`                        |

Resgatar esses 6 exigiria **reescrever asserções para o código da `main`** — cobertura nova, não trabalho
perdido; ficam fora de escopo por não serem funcionalidade.

Os 2 restantes foram resgatados (17 testes verdes, sem `any` explícito):

1. `src/components/__tests__/BancoHorasCabecalho.test.tsx` — 12 testes. A `main` **não tinha** nenhum teste
   do cabeçalho de Banco de Horas (só `BancoHorasComum.test.ts`), então é cobertura nova de componente vivo:
   botão Exportar em lime, Select de período com atalhos, painel de datas, "Mais filtros" com halo.
2. `src/components/__tests__/ColaboradorCamposCustomizadosTab.test.tsx` — 5 testes de **interação**
   (prefill do valor salvo, `Salvar` só habilita após edição, salva só o campo tocado). A `main` já tinha
   `CamposCustomizadosTab.test.tsx`, mas só com asserções estáticas (título, botão, cabeçalhos, vazio):
   é complementar, não duplicata.

Ajuste necessário para o gate `any`: o mock da Motion passou a usar `ElementType`/`ReactNode` no lugar de
`any`, e os dublês de hook usam `as unknown as ReturnType<typeof hook>` (o mesmo `as unknown as` já
adotado nos testes da `main`).

### 12.4 Prova

`typecheck` e `typecheck:tests` limpos · `audit:ratchet-any-tests` **0 → 0** (baseline intocado) ·
`audit:ratchet-warnings` 1/1 · `prettier --check` OK · `vitest run` dos 2 arquivos: **2 arquivos / 17
testes verdes** · `lint:ci` só com o warning pré-existente de `src/types/uiRecord.ts`.

### 12.5 Fora de `src/` — as fatias que ainda não tinham sido cruzadas

O mapa do §10 cobria só `src/`. O port tem 378 arquivos que a `main` não tem, assim distribuídos:

| Pasta               | Exclusivos | Situação                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/`          | 158        | 152 são `_tmp-*`/`_medir-*` (diagnóstico de layout descartável). Os 6 sem `_` (`gerar-esquema-mock`, `limpar-cache-vite`, `postcss-escala-rem`, `sync-lockfiles.cjs/.sh`, `verificar-escala-global`) não são referenciados por nenhum código/CI da `main` — `gerar-esquema-mock` e `limpar-cache` têm 0 referências, e `escala-rem`/`escala-global`/`sync-lockfiles` só aparecem como nome de token CSS ou menção em documento antigo |
| `src/`              | 138        | §10 (produção) + §12.3 (testes)                                                                                                                                                                                                                                                                                                                                                                                                       |
| `docs/`             | 60         | documentação da linhagem do port (ADR, `API_REFERENCE`, `ARCHITECTURE`); a `main` tem o próprio conjunto curado                                                                                                                                                                                                                                                                                                                       |
| `supabase/`         | 18         | **todas com equivalente na `main`** — ver abaixo                                                                                                                                                                                                                                                                                                                                                                                      |
| `e2e/`              | 4          | specs de cobertura (`audit-checklist`, `fuzz-testing`, `ninebox-aprovacao`, `premiacoes-auditoria`); exigem o ambiente autenticado que ainda está vermelho na `main`                                                                                                                                                                                                                                                                  |
| `src/assets/banks/` | 14         | 13 logos + `SOURCES.md`, **excluídos de propósito**: `src/lib/bankBrand.ts` da `main` é byte a byte igual ao do port e documenta a medição que reprovou o `audit:bundle` com os PNGs embutidos (o fallback é sigla sobre a cor oficial)                                                                                                                                                                                               |

As 18 do `supabase/` (14 migrations + 1 rollback + 3 arquivos de função) foram cruzadas uma a uma:

| Migration do port                                                                  | Equivalente na `main`                                                       |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `20260724120000_atomic_rate_limit_rpc`                                             | `edge_rate_limit_check` presente                                            |
| `20260724130000_codex_p1_function_overload_and_auth_gap`                           | `contrato_estender_expiracao` presente                                      |
| `20260724140000_t007_backup_logs_rls`                                              | `backup_logs_select`/`_insert` presentes                                    |
| `20260818000000_p2_037_deprecate_legacy_tables`                                    | `20260818000001_p2_037_deprecate_legacy_tables.sql`                         |
| `20260819000000_p0_fix_user_empresa_id_rls`                                        | `user_empresa_id` presente                                                  |
| `20260820000000_p0_fix_auditoria_rpc`                                              | `listar_auditoria`/`registrar_auditoria` presentes                          |
| `20260821000000_p0_rls_dashboard_audit`                                            | `20260912190000_p0_identity_rls_authz.sql` (+ fortificações posteriores)    |
| `20260925120000_document_upload_storage_columns`                                   | `20261117170300_documentos_colunas_storage.sql`                             |
| `20260925130000_storage_documentos_delete_tenant_scope`                            | `20261117170000_storage_documentos_delete_tenant_scope.sql` + `.verify.sql` |
| `20261005000000_onboarding_kits_rls_additive` / `…010000_onboarding_audit_trigger` | `audit_tarefas_onboarding` presente                                         |
| `20261005020000_onboarding_modelo_b_convergencia`                                  | `20261119170000_onboarding_converge_modelo_b.sql` + `.verify.sql`           |
| `20261026090000_ciclos_exclusao_autorizada`                                        | `bloquear_exclusao_ciclo_com_dependencias` presente                         |

Dos 3 arquivos de função: `enviar-esocial/signer.ts` é cópia órfã — a `main` já importa `./utils/signer.ts`;
`external-db-bridge/debug-test.ts` e `metricas/contract_test.ts` são scripts de teste soltos.

### 12.6 Branches de preservação (sem PR)

Seis branches `claude/*` existem só para guardar o estado do port (nenhuma tem PR): `feat-resgata-trabalho-muri`
(= o próprio `296a01873`), `chore-preserva-stash-muri`, `feat-integracao-trabalho-muri`, `feat-integracao-muri-3way`,
`chore-preserva-wip-medicao-muri` e `feat-resgata-ui-muri`. O conteúdo exclusivo delas é exatamente o que as
tabelas do §12.3 e do §12.5 já cobrem (port + `docs/` + testes do port). Nenhuma branch foi apagada nesta rodada:
apagar é irreversível e o ganho seria zero.

## 13. Causa raiz do E2E autenticado vermelho na `main` — gatilho comparando uuid com texto (#897)

O `E2E Tests (Playwright)` estava vermelho na `main` desde 23/11/2026, sempre no passo
_"Garantir fixtures do E2E autenticado"_, e a falha vinha sendo tratada como infraestrutura. Não era.

### 13.1 Sintoma

`scripts/e2e/ensure-fixtures.mjs` aborta com:

```
code: '22P02', message: 'invalid input syntax for type uuid: ""'
```

O script só usa `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `E2E_USER_EMAIL` e `E2E_USER_PASSWORD`; as variáveis
`MAILOSAUR_*` vazias no log são irrelevantes para esse passo (hipótese inicial descartada).

### 13.2 Causa raiz, com reprodução

`supabase/migrations/20260719170000_security_indexes_constraints.sql:52-60` criou:

```sql
IF NEW.empresa_id IS NOT NULL AND NEW.empresa_id = '' THEN
```

`empresa_id` é `uuid`. O Postgres resolve `''::uuid` em tempo de plano e levanta `22P02` **em toda**
escrita das seis tabelas que receberam o gatilho `trg_prevent_empty_empresa_*`: `colaboradores`,
`folhas_pagamento`, `despesas`, `batidas_ponto`, `registros_ponto` e `admissoes`.

Reproduzido no canônico com sessão autenticada real (usuário de diagnóstico, role `admin`, vínculo às duas
empresas de teste):

```
GET    /rest/v1/colaboradores            -> 200
GET    /rest/v1/folhas_pagamento         -> 200
PATCH  /rest/v1/colaboradores?id=eq....  -> 400 {"code":"22P02","message":"invalid input syntax for type uuid: \"\""}
POST   /rest/v1/folhas_pagamento         -> 400 {"code":"22P02","message":"invalid input syntax for type uuid: \"\""}
```

Leitura funciona, escrita nunca. É exatamente o par que o script de fixtures executa.

O próprio repositório já documentava o defeito em
`supabase/migrations/20261118160000_empresa_id_not_null_rh.sql:176-181` ("levanta 22P02 em TODA escrita das
tabelas onde ela instala o gatilho"), mas a correção nunca chegou ao banco: a `20260719170000` já estava no
ledger canônico, então nada a reaplicava e nada a corrigia.

### 13.3 Correção aplicada

`supabase/migrations/20261125200000_fix_prevent_empty_empresa_id_uuid_cast.sql` faz `CREATE OR REPLACE
FUNCTION public.prevent_empty_empresa_id()` comparando em texto (`NEW.empresa_id::text = ''`). O gatilho
continua instalado nas seis tabelas e a garantia original segue coberta pelo `NOT NULL` da
`20261118160000_empresa_id_not_null_rh`. Sidecar `….verify.sql` devolve `ok` só quando a comparação crua
desapareceu.

Lote canônico (`.github/workflows/canonical-migrations.yml`, lista fechada), na `main`:

| Etapa    | Run         | Resultado                                                         |
| -------- | ----------- | ----------------------------------------------------------------- |
| PR       | #897        | mergeada (`8697240d1`)                                            |
| validate | 45711887210 | `CANONICAL_MIGRATION_DRY_RUN_OK`, 1 asserção de sidecar, todas ok |
| apply    | 45712098258 | `CANONICAL_SIDECARS_OK` + `CANONICAL_SCHEMA_INVARIANTS_OK`        |

As outras 20 migrações da lista foram puladas pelo ledger (todas já registradas), então só a correção rodou.

### 13.4 Prova em produção

Mesmas chamadas que retornavam 400, agora com o mesmo usuário, segundos após o `apply`:

```
PATCH /rest/v1/colaboradores?id=eq.d05818dd-...  -> 200
POST  /rest/v1/folhas_pagamento                  -> 201 {"id":"1c3de86b-...","competencia":"2026-11"}
```

Depois disso o `E2E Tests (Playwright)` da `main` no commit do merge ficou **verde** (`run 45713049875` no
`workflow_dispatch` autenticado e o run do push `8697240d1`), junto com o `Continuous Integration &
Delivery` do mesmo commit.

### 13.5 Impacto medido no banco

Contagem de linhas criadas desde 20/11/2026 nas seis tabelas com o gatilho, no canônico:

| Tabela             | Criadas desde 20/11 | Total |
| ------------------ | ------------------- | ----- |
| `colaboradores`    | 0                   | 16    |
| `admissoes`        | 0                   | 8     |
| `despesas`         | 0                   | 8     |
| `folhas_pagamento` | 1 (do próprio E2E)  | 5     |
| `batidas_ponto`    | 1                   | 1     |
| `registros_ponto`  | 1                   | 121   |

Nenhum cadastro de colaborador entrou no período em que o gatilho quebrado esteve ativo. Não há dado
corrompido a recuperar: as escritas falhavam inteiras (transação abortada), não gravavam pela metade.

### 13.6 `src/components/turnos` — dívida antiga encerrada

O item "resgatar turnos: 30 componentes + `turnoService` sem consumidor" do checkpoint anterior está
superado. Comparação direta:

```
git diff --stat 296a01873 origin/main -- src/components/turnos src/services/turnoService.ts \
  src/services/__tests__/turnoService.test.ts src/pages/TurnosPage.tsx
(sem saída)
```

Diff vazio e os 8 testes de `src/components/turnos/__tests__` existem na `main`. A rota `turnos` está em
`src/App.tsx:466` e `TurnosPage` consome `turnoService`. Não há trabalho a resgatar nessa fatia.

### 13.7 Limpeza do ambiente de diagnóstico

O usuário `e2e-repro-diagnostico@teste.local` criado para a reprodução foi neutralizado: vínculos de
`user_roles` (role `admin`) e `user_empresas` removidos e conta banida até 2126 (`login` → `400 user_banned`).
O `DELETE` do registro em `auth.users` pela Admin API devolve `P0001 "Trilha de auditoria é append-only"`,
porque o cascade tenta apagar linhas de `audit_log` — proteção deliberada, mantida como está. A linha
criada em `folhas_pagamento` pela prova foi apagada (`DELETE` → 200) e o `PATCH` de prova tocou apenas
`updated_at` de um colaborador real.

## 14. `Supabase Preview` vermelho â€” causa raiz e por que NÃƒO se corrige com patch (26/11/2026)

### 14.1 O que o check reporta

Lido direto do check-run do app `supabase` (`gh api repos/â€¦/commits/<sha>/check-runs`):

```
ERROR: cannot change name of view column "empresa_id" to "total_ativos" (SQLSTATE 42P16)
At statement: 0 â€” supabase/migrations/20260317001935_1663bc94-c134-4084-9b08-4b4257a48256.sql
```

O erro Ã© idÃªntico nos 21 commits consecutivos da `main` (verificado de `2a62b1124` a `256e836b9`): nÃ£o Ã©
regressÃ£o de nenhuma PR recente, nem da #876.

### 14.2 Causa raiz

O Preview cria um branch a partir do banco canÃ´nico (schema **e** ledger) e aplica apenas as migrations
**ausentes do ledger**. A primeira delas Ã© `20260317001935_1663bc94-â€¦`, que faz
`CREATE OR REPLACE VIEW public.vw_dashboard_time` **sem `DROP`** com as colunas
`total_ativos/em_ferias/afastados/desligados/total_geral`, enquanto o banco jÃ¡ tem a forma entregue por
`20260515183113_fe3fb304-â€¦` â€” `(empresa_id, total_colaboradores, ativos, afastados)`, confirmada em
`supabase/baseline/20260831_canonical/canonical_schema.sql:17869`. O Postgres nÃ£o permite renomear coluna
existente em `CREATE OR REPLACE VIEW` â†’ `42P16`. O check aborta na primeira dessas migrations e por isso
nÃ£o chega a listar as demais.

### 14.3 O drift Ã© real, medido, e jÃ¡ estava documentado no repositÃ³rio

Medido em 26/11 pelo `canonical-sql-diag.yml` com `allow_pii=true`
(`SELECT array_to_string(array_agg(version ORDER BY version), ' ') FROM supabase_migrations.schema_migrations`,
leitura total â€” o caminho sem `allow_pii` roda sob `ci_auditor` e nÃ£o enxerga `supabase_migrations`):

| medida                                                   | valor  |
| -------------------------------------------------------- | ------ |
| versÃµes no ledger canÃ´nico                             | 1139   |
| arquivos `supabase/migrations/*.sql` (sem `.verify.sql`) | 1172   |
| **migrations sem entrada no ledger**                     | **33** |

O repositÃ³rio jÃ¡ tinha o inventÃ¡rio e o procedimento para isso, e o diagnÃ³stico bate com o registrado:

- `scripts/audit-schema-drift.mjs` â€” o gate que compara repositÃ³rio Ã— ledger existe, mas estÃ¡ **fora do CI
  desde 24/09/2026** com justificativa no prÃ³prio arquivo: a convenÃ§Ã£o de gravar no ledger nunca foi seguida
  ("reprova ~40% das migrations existentes â€” inutilizÃ¡vel como gate").
- `scripts/db/derive-pending-migrations.mjs` â€” deriva exatamente a mesma lista (falha fechado acima de 20
  pendentes, `DEFAULT_MAX_PENDING`, porque acima disso Ã© reconciliaÃ§Ã£o histÃ³rica, nÃ£o lote novo).
- `infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md` â€” "CondiÃ§Ã£o atual": em 31/08/2026 os Gates B, C e E
  reprovaram e o projeto de staging hospedado nunca foi fornecido; `migration repair` e a ativaÃ§Ã£o do squash
  seguem **bloqueados** por decisÃ£o registrada.
- O mesmo fenÃ´meno Ã© a origem do incidente A-036 (lote de RLS de 19â€“31/07/2026 presente no repo e nunca
  aplicado ao banco vivo).

### 14.4 Por que nÃ£o abrir PR reescrevendo as 33 migrations

Fazer as 33 arquivarem `DROP VIEW IF EXISTS` antes dos `CREATE OR REPLACE` deixaria o Preview verde, mas Ã©
exatamente o que o runbook proÃ­be:

- regra 3 â€” nada de `db push`/replay enquanto existir diff fÃ­sico nÃ£o explicado (Gate C reprovado);
- regra 4 â€” nada de `migration repair` para deixar a lista visualmente verde;
- Gate B â€” "NÃ£o 'corrigir para continuar' na mesma execuÃ§Ã£o: isso destruiria a prova do histÃ³rico real".

O Preview lÃª o ledger do branch, e o ledger canÃ´nico tem 1139 versÃµes. NÃ£o hÃ¡ migration nova pendente por
trabalho desta sessÃ£o: as 33 sÃ£o histÃ³rico de 03 â†’ 10/2026. ReescrevÃª-las apaga a evidÃªncia que a
reconciliaÃ§Ã£o usa e continua sem provar qual DDL realmente estÃ¡ materializado no banco.

### 14.5 NÃ£o hÃ¡ exposiÃ§Ã£o de seguranÃ§a â€” verificado no banco vivo

No commit atual da `main` (`256e836b9`), os dois checks que leem o banco de produÃ§Ã£o passaram:

```
success    Integridade do banco canÃ´nico (live)
success    RLS live (pÃ³s-merge, nÃ£o bloqueante)
```

O job `Integridade do banco canÃ´nico (live)` (`.github/workflows/ci.yml:485`) executa os cinco audits contra
o banco vivo â€” `audit-db-search-path.mjs`, `audit-rls-pii.mjs`, `audit-rls-least-privilege.mjs`,
`audit-rls-tenant-open.mjs`, `audit-secdef-authz.mjs` (`ci.yml:548-587`). Como os audits passam lendo o
schema real, os efeitos de seguranÃ§a das 33 migrations ausentes do ledger estÃ£o materializados em produÃ§Ã£o:
o drift Ã© de **escrituraÃ§Ã£o**, nÃ£o de comportamento. Nenhuma correÃ§Ã£o de RLS/search_path estÃ¡ faltando em
produÃ§Ã£o por causa dele.

Dos 33 pendentes, os que mais importam por tema (RLS, Storage, `search_path`) sÃ£o
`20260719150000_storage_bucket_security_hardening`, `20260719191000_empresa_id_not_null_constraints`,
`20260724000700_fix_rls_recrutamento_onboarding`,
`20260724000900_fix_rls_atrasos_adicionais_gratificacoes`, `20260724140001_t007_backup_logs_rls`,
`20260724150000_t008_storage_tenant_path_scope`, `20260816000000_p1_024_policies_orfas` e
`20260912151000_p1_function_search_path` / `20260912152000_p0_pgcrypto_routine_search_path`.

### 14.6 ConsequÃªncia

`Supabase Preview` continua vermelho **por decisÃ£o de processo, nÃ£o por bug**: sÃ³ fecha com a reconciliaÃ§Ã£o
completa (Gates Aâ€“E) e um projeto de staging hospedado. NÃ£o Ã© check bloqueante de merge â€” nenhuma PR fica
presa por ele. O que nÃ£o se deve fazer Ã© tratÃ¡-lo como "uma migration quebrada" e reescrever histÃ³rico.

---

## 15. Storage: privacidade e escopo por tenant dos buckets (26/11/2026)

Único tema do bloco de 26/11 que nenhum dos 5 audits do CI cobria: os gates
`audit-rls-pii`, `audit-rls-least-privilege`, `audit-rls-tenant-open`,
`audit-secdef-authz` e `audit-embed-hints` varrem `public`; `storage.objects`
não estava em nenhum.

### 15.1 Método

Duas fontes cruzadas, nunca uma só:

1. **Código** — todo `from('bucket')`, `.upload(...)`, `.createSignedUrl(...)` e
   `getPublicUrl(...)` em `src/` e em `supabase/functions/`.
2. **Banco vivo** — `storage.buckets` e `pg_catalog.pg_policies` filtrado por
   `schemaname = 'storage' AND tablename = 'objects'`.

O cruzamento é o que importa: bucket existente e usado pelo client **sem**
policy não dá erro em nenhum lugar do repositório — o Supabase simplesmente
responde `403` no upload e "Object not found" na assinatura, em runtime.

### 15.2 O que foi encontrado

20 buckets, 11 sem nenhuma policy. Desses 11, **8 têm consumidor no client** —
ou seja, funcionalidade entregue no app que o banco rejeitava.

| Bucket | Path usado no código | Operação real |
|---|---|---|
| `avatars` | `${user.id}/avatar.${ext}` (`PerfilPage.tsx:199`) | upload com `upsert` |
| `documentos-admissao` | `temp/${uuid}` (`useDocumentOCR.ts:33`) | upload + leitura |
| `ferias-avisos` | `${empresaId}/${ferias.id}.pdf` (`useAssinarAvisoFerias.ts:44`) | upload com `upsert` + assinatura |
| `ferias-coletivas-comunicados` | `${empresaId}/${coletivaId}/${fn}` (`useGerarComunicadoColetivas.ts:67`) | upload com `upsert` + assinatura |
| `medidas-contestacoes` | `${empresaId}/${medidaId}/${uuid}-${file.name}` (`medidasDisciplinaresService.ts:172`) | upload + assinatura |
| `medidas-disciplinares` | `${medida.empresa_id}/${medida_id}/documento-${Date.now()}.html` (`gerar-medida-disciplinar-pdf/index.ts:203`) | escrita por `service_role` + assinatura no client |
| `ponto-biometria` | `${colab.empresa_id}/${colab.id}/${Date.now()}.jpg` (`PontoClockRegister.tsx:192`) | upload |
| `contratos-trabalho` | `${empresaId}/${admissao_id}/contrato-${Date.now()}.html` (`gerar-contrato-pdf/index.ts:173`) | escrita por `service_role` + assinatura no client |

Os outros 9 buckets já funcionavam: têm policy e por isso serviram de
referência de estilo (`pol_documentos_*`, `pol_tenant_*`,
`pol_afastamentos_insert_authenticated`).

### 15.3 Isolamento adotado

Mesmo contrato das policies vivas, sem inventar padrão novo:

```sql
bucket_id = 'X'
AND public.user_belongs_to_empresa(
      auth.uid(), public.storage_path_empresa_id(name))
```

- `storage_path_empresa_id(name)` devolve **NULL** quando a primeira pasta do
  path não é UUID — evita o erro de cast que derrubou as migrations antigas, e
  NULL em predicado de policy significa negação (fail-closed).
- `owner` foi usado só onde o path não carrega tenant (`avatars`,
  `documentos-admissao/temp/`). `storage.objects.owner` é **uuid** no canônico:
  comparar com `auth.uid()::text` fazia o `CREATE POLICY` falhar direto no DDL
  com `operator does not exist: uuid = text` (PR #902).
- `documentos-admissao` aceita dois caminhos: `${empresaId}/...` (isolado por
  tenant) e `temp/${uuid}` (rascunho do próprio usuário, `owner = auth.uid()`).
  A alternativa seria proibir o `temp/`, o que quebraria o fluxo de OCR que já
  está no ar.

### 15.4 Prova em produção

Migration `20261126090000_storage_policies_buckets_app.sql` aplicada pelo
`canonical-migrations` em 26/11/2026 — `validate` verde, `apply` verde,
`verify` verde (sidecar devolveu `ok`).

Query de verificação no canônico:

```sql
SELECT (SELECT count(*) FROM pg_catalog.pg_policies
         WHERE schemaname='storage' AND tablename='objects'
           AND policyname IN (...as 17...))            AS minhas_17,
       (SELECT count(*) FROM pg_catalog.pg_policies
         WHERE schemaname='storage' AND tablename='objects'
           AND policyname='admissao_docs_insert_public') AS furo_public;
-- minhas_17 | furo_public
--         17 |           0
```

### 15.5 O trabalho do agente anterior que foi reaproveitado e o que foi descartado

As migrations `20260719150000_storage_bucket_security_hardening` e
`20260724150000_t008_storage_tenant_path_scope` nunca foram aplicadas ao
canônico. Elas **não** foram reaproveitadas como DDL, por dois motivos
verificados:

1. Derivam o tenant com `((storage.foldername(name))[1])::uuid` — estoura cast
   em qualquer path cuja primeira pasta não seja UUID, e policy que estoura é
   policy que nega tudo.
2. A `20260719150000` declara `admissao_docs_insert_public` com `TO public`,
   isto é, upload **sem sessão**. A nova migration faz `DROP POLICY IF EXISTS`
   nesse nome exato: se aquela migration algum dia entrar num replay, o furo
   não volta.

O que **foi** reaproveitado: o mapa de buckets que ela documentava e a
intenção de escopo por tenant. O comentário dela sobre "fluxo por token" em
`ContratacaoPage` está obsoleto — essa página não faz upload em
`documentos-admissao`.

### 15.6 Pendências de app identificadas (não são DDL, não foram corrigidas aqui)

1. `src/hooks/useDocumentOCR.ts:40` usa `getPublicUrl` em bucket **privado**. A
   URL devolvida é `/object/public/...`, que não serve o arquivo. O correto é
   `createSignedUrl`, como já é feito em `useAssinarAvisoFerias.ts:71` e
   `useGerarComunicadoColetivas.ts:91`.
2. O mesmo hook grava em `temp/${uuid}`, sem `empresaId` no path. A policy
   aceita (é o rascunho do dono), mas isso impede qualquer varredura por
   tenant — o rascunho fica órfão se o usuário abandonar o fluxo.

Ambos são correção de app, em PR separada, e não bloqueiam as policies acima.

---

## 16. Fechamento do drift de ledger (26/11/2026)

### 16.1 A pergunta que precisava de resposta

33 migrations estavam no repositório sem registro em
`supabase_migrations.schema_migrations`. Isso podia significar duas coisas
muito diferentes: (a) só escrituração, ou (b) funcionalidade realmente ausente
em produção. A diferença decide se há incidente.

### 16.2 Medição

1172 arquivos locais, 1132 versões no ledger, 40 ausentes:

- 7 legados (`001`..`007`), anteriores ao versionamento.
- 33 versionadas, de `20260317001935` a `20261012130000`.

As 33 foram conferidas **objeto por objeto** contra o schema vivo: nenhum
objeto consumido pelo app depende delas. Nenhuma RPC citada em `src/` ou em
`supabase/functions/` está ausente. As ausências reais são índices, materialized
views e RPCs **sem consumidor**.

Conclusão: **(a) dívida de escrituração, não funcionalidade ausente.**

### 16.3 Gate ligado (para não repetir)

`scripts/audit-schema-drift.mjs` existia desde o incidente A-036 e nunca tinha
sido ligado: sem corte de data reprovava ~40% do histórico, porque a convenção
de gravar no ledger nunca foi seguida de forma consistente neste projeto.

Agora roda no job `db-integrity-live` com `--since=20261013` — o menor corte que
zera o gate sem esconder migration nova (a última ausente é `20261012130000`).

Saída real do CI em 26/11/2026:

```text
[schema-drift] Filtro --since=20261013: ignorando 1065 migration(ões) históricas.
[schema-drift] OK — 109 desde 20261013 migration(ões), todas com registro no ledger.
```

Antes disso foi preciso dar ao `ci_auditor` (role de `SUPABASE_DB_URL_READONLY`)
`USAGE` em `supabase_migrations` e `SELECT` em `schema_migrations` —
`20261126100000_grant_ci_auditor_migration_ledger.sql`. Sem o grant o gate
reprovava por credencial, que é o pior desfecho possível: falso vermelho
permanente, ou (se alguém "consertasse" ignorando o erro) falso verde.

### 16.4 Observação registrada, não corrigida

`refresh_dashboard_mvs()` tenta refrescar `mv_status_change_daily` e
`mv_anomalies_hourly`, que não existem no schema vivo. O erro acontece dentro
de um job de cron, sem ninguém olhando: falha silenciosa diária. Fora do escopo
deste bloco — fica registrado para não se perder.