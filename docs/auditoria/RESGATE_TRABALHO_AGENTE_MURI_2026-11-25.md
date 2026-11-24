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

Do port do Muri (`296a01873`) saíram **289 arquivos novos** em `src/`. A branch da **#872** entrega hoje **119** deles, todos compilando, testados e sem código morto:

- **#870** — "Ver todos" dos Talentos em destaque abre a janela completa (aba Nine-Box). 11 arquivos: `NineBoxTalentosDialog` novo, `onVerTodos` no card, perfis de saída (`CASCADE_SAIDA_RAPIDA`) no `cascade-motion`, 4 testes novos. `tsc` 0, 322 testes verdes, ratchets sem regressão.
- **#872 camada 1** — 21 arquivos: 11 módulos de regra pura (ponto, turnos, horas extras, banco de horas) + 10 testes.
- **#872 camada 2** — 200 arquivos: serviços (automação, CNAB, provisões, Domínio/Altendata, Metabase), utils (eSocial SST/periódicos, geofencing, equipe), esquema `schemas/ponto.ts`, calculadora de folha, hooks, mocks com teste e os componentes de UI que a main **já consome** (Nine-Box, cascade, central de ajustes, estrutura/organograma, dossiê).
- Poda de escopo nesta rodada: 102 arquivos de UI sem consumidor saíram da PR (não da história — continuam no commit do port e nomeados abaixo) e 27 arquivos de camada de negócio foram mantidos com as correções de `any` reaplicadas.
- Validação: `tsc --noEmit` 0 erros; suíte completa **722 arquivos / 8.408 testes verdes** (10 skipped); os 3 ratchets (`ratchet-any`, `ratchet-any-tests`, `ratchet-warnings`) sem regressão; auditorias estruturais verdes.

## 6. Fila de resgate — 170 arquivos ainda fora (104 fontes + 66 testes)

### 6.1 Aditivo pequeno em arquivo existente — destrava 18 módulos

Cada linha é a mudança exata no arquivo de destino; feito o aditivo, o módulo do port entra junto com o teste dele.

- `src/components/ui/popover.tsx` — exportar `PopoverAnchor` (re-export do Radix; o pacote já é dependência) → destrava `src/components/banco-horas/FiltrosCabecalhoBancoHoras.tsx`, `src/components/ponto/CentralAuditoriaCabecalho.tsx`
- `leaflet` + `@types/leaflet` — **dependência nova, precisa da sua decisão** (só `PontoGeoMapa.tsx` usa) → destrava `src/components/ponto/PontoGeoMapa.tsx`
- O restante dos erros é tipagem local dos próprios arquivos do port (ex.: `Parameter 'etapa' implicitly has an 'any' type`), corrigível na integração.

### 6.2 UI sem consumidor — 54 componentes que exigem a tela/tab correspondente

Compilam e têm teste, mas a tela que os usa, na versão do Muri, é arquivo que a main **já tem com outra implementação** (divergência medida; substituir = regressão): `PontoPage` +338/−431, `BancoHorasPage` +111/−193, `HorasExtrasPage` +147/−189, `AuditoriaPage` +289/−1477, `RecrutamentoPage` +462/−395, `PesquisasClimaPage` +198/−711, `TurnosPage` (a main tem implementação inline).

- `src/components/admissoes/` — ChipFiltroAuditoria.tsx
- `src/components/banco-horas/` — AlertaSaldoNegativoCard.tsx, BancoHorasKpis.tsx, EvolucaoSaldoCard.tsx, SituacaoSaldosCard.tsx, TotaisHorasCard.tsx, exportarBancoHoras.ts
- `src/components/calculadoraRescisao/` — ResultadoRescisao.tsx
- `src/components/colaborador-detalhes/` — CampoInfo.tsx, ComplianceTab.tsx
- `src/components/colaboradores/` — AnimatedDossieTabs.tsx
- `src/components/dashboard/` — DepartmentsCard.tsx, HeadcountOverviewCard.tsx, MapaEstruturaCard.tsx, QuickActionsMenu.tsx, TipoVinculoCard.tsx, anelDonut.tsx, entradaDashboard.ts
- `src/components/esocial/` — ESocialAIInsights.tsx
- `src/components/folha/` — FGTSDigitalDashboard.tsx
- `src/components/horas-extras/` — AprovacoesPendentes.tsx, CabecalhoSolicitacoes.tsx, HistoricoSolicitacoes.tsx, HorasExtrasKpis.tsx, NovaSolicitacaoDialog.tsx, SolicitacaoDetalhesDialog.tsx
- `src/components/metabase/` — MetabaseEmbed.tsx
- `src/components/pesquisas/` — CardPesquisa.tsx, IndicadorPesquisa.tsx, PilulaFiltroPesquisa.tsx
- `src/components/ponto/` — CentralAjustesBuscaFiltros.tsx, CentralAjustesCabecalho.tsx, CentralAjustesFiltros.tsx, CentralAjustesPaginacao.tsx, CentralAjustesPainel.tsx, CentralAjustesTabela.tsx, EditarEscalaDialog.tsx, PontoBancoHorasCard.tsx, PontoEquipeStatusCard.tsx, PontoFechamentoCard.tsx, PontoFluxoEntradasDica.tsx, PontoHorasSemanaCard.tsx, PontoIndicadoresKpi.tsx, PontoPendenciasCard.tsx, PontoUltimasBatidasCard.tsx, acoesCabecalhoPonto.ts, jornadaEtapas.ts
- `src/components/premiacoes/` — PainelAuditoriaRoi.tsx
- `src/components/recrutamento/` — AnalyticsBarraFiltros.tsx, AnalyticsVariacao.tsx, NovaVagaDialog.tsx, OrigemLogotipo.tsx, analyticsFunilAnimacao.ts
- `src/components/ui/` — timelineReveal.ts

Ficam fora também 14 assets de banco (`src/assets/banks/`) — o próprio `src/lib/bankBrand.ts` documenta que a main usa os PNGs de produção e a versão do Muri trazia 304 KB a mais —, 9 mocks sem teste que os consuma e `src/validators/esocialValidators.ts`.

### 6.3 Testes-especificação

Dos 66 testes que ficaram fora, a maioria é a especificação das mudanças de 6.1/6.2 (ex.: régua global das barras em 1200 ms, entrada dos cards, placeholder do Login, pílula do `ColaboradorViewSwitcher`, ordem dos widgets, exports novos de `analyticsComum.ts`). Eles voltam junto com o arquivo que os destrava.
## 7. Auditoria das refs remotas

- `origin/pr/304` … `origin/pr/321` (9 refs): **todas as PRs estão `MERGED`**. O conteúdo está na main via _squash-merge_, por isso `git merge-base --is-ancestor` dá falso negativo. Provas por `git log origin/main --grep='(#N)'`: 304→`e8febd257`, 315→`57054a5ff`, 316→`231cdb74b`, 320→`a90a4feaf`, 321→`529a8d6c5`, 319→`e1a18efd7` (squash de #309+#313+#317+#319).
- `origin/automation/inventario-estado`: 1 commit de bot, só `inventario/estado/*.json`.
- `origin/contexto`: artefatos de bot (`chore(contexto): N fonte(s) regerada(s)`), sem código de aplicação.
