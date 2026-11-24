# Lógica — Services (parte 2/2: `src/services/`, arquivos g–z)

## 1. Cobertura

**Lidos integralmente (40 arquivos, ~4.430 linhas):**

- Raiz `src/services/` (32 arquivos g–z): `historicoContratoService.ts`, `horaExtraService.ts`, `index.ts`,
  `integracaoService.ts`, `intervaloService.ts`, `jornadaHorariosService.ts`, `lgpdService.ts`,
  `localTrabalhoService.ts`, `loggerService.ts`, `medidasDisciplinaresService.ts`, `metabaseService.ts`,
  `notificacoesService.ts`, `pcsService.ts`, `pesquisaService.ts`, `pontoAbertoService.ts`,
  `pontoAuditService.ts`, `pontoMonitorService.ts`, `pontoOfflineService.ts`, `pontoService.ts`,
  `pontosService.ts`, `premiacoesService.ts`, `provisaoService.ts`, `pushNotificationService.ts`,
  `recrutamentoService.ts`, `rescisaoService.ts`, `securityService.ts`,
  `tabelasComplementaresService.ts`, `tabelasReferenciaService.ts`, `turnoService.ts`,
  `webhookService.ts`, `whatsappService.ts`, `workflowService.ts`
- `src/services/tabelas/` (8 arquivos, prefixo `t`): `index.ts`, `adminService.ts`, `beneficiosService.ts`,
  `documentosService.ts`, `folhaService.ts`, `pontoService.ts`, `rhService.ts`, `viewsService.ts`

**Lidos integralmente fora do escopo (necessários para provar o caminho de execução):**
- `src/integrations/supabase/client.ts` (394 linhas) — prova de que `supabase.from()`/`supabase.rpc()`
  do front **não** falam com PostgREST: são um `Proxy` que POSTa na edge function `external-db-bridge`.
- `supabase/functions/external-db-bridge/validation.ts` (linhas 64–122) — `TABLE_DENYLIST` e `RPC_ALLOWLIST`.
- `supabase/functions/external-db-bridge/index.ts` (linhas 489–498, 760–762) — enforcement 403.

**Amostrado (não lido integralmente):** consumidores (`grep -rl` por identificador em todo `src/`, com
verificação cruzada por nome de export nomeado quando o objeto default não existia — ex. `metabaseService`
foi re-checado por `useMetabaseEmbed`/`initMetabaseSDK`/`METABASE_DASHBOARD_IDS`); cadeias de hooks
(1 nível acima); corpo de `registrar_batida_ponto` (migration `20260728220146_…sql:83`).
`src/services/folha/` foi deixado de fora (prefixo `f` = parte 1/2).

**NAO_VERIFICADO:** `node_modules` ausente → não rodei build/typecheck/lint/testes. Nenhuma afirmação
minha depende de execução. Deploy real das edge functions: `NAO_VERIFICADO` (sem PAT).

---

## 2. Tabela de funcionalidades

Legenda de dado: `N=` linhas medidas no briefing; **vazia** = 0 linhas (a tabela existe em
`integrations/supabase/types.ts`, verificado).

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta |
|---|---|---|---|
| **Logger estruturado + persistência remota** | `IMPLEMENTADO_PARCIAL` | `loggerService.ts:117` chama `supabase.rpc('log_frontend_error', …)`; `log_frontend_error` **NÃO** está em `external-db-bridge/validation.ts:95-122` (`RPC_ALLOWLIST`); `index.ts:760-762` responde 403 `RPC_DENIED` | Console/emitStructured funciona; **toda** persistência de warn/error/fatal é rejeitada. `audit_log_unified=512` vem de triggers, não daqui. Adicionar a RPC à allowlist |
| **Registro de ponto (web/kiosk)** | `SUGERIDO_OU_INICIADO` | `pontoService.ts:105` `supabase.rpc('registrar_batida_ponto', …)`; RPC ausente da allowlist; grava em `batidas_ponto` (`migrations/20260728220146_…sql:83`) que está **vazia**; consumidores `pages/PontoKioskPage.tsx:112`, `pages/PontoPage.tsx:238` | Caminho de escrita bloqueado no bridge. `registros_ponto=120` é outra tabela, populada por outro caminho (`pages/PontoPage.tsx:93`) |
| **Ponto offline (fila cifrada + sync)** | `IMPLEMENTADO_PARCIAL` | `pontoOfflineService.ts:145` `functions.invoke('processar-ponto-offline')` (função existe em `supabase/functions/`); consumido por `components/ponto/PontoClockRegister.tsx:21`, `pages/PontoKioskPage.tsx:10` | `functions.invoke` não passa pelo bridge (funciona), mas não há tabela com prova de sync executado; deploy `NAO_VERIFICADO` |
| **Monitoramento técnico do ponto** | `SUGERIDO_OU_INICIADO` | `pontoMonitorService.ts:9` insere em `ponto_auditoria` — tabela **vazia** | Nenhum evento gravado em produção |
| **Auditoria de ajuste/exclusão de ponto** | `IMPLEMENTADO_PARCIAL` | `pontoAuditService.ts:5` → `utils/auditLogger`; consumido por `services/batidasPontoService.ts` | Depende de `auditLogger` (fora do escopo) |
| **Facade `pontosService`** | `MORTO_OU_ABANDONADO` | `pontosService.ts:11`; único consumidor `hooks/usePonto.ts:2`; `usePonto` só aparece em `hooks/index.ts` (barrel) — nenhuma página/componente o importa. O caminho vivo é `hooks/usePontoMelhorado.ts` (usado por `components/dashboard/AnalyticsSection.tsx`), que fala `supabase` cru | Refactor abandonado: `usePonto`→`usePontoMelhorado`. O facade inteiro é código sem chamador |
| **`pontoAbertoService`** | `MORTO_OU_ABANDONADO` | `pontoAbertoService.ts:3`; único consumidor `hooks/usePontosAbertos.ts`; `usePontosAbertos` só aparece em `hooks/index.ts`. Tabela `pontos_abertos` **vazia** | Cadeia órfã: nenhum componente monta o hook |
| **Configurações de intervalo** | `MORTO_OU_ABANDONADO` | `intervaloService.ts:2`; único consumidor `hooks/useConfiguracoesIntervalo.ts`; hook só aparece em `hooks/index.ts`. `configuracoes_intervalo` **vazia** | Cadeia órfã |
| **Grade de horários de jornada** | `MORTO_OU_ABANDONADO` | `jornadaHorariosService.ts:6`; único consumidor `hooks/useNovasTabelas.ts`; `useNovasTabelas` só aparece em `hooks/index.ts`. `jornadas_horarios` **vazia** | Cadeia órfã (o `salvarGrade` com upsert idempotente nunca roda) |
| **Metabase embed (service)** | `MORTO_OU_ABANDONADO` | `metabaseService.ts` — **0 consumidores**. `grep` por `metabaseService`, `useMetabaseEmbed`, `initMetabaseSDK`, `METABASE_DASHBOARD_IDS` em todo `src/` só retorna o próprio arquivo. `components/metabase/MetabaseEmbed.tsx` importa apenas `loggerService` e chama a edge function `metabase-embed` | Refactor abandonado: o componente foi para edge function; o service ficou. Além disso `metabaseService.ts:95-98` é declaradamente um **stub** ("Placeholder: assinatura JWT deveria ser gerada server-side") |
| **Webhooks (tabela `webhooks`)** | `MORTO_OU_ABANDONADO` | `webhookService.ts:6` (`new BaseService('webhooks')`); consumidores `hooks/useWebhooksAvancados.ts:2` (hook só aparece em `hooks/index.ts`) e `services/index.ts:11`. Tabela `webhooks` **vazia** | Cadeia órfã + colisão de nome (ver achado #4) |
| **Webhooks (tabela `webhooks_config`)** | `SUGERIDO_OU_INICIADO` | `integracaoService.ts:58-100`; consumidor real `components/integracoes/ConfigPanels.tsx:15`. `webhooks_config` e `webhook_logs` **vazias** | UI existe, zero uso |
| **CNAB config/remessas (via `integracaoService`)** | `IMPLEMENTADO_PARCIAL` | `integracaoService.ts:24-56`; consumidor `components/integracoes/ConfigPanels.tsx:15`. `cnab_configuracoes=1`, `cnab_remessas=3` | Convive com `services/cnabService.ts` (28 KB, exportado por `index.ts:29`) — dois `cnabService` distintos |
| **Painel de Segurança** | `MORTO_OU_ABANDONADO` (na prática) | `securityService.ts:53,79,92,118` lê `blocked_ips`, `login_attempts`, `security_alerts`, `rate_limit_logs` — **as 4 estão em `TABLE_DENYLIST`** (`validation.ts:64-81`), bridge responde 403 (`index.ts:492-494`). Consumidor `pages/SegurancaPage.tsx` | 4 de 5 métodos falham por construção. `geo_blocked_attempts` passa mas está **vazia**. O banco real usa `login_lockouts=3`/`rate_limits=3`, tabelas que o service nem consulta |
| **Medidas Disciplinares — CRUD** | `SUGERIDO_OU_INICIADO` | `medidasDisciplinaresService.ts:20-86`; consumidores reais (`pages/MedidasDisciplinaresPage.tsx`, `components/medidas-disciplinares/MedidasKanban.tsx`). `medidas_disciplinares` **vazia** | Código completo e ligado; zero uso real |
| **Medidas Disciplinares — workflow/contestação/integração folha** | `MORTO_OU_ABANDONADO` | 8 RPCs em `medidasDisciplinaresService.ts:93,126,133,141,149,169,181,258` (`sugerir_proxima_medida`, `medida_enviar_aprovacao`, `medida_aprovar`, `medida_rejeitar`, `medida_arquivar`, `medida_contestar`, `medida_responder_contestacao`, `aplicar_medida_folha_ponto`) — **nenhuma** na `RPC_ALLOWLIST` | Todo o workflow CLT retorna 403. Só `gerarPDF` (`:103`, via `functions.invoke`) escapa do bridge |
| **PCS — Plano de Cargos e Salários** | `SUGERIDO_OU_INICIADO` | `pcsService.ts:29-186`; consumidor `hooks/usePcs.ts` → 5 componentes + `pages/PlanoCargosSalariosPage.tsx`. Todas as tabelas `pcs_*` **vazias**; as 4 RPCs (`pcs_gerar_grades:129`, `pcs_grades_mercado:140`, `pcs_enquadramento:148`, `pcs_simular_impacto:154`) **não estão na allowlist** | Toda a matemática do módulo é 403. Sem testes (`services/__tests__/` não tem `pcsService.test.ts`) |
| **Premiações — campanhas/regras** | `IMPLEMENTADO_PARCIAL` | `premiacoesService.ts:6,15,44,50`; `premiacoes_campanhas=3`, `premiacoes_regras=2`, `premiacoes_auditoria=8` | Dado existe mas é residual |
| **Premiações — pagamentos/aprovação/conciliação** | `SUGERIDO_OU_INICIADO` | `premiacoesService.ts:27,56,84,131`; `premiacoes_pagamentos` **vazia**, `premiacoes_roi_cenarios` **vazia** | Nunca executado; + bug fatal (achado #2) e lógica fictícia (achado #3) |
| **WhatsApp — envio de mensagem** | `IMPLEMENTADO_PARCIAL` (fachada) | `whatsappService.ts:45-63` e `:86-120`: **não existe chamada a API alguma**; `sendMessage` só faz `insert` em `whatsapp_mensagens_logs` com `status:'sent'` e `mensagem_id_externo: 'wa_direct_'+Date.now()`; `sendTemplateMessage` faz `await new Promise(r=>setTimeout(r,1000))` (`:109`) e depois marca `sent` | Nenhuma integração real. `whatsapp_config`/`whatsapp_templates` **vazias**; `whatsapp_mensagens_logs=13` são registros do próprio fake |
| **Workflows — CRUD definições/etapas** | `SUGERIDO_OU_INICIADO` | `workflowService.ts:128-258`; consumidores `pages/WorkflowsPage.tsx`, `components/workflows/WorkflowDesigner.tsx`. `workflows_definicoes=1`, `workflows_etapas` **vazia** | — |
| **Workflows — execução/SLA/aprovação** | `SUGERIDO_OU_INICIADO` | `workflowService.ts:308` lança `'Workflow não tem etapas configuradas.'` quando não há etapa `ordem=1`; `workflows_etapas` **vazia** ⇒ `executarWorkflow` sempre lança. `workflows_historico` **vazia** | `workflows_execucoes=8` existe apesar de `workflows_etapas=0` e `workflows_historico=0` ⇒ as 8 execuções **não** vieram deste service |
| **Rescisão — cálculo/homologação/assinatura/pagamento** | `IMPLEMENTADO_PARCIAL` | `rescisaoService.ts:45,126,200,228`; consumidor `components/desligamentos/DesligamentoDetailSheet.tsx`. `desligamentos=2`; `assinar_desligamento` (`:205`) **está** na allowlist (`validation.ts:118`) ✅ | `homologacoes_rescisao` **vazia** ⇒ nenhuma homologação real; `d.assinado_empresa/assinado_colaborador` (`:239`) nunca true |
| **Recrutamento (vagas/candidatos/candidaturas/entrevistas)** | `IMPLEMENTADO_PARCIAL` | `recrutamentoService.ts:9-141`; consumidor `pages/RecrutamentoPage.tsx`. `vagas=3`, `candidatos=5`, `candidaturas=5`, `recrutamento_entrevistas=2`, `recrutamento_testes=2`, `recrutamento_anotacoes=2` | Volume de demo (5 candidatos p/ 13 colaboradores); é o service **mais vivo** do escopo |
| **Turnos e escalas** | `IMPLEMENTADO_PARCIAL` | `turnoService.ts:2-66`; consumidor `pages/TurnosPage.tsx`. `turnos=7`, `escalas_trabalho=96` | Idem — dado real, volume baixo |
| **Horas extras (solicitação/aprovação)** | `IMPLEMENTADO_PARCIAL` | `horaExtraService.ts:2-56`; `hooks/useHorasExtras.ts` → `pages/HorasExtrasPage.tsx`. `solicitacoes_hora_extra=15` | Dado real |
| **Tabelas de referência + contas bancárias + estagiário + doc. pessoais** | `IMPLEMENTADO_PARCIAL` | `tabelasReferenciaService.ts:17-246`; `hooks/useTabelasReferencia.ts` → 3 tabs de colaborador. `tipos_desligamento=5`, `tipos_pagamento=4`, `tipos_salario=3`, `contas_bancarias=12` **com dado**; `nacionalidades`, `paises`, `centros_custo`, `dados_estagiario`, `documentos_pessoais_arquivos`, `ferias_aprovacoes`, `ferias_arquivos`, `dependentes_beneficios` **vazias** | 12 dos 16 catálogos de referência estão vazios — selects renderizam lista vazia |
| **LGPD (consentimentos/solicitações)** | `SUGERIDO_OU_INICIADO` | `lgpdService.ts:2-56`; consumidor `pages/LGPDPage.tsx`. `lgpd_consentimentos` e `lgpd_solicitacoes` **vazias** | Zero uso |
| **Pesquisas de clima** | `SUGERIDO_OU_INICIADO` | `pesquisaService.ts:2-84`; consumidor `pages/PesquisasClimaPage.tsx`. `pesquisas=1`; `pesquisas_perguntas`/`pesquisas_respostas` **vazias** | 1 pesquisa sem nenhuma pergunta nem resposta |
| **Provisões mensais** | `SUGERIDO_OU_INICIADO` | `provisaoService.ts:3,22`; consumidor `pages/ProvisoesPage.tsx`; edge function `calcular-provisoes` existe no repo. `provisoes_mensais` **vazia** | Nunca calculado |
| **Push notifications** | `SUGERIDO_OU_INICIADO` | `pushNotificationService.ts:30-33`: `applicationServerKey` (VAPID) **comentado**; `push_subscriptions` **vazia**; consumidor `pages/PerfilPage.tsx` | Sem VAPID key, `pushManager.subscribe` falha na maioria dos browsers |
| **Notificações in-app** | `SUGERIDO_OU_INICIADO` | `notificacoesService.ts:13`; `notificacoes` **vazia**; `:60` `const targetUserId: string \| undefined = undefined;` — destinatário **sempre** `undefined` | Notificação de ajuste de ponto nunca chega a um usuário específico |
| **Histórico de contratos** | `SUGERIDO_OU_INICIADO` | `historicoContratoService.ts:2`; `hooks/useHistoricoContratos.ts` → `components/colaborador-detalhes/HistoricoContratosTab.tsx`. `historico_contratos` **vazia** | — |
| **Locais de trabalho** | `IMPLEMENTADO_PARCIAL` | `localTrabalhoService.ts:5` (`BaseService('locais_trabalho')`); `hooks/useLocaisTrabalho.ts` → `pages/LocaisTrabalhoPage.tsx`. `locais_trabalho=5` | Dado real |
| `tabelas/rhService.ts` → **onboarding** (templates/tarefas/colaborador) | `MORTO_OU_ABANDONADO` | `tabelas/rhService.ts:87-131`; `grep -rl onboardingService src/` (excluindo `services/tabelas/` e `__tests__`) → **nenhum**. É o **único** código de app que toca `onboarding_*` (`grep -rln 'onboarding_tarefas\|onboarding_templates\|onboarding_colaborador'` → só `rhService.ts`, seu teste e `types.ts`) | Tabelas **com dado** (`onboarding_tarefas=27`, `onboarding_template_tarefas=21`, `onboarding_colaborador=6`, `onboarding_templates=4`) mas populadas por seed/migration — nenhuma tela lê |
| `tabelas/rhService.ts` → `configAfastamentos`, `feriasSolicitacoes`, `historicoCargo`, `historicoFerias`, `linhasTransporte`, `notificacoesAdmissao`, `treinamentoParticipantes` | `MORTO_OU_ABANDONADO` | 7 exports, **0 consumidores** cada (grep por identificador em todo `src/`, fora de `services/tabelas/` e `__tests__`) | `config_afastamentos=6` tem dado e ninguém lê via service |
| `tabelas/documentosService.ts` (5 exports) | `MORTO_OU_ABANDONADO` | `documentoTemplatesService`, `documentosAdmissaoService`, `documentosAfastamentoService`, `documentosAssinaturaService`, `documentosColaboradorService` — **0 consumidores** cada | Arquivo inteiro sem chamador |
| `tabelas/folhaService.ts` (5 exports) | `IMPLEMENTADO_PARCIAL` (1/5) | Só `rubricasFolhaService` é consumido (`components/folha/CalculoFolhaWizard.tsx`); `rubricas_folha=24`. `esocialLotesService`, `eventosVariaveisService`, `lancamentosFolhaService`, `parametrosFiscaisService` — **0 consumidores** | `components/folha/RubricasDialog.tsx:51` e `pages/RubricasPage.tsx` acessam `rubricas_folha` **direto**, ignorando o service |
| `tabelas/pontoService.ts` (`ajustesPontoService`, `periodosPontoService`) | `MORTO_OU_ABANDONADO` | **0 consumidores** cada; `ajustes_ponto` e `periodos_ponto` **vazias** | O fluxo vivo usa `solicitacoes_ajuste_ponto=3`, tabela diferente |
| `tabelas/adminService.ts` | `IMPLEMENTADO_PARCIAL` (1/4) | Só `bitrix24Service` é consumido (`components/integracoes/ConfigPanels.tsx:14`); `bitrix24_config`/`bitrix24_sync_logs` **vazias**. `logEnvioRelatoriosService`, `relatoriosAgendadosService`, `savedFiltersService` — **0 consumidores** | `components/relatorios/RelatoriosAgendadosTab.tsx:32,45,63` acessa `relatorios_agendados` **direto** — service duplicado e ignorado |
| `tabelas/beneficiosService.ts` (4 exports) | `IMPLEMENTADO_PARCIAL` (3/4) | `beneficiariosPlanoService`→`pages/PlanosSaudePage.tsx`, `beneficiariosSeguro`+`segurosColaboradores`→`pages/SegurosVidaPage.tsx`. `colaboradorBeneficiosService` — **0 consumidores**. `beneficiarios_plano`, `beneficiarios_seguro`, `seguros_colaboradores` **vazias** | — |
| `tabelas/viewsService.ts` (16 views KPI) | `IMPLEMENTADO_PARCIAL` | `tabelas/viewsService.ts:4-152`; consumidor `components/dashboard/analytics/widgets.tsx:22` | **Todos** os 16 métodos têm `catch { return [] }` — view inexistente/erro vira gráfico vazio silencioso (11 dos 16 nem logam). Ver achado #6 |

---

## 3. Achados graves

### 1. [CRÍTICO] 15 RPCs chamadas pelo front estão fora da `RPC_ALLOWLIST` do bridge → 403 garantido
`src/integrations/supabase/client.ts:379-386` prova que `supabase.rpc(fn, params)` é um `Proxy` que POSTa
`{action:'rpc', fn}` na edge function; `external-db-bridge/index.ts:760-762` responde
`403 RPC_DENIED` para qualquer `fn` fora do `Set` de `validation.ts:95-122`.

Não estão na allowlist (todas do meu escopo):
`log_frontend_error` (`loggerService.ts:117`), `registrar_batida_ponto` (`pontoService.ts:105`),
`sugerir_proxima_medida` / `medida_enviar_aprovacao` / `medida_aprovar` / `medida_rejeitar` /
`medida_arquivar` / `medida_contestar` / `medida_responder_contestacao` / `aplicar_medida_folha_ponto`
(`medidasDisciplinaresService.ts:93,126,133,141,149,169,181,258`),
`pcs_gerar_grades` / `pcs_grades_mercado` / `pcs_enquadramento` / `pcs_simular_impacto`
(`pcsService.ts:129,140,148,154`).

Consequências mensuráveis: `batidas_ponto` = **0 linhas** (registro de ponto nunca gravou pelo caminho do
app); `workflows_historico` = **0**; todas as tabelas `pcs_*` = **0**. O logger perde 100% dos
warn/error/fatal — e, pior, `client.ts:190` chama `loggerService.error` dentro do handler de erro do
próprio bridge, então cada falha de bridge dispara outra chamada que também será negada.
Única RPC do escopo que **está** na allowlist: `assinar_desligamento` (`validation.ts:118`).

### 2. [ALTO] `premiacoesService.autoConciliarComFolha` passa uma frase onde se espera `empresaId` — falha 100% das vezes
`premiacoesService.ts:155`:
```ts
return this.reconciliarFolha(pagamentoId, valorEncontrado, "Conciliação automática via integração eSocial/Folha");
```
A assinatura é `reconciliarFolha(id, valorFolha, empresaId, justificativa?)` (`:84`). O terceiro argumento
vira `empresaId`, produzindo `.eq('campanha.empresa_id', 'Conciliação automática…')` em `:86` seguido de
`.single()` → erro de tipo UUID / zero linhas → exceção. O botão que dispara isso existe na UI:
`components/premiacoes/RewardsApprovalHub.tsx:143`. Nenhum teste cobre `autoConciliarComFolha`
(`services/__tests__/premiacoesService.test.ts:227` só testa `reconciliarFolha` com `EMPRESA_ID` correto).

### 3. [ALTO] Lógica fictícia declarada em `autoConciliarComFolha`
`premiacoesService.ts:141-155` busca `folha_itens`, atribui `const itemFolha = folhaItens[0]` e **nunca o
usa**; o comentário `:151-152` diz *"we simulate finding a matching value or a slight divergence"*, e
`valorEncontrado = Number(pagamento.valor_aprovado)` — ou seja, compara o valor consigo mesmo, garantindo
sempre `status_conciliacao='conciliado'`. Conciliação financeira que não concilia nada.

### 4. [ALTO] WhatsApp é uma fachada: nenhuma chamada externa existe
`whatsappService.ts:45-63` (`sendMessage`) e `:86-120` (`sendTemplateMessage`) não invocam API, edge
function nem webhook. Apenas inserem em `whatsapp_mensagens_logs` com `status:'sent'` e um id sintético
(`'wa_direct_' + Date.now()`); `:109` faz `await new Promise(r => setTimeout(r, 1000))` para *parecer*
latência de rede. O teste `services/__tests__/whatsappService.test.ts:113` cimenta o fake
(`it('returns { success: true } on success')`) sem jamais assertar um envio — teste que não protege.
`whatsapp_config` e `whatsapp_templates` estão **vazias**; os 13 registros de log são o próprio fake.

### 5. [ALTO] Página de Segurança lê 4 tabelas que o bridge nega por denylist
`securityService.ts:53,79,92,118` consulta `blocked_ips`, `login_attempts`, `security_alerts`,
`rate_limit_logs` — as quatro constam em `validation.ts:64-81` (`TABLE_DENYLIST`), e
`index.ts:492-494` responde `403 TABLE_DENIED`. `pages/SegurancaPage.tsx` portanto nunca exibe dado.
Agravante: o banco real registra segurança em `login_lockouts=3` e `rate_limits=3` — tabelas que este
service nem menciona. Existe teste (`securityService.test.ts`) que mocka o supabase e passa, sem detectar
nada disso.

### 6. [MÉDIO] `viewsService`: 16 KPIs com `catch → []`, 11 deles totalmente silenciosos
`tabelas/viewsService.ts:4-152`. Cada método engole qualquer erro e devolve `[]`. Só os 3 primeiros
(`alertasRH:11`, `kpiTurnover:21`, `kpiAbsenteismo:31`) logam um `warn` — que, pelo achado #1, também não
é persistido. Resultado: `components/dashboard/analytics/widgets.tsx` renderiza gráficos vazios
indistinguíveis de "não há dados", mesmo quando a view não existe ou a RLS bloqueia.

### 7. [MÉDIO] Dois `webhookService` e dois `cnabService` coexistindo, com tabelas diferentes
- `services/webhookService.ts:6` → tabela `webhooks`, exportado por `services/index.ts:11`, consumido por
  `hooks/useWebhooksAvancados.ts:2` (hook órfão).
- `services/integracaoService.ts:58` → tabela `webhooks_config`, consumido por
  `components/integracoes/ConfigPanels.tsx:15` (caminho vivo).
- `services/index.ts:29` exporta `cnabService` de `./cnabService` (28 KB), enquanto
  `ConfigPanels.tsx:15` importa `cnabService` de `./integracaoService`.
Refactor abandonado em ambos os pares: o "novo" e o "antigo" convivem, e o que roda é o que **não** está
no barrel. Ambas as tabelas `webhooks` e `webhooks_config` estão vazias.

### 8. [MÉDIO] `metabaseService.ts` é código morto e auto-declarado stub
Zero consumidores em todo `src/` (verificado por 4 identificadores distintos). O componente que existe,
`components/metabase/MetabaseEmbed.tsx`, importa só `loggerService` e chama a edge function
`metabase-embed`. O arquivo abandonado ainda contém `:95-98` *"Placeholder: assinatura JWT deveria ser
gerada server-side… Este é um stub"* e `:116` fallback `'/metabase-placeholder'` — se alguém religasse
o service, exporia a secret key no cliente (`:69` lê `VITE_METABASE_SECRET_KEY`).

### 9. [MÉDIO] `src/services/tabelas/` — 21 de 30 exports não têm nenhum chamador
Mortos (0 consumidores fora de `services/tabelas/` e `__tests__`): `ajustesPontoService`,
`periodosPontoService`, `colaboradorBeneficiosService`, os **5** de `documentosService.ts`,
`esocialLotesService`, `eventosVariaveisService`, `lancamentosFolhaService`, `parametrosFiscaisService`,
`configAfastamentosService`, `feriasSolicitacoesService`, `historicoCargoService`,
`historicoFeriasService`, `linhasTransporteService`, `notificacoesAdmissaoService`, `onboardingService`,
`treinamentoParticipantesService`, `logEnvioRelatoriosService`, `relatoriosAgendadosService`,
`savedFiltersService`. Verificado também que não há `import * as` apontando para o barrel
`tabelasComplementaresService.ts` (só 3 namespace-imports em `src/`, para outros services).
Ainda assim existem **7 arquivos de teste** em `services/tabelas/__tests__/` (~36 KB) exercitando esse
código sem chamador — cobertura que não protege nada em produção.

### 10. [MÉDIO] Onboarding: tabelas com dado, service sem consumidor
`tabelas/rhService.ts:87-131` (`onboardingService`) é o **único** ponto do app que referencia
`onboarding_templates`, `onboarding_template_tarefas`, `onboarding_colaborador`, `onboarding_tarefas`
(grep em todo `src/` retorna apenas ele, seu teste e `types.ts`). Ninguém importa o service. Portanto os
`27 + 21 + 6 + 4` registros dessas tabelas **não** vieram da aplicação — são seed/migration. Nenhuma tela
exibe onboarding.

### 11. [BAIXO] `notificacoesService.notificarAjustePonto` nunca endereça o destinatário
`notificacoesService.ts:60`: `const targetUserId: string | undefined = undefined;` com comentário
admitindo que a resolução do usuário foi deixada "para o trigger". `user_id` chega sempre `undefined`
em `criarNotificacao` (`:21` cai no `user?.id` de **quem aprovou**, não de quem receberia).
`notificacoes` está vazia, então nunca se manifestou.

### 12. [BAIXO] `pushNotificationService` sem VAPID key
`pushNotificationService.ts:29-33`: `applicationServerKey` está comentado e o comentário diz
*"Em um cenário real, usaríamos uma VAPID KEY real do env"*. `push_subscriptions` **vazia**.

### 13. [BAIXO] `index.ts` do barrel expõe um "service" que é uma linha de aritmética
`services/index.ts:48`: `export const fgtsService = { calcular: (salario) => salario * 0.08 };`
Alíquota hardcoded no barrel de exports, fora de qualquer módulo de cálculo.

---

## 4. Lacunas (o que NÃO consegui verificar)

1. **Execução real.** `node_modules` ausente → não rodei typecheck, lint, testes nem build. Nenhuma
   afirmação acima depende disso; onde precisaria, marquei `NAO_VERIFICADO`.
2. **Deploy das edge functions.** `calcular-provisoes`, `processar-ponto-offline`, `validar-biometria`,
   `gerar-medida-disciplinar-pdf`, `metabase-embed` **existem no repo**; se estão deployadas no projeto
   `frjbfeamybqsejlvmqbl` é `NAO_VERIFICADO` (Management API sem PAT, conforme briefing).
3. **Versão deployada do `external-db-bridge`.** Li a `RPC_ALLOWLIST`/`TABLE_DENYLIST` do **repositório**
   (`validation.ts:64-122`). Se a função deployada for mais antiga/nova, os 403 dos achados #1 e #5 podem
   diferir. Só 30 de 641 migrations estão registradas no banco, o que reforça a suspeita de divergência
   repo↔produção — mas não pude medir isso na edge function.
4. **RLS efetiva.** Não consultei policies; quando digo "vazia", é 0 linhas segundo o briefing, não
   "inacessível por RLS".
5. **Origem das 8 linhas de `workflows_execucoes`, das 120 de `registros_ponto` e das 27 de
   `onboarding_tarefas`.** Provei que **não** vieram dos services do meu escopo; não rastreei a origem real
   (seed SQL, migration, ou outro agente) — isso está fora do meu recorte.
6. **`src/services/folha/`** (`calculoLoteService.ts`, `provisoesService.ts`) — prefixo `f`, escopo da
   parte 1/2. Não analisado.
