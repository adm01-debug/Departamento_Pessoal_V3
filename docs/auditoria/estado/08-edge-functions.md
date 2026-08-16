# Backend — Edge Functions (`supabase/functions/`)

## 1. Cobertura

**Escopo real medido:** 61 diretórios em `supabase/functions/`, sendo **60 funções** + `_shared/`.
106 arquivos `.ts` / 17.908 linhas (15 são arquivos de teste, 1.597 linhas).

| O que | Como |
|---|---|
| `external-db-bridge/index.ts` (800), `external-db-bridge/validation.ts` (161), `_shared/csrf.ts` (113), `_shared/authz.ts` (124) | **lidos integralmente** |
| `OCR`, `adiantamento-salarial`, `warmup`, `tabelas-dominio` (topo), `fgts-digital`, `enviar-esocial` (bloco de transmissão), `metabase-embed` (ACL+handler), `healthcheck`, `metrics`, `webhook` (topo), `alertas-preditivos` (auth), `_shared/contract.ts` (CORS) | **lidos em trechos extensos** |
| Demais 45 funções | **amostradas por varredura dirigida**: tabelas alvo (`.from(...)`), chamadas HTTP externas (`fetch`/`safeFetch`), controles (`verifyCsrf`/`getUser`/`requireRh`/`checkRateLimit`/`SERVICE_ROLE_KEY`), marcadores de stub (`simul|mock|TODO|Math.random`) e persistência (`insert|upsert|update`) |
| Rastreamento de chamadores | grep exaustivo em `src/`, `e2e/`, `scripts/`, `supabase/migrations/`, `.github/` por `functions.invoke('x')`, `invoke("x")`, template strings, wrapper `edgeFunctionsService`, `fetch('/functions/v1/x')` |
| Banco de produção | consultas **somente leitura** via MCP (`cron.job`, `pg_class`, `pg_proc`, `storage.buckets`, contagens e `max(created_at)` das tabelas alvo) |

**Deploy das funções: `NAO_VERIFICADO`** (Management API indisponível, sem PAT). Todas as conclusões
de "rodou / não rodou" são derivadas de **efeito colateral persistido no banco**, não de listagem de deploy.

---

## 2. Fatos estruturais medidos (valem para todo o conjunto)

| # | Fato | Evidência |
|---|---|---|
| F1 | **Nenhum cron job invoca edge function.** Os 6 jobs ativos são 100% SQL puro. Nenhuma migration usa `net.http_post` nem URL `functions/v1/`. | `cron.job` jobid 1–6 (lidos ao vivo): `dp_run_retention`, `dp_create_next_partition`, `dp_check_log_rotation`, `dp_connection_health`, `UPDATE despesas ... WHERE id='0960813f-…'`. `grep -rn "net.http_post" supabase/migrations/` → 0 resultados |
| F2 | **`storage.buckets` está VAZIO (0 buckets) em produção.** Toda função que grava/baixa arquivo falha em runtime. | `select id from storage.buckets` → 0 linhas. Buckets usados no código: `sst-programas` (`gerar-ltcat-os/index.ts:309`, `gerar-pgr/index.ts:111`), `medidas-disciplinares` (`gerar-medida-disciplinar-pdf/index.ts:206`), `backups` (`backup-automatico/index.ts:173`), `ponto-biometria` (`processar-ponto-offline/index.ts:233`), `BUCKET` em `enviar-relatorio/index.ts:251` |
| F3 | **`pode_gerir_rh_para` e `pode_gerir_pessoas_para` NÃO EXISTEM no banco.** `rpcBool` falha fechada → `requireRh` sempre nega, exceto para `is_admin`. **22 funções** ficam admin-only. | `_shared/authz.ts:52` (`if (error) return false`), `:66`, `:72`, `:93-105`. `select count(*) from pg_proc where proname='pode_gerir_rh_para'` → **0**. Definidas apenas em `supabase/migrations/20260729152613_*.sql` (migration não aplicada) |
| F4 | **`auditoria` = 0 linhas e nenhum `acao` de edge function em `audit_log`.** As funções gravam auditoria **bloqueante**; logo, elas **nunca executaram com sucesso em produção**. | `select count(*) from auditoria` → **0**. `select acao, count(*) from audit_log group by 1` → só `INSERT`(194), `VISUALIZACAO`(72), `UPDATE`(13), `DELETE`(2). **Nenhum** `PAYROLL_CALC` (`calcular-folha/index.ts:310`), `CALCULATE` (`calcular-13-salario/index.ts:250`), `PIX_LOTE_CRIADO` (`pix-lote/index.ts:215`), `FGTS_DIGITAL_GERADA` (`fgts-digital/index.ts:~160`) |
| F5 | **Única função com execução comprovada em produção: `external-db-bridge`.** 265 linhas em `query_telemetry`, mas **171 são `severity='error'`** e a última escrita é **2026-07-22** (25 dias antes de hoje). | `select operation,severity,count(*),max(created_at) from query_telemetry group by 1,2`: select/error=137 (últ. 2026-07-22), select/slow=60, insert/error=28, select/very_slow=20, rpc/slow=11, rpc/error=6, rpc/very_slow=3 |
| F6 | **Parte relevante do "tráfego de produção" do bridge é o próprio teste do repo.** | `query_telemetry` contém `table_name='__nope__'` (5), `'__nao_existe_xyz__'` (5), `empresas.coluna_que_nao_existe` (5), `invalid input syntax for type uuid: "' UNION SELECT * FROM auth.users--"` (4) — payloads de `src/tests/validateBridgeContract.ts:14` |
| F7 | **6 objetos de banco lidos por funções não existem:** `v_login_anomalies`, `mv_telemetry_dashboard`, `mv_folha_summary`, `health_checks`, `backups`, `guias_impostos`. | `pg_class` (todos os schemas) → ausentes. Definidos em migrations não aplicadas (`20260724110000_p3_057_v_login_anomalies.sql`, `20260724100000_p3_054_mv_telemetry_dashboard.sql`) |
| F8 | **4 tabelas de domínio referenciadas por `tabelas-dominio` e pelo cache do bridge não existem:** `cbo`, `cnae`, `faixas_irrf`, `faixas_inss`. | `tabelas-dominio/index.ts:32-38` (TABLE_MAP); `external-db-bridge/index.ts:30-33` (CACHEABLE_TABLES). `pg_class` → ausentes. Existem só `feriados`, `rubricas_folha`, `parametros_fiscais` |
| F9 | **`supabase/config.toml` aponta para outro projeto.** `project_id = "ciziytrrjjotlsjzshnm"`; produção é `frjbfeamybqsejlvmqbl`. Um `supabase functions deploy` deste repo não atinge a produção auditada. | `supabase/config.toml:1` |
| F10 | **Os 15 arquivos de teste Deno (1.597 linhas) não são executados por nenhum runner.** | `vitest.config.ts:12` → `include: ["src/**/*.{test,spec}.{ts,tsx}"]`. `.github/workflows/ci.yml:66-93` roda apenas `deno check` (nunca `deno test`), e o passo dos 59 non-bridge é `continue-on-error: true` (`ci.yml:81`) — gate que nunca reprova |
| F11 | **Os 12 arquivos `config.ts` dentro das funções são código morto.** Nenhum `index.ts` os importa e o runtime da Supabase não os lê. | `grep -rn "from './config" --include=index.ts` → 0 resultados. Arquivos em `calcular-folha/`, `calcular-ferias/`, `calcular-13-salario/`, `calcular-rescisao/`, `enviar-esocial/`, `enviar-relatorio/`, `gerar-guias/`, `gerar-holerite/`, `processar-ponto/`, `processar-agendamentos/`, `sincronizar-bitrix/`, `backup-automatico/` |
| F12 | **21 das 60 funções não têm nenhum chamador** em `src/`, `e2e/`, migrations ou cron. Verificado com todas as variações de regex + wrapper. | ver §4 |

---

## 3. Auditoria do `external-db-bridge` vs. o que o CLAUDE.md alega

| Controle alegado no CLAUDE.md | Existe? | Evidência | Divergência medida |
|---|---|---|---|
| "JWT validation (getClaims) para writes" | **PARCIAL** | `index.ts:361-375` usa **`auth.getUser()`**, não `getClaims()`. Exigência em `:467` | Nome errado no doc. Funciona, mas **leituras são anônimas** por design (`:1-8`): qualquer origem permitida pode fazer `select` em qualquer tabela fora da denylist |
| "CSRF fail-closed (verifyCsrf)" | **EXISTE, mas fraco** | `index.ts:340-341` → `_shared/csrf.ts:38-102` | `csrf.ts:20` `LOVABLE_HOST_RE = /\.lovable\.(app|dev)$/` aceita **qualquer** subdomínio `*.lovable.app`/`.dev`. O double-submit token só é checado **se o cliente enviar** `x-csrf-token` (`csrf.ts:86-87`) → basta omitir o header. Na prática é "Origin termina em .lovable.app" |
| "Rate limiting (30 writes/100 reads por min)" | **EXISTE** | `index.ts:471-485`; limites em `:482` = 30 (write), 100 (user autenticado), 20 (anônimo) | Doc omite o teto de 20 para anônimo. Só ativa `if (serviceKey)` (`:472`) — sem `SERVICE_ROLE_KEY` **não há rate limit** |
| "Tenant isolation (empresa_id scope)" | **PARCIAL** | `index.ts:552-572`, `assertTenantScope` `:311-330` | Aplica-se **só a writes** e **só** às 21 tabelas de `TENANT_SCOPED_TABLES` (`validation.ts:85-91`). `insert`/`upsert` confiam no `empresa_id` **enviado pelo cliente** (`:565` → `extractEmpresaIdsFromData`): linha sem `empresa_id` ⇒ `empresaIds.size===0` ⇒ `assertTenantScope` retorna `{ok:true}` (`:316`) e a escrita passa sem verificação de tenant |
| "Table denylist (16 tabelas sensíveis)" | **EXISTE — 16 confere** | `validation.ts:64-81`; enforcement `index.ts:492-494` | ✅ Único número do doc que bate |
| "RPC allowlist (25 RPCs aprovadas)" | **EXISTE, mas são 32** | `validation.ts:95-122`; enforcement `index.ts:760-762` | **Contagem errada no doc: 32, não 25.** E **4 delas não existem no banco**: `check_account_lockout`, `record_login_attempt`, `reset_account_lockout` e `pode_gerir_rh_para` (esta última não está no allowlist mas é usada por `authz.ts`) |
| "SQL injection prevention (3 camadas regex)" | **PARCIAL** | `validation.ts:8-14` (`IDENTIFIER_RE`, `COLUMNS_RE`, `DANGEROUS_TOKENS`), `:135-153` (`isSafeOrExpression`) | `isSafeFilterColumn` (`validation.ts:159-161`) usa `/^[A-Za-z0-9_.,"()>\s-]+$/` **sem** passar por `DANGEROUS_TOKENS` — é a validação mais frouxa do conjunto |
| "ORDER BY column validation" | **EXISTE** | `isSafeOrderColumn` `validation.ts:27-33`; enforcement `index.ts:649-651` | ✅ |
| "Payload cap (256KB streaming)" | **EXISTE** | `index.ts:42, 349-352, 388-393`; guarda anti gzip-bomb `:411-414` | ✅ |
| "Telemetry batch" | **EXISTE** | `index.ts:139-246` | Só persiste eventos `slow/very_slow/error` (`:212 if (meta.status === "ok") return`). Explica por que `query_telemetry` tem 64% de erros: **sucessos não são gravados** |
| "Error tracking com severidade" | **EXISTE** | `classifySeverity` `index.ts:111-116` | ✅ |
| Query timeout (AbortController) | **EXISTE** (o CLAUDE.md ainda lista como "próximo passo") | `index.ts:51-57`, 504 em `:793-796` | Doc desatualizado — já implementado |
| Keyset pagination (listado como pendente) | **CÓDIGO MORTO** | `parseCursor` em `validation.ts:43-59` **nunca é importado** por `index.ts:19-22` | Escrito e testado, nunca ligado |

### Achado próprio do bridge: proteção de login é um stub
`index.ts:59-63` define `LOGIN_PROTECTION_RPC_FALLBACKS = { check_login_lock: false, record_failed_login: null, reset_login_attempts: null }`
e `index.ts:764-767` **curto-circuita** essas RPCs: retorna o valor fixo **sem tocar o banco**.
Ou seja: via bridge, `check_login_lock` **sempre responde "não bloqueado"** e `record_failed_login`
**nunca registra tentativa**. O erro `Could not find the function public.record_failed_login(p_identifier, p_identifier_type)`
aparece 3× em `query_telemetry` — o fallback foi criado para mascarar assinatura de RPC divergente.

---

## 4. Tabela de funcionalidades (60 funções)

Legenda de chamador: `EFS` = via `src/services/edgeFunctionsService.ts`; `INV` = `supabase.functions.invoke` direto; `FETCH` = `fetch('/functions/v1/…')`; `—` = nenhum.

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta |
|---|---|---|---|
| **external-db-bridge** — gateway POST-only | `IMPLEMENTADO_TOTAL` | `index.ts:335-800`; chamador `edgeFunctionsService.ts:193` + `AppSidebar.tsx` (checkExternalDb); `client.ts:17`. Dado real: `query_telemetry`=265 | Única com execução provada. 171/265 eventos são erro; sem escrita desde 2026-07-22. Corrigir CSRF (§3), tenant scope de insert e o stub de login-protection |
| **calcular-folha** — cálculo de folha | `IMPLEMENTADO_PARCIAL` | `index.ts:281-283` (upsert `folhas_pagamento`), `:307-310` (audit `PAYROLL_CALC`); chamador EFS `edgeFunctionsService.ts:86` ← `FolhaPagamentoPage.tsx` | `audit_log` **não tem nenhum `PAYROLL_CALC`** ⇒ nunca rodou em prod. As 4 linhas de `folhas_pagamento` vieram de CRUD do frontend (`audit_log` tabela=folhas_pagamento acao=INSERT ×6). Depende de `pode_gerir_rh_para` (F3). Não grava `folha_itens` |
| **calcular-13-salario** | `IMPLEMENTADO_PARCIAL` | `index.ts:247-254` (audit bloqueante `CALCULATE`); chamador INV (`useCalcular13Salario`) | Calculadora pura, **sem persistência** do resultado. `acao='CALCULATE'` ausente de `audit_log` ⇒ nunca executou. Bloqueada por F3 |
| **calcular-ferias** | `IMPLEMENTADO_PARCIAL` | `index.ts:123` (lê `colaboradores`), `:155` (audit); EFS `edgeFunctionsService.ts:78` ← `FeriasPage.tsx` | Sem persistência do cálculo. Sem traço em `audit_log`. Bloqueada por F3 |
| **calcular-rescisao** | `IMPLEMENTADO_PARCIAL` | `index.ts:162`, `:282`; EFS `edgeFunctionsService.ts:105` ← `CalculadoraRescisaoPage.tsx` | Idem: calculadora sem persistência, sem traço de execução. Bloqueada por F3 |
| **calcular-provisoes** | `IMPLEMENTADO_PARCIAL` | grava `provisoes_mensais`, `provisao_logs`; chamador INV | `provisoes_mensais`=**0** linhas. Bloqueada por F3 |
| **fechar-folha** | `IMPLEMENTADO_PARCIAL` | grava `folhas_pagamento`, `provisoes_mensais`, `audit_log`; chamador INV | Nenhum `audit_log` de fechamento; `provisoes_mensais`=0 |
| **reabrir-folha** | `IMPLEMENTADO_PARCIAL` | `index.ts` (274 linhas), grava `folhas_pagamento`+`audit_log`; chamador INV | Idem acima |
| **gerar-guias** — DARF/GPS/FGTS | `SUGERIDO_OU_INICIADO` | `index.ts:238` (protocolo local `GUIA-${Date.now()}`), `:260` insert em `guias_fgts`/`guias_inss`; EFS `edgeFunctionsService.ts:53` ← `ObrigacoesFiscaisPage.tsx`, `FGTSDigitalDashboard.tsx` | **Zero chamada HTTP** — não emite guia real, só grava linha. `guias_fgts`/`guias_inss` vazias. Sem código de barras/PDF |
| **enviar-esocial** | `SUGERIDO_OU_INICIADO` | `index.ts:33` `SIMULATE=ESOCIAL_SIMULATE`, `:159-178` — se `SIMULATE` gera protocolo `PRT${uuid}` falso; senão **falha fechada 503** ("Integração eSocial não configurada"). Assinatura ICP-Brasil é mock: `enviar-esocial/utils/signer.ts:22,41` (`[Simulated Certificate Content]`), `signer.ts:17,36` (`CERTIFICADO_MOCK`) | **Não existe cliente SOAP.** `esocial_eventos`=0, `esocial_transmissao_logs`=0, `configuracoes_esocial`=0. Falta integração real + certificado |
| **fgts-digital** | `SUGERIDO_OU_INICIADO` | `index.ts` — protocolo local `FGD-${Date.now()}` ; insert em `guias_fgts_digital`+`fgts_digital_logs`+`auditoria` | **Zero `fetch`**. Nenhuma comunicação com o FGTS Digital. `guias_fgts_digital`=0, `fgts_digital_logs`=0, `auditoria`=0. Sem chamador no frontend |
| **dctfweb** | `SUGERIDO_OU_INICIADO` | `index.ts:130-133` insert com `status:'gerada'`; `:147` audit | **Zero `fetch`** para a Receita. `dctfweb_declaracoes`=0. Sem chamador |
| **pix-lote** | `SUGERIDO_OU_INICIADO` | `index.ts:174-197` insert `pix_lotes`/`pix_itens`; `:214-235` auditoria **bloqueante com rollback** | **Zero API bancária PIX.** `auditoria`=0 e `idempotency_keys`=0 ⇒ as 2 linhas de `pix_lotes` **não** foram criadas por esta função. Sem chamador |
| **cnab-remessa** | `SUGERIDO_OU_INICIADO` | `index.ts:123-168` sequencial + insert `cnab_remessas`/`cnab_itens`; `:185` audit | **Não gera o arquivo CNAB 240/400** — nenhuma montagem de layout, nenhum upload. `cnab_itens`=0 e `auditoria`=0 (as 3 linhas de `cnab_remessas` vieram de fora). Sem chamador |
| **emprestimo-consignado** | `SUGERIDO_OU_INICIADO` | grava `emprestimos_consignados`+`auditoria`+`convenios` | `auditoria`=0 ⇒ as 7 linhas de `emprestimos_consignados` não vieram daqui. **Sem chamador** |
| **adiantamento-salarial** | `SUGERIDO_OU_INICIADO` | `index.ts` (171 linhas) insert `adiantamentos_salariais` + `auditoria` | `auditoria`=0 ⇒ as 4 linhas vieram de fora. **Sem chamador**. Bloqueada por F3 |
| **sincronizar-bitrix** | `IMPLEMENTADO_PARCIAL` | HTTP real: `index.ts:107` `${config.webhook_url}/department.get`, `:130` `/user.get?ACTIVE=true`; EFS `edgeFunctionsService.ts:185` ← `InlineTabs.tsx`, `SystemHealthTab.tsx` | `bitrix24_config`=0 (sem `webhook_url` configurado) e `bitrix24_sync_logs`=0 ⇒ nunca sincronizou |
| **metabase-embed** | `IMPLEMENTADO_PARCIAL` | JWT HS256 assinado em `index.ts:60-79`; health real `:84`; chamador FETCH `MetabaseEmbed.tsx:264` | **ACL é no-op**: `index.ts:102-105` `DASHBOARD_ACL = {}` declarado e **nunca usado**; `:176` testa `ALL_EMPRESAS_ACL[dashId] === false`, e nenhum valor é `false` (ids desconhecidos dão `undefined`) ⇒ **qualquer `dashboardId` passa**. Comentários em `:110-114` prometem restrição por papel que não existe |
| **assistente-ia** | `IMPLEMENTADO_PARCIAL` | HTTP real `index.ts:113` (`safeFetchWithRetry`); chamador FETCH `assistenteIAService.ts:131` | Sem persistência de conversas; depende de chave de IA (`NAO_VERIFICADO`) |
| **OCR** | `IMPLEMENTADO_PARCIAL` | HTTP real `index.ts:135` → `api.lovable.dev`; storage `:113`; EFS `edgeFunctionsService.ts:125` ← `DocumentosPage.tsx` | **Buckets `documentos`/`documentos-admissao` não existem** (F2) ⇒ `createSignedUrl` falha. Não persiste o extraído |
| **process-document-ocr** | `SUGERIDO_OU_INICIADO` | HTTP real `index.ts:111`; chamador INV (`useDocumentOCR`) | Duplica `OCR` (dois caminhos concorrentes para a mesma função). Nenhuma tabela de destino |
| **validar-biometria** | `IMPLEMENTADO_PARCIAL` | comparação facial real `index.ts:130`; comentário `:4` confirma que antes era `Math.random()`; lê/grava `batidas_ponto`, `colaboradores`; chamador INV | `batidas_ponto`=**0**. Bucket `ponto-biometria` inexistente |
| **processar-ponto** | `IMPLEMENTADO_PARCIAL` | grava `banco_horas`, `batidas_ponto`, `registros_ponto`, `jornadas`; EFS `edgeFunctionsService.ts:63` ← `PontoPage.tsx` | `batidas_ponto`=0. `banco_horas`=25 e `registros_ponto`=120, mas `audit_log` mostra os 120 `registros_ponto` como `acao='INSERT'` (CRUD do frontend), não da função |
| **processar-ponto-offline** | `IMPLEMENTADO_PARCIAL` | `index.ts:230-233` bucket `ponto-biometria`; chamador INV (`pontoOfflineService`) | Bucket inexistente (F2) ⇒ `getPublicUrl` retorna URL morta |
| **parse-afdt** | `SUGERIDO_OU_INICIADO` | grava `afdt_importacoes`, `afdt_registros_raw`; chamador INV | Ambas as tabelas = **0** linhas |
| **gerar-aej** | `SUGERIDO_OU_INICIADO` | grava `aej_geracoes`, lê `batidas_ponto`; chamador INV | `aej_geracoes`=0 e `batidas_ponto`=0 ⇒ AEJ sairia vazio |
| **gerar-holerite** | `MORTO_OU_ABANDONADO` | `index.ts` (176 linhas); wrapper `edgeFunctionsService.ts:144` existe mas **nenhum componente o consome** (grep de `edgeFunctionsService.gerarHolerite` → 0) | Sem chamador. `holerites`=0 |
| **distribuir-holerites** | `SUGERIDO_OU_INICIADO` | grava `holerite_distribuicoes`, `notificacoes`; chamador INV | `holerites`=0, `holerite_distribuicoes`=0, `notificacoes`=0 |
| **gerar-contrato-pdf** | `SUGERIDO_OU_INICIADO` | template `index.ts:18,45`; grava `contratos_gerados`; chamador INV | `contratos_gerados`=0, `admissao_tokens`=0 |
| **gerar-medida-disciplinar-pdf** | `SUGERIDO_OU_INICIADO` | `index.ts:206,218` bucket `medidas-disciplinares`; chamador `medidasDisciplinaresService.ts:105` | Bucket inexistente (F2). `medidas_disciplinares`=**0** |
| **gerar-pgr** | `SUGERIDO_OU_INICIADO` | `index.ts:111,146` bucket `sst-programas`; chamador INV | Bucket inexistente (F2) ⇒ upload falha. `sst_programas`=4, `sst_riscos_ambientais`=4 (dado de teste) |
| **gerar-ltcat-os** | `SUGERIDO_OU_INICIADO` | `index.ts:309,318` upload+signed URL em `sst-programas`; chamador INV | Bucket inexistente (F2). `sst_ltcat_laudos`=1, `sst_ordens_servico`=1 |
| **assinaturaDigital** | `MORTO_OU_ABANDONADO` | `index.ts` (170 linhas), lê `admissao_tokens`; wrapper `edgeFunctionsService.ts:148` **não consumido** | Sem chamador. `admissao_tokens`=0 |
| **enviar-relatorio** | `IMPLEMENTADO_PARCIAL` | HTTP real `index.ts:274` → `api.resend.com`; upload `:251`; EFS `edgeFunctionsService.ts:43` ← `RelatoriosPage.tsx` | `index.ts:269-270`: sem `RESEND_API_KEY` grava `status:"simulado"` e **retorna sucesso** — falso positivo. `log_envio_relatorios`=0. Bucket inexistente (F2) |
| **processar-agendamentos** | `SUGERIDO_OU_INICIADO` | `index.ts:103` chama `enviar-relatorio` por HTTP; EFS `edgeFunctionsService.ts:141` ← `SystemHealthTab.tsx` (botão manual) | Desenhado para cron, mas **nenhum cron o chama** (F1). `relatorios_agendados`=0 ⇒ sempre processa lista vazia |
| **alertas-dp** | `IMPLEMENTADO_PARCIAL` | HTTP real `index.ts:313` → Resend; EFS `edgeFunctionsService.ts:35` ← `SystemHealthTab.tsx`, `MorningBriefing.tsx` | Lê `v_login_anomalies` (`index.ts:207`) — **view inexistente** (F7) ⇒ bloco de segurança sempre vazio. `notificacoes`=0 |
| **alertas-preditivos** | `MORTO_OU_ABANDONADO` | `index.ts:318` HTTP real p/ IA; auth em `:56-72`; **sem `verifyCsrf`**. `grep -rn alertas-preditivos src/` → 0 chamadores (o único hit é a string do cron `gerar-alertas-preditivos-ia` em `AdminDiagnosticoMigracaoPage.tsx:34`) | Sem chamador e sem cron. O cron esperado `gerar-alertas-preditivos-ia` **não existe** em `cron.job` |
| **notificacao** | `MORTO_OU_ABANDONADO` | `index.ts` (221 linhas); wrapper `edgeFunctionsService.ts:138` **não consumido** | Sem chamador. `notificacoes`=0, `fila_notificacoes`=0 |
| **exportacao** | `MORTO_OU_ABANDONADO` | `index.ts` (190 linhas); wrapper `edgeFunctionsService.ts:109` **não consumido** | Sem chamador |
| **importacao** | `MORTO_OU_ABANDONADO` | `index.ts` (273 linhas); wrapper `edgeFunctionsService.ts:180` **não consumido** | Sem chamador |
| **criptografia** | `MORTO_OU_ABANDONADO` | `index.ts` (172 linhas); wrapper `edgeFunctionsService.ts:170` **não consumido** | Sem chamador |
| **rateLimit** (função HTTP) | `MORTO_OU_ABANDONADO` | `index.ts` (135 linhas); wrapper `edgeFunctionsService.ts:189` **não consumido** | Sem chamador. O rate limit real usado é o módulo `_shared/rateLimit.ts` (importado por 50+ funções) — a função HTTP é redundante |
| **relatorio** | `MORTO_OU_ABANDONADO` | `index.ts` (309 linhas), lê 6 tabelas; `grep -rn "invoke('relatorio'" src/` → 0 | Sem chamador (os hits de "relatorio" em `src/` são `TabsTrigger value="relatorio"`) |
| **auditoria** (função) | `MORTO_OU_ABANDONADO` | `index.ts` (166 linhas), grava tabela `auditoria`; nenhum `invoke('auditoria')` — os 10 hits em `src/` são rota `/auditoria` e abas de UI | Sem chamador. Tabela `auditoria`=0 |
| **integracao** | `MORTO_OU_ABANDONADO` | `index.ts` (152 linhas), grava `integracoes`/`integracao_logs`; nenhum `invoke('integracao')` | Sem chamador. Ambas as tabelas = 0 |
| **backup-automatico** | `MORTO_OU_ABANDONADO` | `index.ts:173` `storage.from('backups')`; grava tabela `backups`; sem chamador e sem cron (F1) | **Tabela `backups` e bucket `backups` não existem** (F2/F7). Desenhado para cron inexistente |
| **backup** | `IMPLEMENTADO_PARCIAL` | `index.ts` (119 linhas); EFS `edgeFunctionsService.ts:118` ← `SystemHealthTab.tsx:83` | Lê `audit_log`/`user_roles`; não cria artefato de backup persistido |
| **limpeza** | `IMPLEMENTADO_PARCIAL` | grava `auditoria` e limpa `blocked_ips`, `login_attempts`, `rate_limit_logs`, `user_sessions`, `verification_tokens`; EFS `edgeFunctionsService.ts:115` ← `SystemHealthTab.tsx:69`, `MorningBriefing.tsx:298` | `auditoria`=0 ⇒ nunca executou. Sobrepõe-se ao cron SQL `dp_run_retention` (jobid 1/2) |
| **cache** | `IMPLEMENTADO_PARCIAL` | `index.ts` (248 linhas); EFS `edgeFunctionsService.ts:163` ← `SystemHealthTab.tsx:137`, `MorningBriefing.tsx:288` | Cache in-memory por isolate: `invalidate` só limpa o isolate que atendeu a requisição, não a frota |
| **healthcheck** | `IMPLEMENTADO_PARCIAL` | `index.ts:33-50`; **sem auth e sem CSRF**, service_role; EFS `edgeFunctionsService.ts:112` + `AdminDiagnosticoMigracaoPage.tsx:24` | Lê `health_checks` — **tabela inexistente** (F7); `index.ts:69` já assume "opcional" |
| **metricas** | `IMPLEMENTADO_PARCIAL` | `index.ts:51,110`; INV `useSystemHealth.ts:33` + `AdminDiagnosticoMigracaoPage.tsx:24` | Lê `mv_telemetry_dashboard` e `mv_folha_summary` — **ambas inexistentes** (F7) ⇒ sempre cai no fallback |
| **metrics** (Prometheus) | `MORTO_OU_ABANDONADO` | `index.ts:1-11`; **sem auth, sem CSRF, sem rate limit**, service_role (`:44-48`); nenhum chamador; nenhum scraper configurado no repo | Lê `health_checks` (`:55`) e `mv_telemetry_dashboard` (`:103`) — inexistentes. Endpoint público que expõe métricas internas |
| **folha-metrics** | `IMPLEMENTADO_PARCIAL` | `index.ts:92` posta em Slack; INV `MetricasFolhaDashboard.tsx:35` | Lê `idempotency_keys`=**0** e `audit_log` sem eventos de folha ⇒ métricas sempre zeradas |
| **auth-login** | `IMPLEMENTADO_PARCIAL` | `index.ts` (153 linhas); `config.toml:3-4` `verify_jwt=false`; FETCH `AuthContext.tsx:175` | Único `verify_jwt=false` declarado. `index.ts:85` degrada **fail-open** na observabilidade. `login_lockouts`=3 |
| **auth-gov-br** | `SUGERIDO_OU_INICIADO` | HTTP real `index.ts:161` (`GOVBR_TOKEN_URL`); grava `govbr_auth_state`, `profiles`; INV (2 chamadores) | `govbr_auth_state`=**0** ⇒ nenhum fluxo gov.br iniciado. Depende de credenciais (`NAO_VERIFICADO`) |
| **consultarCEP** | `IMPLEMENTADO_TOTAL` (sem tabela) | HTTP real `index.ts:54` (ViaCEP) + fallback `:74` (BrasilAPI); INV | Sem persistência por natureza. Não há prova de execução em prod |
| **consultarCNPJ** | `IMPLEMENTADO_TOTAL` (sem tabela) | HTTP real `index.ts:50` (BrasilAPI); INV | Idem |
| **tabelas-dominio** | `IMPLEMENTADO_PARCIAL` | `index.ts:32-38` TABLE_MAP; INV | **Sem autenticação, sem CSRF, CORS `*`, service_role** (`:23-25, 56-58`). 4 dos 6 tipos (`cbo`, `cnae`, `irrf`, `inss`) apontam para tabelas **inexistentes** (F8) |
| **webhook** | `SUGERIDO_OU_INICIADO` | HMAC `index.ts:9-32`, replay TTL `:37`, rate por IP `:44-51`; grava `webhook_logs` | `webhook_logs`=**0** ⇒ nunca recebeu evento. Endpoint de entrada: `NAO_VERIFICADO` se algum sistema externo o conhece |
| **warmup** | `MORTO_OU_ABANDONADO` | `index.ts:50-53` retorna `{ warmed: true, timestamp }` **hardcoded**, sem tocar nada; nenhum chamador em nenhum lugar do repo | Stub puro. Nome sugere pré-aquecimento, mas não faz query alguma |

---

## 5. Achados graves

1. **[CRÍTICA] 22 funções estão travadas em produção por RPC ausente.** `_shared/authz.ts:66` chama
   `pode_gerir_rh_para`, que **não existe** (`pg_proc` = 0). `rpcBool` falha fechada (`authz.ts:52`), então
   `requireRh` (`:93-105`) só passa para `is_admin`. Todos os 4 registros de `user_roles` são `admin`, o que
   mascara o defeito. Qualquer usuário RH não-admin recebe `403 FORBIDDEN` em `calcular-folha`,
   `fechar-folha`, `pix-lote`, `cnab-remessa`, `exportacao`, `gerar-contrato-pdf` etc. A definição existe
   apenas em `supabase/migrations/20260729152613_*.sql`, migration **não aplicada** (30 registradas contra 641 arquivos).

2. **[CRÍTICA] Nenhuma função de negócio deixou rastro de execução em produção.** As funções gravam
   auditoria bloqueante; `auditoria` = **0 linhas** e `audit_log` só contém `INSERT/UPDATE/DELETE/VISUALIZACAO`
   (CRUD do frontend) — nenhum `PAYROLL_CALC` (`calcular-folha/index.ts:310`), `CALCULATE`
   (`calcular-13-salario/index.ts:250`), `PIX_LOTE_CRIADO` (`pix-lote/index.ts:215`). Consequência direta:
   as linhas existentes em `pix_lotes`(2), `cnab_remessas`(3), `adiantamentos_salariais`(4) e
   `emprestimos_consignados`(7) **não foram criadas pelas respectivas edge functions** — em `pix-lote` a
   auditoria tem rollback explícito (`index.ts:230-235`), logo seria impossível.

3. **[CRÍTICA] Nenhum bucket de storage existe em produção (0 buckets).** Toda geração de documento
   quebra em runtime: `gerar-ltcat-os/index.ts:309`, `gerar-pgr/index.ts:111`,
   `gerar-medida-disciplinar-pdf/index.ts:206`, `backup-automatico/index.ts:173`,
   `processar-ponto-offline/index.ts:233`, `enviar-relatorio/index.ts:251`, `OCR/index.ts:113`.
   `AdminDiagnosticoMigracaoPage.tsx:25-30` espera 13 buckets.

4. **[ALTA] CSRF do bridge é contornável por qualquer app Lovable.** `_shared/csrf.ts:20`
   `LOVABLE_HOST_RE = /\.lovable\.(app|dev)$/` aceita qualquer subdomínio (domínio de criação pública), e o
   double-submit token só é verificado **se o atacante escolher enviá-lo** (`csrf.ts:86-87`). O mesmo regex
   está em `_shared/contract.ts:26`, aplicando-se a **todas** as funções.

5. **[ALTA] `metabase-embed` tem ACL decorativa.** `index.ts:102-105` declara `DASHBOARD_ACL = {}` e
   **nunca o usa**; `index.ts:176` só nega quando `ALL_EMPRESAS_ACL[dashId] === false`, e nenhum valor é
   `false` — ids desconhecidos são `undefined`. Resultado: **qualquer usuário autenticado obtém JWT
   assinado para qualquer `dashboardId`**, contrariando os comentários `:112-113` ("eSocial — admin + dp").

6. **[ALTA] Proteção contra brute-force é um stub no bridge.** `external-db-bridge/index.ts:59-63` +
   `:764-767` curto-circuitam `check_login_lock` → **sempre `false`** (nunca bloqueado) e
   `record_failed_login` → **`null`** (nunca registra), sem tocar o banco. `query_telemetry` confirma o motivo:
   `Could not find the function public.record_failed_login(p_identifier, p_identifier_type)` (3 ocorrências).

7. **[ALTA] Integrações governamentais/bancárias são todas simuladas.** Nenhuma das funções
   `enviar-esocial`, `fgts-digital`, `dctfweb`, `pix-lote`, `cnab-remessa`, `gerar-guias` contém **uma única
   chamada HTTP** (varredura completa de `fetch`/`safeFetch` em §"integrações"). Protocolos são strings
   locais: `PRT${crypto.randomUUID()}` (`enviar-esocial/index.ts:163`), `FGD-${Date.now()}` (fgts-digital),
   `GUIA-${t}-${Date.now()}` (`gerar-guias/index.ts:238`). A assinatura ICP-Brasil é literal falsa:
   `enviar-esocial/utils/signer.ts:41` `<X509Certificate>MIIF...[Simulated Certificate Content]...==`.
   `cnab-remessa` **não gera o arquivo CNAB** — só grava linhas.

8. **[ALTA] Endpoints públicos com `service_role` e sem autenticação.** `metrics/index.ts:44-48`
   (Prometheus, sem auth/CSRF/rate limit), `tabelas-dominio/index.ts:23-25,56-58` (CORS `*`, sem auth),
   `healthcheck/index.ts:33-36` (sem auth, só rate limit in-memory por isolate — inútil sob escala).

9. **[ALTA] `config.toml` aponta para outro projeto Supabase.** `supabase/config.toml:1`
   `project_id = "ciziytrrjjotlsjzshnm"` vs. produção `frjbfeamybqsejlvmqbl`. Deploy a partir deste repo
   não atinge o ambiente auditado — reforça o `NAO_VERIFICADO` sobre quais funções estão deployadas.

10. **[MÉDIA] CI que não protege as edge functions.** `.github/workflows/ci.yml:81` marca o `deno check`
    das 59 funções não-bridge como `continue-on-error: true` (gate que nunca reprova) e **não existe
    `deno test`** em lugar nenhum. Os **15 arquivos de teste Deno / 1.597 linhas**
    (`external-db-bridge/validation.test.ts`, `_shared/idempotency.test.ts`, `calcular-folha/e2e_concorrencia.test.ts`,
    `processar-ponto/e2e_idempotencia.test.ts`, …) não são executados por runner algum —
    `vitest.config.ts:12` só inclui `src/**`.

11. **[MÉDIA] 21 de 60 funções (35%) não têm chamador algum** — nem frontend, nem cron, nem webhook
    conhecido: `adiantamento-salarial`, `alertas-preditivos`, `assinaturaDigital`, `auditoria`,
    `backup-automatico`, `cnab-remessa`, `criptografia`, `dctfweb`, `emprestimo-consignado`, `exportacao`,
    `fgts-digital`, `gerar-holerite`, `importacao`, `integracao`, `metrics`, `notificacao`, `pix-lote`,
    `rateLimit`, `relatorio`, `warmup`, `webhook`. Sete delas (`gerar-holerite`, `assinaturaDigital`,
    `exportacao`, `importacao`, `criptografia`, `notificacao`, `rateLimit`) têm wrapper declarado em
    `src/services/edgeFunctionsService.ts:109-189` que **nenhum componente consome**.

12. **[MÉDIA] Isolamento de tenant do bridge é furável em `insert`/`upsert`.**
    `external-db-bridge/index.ts:565` deriva o tenant do `empresa_id` **enviado pelo cliente**
    (`extractEmpresaIdsFromData`, `:271-282`); se as linhas não trouxerem `empresa_id`,
    `assertTenantScope` (`:316`) retorna `{ok:true}` sem verificar nada. Somente `update`/`delete` fazem
    lookup real (`:288-309`).

13. **[MÉDIA] `enviar-relatorio` reporta sucesso falso.** `index.ts:269-270`: sem `RESEND_API_KEY`,
    grava `status: "simulado"` / `"Envio simulado"` e **não bloqueia** — o usuário vê o relatório como enviado.

14. **[MÉDIA] Objetos de banco lidos por funções não existem:** `v_login_anomalies` (usada em
    `alertas-dp/index.ts:207` — o bloco de alertas de segurança sempre retorna vazio),
    `mv_telemetry_dashboard` e `mv_folha_summary` (`metricas/index.ts:51,110`; `metrics/index.ts:103`),
    `health_checks` (`healthcheck/index.ts:48`; `metrics/index.ts:55`), `backups`
    (`backup-automatico`), `cbo`/`cnae`/`faixas_irrf`/`faixas_inss` (`tabelas-dominio/index.ts:32-38` e
    `external-db-bridge/index.ts:30-33`).

15. **[BAIXA] Código morto dentro das funções.** `parseCursor`/keyset pagination
    (`external-db-bridge/validation.ts:43-59`) escrito e testado, nunca importado por `index.ts:19-22`.
    Os 12 `config.ts` (F11) não são lidos por ninguém. `process-document-ocr` duplica `OCR`
    com dois caminhos concorrentes no frontend. `enviar-esocial` tem **dois** assinadores mock
    (`signer.ts` e `utils/signer.ts`), ambos falsos.

---

## 6. Lacunas (não verificado e por quê)

| O que | Por quê |
|---|---|
| **Quais funções estão de fato DEPLOYADAS** | Management API indisponível (sem PAT). `NAO_VERIFICADO`. Agravado por `config.toml` apontar para outro `project_id` (achado 9) |
| **Se as funções compilam / `deno check` passa** | `node_modules` ausente e Deno não instalado; proibido afirmar. `NAO_VERIFICADO` |
| **Se os 15 testes Deno passam** | Nenhum runner disponível; e nenhum runner os executa no CI (achado 10). `NAO_VERIFICADO` |
| **Variáveis de ambiente em produção** (`EXTERNAL_DB_URL`, `EXTERNAL_DB_KEY`, `RESEND_API_KEY`, `ESOCIAL_SIMULATE`, `LOVABLE_API_KEY`, `METABASE_*`, `WEBHOOK_SECRET`, `EXTRA_ALLOWED_ORIGINS`) | Segredos não legíveis pelo MCP. **Impacto direto**: se `EXTERNAL_DB_KEY` for uma service_role, os `select` anônimos do bridge (`index.ts:1-8, 467`) expõem todo o banco externo fora da denylist — não consegui medir |
| **Se o banco externo do bridge tem RLS** | `EXTERNAL_DB_URL` aponta para outra instância, fora do alcance do MCP. A premissa "RLS externo é a fonte de verdade" (`external-db-bridge/index.ts:6`) é **não verificada** |
| **Se algum sistema externo posta em `webhook`** | `webhook_logs`=0 sugere que não, mas ausência de log pode ser falha de escrita. `NAO_VERIFICADO` |
| **Se `metrics` é raspado por Prometheus** | Nenhuma config de scraper no repo. `NAO_VERIFICADO` |
| **Logs de invocação das Edge Functions** | Sem acesso ao analytics/logs da plataforma. Toda inferência de execução veio de efeito persistido |
| **Leitura linha a linha das 45 funções amostradas** | Volume; declarei explicitamente o método de amostragem em §1. Achados de comportamento nessas funções derivam de greps dirigidos, não de leitura integral |
