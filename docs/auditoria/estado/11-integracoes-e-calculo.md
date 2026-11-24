# Integrações externas + Núcleo de cálculo + Utilitários

## 1. Cobertura

**Lidos integralmente (arquivo completo):**
- `src/calculators/` — 9 arquivos `.ts` (auditHelper, beneficios, folhaCompleta, impostos, index, rescisao, tabelas, trabalhista-base, trabalhistas)
- `src/integrations/supabase/client.ts` (394 linhas), `src/integrations/lovable/index.ts` (18 linhas)
- `capacitor.config.ts` (65 linhas), `vite.config.pwa.ts` (90 linhas)
- `supabase/functions/enviar-esocial/signer.ts`, `supabase/functions/sincronizar-bitrix/index.ts`
- `src/services/whatsappService.ts` (parcial: 120/~140 linhas — todo o bloco de envio)

**Amostrados (grep dirigido + leitura de trechos):**
- `supabase/functions/` — 61 diretórios; leitura de trechos em ~20 funções de integração
- `src/utils/` (27 módulos `.ts` + 2 subpastas) — inventário de consumidores por grep; leitura integral só de `folhaCalc.ts`
- `src/schemas/` (25 arq.), `src/lib/` (11 arq.), `src/types/`, `src/constants/`, `src/errors/`, `src/validators/`, `src/i18n/` — grep de consumidores + amostra de cabeçalhos
- `src/services/` — grep dirigido (whatsapp, metabase, dominioAlterdata, cnab, contratacao, edgeFunctions, calculoLote)

**Não executado:** build, typecheck, lint, testes (`node_modules` ausente — briefing §Toolchain). Nenhum arquivo do repositório foi editado.

---

## 2. INVENTÁRIO DE INTEGRAÇÕES EXTERNAS

Legenda de "HTTP real": há `fetch`/`safeFetch` para host de terceiro no código, com arquivo:linha.
Volumetria vem da lista do briefing (tabelas com N>0). Tabela ausente da lista = **0 linhas**.

| # | Integração | HTTP real? (arquivo:linha) | Credencial / env | Tabela de log | N linhas | Classificação |
|---|---|---|---|---|---|---|
| 1 | **eSocial — transmissão** | **NÃO.** `supabase/functions/enviar-esocial/index.ts:159-177`: se `ESOCIAL_SIMULATE=true` → `setTimeout(200)` + protocolo `PRT${crypto.randomUUID()}`; senão → `success=false`, HTTP 503 "Integração eSocial não configurada". Nenhum cliente SOAP existe. | `ESOCIAL_SIMULATE` | `esocial_transmissao_logs`, `esocial_eventos` | 0 / 0 | `SUGERIDO_OU_INICIADO` |
| 2 | **eSocial — assinatura ICP-Brasil** | **NÃO.** `supabase/functions/enviar-esocial/signer.ts:1-48` — cabeçalho literal "Simulação de assinatura"; `assinaturaMock = btoa(hashHex).substring(0,100)` (l.17) e `<ds:X509Certificate>MII...CERTIFICADO_MOCK...` (l.36). XML nunca é assinado de fato. | nenhuma (não usa cert A1/A3) | idem #1 | 0 | `SUGERIDO_OU_INICIADO` (**assinatura falsa**) |
| 3 | **eSocial — protocolo na admissão** | **NÃO.** `src/services/contratacaoService.ts:187-193`: `await new Promise(r => setTimeout(r, 2000))` e grava `esocial_protocol: PROTO-${Math.random()...}` em `admissoes.metadata`. | — | `admissoes` | 8 | `IMPLEMENTADO_PARCIAL` (grava **protocolo fictício** em dado real) |
| 4 | **eSocial — geração de XML/eventos** | N/A (offline). `src/utils/esocialXmlGenerator.ts` (1 consumidor), `src/schemas/esocial/*` (3 consumidores reais). `src/utils/esocialEventosPeriodicos.ts` e `esocialEventosSST.ts` — **0 consumidores de produção**, só testes. | — | `esocial_eventos` | 0 | `IMPLEMENTADO_PARCIAL` |
| 5 | **FGTS Digital** | **NÃO.** `supabase/functions/fgts-digital/index.ts` é CRUD local puro: valida Zod + grava `guias_fgts_digital` (l.~130), `fgts_digital_logs` (l.~146), `auditoria`. Zero `fetch` para gov. | — | `guias_fgts_digital`, `fgts_digital_logs` | 0 / 0 | `SUGERIDO_OU_INICIADO` |
| 6 | **DCTFWeb** | **NÃO.** `supabase/functions/dctfweb/index.ts` — CRUD local: grava `dctfweb_declaracoes` (l.~130) + `auditoria`. Zero `fetch` externo. | — | `dctfweb_declaracoes` | 0 | `SUGERIDO_OU_INICIADO` |
| 7 | **CAGED** | **INEXISTENTE.** `grep -ri caged src supabase/functions` → **0 ocorrências**. | — | — | — | não existe |
| 8 | **RAIS** | **INEXISTENTE** como integração. Os 15 hits de `grep -i rais` são falsos positivos (`ConfiguracoesGe**rais**Tab`, "fiscais"). | — | — | — | não existe |
| 9 | **gov.br (SSO OIDC)** | **SIM.** `supabase/functions/auth-gov-br/index.ts:9-12` (`GOVBR_BASE_URL` → `/authorize`,`/token`,`/userinfo`); `safeFetch(GOVBR_TOKEN_URL)` em l.161; userinfo em l.180. Frontend invoca em 2 pontos. | `GOVBR_CLIENT_ID`, `GOVBR_CLIENT_SECRET`, `GOVBR_BASE_URL` | nenhuma tabela dedicada | — | `IMPLEMENTADO_PARCIAL` (código completo; **sem prova de uso**, sem secrets confirmados) |
| 10 | **Bitrix24** | **SIM.** `supabase/functions/sincronizar-bitrix/index.ts:106` (`safeFetch(${webhook_url}/department.get)`) e `:128` (`/user.get?ACTIVE=true`); faz upsert em `departamentos` e `colaboradores`. `sync_cargos` é **stub**: l.155 retorna `{note:'requires custom Bitrix24 field mapping'}`. | `bitrix24_config.webhook_url` (DB, não env) | `bitrix24_sync_logs` | 0 | `IMPLEMENTADO_PARCIAL` (nunca executado; sync de cargos não implementado) |
| 11 | **Metabase (Signed Embed)** | **SIM (healthcheck).** `supabase/functions/metabase-embed/index.ts:25` importa `safeFetch`; gera JWT de embed com TTL 3h + cache em memória. **Allowlist de dashboard hardcoded**: l.110-111 `{1: true, 2: true}`. Frontend: `src/components/metabase/MetabaseEmbed.tsx` existe; `src/services/metabaseService.ts` tem **0 consumidores**. | `METABASE_URL`, `METABASE_SECRET_KEY`, `METABASE_SITE_URL` | nenhuma | — | `IMPLEMENTADO_PARCIAL` (service órfão; env não confirmado) |
| 12 | **Sentry (frontend)** | **SIM (SDK).** `src/main.tsx:13-17` — `Sentry.init` só se `import.meta.env.PROD && VITE_SENTRY_DSN`. | `VITE_SENTRY_DSN`, `VITE_SENTRY_RELEASE` | externa | — | `IMPLEMENTADO_PARCIAL` (gate por env não verificável) |
| 13 | **Sentry (edge)** | **SIM.** `supabase/functions/_shared/sentry.ts:13,34,41` — envelope via `fetch` nativo; **no-op silencioso** se `SENTRY_DSN` ausente (l.41-44 cai em `console.error`). Importado por ≥8 funções. | `SENTRY_DSN`, `SENTRY_RELEASE`, `SENTRY_ENVIRONMENT` | externa | — | `IMPLEMENTADO_PARCIAL` |
| 14 | **WhatsApp / Evolution API** | **NÃO — SIMULADO.** `src/services/whatsappService.ts:46-62` (`sendMessage`) apenas insere em `whatsapp_mensagens_logs` com `status:'sent'` e `mensagem_id_externo: wa_direct_${Date.now()}`. `sendTemplateMessage` (l.85-117): `await new Promise(r => setTimeout(r, 1000))` e marca `'sent'` com `wa_${Date.now()}`. **Zero fetch para a Evolution API.** UI de config existe (`src/components/integracoes/ConfigPanels.tsx:306` "URL da Instância (Evolution API)"). | `whatsapp_config.instancia_url/api_key` (DB) — **nunca lidos no envio** | `whatsapp_mensagens_logs` | **13** | `IMPLEMENTADO_PARCIAL` — **log com dado real, envio 100% fictício** |
| 15 | **PIX (lote)** | **NÃO.** `supabase/functions/pix-lote/index.ts` — só grava `pix_lotes` (l.173), `pix_itens` (l.197) e `auditoria`, com fluxo de dupla aprovação (`PIX_APROVACAO_DUPLA_CENTAVOS`, default R$100k). Nenhum `fetch` a PSP/banco. | `PIX_APROVACAO_DUPLA_CENTAVOS` | `pix_lotes` / `pix_itens` | **2** / 0 | `IMPLEMENTADO_PARCIAL` (lote criado mas **nunca transmitido**; itens vazios) |
| 16 | **CNAB (remessa bancária)** | **NÃO (por design — arquivo).** Geração real de layout: `src/services/cnabService.ts:135` `generateCNAB240`, `:404` `generateCNAB400`, header montado com `pad()` em `:216`, linhas de 240/400 bytes. Retorno CNAB parseado em `:300-302`. Edge `cnab-remessa/index.ts` grava `cnab_remessas` (l.137) + `cnab_itens` (l.168). Entrega do arquivo ao banco é manual. | `cnab_configuracoes` (DB) | `cnab_remessas`, `cnab_itens` | **3** / 0 | `IMPLEMENTADO_PARCIAL` (remessas criadas; **`cnab_itens` vazio** → remessas sem linha) |
| 17 | **OCR de documentos** | **SIM.** `supabase/functions/process-document-ocr/index.ts:112` → `https://api.lovable.dev/v1/chat/completions`; `supabase/functions/OCR/index.ts:136` idem. Frontend: `src/hooks/useDocumentOCR.ts:45`. | `LOVABLE_API_KEY` | nenhuma tabela de log dedicada | — | `IMPLEMENTADO_PARCIAL` (sem persistência de log; env não confirmado) |
| 18 | **Consulta CNPJ** | **SIM.** `supabase/functions/consultarCNPJ/index.ts:50` → `https://brasilapi.com.br/api/cnpj/v1/${clean}`. Consumidor: `src/components/ui/cnpj-input.tsx:74`. **Não usa ReceitaWS** (0 ocorrências). | nenhuma (API pública) | nenhuma | — | `IMPLEMENTADO_PARCIAL` (só falta prova de uso; `empresas`=1) |
| 19 | **Consulta CEP** | **SIM, com fallback duplo.** `supabase/functions/consultarCEP/index.ts:54` → ViaCEP; `:74` → BrasilAPI. Consumidor: `src/components/ui/cep-input.tsx:51`. | nenhuma (APIs públicas) | nenhuma | — | `IMPLEMENTADO_PARCIAL` |
| 20 | **Biometria facial (ponto)** | **SIM.** `supabase/functions/validar-biometria/index.ts:131` → `https://ai-gateway.lovable.dev/v1/chat/completions` (modelo `google/gemini-2.5-flash`), retry 3x. Comentário l.4 confirma que **antes era `Math.random()`**. Fail-closed: sem `LOVABLE_API_KEY` → status `'pendente'` (l.174). | `LOVABLE_API_KEY` | `batidas_ponto` (update) | 0 (`batidas_ponto` ausente da lista) | `IMPLEMENTADO_PARCIAL` |
| 21 | **Lovable AI Gateway (assistente)** | **SIM.** `supabase/functions/assistente-ia/index.ts:114` → `ai-gateway.lovable.dev`. | `LOVABLE_API_KEY` | — | — | `IMPLEMENTADO_PARCIAL` |
| 22 | **OpenAI (alertas preditivos)** | **SIM.** `supabase/functions/alertas-preditivos/index.ts:316` → `AI_GATEWAY_URL \|\| https://api.openai.com/v1/chat/completions`. | `OPENAI_API_KEY`, `AI_GATEWAY_URL` | — | — | `SUGERIDO_OU_INICIADO` (sem tabela de saída com dado) |
| 23 | **Lovable OAuth (Google/Apple)** | **SIM (via Supabase Auth).** `src/integrations/lovable/index.ts:9-16` — wrapper de `supabase.auth.signInWithOAuth`. Único consumidor: `src/pages/LoginPage.tsx:5,72`. Arquivo se autodeclara legado ("kept for backward compatibility", l.2). | provider config no Supabase | `auth.users` | — | `IMPLEMENTADO_PARCIAL` |
| 24 | **E-mail — Resend** | **SIM.** `supabase/functions/enviar-relatorio/index.ts:274` e `supabase/functions/alertas-dp/index.ts:313` → `https://api.resend.com/emails` via `safeFetch`. | `RESEND_API_KEY` | `fila_notificacoes`, `notificacoes` | 0 / 0 | `SUGERIDO_OU_INICIADO` |
| 25 | **E-mail — SMTP/nodemailer/SendGrid** | **INEXISTENTE.** 0 ocorrências de `SMTP`, `nodemailer`, `sendgrid`. | — | — | — | não existe |
| 26 | **Distribuição de holerites (multicanal)** | **PARCIAL.** `supabase/functions/distribuir-holerites/index.ts:60` aceita `portal\|email\|whatsapp`; l.167 marca **só `portal`** como enviado ("canal síncrono"); email/whatsapp entram em fila e dependem de #14/#24. UI: `src/components/folha/DistribuirHoleritesButton.tsx:27` rotula WhatsApp como "Requer integração ativa". | — | `holerites_distribuicao`, `notificacoes` | 0 / 0 | `SUGERIDO_OU_INICIADO` |
| 27 | **Slack** | **SIM (opt-in).** `supabase/functions/folha-metrics/index.ts:82,88` — no-op se `SLACK_WEBHOOK_URL` ausente. Única referência no repo. | `SLACK_WEBHOOK_URL` | — | — | `SUGERIDO_OU_INICIADO` |
| 28 | **Telegram** | **INEXISTENTE.** 0 ocorrências. | — | — | — | não existe |
| 29 | **Stripe / pagamentos** | **INEXISTENTE.** Os 2 hits de "stripe" são `theme:'striped'` de jsPDF-autotable (`src/services/exportService.ts:100`, `src/utils/feriasPDF.ts:34`). | — | — | — | não existe |
| 30 | **Domínio / Alterdata (ERP contábil)** | **fetch existe, mas serviço é órfão.** `src/services/dominioAlterdataService.ts:58` (`await fetch(url, fetchOptions)`); cabeçalho l.3 diz "Simulação de cenários". **0 consumidores de produção** (grep `dominioAlterdataService\|dominioService` fora do próprio arquivo → nenhum). | `apiKey`/`clientId`/`clientSecret` (passados por parâmetro; sem env) | `lancamentos_contabeis` | 5 (populada por outro caminho) | `MORTO_OU_ABANDONADO` |
| 31 | **Webhooks de saída** | Config CRUD apenas: `src/services/integracaoService.ts:62-92` (`webhooks_config`, `webhook_logs`). Edge `integracao/index.ts:113,123` grava `integracoes`/`integracao_logs`; `action:'sync'` **só loga, não sincroniza nada**. | `WEBHOOK_SECRET`, `WEBHOOK_REQUIRE_TIMESTAMP` | `webhook_logs`, `integracao_logs`, `logs_integracoes` | 0 / 0 / 0 | `SUGERIDO_OU_INICIADO` |
| 32 | **Capacitor (mobile)** | **NÃO CONFIGURADO** — ver §5. | — | — | — | `SUGERIDO_OU_INICIADO` |
| 33 | **External DB Bridge** (integração interna crítica) | **SIM.** `src/integrations/supabase/client.ts:167-177` → `POST ${FUNCTIONS_BASE}/external-db-bridge`, com retry 1s/5s/25s e `Idempotency-Key` auto-gerada para writes (l.66-69). É o caminho de **todo I/O de dados** do frontend. | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `EXTERNAL_DB_URL`, `EXTERNAL_DB_KEY`, `BRIDGE_QUERY_TIMEOUT_MS` | `query_telemetry` | **265** | `IMPLEMENTADO_TOTAL` |

**Resumo:** de 33 itens, **4 não existem** (CAGED, RAIS, Telegram, Stripe/SMTP), **7 são simulações ou CRUD local disfarçado de integração** (#1,#2,#3,#5,#6,#14,#15), **1 está morto** (#30) e **apenas 1 tem dado real de produção comprovado** (#33, bridge).

---

## 3. Núcleo de cálculo (`src/calculators/`)

### 3.1 Tabelas hardcoded — e de que ano são

Tudo em `src/calculators/tabelas.ts` (55 linhas), sem carga de banco nem versionamento por vigência.

| Constante | Valor | Linha | Avaliação |
|---|---|---|---|
| `SALARIO_MINIMO_2026` | 1621.00 | `tabelas.ts:3` | plausível p/ 2026 |
| `FAIXAS_INSS_2026` | 1621.00 / 2902.84 / 4354.27 / 8475.55 | `tabelas.ts:5-10` | escalonado com o SM 2026 |
| `TETO_INSS_2026` | 8475.55 | `tabelas.ts:12` | idem |
| **`FAIXAS_IRRF_2026`** | **2259.20** / 2826.65 / 3751.05 / 4664.68 | **`tabelas.ts:14-20`** | **DESATUALIZADO.** 2259.20 é o limite de isenção da tabela vigente **fev/2024–abr/2025**. Desde mai/2025 o 1º limite é 2428,80; e a Lei 15.270/2025 alterou o regime para 2026. Rotulada `_2026` mas é a tabela de 2024. |
| **`DEDUCAO_SIMPLIFICADA_IRRF_2026`** | **564.80** | **`tabelas.ts:22`** | **DESATUALIZADO.** É 25% de 2259,20 (tabela 2024). Valor de 2025 = 607,20. |
| `DEDUCAO_DEPENDENTE_IRRF` | 189.59 | `tabelas.ts:23` | correto (estável) |
| `SALARIO_FAMILIA_TETO/VALOR` | 1980.38 / 67.54 | `tabelas.ts:26-27` | `NAO_VERIFICADO` (não confere com 2024 nem 2025; provável projeção) |
| **`FAIXAS_SEGURO_DESEMPREGO_2026`** | teto 2313.74 | **`tabelas.ts:47-55`** | **auto-contraditório**: o comentário da l.47 diz *"base SM R$1.518,00"* — ou seja, valores de **2025** dentro de uma constante chamada `_2026`. |
| `FAIXAS_PLR_2026` | 7640.80 … | `tabelas.ts:32-38` | consistente com Lei 14.663/2023 |

O teste `src/calculators/__tests__/tabelas.test.ts:22-24` **congela** `SALARIO_MINIMO_2026 === 1621.00`, mas os demais asserts (l.28-40) só verificam **monotonicidade** de limites/alíquotas — **não validam nenhum valor de IRRF**. Ou seja: o teste passaria com a tabela de 2024, de 2020 ou com valores inventados.

### 3.2 Duplicação e qual motor **de fato roda**

Existem **três** implementações concorrentes de INSS/IRRF:

| Motor | Local | Tabela INSS | Tabela IRRF | Persiste em |
|---|---|---|---|---|
| **A — canônico (front)** | `src/calculators/impostos.ts:11,32` + `tabelas.ts` | **1621.00 … teto 8475.55** | 2259.20… | via `folhaCalc` |
| **B — edge folha** | `supabase/functions/calcular-folha/index.ts:19-36` | **1518.00 … teto 8157.41** | 2259.20… | `folhas_pagamento` (`index.ts:281-283`) |
| **C — edge férias/rescisão/13º** | `calcular-ferias/index.ts:19-31`, `calcular-rescisao/index.ts:18-30`, `calcular-13-salario/index.ts:18` | **teto 8157.41** | 2259.20… | tabelas próprias |

**Cadeia realmente executada para a folha (a que grava `folha_itens`, N=12):**
`src/services/folha/calculoLoteService.ts:219` → `folhaCalc.processar()` → `src/utils/folhaCalc.ts:2-4` (importa `@/calculators/impostos` e `FAIXAS_*_2026`) → upsert em `folha_itens` (`calculoLoteService.ts:243`) + insert em `folha_auditoria` (`:246`).
Também consumido por `src/hooks/useCalculoFolha.ts:33` e `src/pages/FeriasPage.tsx:107` (via `calculoFerias`).

**O caminho da edge function existe em paralelo:** `src/pages/FolhaPagamentoPage.tsx:141-146` → `edgeFunctionsService.calcularFolha` → `edgeFunctionsService.ts:87` → `invoke('calcular-folha')`. **Botão distinto na mesma tela** ("Calcular folha no servidor", l.155).

> **Fonte da verdade: não existe.** São dois botões na mesma página, com **tabelas de INSS de anos diferentes** (teto 8475,55 vs 8157,41), gravando na mesma folha. Ver Achado #1.

### 3.3 Refactor abandonado dentro do próprio `src/calculators/`

`src/calculators/folhaCompleta.ts` (106 linhas) implementa `calcularFolhaCompleta` — versão mais completa (DSR sobre adicional noturno l.35, iteração convergente pensão×IRRF l.51-59, plano de contas de lançamentos l.67-79). **Consumidores de produção: 0.**

Varredura de 29 funções exportadas por `src/calculators/`, excluindo `__tests__` e o próprio diretório — **todas com 0 consumidores**:
`calcularFolhaCompleta, calcularSalarioLiquido, calcularEncargos, calcularPLR, calcularSeguroDesemprego, calcularMulta477, calcularProvisaoFerias, calcularProvisao13, calcularMargemConsignado, calcularProRata, calcularAvisoPrevioIndenizado, calcularMultaFGTS, calcularEmprestimoConsignado, calcularValeAlimentacao, calcularPlanoSaude, calcularLiquido, calcularSalarioMaternidade, calcularAuxilioDoenca, calcularSobreaviso, calcularProntidao, calcularBancoHoras, calcularMedias, calcularQuilometragem, calcularDiarias, calcularComissao, calcularGratificacao, calcularAdicionalTransferencia, verifyCalculationIntegrity, auditCalculation`.

Só entram em produção: `calcularINSS/IRRF/FGTS` (`impostos.ts`), `calcularHorasExtras/DSR/calcular13Salario` (`trabalhista-base.ts`), `calcularFerias` (`beneficios.ts`, via `utils/calculoFerias.ts:1`), `calcularRescisao` (via `utils/rescisaoCalc.ts:7`) e `signCalculation` (`utils/rescisaoCalc.ts:8`). → **≈80% de `src/calculators/` é `MORTO_OU_ABANDONADO`.**

Note em particular: `auditCalculation` (`auditHelper.ts:18`) e `verifyCalculationIntegrity` (`:49`) — a "assinatura SHA-256 do cálculo de folha" **nunca é chamada** pelo motor que roda; o `calculoLoteService` grava em `folha_auditoria` com texto livre (`calculoLoteService.ts:250`), sem assinatura.

---

## 4. `src/utils/` — funções sem consumidor (com prova)

Método: para cada módulo, `grep -rl "utils/<base>\b|from './<base>'|from \"./<base>\"" src --include=*.ts --include=*.tsx`, descartando `__tests__/` e `*.test.*` e o próprio arquivo. Variações do regex testadas: caminho com alias `@/utils/`, caminho relativo `../<base>`, `./<base>`.

| Módulo | Consumidores prod | Consumidores só-teste | Classificação |
|---|---|---|---|
| `src/utils/cursorPagination.ts` | **0** | **0** | `MORTO_OU_ABANDONADO` — nem teste. Substituído por `src/lib/cursor.ts` (`src/services/feriasService.ts:5` usa `parseCursor` de `@/lib/cursor`). Refactor concluído, resto não removido. |
| `src/utils/esocialEventosPeriodicos.ts` | **0** | 2 (`__tests__/esocialEventos.test.ts:2`, `__tests__/esocialEventosPeriodicos.test.ts:9`) | `MORTO_OU_ABANDONADO` — testado, nunca chamado |
| `src/utils/esocialEventosSST.ts` | **0** | 2 (`__tests__/esocialEventos.test.ts:3`, `esocialEventosSST.test.ts:9`) | `MORTO_OU_ABANDONADO` |
| `src/utils/evaluationPDF.ts` (`gerarPDIPDF`) | **0** | 1 (`__tests__/evaluationPDF.test.ts:14`) | `MORTO_OU_ABANDONADO` |

Demais 23 módulos de `src/utils/` têm ≥1 consumidor de produção (maiores: `safeError`=110, `piiMask`=18, `dateLocal`=37).

**Fora de `src/utils/`, no meu escopo, também órfãos:**

| Alvo | Prova | Classificação |
|---|---|---|
| `src/i18n/` (584 linhas: `index.ts` 500 + `useTranslation.ts` 84) | `grep -rn "@/i18n\|from '.*i18n" src` → **0 resultados** fora do próprio diretório | `MORTO_OU_ABANDONADO` |
| `src/validators/esocialValidators.ts` | única menção no repo é um **comentário**: `src/schemas/common.ts:6` "(backward compat)". Nenhum `import`. | `MORTO_OU_ABANDONADO` |
| `src/errors/AppError.ts` (`AppError`,`ValidationError`,`AuthError`,`NetworkError`,`NotFoundError`,`PermissionError`,`getErrorMessage`,`isAppError`) | reexportado por `src/errors/index.ts:4-13`, mas o único import de `@/errors` é `src/main.tsx:8` — e importa **apenas** `ErrorBoundary`. Os hits de `ValidationError` em `src/schemas/esocial/naoPeriodicosValidators.ts:11` são de um **tipo local homônimo**, não do `AppError.ts`. | `MORTO_OU_ABANDONADO` |
| `src/schemas/{admissao,afastamento,beneficio,cargo,colaborador,departamento,documento,ferias,folha,ponto}.ts` (10 de 25 arquivos) | `grep -rn "from ['\"].*schemas" src` fora de `src/schemas/` retorna 8 linhas, todas apontando para `@/schemas/esocial` ou `@/schemas` (só `empresaSchema`, em `src/pages/EmpresaFormPage.tsx:18`). Os 4 formulários com `zodResolver` que não usam `empresaSchema` (`ColaboradorFormPage.tsx:31`, `AfastamentoForm.tsx:23`, `AdminCatPage.tsx:64`) declaram **`const schema = z.object({...})` local**. | `MORTO_OU_ABANDONADO` — camada de validação paralela ignorada |
| `src/services/metabaseService.ts` | `grep -rn "metabaseService" src` fora do arquivo → 0 | `MORTO_OU_ABANDONADO` |
| `src/services/dominioAlterdataService.ts` | idem (item #30 da tabela) | `MORTO_OU_ABANDONADO` |

---

## 5. Dado fictício no escopo

| Ocorrência | Arquivo:linha | Natureza |
|---|---|---|
| Protocolo eSocial inventado | `src/services/contratacaoService.ts:193` | `PROTO-${Math.random().toString(36).toUpperCase().slice(0,10)}` gravado em `admissoes.metadata` (tabela com **8 linhas reais**) |
| Latência de rede falsa | `src/services/contratacaoService.ts:187` | `setTimeout(2000)` simulando transmissão |
| Envio WhatsApp falso | `src/services/whatsappService.ts:59` | `mensagem_id_externo: wa_direct_${Date.now()}`, `status:'sent'` sem envio |
| Envio de template falso | `src/services/whatsappService.ts:105,109` | `setTimeout(1000)` + `wa_${Date.now()}` |
| Assinatura ICP-Brasil falsa | `supabase/functions/enviar-esocial/signer.ts:17,36` | `assinaturaMock`, `CERTIFICADO_MOCK` |
| Protocolo/recibo eSocial sandbox | `supabase/functions/enviar-esocial/index.ts:161-162` | `PRT${uuid}` / `REC-${uuid}` sob `ESOCIAL_SIMULATE` |
| Allowlist de dashboard hardcoded | `supabase/functions/metabase-embed/index.ts:110-111` | `{1:true, 2:true}` — todos os autenticados |
| Largura de skeleton aleatória (cosmético, aceitável) | `src/components/ui/sidebar.tsx:537` | `Math.random()*40+50 %` |

`Math.random()` **legítimo** no meu escopo: `src/lib/retry.ts:81` (jitter de backoff), `src/lib/tracing.ts:44` (trace id), `src/lib/utils.ts:6` (`generateId`). Nenhuma métrica sempre-zero encontrada em `src/calculators/`, `src/utils/`, `src/lib/`.

---

## 6. PWA e Mobile

### PWA — `IMPLEMENTADO_PARCIAL` (com ativo faltando)
- `vite.config.ts:6,54` **usa** `VitePWA` — este é o config do build real. `vite-plugin-pwa@1.3.0` e `workbox-window@7.4.1` estão em `package.json:103-104`.
- `vite.config.pwa.ts` (90 linhas) é um **segundo config duplicado e não referenciado por nenhum script** de `package.json` → arquivo redundante.
- Registro de SW: `src/main.tsx:129` (`'serviceWorker' in navigator`, com guarda `!isInIframe && !isPreviewHost`).
- **Fio quebrado:** o manifest declara `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` e 3 ícones de shortcut (`vite.config.pwa.ts:26-36`; idem `vite.config.ts:64-69`), mas `ls public/` = `favicon.ico, manifest.json, manifest.webmanifest, placeholder.svg, robots.txt, sw-custom.js, vite.svg`. **Nenhum PNG existe** → ícones 404, instalação PWA degradada.
- Há **três** manifestos concorrentes: `public/manifest.json`, `public/manifest.webmanifest` e o gerado pelo VitePWA.
- CI: nenhum workflow de `.github/workflows/` (5 arquivos) menciona `pwa`.

### Mobile / Capacitor — `SUGERIDO_OU_INICIADO` (esqueleto)
- `capacitor.config.ts` existe (65 linhas), tipado como `CapacitorConfig`.
- **`grep -c "@capacitor" package.json` → 0.** Nenhuma dependência Capacitor instalada; o `import type { CapacitorConfig } from '@capacitor/cli'` (l.21) **não resolve**.
- Não existem os diretórios `android/` nem `ios/`.
- `package.json:37-39` define `build:mobile`, `build:mobile:android`, `cap:check` → todos apontam para `scripts/capacitor-build.sh`, cujo próprio cabeçalho (l.11-15) instrui o operador a rodar `npm install @capacitor/core @capacitor/cli` e `npx cap add android` **antes** — ou seja, o setup nunca foi feito.
- CI: `grep -rn "mobile\|capacitor" .github/workflows/` → **0 resultados**. Nenhum build mobile ativo.

---

## 7. Achados graves

1. **[CRÍTICO] Dois motores de folha com tabelas de INSS de anos diferentes, ambos ativos na mesma tela.**
   `src/utils/folhaCalc.ts:4` usa `FAIXAS_INSS_2026` (`tabelas.ts:5-10`, teto **8475,55**); `supabase/functions/calcular-folha/index.ts:19-34` usa faixas **2025** (teto **8157,41**). `src/pages/FolhaPagamentoPage.tsx` expõe os dois caminhos (cálculo local via `calculoLoteService.ts:219` e "no servidor" via `:141`). Para salário acima de R$ 8.157,41 os dois produzem INSS diferente sobre a mesma competência. Não há fonte da verdade.

2. **[CRÍTICO] Tabela de IRRF rotulada `_2026` é a tabela de fev/2024.**
   `src/calculators/tabelas.ts:14-20` (1º limite 2259,20) e `:22` (dedução simplificada 564,80) — valores substituídos em mai/2025 e novamente pela Lei 15.270/2025. Replicados idênticos em `calcular-folha:26-31`, `calcular-ferias:29`, `calcular-rescisao:28`. **Todo IRRF calculado no sistema está errado**, front e back. O teste que deveria pegar isso (`__tests__/tabelas.test.ts`) só verifica monotonicidade, nunca valores.

3. **[CRÍTICO] Constante `FAIXAS_SEGURO_DESEMPREGO_2026` documenta a si mesma como base 2025.**
   `src/calculators/tabelas.ts:47` — comentário literal *"(Resolução CODEFAT — base SM R$1.518,00)"* dentro de constante `_2026`. Nomenclatura mente sobre a vigência.

4. **[ALTO] eSocial inteiro é simulação — inclusive a assinatura digital.**
   `enviar-esocial/signer.ts:17,36` gera `assinaturaMock`/`CERTIFICADO_MOCK`; `index.ts:167-177` falha 503 em modo real. Nenhum cliente SOAP no repo. `esocial_eventos` e `esocial_transmissao_logs` = 0 linhas. Mesmo assim `contratacaoService.ts:193` grava protocolo `Math.random()` em `admissoes` (8 linhas reais) — **dado fictício persistido em tabela de produção**.

5. **[ALTO] WhatsApp: painel de configuração completo, envio 100% fictício, com 13 logs "enviados" no banco.**
   `whatsappService.ts:46-62` nunca lê `whatsapp_config.instancia_url`/`api_key`; só insere log `status:'sent'`. `whatsapp_mensagens_logs` = **13 linhas** — evidência de que a simulação já rodou e produziu registros que parecem envios reais.

6. **[ALTO] FGTS Digital e DCTFWeb são CRUD local vestido de integração fiscal.**
   `fgts-digital/index.ts` e `dctfweb/index.ts` — zero `fetch` para gov.br/Receita/Caixa; apenas Zod + insert + auditoria. Tabelas `guias_fgts_digital`, `fgts_digital_logs`, `dctfweb_declaracoes` = 0 linhas.

7. **[ALTO] `.single()` e `.maybeSingle()` colapsados na bridge — divergência semântica silenciosa.**
   `src/integrations/supabase/client.ts:361-362` ambos setam `payload.single = true`; l.203 retorna `null` quando o array vem vazio. Em `supabase-js`, `.single()` **erra** com 0 linhas. Todo código que confia em `.single()` para detectar ausência de registro recebe `null` em vez de erro — falha silenciosa.

8. **[MÉDIO] ~80% de `src/calculators/` é código morto**, incluindo o motor mais completo (`folhaCompleta.ts`, com DSR sobre adicional noturno e iteração pensão×IRRF) e a assinatura de integridade do cálculo (`auditHelper.ts:18,49`). 29 funções exportadas com 0 consumidores (prova em §3.3). Refactor abandonado clássico: o novo é melhor, o antigo é o que roda.

9. **[MÉDIO] Camada de validação Zod inteira ignorada.** 10 de 25 arquivos de `src/schemas/` sem consumidor; os formulários redeclaram schemas locais (`ColaboradorFormPage.tsx:31`, `AfastamentoForm.tsx:23`). Idem `src/validators/esocialValidators.ts` (referenciado só em comentário) e `src/errors/AppError.ts`.

10. **[MÉDIO] `src/i18n/` — 584 linhas, 0 importadores.** Sistema de 3 idiomas com pluralização e formatação regional que nada consome.

11. **[MÉDIO] PWA com todos os ícones ausentes.** Manifest referencia 7 PNGs; `public/` não tem nenhum. Mais 2 manifestos concorrentes e um `vite.config.pwa.ts` duplicado e não referenciado.

12. **[MÉDIO] Capacitor: config sem dependências.** `capacitor.config.ts` importa de `@capacitor/cli`, ausente do `package.json`; sem `android/`, sem `ios/`, sem job de CI. Os 3 scripts npm apontam para um shell script que exige setup manual nunca feito.

13. **[BAIXO] `cnab_remessas`=3 mas `cnab_itens`=0** — remessas bancárias registradas sem nenhuma linha de pagamento. Mesmo padrão em `pix_lotes`=2 com `pix_itens`=0. Cabeçalho existe, conteúdo não.

14. **[BAIXO] Sincronização de cargos do Bitrix é stub declarado.** `sincronizar-bitrix/index.ts:155` retorna `{note: 'Cargos sync requires custom Bitrix24 field mapping'}` e ainda assim conta como sucesso na resposta agregada.

---

## 8. Lacunas — o que NÃO consegui verificar

1. **Quais Edge Functions estão de fato deployadas.** Management API indisponível (briefing §Banco). Toda avaliação de edge function aqui é sobre **código-fonte**, não sobre runtime. → `NAO_VERIFICADO`.
2. **Quais secrets/env vars estão configurados** (`LOVABLE_API_KEY`, `RESEND_API_KEY`, `GOVBR_*`, `METABASE_*`, `SENTRY_DSN`, `SLACK_WEBHOOK_URL`, `ESOCIAL_SIMULATE`, `VITE_SENTRY_DSN`). Sem acesso ao painel de secrets, não é possível dizer se as integrações #9,#11,#12,#13,#17,#20,#21,#22,#24,#27 estão ligadas ou em no-op. → `NAO_VERIFICADO`.
3. **Se o código compila / os testes passam.** `node_modules` ausente. Não afirmo nada sobre build, typecheck, lint ou execução de testes.
4. **Valores oficiais das tabelas 2026** (INSS, salário-família, seguro-desemprego). Confrontei contra o que conheço das tabelas 2024/2025; os itens marcados `NAO_VERIFICADO` (salário-família 1980,38/67,54) precisam de conferência contra a portaria vigente. Os achados #2 e #3 são seguros porque a **própria evidência interna** (valor 2259,20 = tabela fev/2024; comentário "base SM R$1.518,00") os comprova.
5. **Qual dos dois botões de folha o usuário realmente aperta.** Ambos existem na UI (`FolhaPagamentoPage.tsx`). `folha_itens`=12 e `folhas_pagamento`=4 são compatíveis com qualquer um dos dois; não há coluna de origem que permita distinguir. O achado #1 é sobre a **divergência estrutural**, não sobre qual predominou.
6. **`src/utils/` — cobertura por amostragem.** Inventariei os 27 módulos por grep de importadores, mas li integralmente apenas `folhaCalc.ts`. Funções órfãs *dentro* de módulos que têm consumidor (ex.: um export não usado em `format.ts`) não foram varridas.
7. **`src/types/` (12 arq.) e `src/constants/` (3 arq.)** — inventariados por contagem de importadores, sem análise de exports individuais.
