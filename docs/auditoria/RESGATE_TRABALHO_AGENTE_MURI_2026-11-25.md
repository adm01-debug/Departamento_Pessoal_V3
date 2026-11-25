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
