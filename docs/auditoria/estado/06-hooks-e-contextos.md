# Lógica — Hooks e Contextos

Repositório: `/home/user/Departamento-Pessoal-V3` (branch `claude/system-status-roadmap-5ifcl7`).
Banco lido AO VIVO (somente leitura) via MCP `SUPABASE - DEPARTAMENTO PESSOAL` (`frjbfeamybqsejlvmqbl`).

---

## 1. Cobertura

**Escopo real medido** (o briefing dizia "180 arquivos"; isso inclui testes):

| Diretório | Arquivos de produção | Linhas | Testes (`__tests__`, fora de escopo) |
|---|---|---|---|
| `src/hooks/` (raiz) | 85 | 7.038 | 83 |
| `src/hooks/ferias/` | 6 | 528 | 6 |
| `src/contexts/` | 4 (3 + `index.ts`) | ~470 | 3 |
| `src/providers/` | 4 (3 + `index.ts`) | ~90 | 0 |
| **Total de produção coberto** | **99** | **~8.1k** | — |

**Lido integralmente (33 arquivos):** `useEmpresas.ts`, `useColaboradorVinculo.ts`, `useExecutiveDashboard.ts`,
`useRealtimeDashboard.ts`, `useRealTimeSubscription.ts`, `useSystemHealth.ts`, `useSystemHealthHistory.ts`,
`usePendencias.ts`, `useNotificacoes.ts`, `useBeneficiosColaborador.ts`, `useOrganograma.ts`,
`usePontoMelhorado.ts` (parcial 1–70), `useGenericCrud.ts` (1–80), `useFerias.ts`, `useGrupo.ts` (1–60),
`useSecurityMonitor.ts`, `useSecureVisibility.ts`, `useDataAccessLog.ts`, `useCalculoFeriasPreview.ts`,
`useFeriasCursor.ts` (1–60), `useActionStateHelper.ts` (assinaturas), `validators.ts` (assinaturas),
`useMountEffects.ts` (assinaturas), `useTranslation.ts` (1–40), `hooks/index.ts`, `useAuth.ts`,
`AuthContext.tsx`, `EmpresaContext.tsx`, `NotificationContext.tsx`, `contexts/index.ts`,
`providers/index.ts`, `main.tsx` (montagem), `i18n/useTranslation.ts` + `i18n/index.ts` (cabeçalhos).

**Amostrado (66 arquivos):** varredura mecânica por arquivo extraindo (a) símbolos exportados,
(b) `.from('<tabela>')`, (c) `rpc('<fn>')`, (d) `functions.invoke('<fn>')`, (e) `import ... from '@/services/*'`,
(f) `staleTime/gcTime/refetchInterval/enabled`, (g) `Math.random|TODO|mock|hardcoded`. Depois cruzei
cada tabela/view/RPC contra o catálogo real do Postgres (`pg_class`, `pg_proc`, `information_schema.columns`)
e contra as contagens de linhas. Os 6 hooks de `hooks/ferias/` foram amostrados só nos blocos de `rpc()`
(argumentos conferidos 1‑a‑1 contra `pg_get_function_identity_arguments`).

**Método de prova de "morto":** para CADA símbolo exportado, `grep -rl "\b<símbolo>\b" src e2e supabase/functions`
excluindo o próprio arquivo, os `__tests__` e os barris (`hooks/index.ts`, `contexts/index.ts`,
`providers/index.ts`). Testei também as variações: `import * as` (só 5 ocorrências, todas de `@/services`
ou `react`, nenhuma de hooks), import via barril `from '@/hooks'` (43 ocorrências, listadas abaixo) e
grep bruto sem `\b`. Nada mudou o resultado.

**Uso real do barril `@/hooks`** (43 imports): apenas `useEmpresas` (39×), `useAuth` (2×), `useNow` (1×),
`useColaboradores` (1×), `usePontoOffline` (1×). Portanto **estar exportado em `hooks/index.ts` NÃO é
prova de consumo** — é o principal falso-positivo desta base.

**Não executei nada** (`node_modules` ausente): zero afirmações sobre compilação/lint/testes.

---

## 2. Tabela de funcionalidades

### 2.1 Contextos e providers

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta |
|---|---|---|---|
| Montagem de providers | `IMPLEMENTADO_TOTAL` | `src/main.tsx:163-185` monta `QueryProvider → ThemeProvider → ToastProvider → AuthProvider → NotificationProvider → EmpresaProvider`. Nenhum provider criado sem montar. | — |
| `AuthContext` (login/roles/MFA/prefetch) | `IMPLEMENTADO_TOTAL` | `src/contexts/AuthContext.tsx:38` RPC `get_user_roles` **existe** (`pg_proc`); `:175` POST em edge `auth-login`; `user_roles`=4 linhas (todas `admin`). | Deploy da edge `auth-login` = `NAO_VERIFICADO` (sem PAT). |
| `EmpresaContext` (`useEmpresa`) | `IMPLEMENTADO_PARCIAL` | `src/contexts/EmpresaContext.tsx:20-45`; 12 consumidores reais (`SSTPage`, `FeriadosPage`, `command-palette`, `BackupPage`, …). Delega 100% a `useEmpresas` — o "dual-state" citado no comentário `:17` está de fato resolvido. | `empresas: Empresa[]` (`:29-31`) é **sempre `[]`** — ver Achado #2. |
| `NotificationContext` | `IMPLEMENTADO_PARCIAL` | `src/contexts/NotificationContext.tsx:19-40`; delega a `useNotificacoes`. | `public.notificacoes` = **0 linhas**. Alias `useNotifications` (`:50`) tem **0 consumidores**. |
| `QueryProvider` / `ThemeProvider` / `ToastProvider` | `IMPLEMENTADO_TOTAL` | `src/providers/index.ts:1-4` + `main.tsx:167-170`. `QueryProvider.tsx:17-18` staleTime 5min/gcTime 30min. | — |

### 2.2 Hooks com dado real no banco

| Funcionalidade | Classificação | Evidência (arquivo:linha) + tabela | O que falta |
|---|---|---|---|
| Contexto de empresa (`useEmpresas`) | `IMPLEMENTADO_PARCIAL` | `src/hooks/useEmpresas.ts:132-353`; `empresas`=1, `user_empresas`=4. 137 arquivos referenciam. | Achados #1 e #2 (quebra para não-admin; join ausente). |
| Grupo empresarial (`useGrupo`) | `IMPLEMENTADO_PARCIAL` | `src/hooks/useGrupo.ts:53-60` → `empresas` (1 linha). Consumidor: `EmpresaSwitcher.tsx:40`. | 1 empresa só; "grupo" não exercitado. |
| Férias — CRUD + aprovação | `IMPLEMENTADO_TOTAL` | `src/hooks/useFerias.ts:8-112` (`feriasService`); `ferias`=12, `periodos_aquisitivos`=12. Consumidores: `FeriasPage.tsx`, `CalendarioFerias.tsx`. | — |
| Férias — assinatura do aviso | `IMPLEMENTADO_PARCIAL` | `src/hooks/useAssinarAvisoFerias.ts:54-60` RPC `assinar_aviso_ferias(p_ferias_id,p_hash,p_pdf_url,p_ip,p_ua)` — assinatura **confere** com `pg_proc`. | `ferias_audit_log`=12 mas nenhuma coluna de assinatura verificada com N>0 → uso real não comprovado. |
| Férias — alerta pagamento D‑2 | `IMPLEMENTADO_TOTAL` | `src/hooks/ferias/useAlertasPagamentoD2.ts:40,65-69`; view `v_ferias_alerta_pagamento_d2` = **5 linhas**; RPC `registrar_pagamento_ferias` confere. | — |
| Férias — reconciliação com folha | `IMPLEMENTADO_TOTAL` | `src/hooks/ferias/useReconciliacaoFolha.ts:38`; view `v_ferias_folha_reconciliacao` = **4 linhas**. | — |
| Férias — logs de reconciliação | `SUGERIDO_OU_INICIADO` | `src/hooks/ferias/useReconciliacaoLogs.ts:25` → `ferias_reconciliacao_logs` = **0 linhas**. | Nenhuma execução jamais registrada. |
| Férias — programação (Kanban) | `SUGERIDO_OU_INICIADO` | `src/hooks/ferias/useProgramacaoFerias.ts:138-219`; as 5 RPCs `programacao_ferias_*` **existem** e os argumentos conferem; mas `ferias_programacao` = **0 linhas**. | Nunca usado em produção. |
| Férias — comunicado de coletivas | `SUGERIDO_OU_INICIADO` | `src/hooks/ferias/useGerarComunicadoColetivas.ts:71-77` (RPC confere); `ferias_coletivas` = **0 linhas**. | Idem. |
| Férias — adiantamento 13º | `SUGERIDO_OU_INICIADO` | `src/hooks/ferias/useAdiantamento13.ts:27-29` (RPC confere); depende de `ferias` mas sem coluna com N>0 comprovada. | Uso real não comprovado. |
| Colaboradores / Cargos / Departamentos / Afastamentos / Desligamentos / Locais / Folha (via `useGenericCrud`) | `IMPLEMENTADO_TOTAL` | `src/hooks/useGenericCrud.ts:31-141`, usado por 10 hooks; `colaboradores`=13, `cargos`=14, `departamentos`=10, `afastamentos`=1, `desligamentos`=2, `folhas_pagamento`=4. | — |
| Detalhes do colaborador | `IMPLEMENTADO_PARCIAL` | `src/hooks/useColaboradorDetalhes.ts` (284 L), 11 consumidores em `components/colaborador-detalhes/`. | **11 dos ~28 exports mortos** (§2.4). |
| Tabelas de referência | `IMPLEMENTADO_PARCIAL` | `src/hooks/useTabelasReferencia.ts` (234 L); usados: `useContasBancarias` (`contas_bancarias`=12), `useDocumentosPessoais`, `useDadosEstagiario`. | **~30 dos 36 exports mortos** (§2.4). |
| Auditoria de acesso a dado sensível | `IMPLEMENTADO_TOTAL` | `src/hooks/useDataAccessLog.ts:115-122` RPC `registrar_auditoria(p_tabela,p_registro_id,p_acao,p_dados_anteriores,p_dados_novos,p_empresa_id)` — assinatura **confere**; `audit_log`=281, `audit_log_unified`=512. 5 páginas consomem. | — |
| Health check do banco | `IMPLEMENTADO_TOTAL` | `src/hooks/useSystemHealth.ts:21` e `useSystemHealthHistory.ts:101-105` → `versao_banco`=1. | Métricas avançadas dependem da edge `metricas` (`NAO_VERIFICADO`). |
| Ponto — solicitações de ajuste | `IMPLEMENTADO_PARCIAL` | `src/hooks/usePontoMelhorado.ts:38-42` → `solicitacoes_ajuste_ponto`=3 (todas `status='em_analise'`). | `enabled: true` com `empresaId!` (Achado #7). |
| Ponto — offline (IndexedDB) | `IMPLEMENTADO_PARCIAL` | `src/hooks/usePontoOffline.ts` → `pontoOfflineService`; `PontoPage.tsx:26`. | Fila local; sincronismo com `registros_ponto`(120) não comprovado. |
| Feriados (dados) | `IMPLEMENTADO_TOTAL` (mas via página, não via hook) | `src/pages/FeriadosPage.tsx:33` query inline em `feriados` (28 linhas). | O hook `useFeriados.ts` é morto — Achado #5. |
| Segurança de sessão | `IMPLEMENTADO_TOTAL` | `src/hooks/useSessionTimeout.ts`, `useSecureVisibility.ts:75-93`, `useSecurityMonitor.ts:35-71` — todos montados em `src/App.tsx:8-10`. | Lógica 100% client-side (sem persistência). |
| Anti brute-force (login) | `IMPLEMENTADO_PARCIAL` | `src/hooks/useBruteForceProtection.ts` ← `LoginPage.tsx`; `login_lockouts`=3, `rate_limits`=3. | — |

### 2.3 Hooks cujo alvo no banco está VAZIO

| Funcionalidade | Classificação | Evidência | O que falta |
|---|---|---|---|
| Benefícios do colaborador | `IMPLEMENTADO_PARCIAL` | `src/hooks/useBeneficiosColaborador.ts:14,29,49` → `beneficios_colaborador` = **0 linhas**, enquanto `beneficios_colaboradores` = **74 linhas**. | Achado #3 (tabela duplicada, app lê a vazia). |
| Notificações | `SUGERIDO_OU_INICIADO` | `src/hooks/useNotificacoes.ts:41-46` → `notificacoes` = **0 linhas**. Geração automática (`:118-…`) só dispara por mutation manual da UI. | Nenhum job/trigger popula. |
| Pendências do dashboard | `SUGERIDO_OU_INICIADO` | `src/hooks/usePendencias.ts:237-241` → `pendencias` = **0 linhas** (colunas conferem). | Nada escreve na tabela. |
| Documentos do colaborador | `SUGERIDO_OU_INICIADO` | `src/hooks/useDocumentos.ts` → `documentos` = **0 linhas**. | — |
| Assinatura digital / contratação digital / workflow de admissão | `SUGERIDO_OU_INICIADO` | `useAssinaturas.ts`, `useContratacaoDigital.ts`, `useAdmissaoWorkflow.ts` → `admissao_tokens` = **0**, `workflows_historico` = **0** (`admissoes`=8, `workflows_execucoes`=8). | Fluxo de token/assinatura nunca executado. |
| Contratos — KPI de assinatura / vencendo / timeline | `SUGERIDO_OU_INICIADO` | `useContratosAssinaturaKPI.ts:55,72`, `useContratosVencendo.ts:52`, `useContratoTokenTimeline.ts:42` → views `v_contratos_assinatura_kpi`=**0**, `v_contratos_tokens_pendentes`=**0**, `v_contratos_vencendo`=**0**, `v_contrato_token_timeline`=**0**. | Cards renderizam sempre vazios. |
| Auditoria da folha | `SUGERIDO_OU_INICIADO` | `useCalculoFolha.ts` / `useFolhaAuditoria.ts` → `folha_auditoria` = **0 linhas** (`folhas_pagamento`=4, `folha_itens`=12). | Cálculo grava folha mas não auditoria. |
| Dashboard executivo — financeiro estratégico | `SUGERIDO_OU_INICIADO` | `useExecutiveDashboard.ts:101-105` → `personnel_budget` = **0 linhas**. | Orçamento nunca cadastrado. |

### 2.4 `MORTO_OU_ABANDONADO` — provado (nenhum caminho de execução chega)

| Alvo | Linhas | Evidência de ausência de chamador |
|---|---|---|
| `src/hooks/useNovasTabelas.ts` — **22 exports, 0 consumidores** | 241 | `hooks/index.ts:42-50` reexporta; grep bruto por `useBatidasPonto`/`useFaltas`/`useEpis`/`useMedidasDisciplinares`/`useJornadaHorarios`/`useBancoHorasConfig` → **só** `index.ts` + o próprio arquivo. As páginas usam os *services* direto: `EPIsPage.tsx:16 episService`, `FaltasPage.tsx faltasService`, `MedidasDisciplinaresPage.tsx medidasDisciplinaresService`, `PontoPage.tsx:24 batidasPontoService`. **Refactor abandonado.** |
| `src/hooks/useTabelasReferencia.ts` — ~30 exports mortos | de 234 | `useNacionalidades`, `useTiposDesligamento`, `useTiposAvisoPrevio`, `useTiposDeficiencia`, `useTiposPagamento`, `useTiposSalario`, `useRelacionamentosDependentes`, `useGenerosDocumento`, `useTiposVisto`, `useCondicoesIngresso`, `useTemposResidencia`, `useDescricoesLogradouro`, `usePaises`, `useCategoriasTrabalhador`, `useRelacionamentosContatoEmergencia`, `useMotivosAfastamento`, `useCentrosCusto` (+Criar/Atualizar/Excluir), `useCriar/AtualizarContaBancaria`, `useFeriasAprovacoes` (+Criar/Atualizar), `useFeriasArquivos` (+Criar), `useDependentesBeneficios` (+Vincular/Desvincular) — todos só em `hooks/index.ts:70-84`. |
| `src/hooks/useColaboradorDetalhes.ts` — 11 exports mortos | de 284 | `useAtualizarDependente`, `useCamposCustomizados`, `useCriarFeriasColetivas`, `useFeriasColetivas`, `useCriarWebhook`, `useWebhooks`, `useEtnias`, `useIdentidadesGenero`, `useTimes`, `useTiposAdmissao`, `useTiposEstabilidade` — só em `hooks/index.ts:53-67`. |
| `src/hooks/useActionStateHelper.ts` | 111 | `useFormActionState` sem consumidor. O próprio arquivo admite: `:7` *"Auditoria 26/07: zero usos de useFormState e zero usos de useFormActionState"*. Não exportado no barril. |
| `src/hooks/validators.ts` | 109 | Único importador é `useActionStateHelper.ts:44` (que é morto). `src/utils/importacao/parser.ts:3` importa `./validators` — **outro arquivo**, não este. |
| `src/hooks/useFeriasCursor.ts` | 104 | **0 referências** em todo `src/` + `e2e/` além do próprio arquivo. Nem no barril. Keyset pagination P1‑020 nunca ligada. |
| `src/hooks/usePonto.ts` | 84 | Só `hooks/index.ts:24`. `PontoPage.tsx:24,26` usa `pontoService`/`batidasPontoService`/`usePontoOffline`. Duplicata abandonada. |
| `src/hooks/useNavigationGuard.tsx` | 81 | Só `hooks/index.ts:36`. (`useFormGuard.ts` é o que roda: `ColaboradorFormPage`, `EmpresaFormPage`.) |
| `src/hooks/useMediaQuery.ts` — 4 exports | 54 | `useMediaQuery`, `useBreakpoint`, `usePrefersDarkMode`, `usePrefersReducedMotion`: só `hooks/index.ts:3`. Quem roda é `use-mobile.tsx` (`ui/sidebar.tsx`). |
| `src/hooks/useConfiguracoesIntervalo.ts` | 53 | Só `hooks/index.ts:33`. |
| `src/hooks/useFeriados.ts` | 53 | Só `hooks/index.ts:26`. `FeriadosPage.tsx:30-51` reimplementa a query inline. |
| `src/hooks/useLocalStorage.ts` | 48 | Só `hooks/index.ts:2`. |
| `src/hooks/useAssinaturaDigital.ts` | 40 | Só `hooks/index.ts:13`. (Quem roda é `useAssinaturas.ts` em `AssinaturasPage`.) |
| `src/hooks/useCalculoFeriasPreview.ts` | 34 | **0 referências** em todo o repo. Doc `:13` promete uso no `FeriasForm` — o form não importa. |
| `src/hooks/useContratos.ts` | 34 | Só `hooks/index.ts:22`. |
| `src/hooks/useWebhooksAvancados.ts` (`useWebhooksAvancados` + `useWebhookLogs`) | 33 | Só `hooks/index.ts:34`. |
| `src/hooks/usePontosAbertos.ts` | 22 | Só `hooks/index.ts:35`. |
| `src/hooks/useValeTransporte.ts` | 16 | Só `hooks/index.ts:21`. |
| `src/hooks/useMountEffects.ts` — 2 de 3 exports | de 68 | `useOnMountWithDeps` (`:38`) e `useStableCallback` (`:62`) sem consumidor. `useOnMount` (`:18`) é usado por 15 arquivos. |
| `src/hooks/useTranslation.ts` (+ `src/i18n/*`) | 217 (+~200) | Único consumidor é `src/components/i18n/LanguageSelector.tsx:10`, e `LanguageSelector` **não é importado por ninguém** (`:2` diz "seletor de idioma no header"; `Header.tsx` não o importa). `src/i18n/useTranslation.ts` e `src/i18n/index.ts` têm 0 importadores externos. i18n inteiro é morto por transitividade. |
| `NotificationContext.tsx:50` alias `useNotifications` | 1 | 0 consumidores (todos usam `useNotification`). |

**Total morto medido: ~1.100 linhas de hook + ~70 símbolos exportados sem chamador.**

---

## 3. Achados graves

### #1 — CRÍTICO · `useEmpresas` deixa **todo** usuário não‑admin sem contexto de empresa
`src/hooks/useEmpresas.ts:156-158` — a query `todas-empresas` é `enabled: isAdmin`.
`:176-186` — as **quatro** vias de resolução da empresa efetiva derivam exclusivamente de `todasEmpresas`:
```
empresaAtualData        = todasEmpresas?.find(...)   // :176
empresaDefault          = todasEmpresas?.find(...)   // :181
empresaPrimeiraVinculada= todasEmpresas?.find(...)   // :184
empresaPrimeiraGlobal   = todasEmpresas?.[0]         // :185
empresaEfetiva = empresaAtualData || empresaDefault || empresaPrimeiraVinculada || empresaPrimeiraGlobal;
```
Para não‑admin, `todasEmpresas === undefined` ⇒ `empresaAtual = null` e `empresaAtualId = null` (`:339-340`).
Como ~137 arquivos gateiam suas queries em `enabled: !!empresaId`, **o app inteiro fica em branco para
não‑admins**. Hoje o bug está mascarado: `select role,count(*) from user_roles` retorna **`admin`=4, e
nenhum outro papel** — 100% dos usuários são admin. O primeiro usuário `user`/`moderator` cadastrado
derruba a aplicação para ele.

### #2 — ALTO · `user_empresas` é lido sem join; `EmpresaContext.empresas` é sempre `[]`
`src/hooks/useEmpresas.ts:145-151`: `.from("user_empresas").select(\`*\`)` — **sem** embed de `empresas` —
mas o retorno é tipado como `(UserEmpresa & { empresa: Empresa })[]`. Consequências verificadas:
- `src/contexts/EmpresaContext.tsx:29-31`: `userEmpresas.map(ue => ue.empresa).filter(Boolean)` ⇒ **sempre `[]`**.
- `src/components/empresa/EmpresaSelector.tsx:32-33`: `if (ue.empresa)` ⇒ o `Map` nunca é populado, lista vazia.
- `src/components/layout/EmpresaSelector.tsx:103`: `ue.empresa?.nome_fantasia || ue.empresa?.razao_social` ⇒ item renderizado **sem nome**.

### #3 — ALTO · Tabela de benefícios duplicada; o app lê a **vazia**
Ambas existem em `public` (confirmado em `pg_class`):
`beneficios_colaborador` = **0 linhas** · `beneficios_colaboradores` = **74 linhas**.
Todo o código aponta para a vazia: `src/hooks/useBeneficiosColaborador.ts:14,29,49`,
`src/services/beneficioService.ts:38,96,109,119`, `src/services/calculoBeneficiosService.ts:41,199`,
`src/services/folha/calculoLoteService.ts:139`, `supabase/functions/gerar-holerite/index.ts:111`.
**Zero referências** a `beneficios_colaboradores` em `src/`. Resultado: a aba Benefícios do colaborador,
o dashboard de adesões (`BeneficiosDashboard.tsx:9-19`) e o holerite calculam **0 adesões / R$ 0 de custo**
apesar de 74 vínculos reais gravados.

### #4 — ALTO · Realtime é decorativo: a publicação `supabase_realtime` está **vazia**
`select * from pg_publication_tables where pubname='supabase_realtime'` → **0 linhas**
(`pg_publication.puballtables = false`). Nenhuma tabela emite `postgres_changes`. Portanto:
- `src/hooks/useRealtimeDashboard.ts:187-203` (`DashboardPage`) nunca invalida cache nem exibe os toasts de `:146-161`;
- `src/hooks/useRealTimeSubscription.ts:36-55` (`AnalyticsSection`, `EventTimeline`, `DashboardExecutivoPage`) nunca dispara `handleChange`.
Agravante em `useRealtimeDashboard.ts:188-192`: o filtro é registrado **sem a chave `table`**, o que também
foge do contrato do `postgres_changes` do supabase-js. Classificação: `MORTO_OU_ABANDONADO` na prática.

### #5 — ALTO · `useColaboradorVinculo` está quebrado nas **duas** camadas (Portal do Colaborador)
`src/hooks/useColaboradorVinculo.ts:34`: `db.rpc('vincular_colaborador_ao_usuario')` — a função **não existe**
(`pg_proc` filtrado por `%vincular%` retorna apenas `auto_vincular_admins_empresa`).
`src/hooks/useColaboradorVinculo.ts:49`: `.eq('user_id', user.id)` sobre `colaboradores` — a tabela tem
**147 colunas e nenhuma se chama `user_id`** (`information_schema.columns`) ⇒ erro `42703`, `throw` em `:60`.
O hook sempre falha. Consumidores: `src/pages/PortalPage.tsx`, `src/components/portal/PortalRegimentoCard.tsx`.
O próprio comentário `:11-20` descreve a RPC como se existisse. Portal do Colaborador: `IMPLEMENTADO_PARCIAL`
com fio partido.

### #6 — MÉDIO-ALTO · Dashboard Executivo: 3 KPIs travados em zero por filtro que não casa com o dado
`src/hooks/useExecutiveDashboard.ts`:
- `:45` `.from('batidas_ponto')...gt('horas_falta','00:00:00')` — **`batidas_ponto` não tem coluna `horas_falta`**
  (39 colunas listadas, nenhuma). Erro silencioso ⇒ `diasFalta = null` ⇒ **absenteísmo sempre 0** (`:80`).
  Além disso `batidas_ponto` = **0 linhas**; o dado de ponto vive em `registros_ponto` (120 linhas).
- `:43` `ferias.status = 'pendente'` — valores reais: `concluida`(7), `aprovada`(4), `em_gozo`(1). **Nunca `pendente`** ⇒ `feriasPendentes` sempre 0.
- `:46` `solicitacoes_ajuste_ponto.status = 'enviado'` — valor real: `em_analise`(3). ⇒ `pontoPendentes` sempre 0.
- `:41` competência atual = `2026-08`; `folhas_pagamento` só tem até `2026-07` ⇒ `totalFolhaAtual = 0`,
  `custoMedio = 0` e `variacaoFolha = -100%` (`:76`).

### #7 — MÉDIO · Consultas com `enabled: true` e `empresaId!` (query dispara sem tenant)
`src/hooks/usePontoMelhorado.ts:36-41` e `src/hooks/useOrganograma.ts:11-18`. São os **únicos dois**
`enabled: true` do escopo. No primeiro, `.eq('empresa_id', empresaId!)` roda com `undefined`.
No segundo é pior: `useOrganograma` calcula `empresaId` (`:7`) e **nunca o usa** — busca `departamentos`
(`:15-18`) e `colaboradores` (`:23-26`) **sem nenhum filtro de empresa**, com o comentário `:14`
("Removido filtro de empresa_id … não existe no schema externo") justificando. O isolamento multi-tenant
do organograma depende exclusivamente de RLS.

### #8 — MÉDIO · `useNovasTabelas.ts` (241 L, 22 hooks) é um refactor abandonado
Ver §2.4. Camada de hooks criada sobre 6 services (`episService`, `faltasService`,
`medidasDisciplinaresService`, `batidasPontoService`, `jornadaHorariosService`, `bancoHorasConfigService`)
que **nenhuma página adotou** — todas chamam o service direto. O barril `hooks/index.ts:42-50` mantém a
ilusão de que a camada está viva.

### #9 — MÉDIO · i18n inteiro é morto por transitividade
`src/hooks/useTranslation.ts` (217 L) → único consumidor `LanguageSelector.tsx` → **0 consumidores**.
Existe ainda uma **segunda** implementação, `src/i18n/useTranslation.ts` + `src/i18n/index.ts`, com
**0 importadores** (o único `@/i18n` do repo é o `import` interno de `i18n/useTranslation.ts:27`).
Duas implementações concorrentes, nenhuma montada.

### #10 — BAIXO · `useFeriados` vs. query inline (duplicação de fonte da verdade)
`src/hooks/useFeriados.ts:7` existe e está correto, mas `src/pages/FeriadosPage.tsx:30-51` refaz
`supabase.from('feriados')` inline. Mesmo padrão em `usePonto`↔`PontoPage`, `useMediaQuery`↔`use-mobile`,
`useNavigationGuard`↔`useFormGuard`, `useAssinaturaDigital`↔`useAssinaturas`.

### Não-achados (verificados e limpos)
- **Dado fictício:** `Math.random()` aparece **1 vez** no escopo, em `useIdempotencyKey.ts:30`, como
  fallback de `crypto.randomUUID` — uso legítimo. **Nenhum** valor hardcoded, mock ou seed em hooks/contextos.
- **`staleTime` mascarando ausência de dado:** nenhum `Infinity`. Valores entre 30s e 5min; `QueryProvider.tsx:17-18`
  usa 5min/30min. Nada suspeito.
- **Assinaturas de RPC:** as 11 RPCs invocadas por hooks que existem tiveram os nomes de argumento conferidos
  1‑a‑1 contra `pg_get_function_identity_arguments` — **todas batem** (a única inexistente é a do Achado #5).
- **Providers órfãos:** nenhum. Os 6 providers de `src/contexts` + `src/providers` estão montados em `main.tsx:163-185`.

---

## 4. Lacunas (não verificado e por quê)

1. **Deploy das Edge Functions** — `NAO_VERIFICADO`. Sem PAT do Management API. Afeta a validação de
   `useCalcular13Salario` (`calcular-13-salario`), `useDocumentOCR` (`process-document-ocr`),
   `useSystemHealth` (`metricas`) e `AuthContext` (`auth-login`). O código do cliente está correto;
   não sei se a função responde.
2. **Comportamento em runtime** — `node_modules` ausente. Não executei build, typecheck, lint nem testes.
   Toda conclusão aqui é estática ou vem de leitura do banco. Os Achados #1, #5, #6 são deduções de
   schema+código, não observações de tela.
3. **Colunas usadas dentro dos `services/`** — só validei as colunas tocadas **diretamente** pelos hooks
   (`.from()` nos 91 arquivos). Hooks que delegam a `@/services/*` (≈35 dos 91) têm suas colunas
   validadas no escopo do agente de Services, não neste.
4. **Buckets de Storage** — `useAssinarAvisoFerias`, `useDocumentos` e `useGerarComunicadoColetivas`
   escrevem em Storage; não listei buckets nem objetos.
5. **RLS efetiva** — 599 policies existem, mas não testei nenhuma sob um JWT real. Os Achados #1 e #7
   descrevem o que o código faz, não o que a RLS permitiria.
6. **`__tests__`** — 92 arquivos de teste (83 + 6 + 3) explicitamente **fora de escopo** por instrução.
   Não avaliei se protegem algo.
7. **Consumo transitivo profundo** — a prova de "morto" cobre 1 nível (símbolo → arquivo importador).
   Para `useTranslation` fui 2 níveis (hook → `LanguageSelector` → ninguém). Para os demais hooks vivos
   não verifiquei se a *página* consumidora está roteada em `App.tsx` — isso é do agente de Rotas/Páginas.
