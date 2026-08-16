# Frontend — Roteamento e Páginas (lote 1/3: `src/App.tsx` + `src/pages/[A-C]*`)

## 1. Cobertura

**Lido integralmente (linha a linha):**
- `src/App.tsx` (435 linhas) — mapa de rotas completo abaixo.
- `src/components/ProtectedRoute.tsx` e `src/components/AdminRoute.tsx` (guards).
- `src/pages/BancoHorasPage.tsx` (69), `src/pages/ConfiguracoesPage.tsx` (100), `src/pages/AdminDiagnosticoMigracaoPage.tsx` (1-120 de 348), `src/pages/AdminSstDashboardPage.tsx` (1-60), `src/pages/AssistenteIAPage.tsx` (20-110), `src/services/backupService.ts` (1-125), `src/hooks/useAdmissoes.ts`, `src/hooks/useBeneficios.ts`, `src/hooks/useCargos.ts`, `src/services/beneficioService.ts` (1-40).

**Amostrado por extração estruturada (grep determinístico sobre 100% dos 43 arquivos A–C, 11.618 linhas):**
- imports de `services/`, `hooks/`, `integrations/` por arquivo;
- toda ocorrência de `.from('<tabela>')`, `.rpc('<fn>')`, `functions.invoke('<fn>')`;
- contagem de `useQuery`/`queryFn` (leitura) vs `useMutation`/`insert`/`update`/`delete`/`upsert` (escrita);
- varredura de `Math.random`, `TODO|FIXME|XXX|HACK|mock|fake|dummy|em desenvolvimento`;
- arrays hardcoded de nível de módulo (`^const [A-Z_]+ = [`).
- Tabelas alcançadas indiretamente: extraídas dos 12 services e 9 hooks consumidos pelas páginas A–C.

**Verificado ao vivo contra o banco de produção (`frjbfeamybqsejlvmqbl`, somente leitura):** existência e `n_live_tup` de 54 tabelas, existência de 11 funções RPC, `cron.job`, `storage.buckets`, `auth.mfa_factors`, `auth.users`.

**Arquivos cobertos:** 1 (`App.tsx`) + 43 páginas A–C + 2 guards = 46 no escopo direto; +21 arquivos de service/hook lidos como dependência.

**NÃO verificado:** compilação, lint, testes (`node_modules` ausente). Deploy de Edge Functions (`NAO_VERIFICADO`, sem PAT).

---

## 2. Mapa COMPLETO de rotas (`src/App.tsx`) — 110 `path=`

### 2.1 Resumo estrutural
| Métrica | Valor | Evidência |
|---|---|---|
| Total de `path=` | 110 | `grep -c "path=" src/App.tsx` |
| Páginas em `src/pages/*.tsx` | 109 | `ls src/pages/*.tsx \| wc -l` |
| Páginas importadas em `App.tsx` | 109 (100%) | `comm` entre importados e arquivos = vazio |
| Páginas importadas mas **sem rota** | **3** | ver §4 |
| Rotas públicas (sem `ProtectedRoute`) | 8 | L178–184, L426 |
| Rotas sob `ProtectedRoute` + `MainLayout` | 102 | L187–422 |
| Rotas com `AdminRoute` (auth + role + **MFA fail-closed**) | 23 | `grep -c "<AdminRoute>"` |
| Páginas eager (não-lazy) | 3 | `LoginPage` L13, `DashboardPage` L14, `AuthCallbackPage` L15 |
| Páginas lazy | 106 | L18–124 |
| Redirects | 1 | L195 `index → Navigate to "dashboard" replace` |
| Catch-all | 1 | L421 `path="*" → NotFoundPage` |

Wrapper de lazy: `LazyPage` (L161-169) = `RouteErrorBoundary` + `Suspense fallback={<PageLoader/>}`.

### 2.2 Rotas PÚBLICAS (fora de `ProtectedRoute`) — 8
| # | path | Componente | Lazy | Guard | Linha |
|---|---|---|---|---|---|
| 1 | `/login` | LoginPage | não (L13) | nenhum | 178 |
| 2 | `/auth/callback` | AuthCallbackPage | não (L15) | nenhum | 179 |
| 3 | `/ponto/kiosk` | PontoKioskPage | sim (L120) | **nenhum** | 180 |
| 4 | `/assinar-contrato/:token` | AssinarContratoPage | sim (L55) | token via RPC | 181 |
| 5 | `/verificar-contrato` | VerificarContratoPage | sim (L56) | nenhum | 182 |
| 6 | `/verificar-contrato/:hash` | VerificarContratoPage | sim (L56) | hash | 183 |
| 7 | `/ciencia-medida/:token` | CienciaMedidaPage | sim (L57) | token via RPC | 184 |
| 8 | `/contratacao` | ContratacaoPage | sim (L54) | **nenhum** | 426 |

> Nota (L425-432): `/contratacao` usa `Suspense` **cru**, sem `RouteErrorBoundary` — é a única rota lazy sem error boundary. Qualquer throw de render derruba a árvore inteira em tela branca. É justamente a rota pública de admissão que escreve em `admissoes`/`documentos_admissao`.

### 2.3 Rotas sob `ProtectedRoute` + `MainLayout` (L187-194) — 102
`ProtectedRoute` (L21-…): exige `user`; MFA **fail-open** (`.catch(() => setMfaGate('ok'))`, L54-56).

| # | path (relativo a `/`) | Componente | Lazy | AdminRoute | Linha |
|---|---|---|---|---|---|
| 9 | `` (index) | `Navigate to="dashboard" replace` | — | não | 195 |
| 10 | `dashboard` | DashboardPage | **não** (L14) | não | 196 |
| 11 | `dashboard-executivo` | DashboardExecutivoPage | sim | não | 197 |
| 12 | `colaboradores` | ColaboradoresPage | sim | não | 200 |
| 13 | `colaboradores/novo` | ColaboradorFormPage | sim | não | 201 |
| 14 | `colaboradores/editar/:id` | ColaboradorFormPage | sim | não | 202 |
| 15 | `colaboradores/:id` | ColaboradorDetalhesPage | sim | não | 203 |
| 16 | `admissoes` | AdmissoesPage | sim | não | 206 |
| 17 | `afastamentos` | AfastamentosPage | sim | não | 207 |
| 18 | `desligamentos` | DesligamentosPage | sim | não | 208 |
| 19 | `ferias` | FeriasPage | sim | não | 209 |
| 20 | `ferias/programacao` | FeriasProgramacaoPage | sim | não | 210 |
| 21 | `ponto` | PontoPage | sim | não | 211 |
| 22 | `beneficios` | BeneficiosPage | sim | não | 212 |
| 23 | `beneficios/novo` | BeneficioFormPage | sim | não | 213 |
| 24 | `folha` | FolhaPage | sim | não | 216 |
| 25 | `folha/calcular` | FolhaPagamentoPage | sim | não | 217 |
| 26 | `folha/compliance` | FolhaCompliancePage | sim | não | 218 |
| 27 | `rubricas` | RubricasPage | sim | não | 219 |
| 28 | `provisoes` | ProvisoesPage | sim | não | 220 |
| 29 | `passivo-trabalhista` | PassivoTrabalhistaPage | sim | não | 221 |
| 30 | `financeiro-bancario` | FinanceiroBancarioPage | sim | não | 222 |
| 31 | `contabilidade` | ContabilidadePage | sim | não | 223 |
| 32 | `contabilidade/canal` | CanalContabilidadePage | sim | não | 224 |
| 33 | `empresas` | EmpresasPage | sim | não | 227 |
| 34 | `empresas/novo` | EmpresaFormPage | sim | não | 228 |
| 35 | `empresas/editar/:id` | EmpresaFormPage | sim | não | 229 |
| 36 | `cargos` | CargosPage | sim | não | 230 |
| 37 | `cargos-salarios` | PlanoCargosSalariosPage | sim | não | 231 |
| 38 | `departamentos` | DepartamentosPage | sim | não | 233 |
| 39 | `lotacoes` | LotacoesPage | sim | não | 234 |
| 40 | `locais-trabalho` | LocaisTrabalhoPage | sim | não | 235 |
| 41 | `times` | TimesPage | sim | não | 236 |
| 42 | `promo-brindes` | PromoBrindesPage | sim | não | 237 |
| 43 | `promo-brindes/vinculos` | VinculosPromoPage | sim | não | 238 |
| 44 | `organograma` | OrganogramaPage | sim | não | 239 |
| 45 | `avaliacao` | AvaliacaoPage | sim | não | 242 |
| 46 | `treinamentos` | TreinamentosPage | sim | não | 243 |
| 47 | `recrutamento` | RecrutamentoPage | sim | não | 244 |
| 48 | `onboarding` | OnboardingPage | sim | não | 245 |
| 49 | `pesquisas-clima` | PesquisasClimaPage | sim | não | 246 |
| 50 | `documentos` | DocumentosPage | sim | não | 249 |
| 51 | `gerador-documentos` | GeradorDocumentosPage | sim | não | 250 |
| 52 | `assinaturas` | AssinaturasPage | sim | não | 251 |
| 53 | `esocial` | ESocialPage | sim | não | 252 |
| 54 | `obrigacoes-fiscais` | ObrigacoesFiscaisPage | sim | não | 253 |
| 55 | `sst` | SSTPage | sim | não | 254 |
| 56 | `auditoria` | AuditoriaPage | sim | **sim** | 255 |
| 57 | `canal-etica` | CanalEticaPage | sim | não | 256 |
| 58 | `lgpd` | LGPDPage | sim | **sim** | 257 |
| 59 | `seguranca` | SegurancaPage | sim | **sim** | 258 |
| 60 | `assistente-ia` | AssistenteIAPage | sim | não | 261 |
| 61 | `calculadora-rescisao` | CalculadoraRescisaoPage | sim | não | 262 |
| 62 | `importacao` | ImportacaoPage | sim | não | 263 |
| 63 | `backup` | BackupPage | sim | **sim** | 264 |
| 64 | `notificacoes` | NotificacoesPage | sim | não | 265 |
| 65 | `usuarios` | UsuariosPage | sim | **sim** | 266 |
| 66 | `perfil` | PerfilPage | sim | não | 267 |
| 67 | `configuracoes` | ConfiguracoesPage | sim | **sim** | 268 |
| 68 | `admin/telemetria` | AdminTelemetriaPage | sim | **sim** | 272 |
| 69 | `admin/idempotencia` | AdminIdempotenciaPage | sim | **sim** | 280 |
| 70 | `admin/operacao` | AdminOperacaoPage | sim | **sim** | 288 |
| 71 | `admin/security` | AdminSecurityPage | sim | **sim** | 296 |
| 72 | `admin/ponto/divergencias` | AdminPontoDivergenciasPage | sim | **sim** | 304 |
| 73 | `admin/sst/clinicas` | AdminClinicasPartnersPage | sim | **sim** | 312 |
| 74 | `admin/sst/agendamentos` | AdminAgendamentoExamesPage | sim | **sim** | 320 |
| 75 | `admin/sst/aso` | AdminAsoWorkflowPage | sim | **sim** | 328 |
| 76 | `admin/sst/epis` | AdminEpisFichasPage | sim | **sim** | 336 |
| 77 | `admin/sst/extintores` | AdminExtintoresPage | sim | **sim** | 344 |
| 78 | `admin/sst/dashboard` | AdminSstDashboardPage | sim | **sim** | 352 |
| 79 | `admin/sst/cat` | AdminCatPage | sim | **sim** | 360 |
| 80 | `admin/sst/regimento` | AdminRegimentoInternoPage | sim | **sim** | 368 |
| 81 | `admin/diagnostico-migracao` | AdminDiagnosticoMigracaoPage | sim | **sim** | 376 |
| 82 | `horas-extras` | HorasExtrasPage | sim | não | 385 |
| 83 | `feriados` | FeriadosPage | sim | não | 386 |
| 84 | `jornadas` | JornadasPage | sim | não | 387 |
| 85 | `turnos` | TurnosPage | sim | não | 388 |
| 86 | `escalas` | EscalasPage | sim | não | 389 |
| 87 | `comunicacao-interna` | ComunicacaoInternaPage | sim | não | 390 |
| 88 | `despesas` | DespesasPage | sim | não | 391 |
| 89 | `controle-acesso` | ControleAcessoPage | sim | **sim** | 393 |
| 90 | `medidas-disciplinares` | MedidasDisciplinaresPage | sim | não | 400 |
| 91 | `movimentacoes` | MovimentacoesPage | sim | não | 401 |
| 92 | `sindicatos` | SindicatosPage | sim | não | 402 |
| 93 | `planos-saude` | PlanosSaudePage | sim | não | 403 |
| 94 | `convenios` | ConveniosPage | sim | não | 404 |
| 95 | `seguros-vida` | SegurosVidaPage | sim | não | 405 |
| 96 | `pensoes` | PensoesPage | sim | não | 406 |
| 97 | `vales` | ValesPage | sim | não | 407 |
| 98 | `descontos` | DescontosPage | sim | não | 408 |
| 99 | `exames` | ExamesPage | sim | não | 409 |
| 100 | `holerites` | HoleritesPage | sim | não | 410 |
| 101 | `portal` | PortalPage | sim | não | 411 |
| 102 | `workflows` | WorkflowsPage | sim | não | 412 |
| 103 | `design-system` | DesignSystemPage | sim | não | 413 |
| 104 | `integracoes` | IntegracoesPage | sim | não | 414 |
| 105 | `banco-horas` | BancoHorasPage | sim | não | 415 |
| 106 | `relatorios` | RelatoriosPage | sim | não | 416 |
| 107 | `premiacoes` | PremiacoesPage | sim | não | 418 |
| 108 | `configuracoes/contratos-templates` | ContratoTemplatesPage | sim | **sim** | 419 |
| 109 | `contratos-gerados` | ContratosGeradosPage | sim | **sim** | 420 |
| 110 | `*` | NotFoundPage | sim | não | 421 |

### 2.4 Consistência sidebar ↔ rotas
Os 64 `path:` de `src/components/layout/AppSidebar.tsx` têm **todos** rota correspondente (`comm -23 sidebar rotas` = vazio). Não há item de menu apontando para 404.

---

## 3. Tabela de funcionalidades — páginas A–C (43 arquivos)

Legenda de "dado": `n_live_tup` medido em produção nesta sessão.

| Funcionalidade (página) | Classificação | Evidência (arquivo:linha) | O que falta |
|---|---|---|---|
| **AdminAgendamentoExamesPage** — agendamento de exames ocupacionais | `IMPLEMENTADO_PARCIAL` | rota `App.tsx:320` (AdminRoute); `AdminAgendamentoExamesPage.tsx:3-4`; `.from('exames_agendamentos')`, `.from('colaboradores')`; leituras=6/escritas=3; `exames_agendamentos=6` | Bloqueada por MFA (§4.1). Fluxo funciona, mas nunca sai de 6 linhas semente |
| **AdminAsoWorkflowPage** — workflow de ASO | `IMPLEMENTADO_PARCIAL` | `App.tsx:328`; `.from('asos')`; leit=4/escr=4; `asos=6` | Bloqueada por MFA. Emissão de PDF de ASO depende de bucket inexistente (§4.2) |
| **AdminCatPage** — CAT (Comunicação de Acidente) | `IMPLEMENTADO_PARCIAL` | `App.tsx:360`; `.from('sst_cat')`,`.from('colaboradores')`; leit=3/escr=2; `sst_cat=1` | Bloqueada por MFA; 1 linha só |
| **AdminClinicasPartnersPage** — clínicas parceiras | `IMPLEMENTADO_PARCIAL` | `App.tsx:312`; `.from('clinicas_partners')`; leit=4/escr=7; `clinicas_partners=3` | Bloqueada por MFA |
| **AdminDiagnosticoMigracaoPage** — diagnóstico de infra | `IMPLEMENTADO_PARCIAL` (diagnóstico **sempre vermelho**) | `App.tsx:376`; `AdminDiagnosticoMigracaoPage.tsx:23-37` (constantes hardcoded), `:88-120` (checks) | Espera 15 cron jobs nomeados (nenhum dos 6 reais bate) e 13 buckets (existem **0**). Ver §4.2/§4.3 |
| **AdminEpisFichasPage** — fichas de EPI | `IMPLEMENTADO_PARCIAL` | `App.tsx:336`; `.from('epis_fichas')`, `.from('epis_fichas_assinaturas')`; `epis_fichas=1`, **`epis_fichas_assinaturas=0`** | Assinatura de ficha nunca ocorreu; bloqueada por MFA |
| **AdminExtintoresPage** — extintores/inspeções | `IMPLEMENTADO_PARCIAL` | `App.tsx:344`; `.from('sst_extintores')`,`.from('sst_extintores_inspecoes')`; `5`/`2` linhas | Bloqueada por MFA |
| **AdminIdempotenciaPage** — saúde de idempotência | `IMPLEMENTADO_PARCIAL` | `App.tsx:280`; `.rpc('get_idempotency_health')` — RPC **existe** em prod | Somente leitura (escr=0). Bloqueada por MFA |
| **AdminOperacaoPage** — painel de operação | `IMPLEMENTADO_PARCIAL` | `App.tsx:288`; `.rpc('get_cron_jobs_health')`, `.rpc('get_dlq_stats')`, `.rpc('get_idempotency_health')`, `:90 .rpc('get_security_alerts_summary')` — todas existem | Bloqueada por MFA. `security_alerts=0` → painel de alertas sempre vazio |
| **AdminPontoDivergenciasPage** — divergências AFDT | `SUGERIDO_OU_INICIADO` | `App.tsx:304`; `.from('afdt_divergencias')`; **`afdt_divergencias=0`** | Nenhuma divergência jamais gravada; produtor é a edge fn `parse-afdt` (deploy `NAO_VERIFICADO`) |
| **AdminRegimentoInternoPage** — regimento interno | `IMPLEMENTADO_PARCIAL` | `App.tsx:368`; `.from('sst_regimento_documentos')`; `=1`, `sst_regimento_assinaturas=1` | Bloqueada por MFA; upload do documento depende de bucket inexistente |
| **AdminSecurityPage** — alertas de segurança | `SUGERIDO_OU_INICIADO` | `App.tsx:296`; `AdminSecurityPage.tsx:107 .from('security_alerts')`; **`security_alerts=0`** | Tabela nunca populada; painel exibe estado vazio permanente |
| **AdminSstDashboardPage** — dashboard SST/SLA | `IMPLEMENTADO_PARCIAL` | `App.tsx:352`; `AdminSstDashboardPage.tsx:24 .rpc('sst_dashboard_sla')` — RPC **existe** | Bloqueada por MFA. Sem estado de erro: `if (isLoading \|\| !data)` (L30) mostra skeleton **eterno** se a RPC falhar |
| **AdminTelemetriaPage** — telemetria de queries | `IMPLEMENTADO_TOTAL` | `App.tsx:272`; `AdminTelemetriaPage.tsx:58 .from("query_telemetry")`, `:78 .delete()`; **`query_telemetry=265`** | Único painel admin com dado real de volume. Ressalva: inacessível hoje por MFA (§4.1) |
| **AdmissoesPage** — lista de admissões | `IMPLEMENTADO_TOTAL` | `App.tsx:206`; `AdmissoesPage.tsx:3` → `useAdmissoes.ts:14` → `admissaoService` (`BaseService('admissoes')`, `admissaoService.ts:5`); **`admissoes=8`** | — |
| **AfastamentosPage** — afastamentos | `IMPLEMENTADO_PARCIAL` | `App.tsx:207`; `AfastamentosPage.tsx:3,6` → `afastamentoService.ts` (`afastamentos`,`cid10`,`config_afastamentos`,`documentos_afastamento`,`prorrogacoes_afastamento`); `afastamentos=1`,`cid10=6`,`config=6`, **`documentos_afastamento=0`**, **`prorrogacoes_afastamento=0`** | Upload de documento (`afastamentoService.ts:125-131`) usa bucket `afastamentos` que **não existe** (§4.2). Prorrogação nunca usada |
| **AssinarContratoPage** — assinatura pública por token | `SUGERIDO_OU_INICIADO` | `App.tsx:181`; `:55/:81/:124` RPCs `contrato_preview_url_por_token`, `contrato_consultar_por_token`, `contrato_assinar_por_token` — **todas existem**; **`contratos_gerados=0`**, **`contrato_token_eventos=0`** | Nenhum contrato jamais gerado → nenhum token possível. PDF depende do bucket `contratos-trabalho` (inexistente) |
| **AssinaturasPage** — painel de assinaturas | `SUGERIDO_OU_INICIADO` | `App.tsx:251`; `AssinaturasPage.tsx:14` → `useAssinaturas.ts` `.from('admissao_tokens')`; **`admissao_tokens=0`** | Lista sempre vazia; escr=0 (só leitura + filtro) |
| **AssistenteIAPage** — chat de IA | `IMPLEMENTADO_PARCIAL` | `App.tsx:261`; `AssistenteIAPage.tsx:66` → `assistenteIAService.ts:131 fetch(${functionsBase}/assistente-ia)`; fn existe no repo (`supabase/functions/assistente-ia`) | Deploy da edge function `NAO_VERIFICADO`. Sem persistência: histórico só em `useState` (`:35`) — some ao recarregar |
| **AuditoriaPage** — consulta de auditoria | `IMPLEMENTADO_PARCIAL` | `App.tsx:255` (AdminRoute); `auditoriaService.ts:38 .rpc('listar_auditoria')`, `:60 .rpc('registrar_auditoria')` — existem; `:81 .from('notificacoes')` com **`notificacoes=0`** | Bloqueada por MFA. Aba de notificações sempre vazia |
| **AuthCallbackPage** — callback OAuth | `IMPLEMENTADO_PARCIAL` | `App.tsx:179`; `AuthCallbackPage.tsx:3`; 51 linhas, eager | Sem persistência própria. Sem prova de uso (5 usuários em `auth.users`) |
| **AvaliacaoPage** — avaliação de desempenho / OKR / PDI | `SUGERIDO_OU_INICIADO` | `App.tsx:242`; `AvaliacaoPage.tsx:11` → `avaliacaoService.ts`: `ciclos_avaliacao=2`, **`competencias_config=0`**, **`feedbacks_360=0`**, **`metas_okrs=0`**, **`pdi_plano_desenvolvimento=0`** | 4 das 5 tabelas do módulo vazias: 2 ciclos criados, zero avaliação/meta/feedback executados |
| **BackupPage** — exportação CSV/JSON | `IMPLEMENTADO_PARCIAL` **(backup silenciosamente incompleto)** | `App.tsx:264` (AdminRoute); `BackupPage.tsx:12` → `backupService.ts:14-24` `BACKUP_TABLES` | Inclui `'folha_pagamento'` (`backupService.ts:18`) que **não existe** no schema (a real é `folhas_pagamento`). `Promise.allSettled` (`:53`,`:99`) engole o erro → backup sai sem folha, sem aviso. Ver §4.4 |
| **BancoHorasPage** — banco de horas | `IMPLEMENTADO_PARCIAL` | `App.tsx:415`; `BancoHorasPage.tsx:19 .from('banco_horas')`; **`banco_horas=25`** | KPI "Saldo geral" é o literal `—` (`BancoHorasPage.tsx:41`) — métrica falsa. Página é 100% leitura; escrita só via `bancoHorasService.ts:40`, sem UI que a chame |
| **BeneficioFormPage** — criar benefício | `IMPLEMENTADO_TOTAL` | `App.tsx:213`; `BeneficioFormPage.tsx:8` → `useBeneficios.ts:15` → `beneficioService` (`BaseService('beneficios')`, `beneficioService.ts:13`); **`beneficios=8`** | — |
| **BeneficiosPage** — lista/adesão de benefícios | `IMPLEMENTADO_PARCIAL` **(dado real órfão)** | `App.tsx:212`; `BeneficiosPage.tsx:12`; `beneficioService.ts:38,96,109,119` usa **`beneficios_colaborador` (0 linhas)**; as **74** adesões reais estão em `beneficios_colaboradores` | Split de tabela: a UI lê a tabela errada. Ver §4.5 — achado mais grave de dado |
| **CalculadoraRescisaoPage** — rescisão | `IMPLEMENTADO_PARCIAL` | `App.tsx:262`; `.from('colaboradores')`, `.from('desligamentos')`, `.from('historico_rescisoes')`; `desligamentos=2`, **`historico_rescisoes=0`** | Cálculo via `edgeFunctionsService` (`:20`) → `calcular-rescisao` (deploy `NAO_VERIFICADO`). Nenhum cálculo jamais persistido em `historico_rescisoes` |
| **CanalContabilidadePage** — canal com contabilidade | `IMPLEMENTADO_TOTAL` | `App.tsx:224`; `CanalContabilidadePage.tsx:15` → `canalContabilidadeService.ts`: `contabilidade_threads=3`, `contabilidade_mensagens=5`, `contabilidade_contatos=3` | Ressalva: anexos usam bucket `contabilidade-anexos` (`canalContabilidadeService.ts:10,134`) que **não existe** → anexar arquivo falha |
| **CanalEticaPage** — canal de ética | `SUGERIDO_OU_INICIADO` | `App.tsx:256`; `CanalEticaPage.tsx:14 .from('canal_etica')`; **`canal_etica=0`** | Nenhuma denúncia registrada; CRUD existe (escr=4) mas nunca exercido |
| **CargosPage** — cargos | `IMPLEMENTADO_TOTAL` | `App.tsx:230`; `CargosPage.tsx:2` → `useCargos.ts:11` → `cargoService.ts:6 BaseService('cargos')`; **`cargos=14`** | — |
| **CentrosCustoPage** — centros de custo | `MORTO_OU_ABANDONADO` | Importada em `App.tsx:75`, **nenhum `<Route>` a referencia** (`grep "CentrosCustoPage" App.tsx` → só L75); `.from('centros_custo')` com **`centros_custo=0`** | Rota inexistente. `Breadcrumbs.tsx:57` e `PageTransition.tsx:110` já mapeiam `/centros-custo`, que hoje cai no catch-all `App.tsx:421` → 404. Ver §4.6 |
| **CienciaMedidaPage** — ciência de medida disciplinar (token público) | `SUGERIDO_OU_INICIADO` | `App.tsx:184`; `:107/:145` RPCs `medida_consultar_por_token`, `medida_registrar_ciencia_publica` — **existem**; **`medidas_disciplinares=0`** | Nenhuma medida disciplinar registrada → nenhum token pode existir. Fluxo nunca executado em produção |
| **ColaboradorDetalhesPage** — ficha do colaborador | `IMPLEMENTADO_TOTAL` | `App.tsx:203`; `ColaboradorDetalhesPage.tsx:4,11` → `colaboradorService` `.from('colaboradores')`; **`colaboradores=13`** | Somente leitura (escr=0), por design |
| **ColaboradorFormPage** — cadastro/edição | `IMPLEMENTADO_TOTAL` | `App.tsx:201,202`; `ColaboradorFormPage.tsx:18,26-29` (`colaboradorService`, `useDepartamentos`, `useCargos`, `useFormGuard`, `useServerValidation`); leit=4/escr=3; `colaboradores=13` | — |
| **ColaboradoresPage** — lista de colaboradores | `IMPLEMENTADO_TOTAL` | `App.tsx:200`; `ColaboradoresPage.tsx:11-17,28`; `colaboradores=13` | Exportação Excel/PDF client-side (não depende de storage) |
| **ComunicacaoInternaPage** — comunicados | `SUGERIDO_OU_INICIADO` | `App.tsx:390`; `ComunicacaoInternaPage.tsx:17,18`; `comunicacaoService.ts`: **`comunicados=0`**, **`comunicados_leituras=0`**, `canal_etica=0` | CRUD completo (escr=10) mas nenhum comunicado publicado |
| **ConfiguracoesPage** — 17 abas de configuração | `IMPLEMENTADO_PARCIAL` | `App.tsx:268` (AdminRoute); `ConfiguracoesPage.tsx:31-49` (17 abas) e `:76-99` (17 `TabsContent` — cobertura 1:1, sem aba órfã) | Página é só um shell de abas; a substância está em 17 componentes de `components/settings/` (fora do meu escopo — lote de componentes). Inacessível hoje por MFA |
| **ContabilidadePage** — contabilização de folha | `IMPLEMENTADO_PARCIAL` | `App.tsx:223`; `ContabilidadePage.tsx:10` → `contabilidadeService.ts`: `folhas_pagamento=4`, `lancamentos_contabeis=5`, `plano_contas=23` | Página é 100% leitura (escr=0): exibe lançamentos mas não os gera pela UI |
| **ContratacaoPage** — admissão digital pública | `IMPLEMENTADO_PARCIAL` | `App.tsx:426` (pública); `ContratacaoPage.tsx:230 supabase.storage.from('documentos').upload(...)`; `.from('admissao_tokens')` (**0**), `.from('admissoes')` (8), `.from('documentos')` (**0**), `.from('documentos_admissao')` (**0**) | **Upload quebrado**: bucket `documentos` não existe (§4.2). Sem `RouteErrorBoundary` (`App.tsx:427-431`). Comentário no próprio código admite bug histórico de upload (`:237`) |
| **ContratoTemplatesPage** — templates de contrato | `IMPLEMENTADO_PARCIAL` | `App.tsx:419` (AdminRoute); `ContratoTemplatesPage.tsx:11,40` → `contratoTemplateService.ts` `.from('contrato_templates')`; **`contrato_templates=5`** | Templates existem, mas nunca geraram contrato (`contratos_gerados=0`). Bloqueada por MFA |
| **ContratosGeradosPage** — contratos gerados | `SUGERIDO_OU_INICIADO` | `App.tsx:420` (AdminRoute); `ContratosGeradosPage.tsx:106-110 contratoTemplateService.listarGerados`, `:191 downloadUrl`, `:201 gerarTokenAssinatura`; **`contratos_gerados=0`**, **`contrato_token_eventos=0`** | Lista sempre vazia. `contratoTemplateService.ts:134` usa bucket `contratos-trabalho` (inexistente). Bloqueada por MFA |
| **ControleAcessoPage** — registro de acesso físico | `SUGERIDO_OU_INICIADO` | `App.tsx:393` (AdminRoute); `ControleAcessoPage.tsx:14` → `controleAcessoService.ts .from('controle_acesso')`; **`controle_acesso=0`** | Nenhum acesso registrado. Bloqueada por MFA |
| **ConveniosPage** — convênios | `SUGERIDO_OU_INICIADO` | `App.tsx:404`; `ConveniosPage.tsx:15` `.from('convenios')`, `.from('convenios_colaboradores')`, `.from('colaboradores')`; **`convenios=0`**, **`convenios_colaboradores=0`** | CRUD completo (escr=11) nunca exercido |
| **EPIsPage** (arquivo A–C? não — listada aqui por ser órfã do mesmo grupo) | — | ver §4.6 | — |

**Distribuição das 43 páginas A–C:** `IMPLEMENTADO_TOTAL` = 7 · `IMPLEMENTADO_PARCIAL` = 22 · `SUGERIDO_OU_INICIADO` = 13 · `MORTO_OU_ABANDONADO` = 1 (CentrosCustoPage).

---

## 4. Achados graves

### 4.1 [CRÍTICO] As 23 rotas `AdminRoute` estão INACESSÍVEIS em produção — MFA obrigatório com 0 fatores cadastrados
`AdminRoute.tsx` só renderiza `children` quando `mfaState === 'verified'` (`AdminRoute.tsx:196`, último `return`). O estado é derivado de `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` (`:32`): sem TOTP enrolado, `nextLevel !== 'aal2'` → cai em `setMfaState('missing')` (`:54`) → renderiza a tela-bloqueio "Autenticação de Dois Fatores Obrigatória" (`:171-193`). O `.catch` é **fail-closed** (`:56-62`).

Medido em produção nesta sessão:
```
auth.users = 5 · auth.mfa_factors (total) = 0 · auth.mfa_factors (verified) = 0 · roles distintos em user_roles = 'admin'
```
Portanto **nenhum usuário consegue abrir** `auditoria`, `lgpd`, `seguranca`, `backup`, `usuarios`, `configuracoes`, `controle-acesso`, `configuracoes/contratos-templates`, `contratos-gerados` e os 14 `admin/*`. Toda a superfície administrativa do produto (23/110 rotas, 21%) é inalcançável hoje.

Contraste de política: `ProtectedRoute.tsx:54-56` é **fail-open** (`.catch(() => setMfaGate('ok'))`) enquanto `AdminRoute.tsx:56-62` é fail-closed. Os dois guards do mesmo app divergem na direção da falha.

### 4.2 [CRÍTICO] Existem ZERO buckets de storage em produção — todo upload/download de arquivo está quebrado
Medido: `storage.buckets = 0`, `storage.objects = 0`, `pg_policies where schemaname='storage' = 0`.

Consumidores no meu escopo que falham em runtime com "Bucket not found":
- `ContratacaoPage.tsx:230` → bucket `documentos` (fluxo público de admissão digital)
- `services/afastamentoService.ts:125-131` → bucket `afastamentos` (usado por `AfastamentosPage.tsx:6`)
- `services/canalContabilidadeService.ts:10,134,140` → bucket `contabilidade-anexos` (usado por `CanalContabilidadePage.tsx:15`)
- `services/contratoTemplateService.ts:134` → bucket `contratos-trabalho` (usado por `ContratosGeradosPage.tsx:191`)

Agravante: `AdminDiagnosticoMigracaoPage.tsx:25-29` lista 13 buckets esperados e **nenhum** deles é `contratos-trabalho`, nem `ferias-avisos` que o `CLAUDE.md` afirma ter criado na migração `20260723113000`. Ou seja: o inventário de buckets do código já diverge de si mesmo, e a realidade é zero.

### 4.3 [ALTO] Página de diagnóstico calibrada contra uma infraestrutura que não existe
`AdminDiagnosticoMigracaoPage.tsx:31-37` declara 15 cron jobs esperados (`audit-archive-retention-daily`, `purge-idempotency-daily`, …). Em produção há **6** jobs, todos `active=true`, e **nenhum nome coincide**:
```
dp-health-snapshot, dp-log-rotation-check, dp-partition-monthly,
dp-retention-anonymize-90d, dp-retention-delete-730d, update-despesa-updated-at-daily
```
Combinado com §4.2 (0/13 buckets), a única página de "saúde da migração" do sistema reportará falha permanente em cron + storage — e, como ela própria é `AdminRoute` (`App.tsx:376`), ninguém consegue abri-la para ver isso (§4.1).

### 4.4 [ALTO] O backup omite a folha de pagamento em silêncio
`services/backupService.ts:14-24` lista `'folha_pagamento'` (singular). Verificado: **não existe** tabela `public.folha_pagamento`; a real é `folhas_pagamento` (4 linhas). `fetchTableData` lança (`:36`), mas as chamadas usam `Promise.allSettled` (`:53` e `:99`) e o ramo `rejected` é **descartado sem log e sem aviso ao usuário** (`:58-70`, `:104-108`). O usuário baixa um "backup" de 9/10 tabelas, com o contador `tabelas:` (`:113`) refletindo apenas as que deram certo — nada indica a perda. Backup de DP sem folha é backup inútil.

### 4.5 [CRÍTICO] Split de tabela de benefícios: as 74 adesões reais são invisíveis ao aplicativo
Existem **duas** tabelas em `public`:
- `beneficios_colaborador` (singular) — **0 linhas** — é a que TODO o código usa
- `beneficios_colaboradores` (plural) — **74 linhas** — nenhum código de aplicação a lê

Consumidores da tabela vazia: `services/beneficioService.ts:7,38,94,96,109,119`; `hooks/useBeneficiosColaborador.ts:14,29,49`; `services/calculoBeneficiosService.ts:12,41,199`; `services/folha/calculoLoteService.ts:137-139`; e a edge function `supabase/functions/gerar-holerite/index.ts:111`.

Referências ao plural em todo o repo: **apenas** `src/integrations/supabase/types.ts:2265-2326` (arquivo gerado). Zero código executável.

Consequência direta: `BeneficiosPage` mostra adesão zero, e o **cálculo de folha e a geração de holerite descontam/creditam benefícios a partir de uma tabela vazia** — os 74 vínculos reais nunca entram na folha. `services/folha/calculoLoteService.ts:137` inclusive comenta "Tenta na tabela unificada `beneficios_colaborador`", revelando um refactor de unificação que criou a tabela nova e nunca migrou os dados.

### 4.6 [MÉDIO] 3 páginas importadas em `App.tsx` sem nenhuma rota — órfãs com link de entrada
Prova: as 109 páginas de `src/pages/*.tsx` estão todas importadas (`comm` entre importadas e arquivos = conjunto vazio), mas 3 componentes nunca aparecem em `Component={...}` nem em `<X />`:

| Componente | Import (linha) | Ocorrências em `<Route>` |
|---|---|---|
| `EPIsPage` | `App.tsx:71` | **0** — `grep -n "EPIsPage" src/App.tsx` retorna somente L71 |
| `FaltasPage` | `App.tsx:72` | **0** — `grep -n "FaltasPage" src/App.tsx` retorna somente L72 |
| `CentrosCustoPage` | `App.tsx:75` | **0** — `grep -n "CentrosCustoPage" src/App.tsx` retorna somente L75 |

Não é código apenas morto — há navegação apontando para eles:
- `src/components/dashboard/WorkforceHealthScore.tsx:69` define `route: '/faltas'` no card "Absenteísmo" → clicar leva ao catch-all `App.tsx:421` → **NotFoundPage**.
- `src/components/layout/PageTransition.tsx:106,108,110` registra `/faltas`, `/epis`, `/centros-custo` como rotas conhecidas para animação.
- `src/components/layout/Breadcrumbs.tsx:57` mapeia o rótulo `'centros-custo': 'Centros de Custo'`.

Efeito colateral de build: os três `lazy()` continuam gerando chunks que nunca são carregados.

### 4.7 [MÉDIO] `/ponto/kiosk` e `/contratacao` são públicas e sem proteção de rota
`App.tsx:180` expõe o quiosque de ponto sem qualquer guard, e `App.tsx:426` expõe a admissão digital — esta última é a **única rota lazy sem `RouteErrorBoundary`** (`:427-431` usa `Suspense` cru, enquanto todas as demais passam por `LazyPage`, `:161-169`). Um throw de render em `ContratacaoPage` (750 linhas, com OCR e upload) resulta em tela branca para um candidato externo, sem recuperação.

### 4.8 [MÉDIO] Módulo de avaliação de desempenho: 4 de 5 tabelas vazias
`AvaliacaoPage.tsx:11` → `services/avaliacaoService.ts` toca `ciclos_avaliacao` (**2**), `competencias_config` (**0**), `feedbacks_360` (**0**), `metas_okrs` (**0**), `pdi_plano_desenvolvimento` (**0**). Dois ciclos foram abertos e nenhuma avaliação, meta, feedback ou PDI foi produzido. O módulo tem 8 leituras/7 escritas de UI — o código está lá, o processo nunca rodou.

### 4.9 [BAIXO] Métrica falsa em `BancoHorasPage`
`BancoHorasPage.tsx:41` renderiza o KPI "Saldo geral" como o literal `—`, num card visualmente idêntico aos três KPIs calculados ao lado (`:38-40`). Não há cálculo, nem `TODO`. O usuário lê um placeholder como se fosse dado. É o único caso de métrica fabricada que encontrei em A–C — **não há `Math.random()` em nenhuma das 43 páginas** (`grep "Math\.random" A*.tsx B*.tsx C*.tsx` → 0 resultados), nem `TODO`/`FIXME`/`mock` real (os ~50 hits de "todos" são o adjetivo português em filtros de UI).

### 4.10 [BAIXO] `AdminSstDashboardPage` sem estado de erro
`AdminSstDashboardPage.tsx:30` usa `if (isLoading || !data)` para decidir o skeleton. Se `.rpc('sst_dashboard_sla')` (`:24`) falhar, `isLoading` vira `false` e `data` fica `undefined` → **skeleton eterno**, sem mensagem. A RPC existe em produção, mas o modo de falha permanece silencioso.

---

## 5. Lacunas — o que NÃO consegui verificar

1. **Compilação / lint / testes**: `node_modules` ausente. Nenhuma afirmação de "compila" ou "testes passam" foi feita. `NAO_VERIFICADO`.
2. **Deploy das Edge Functions**: sem PAT para a Management API. As funções `assistente-ia`, `calcular-rescisao`, `parse-afdt`, `gerar-contrato-pdf`, `gerar-holerite` existem em `supabase/functions/` mas **não sei se estão deployadas**. `NAO_VERIFICADO` — isso afeta a classificação de `AssistenteIAPage`, `CalculadoraRescisaoPage`, `AdminPontoDivergenciasPage`, `ContratosGeradosPage`.
3. **Substância das 17 abas de `ConfiguracoesPage`**: mora em `src/components/settings/*` — fora do meu escopo (páginas A–C). Classifiquei apenas o shell.
4. **RLS efetiva**: não testei se as policies deixam um usuário não-admin ler dados de outro tenant. Só verifiquei a presença dos guards de rota no cliente — que são contornáveis por definição (client-side).
5. **Corpo completo de 30 das 43 páginas A–C**: li integralmente 6 e amostrei as demais por extração estruturada (imports, tabelas/RPCs, contagem leitura/escrita, varredura de padrões suspeitos). Lógica de negócio interna a handlers que não tocam Supabase pode ter escapado.
6. **Origem do split `beneficios_colaborador(es)`**: não rastreei qual das 641 migrations criou cada tabela nem por que os dados ficaram no plural — apenas provei o estado atual e a ausência de leitor para o plural.
7. **Rotas dos lotes 2 e 3**: o mapa da §2 é completo (110/110) e serve de insumo, mas classifiquei apenas as páginas A–C.
