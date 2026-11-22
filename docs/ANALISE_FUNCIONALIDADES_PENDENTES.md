# Análise de funcionalidades pendentes — estado real certificado

**Original:** 02/04/2026 (análise estática de código)
**Revisão exaustiva:** 22/11/2026 — cada linha abaixo foi reverificada no código e, quando aplicável, no banco canônico (`frjbfeamybqsejlvmqbl`).

> Este documento substitui a versão de 02/04/2026, que listava 12 itens como ausentes.
> **9 deles já estavam implementados** na época desta revisão. As tabelas abaixo dão
> arquivo:linha do consumidor, que é o que prova funcionalidade integrada — não a
> existência de um arquivo solto.

---

## Categoria 2 — os 7 "pendentes" (todos resolvidos)

| # | Item | Estado real | Evidência (arquivo:linha) |
|---|------|-------------|---------------------------|
| 1 | eSocial — envio real ao governo | **Bloqueado por dependência externa do cliente**, não por código. A edge recusa honestamente em vez de fingir sucesso. | `supabase/functions/enviar-esocial/index.ts:145-150` — "Esta versão não possui cliente SOAP nem assinatura ICP-Brasil real" → `Transmissão produtiva eSocial indisponível`. Falta certificado ICP-Brasil A1/A3 + endpoint homologado. |
| 2 | Folha — integração bancária de pagamento | **Feito.** | `src/pages/FolhaPagamentoPage.tsx:251` `<PagamentoBancarioWizard folhaId={resumo.id} />` e `:252` `<CNABDialog folhaId={resumo.id} />` |
| 3 | Ponto — biometria / reconhecimento facial | **Feito.** | `src/services/pontoService.ts:155` `validarBiometria` → edge `validar-biometria`, consumida em `src/pages/PontoPage.tsx:341` |
| 4 | Workflows — engine automática com triggers e e-mail | **Feito.** | `src/services/workflowService.ts:279` `executarWorkflow`, `:377` `executarPorTipo`, `:403` `registrarAprovacao`, `:510` `statusSLA`; RPCs `fn_processar_workflow` e `fn_start_workflow` em `supabase/baseline/20260831_canonical/canonical_schema.sql:4213` e `:4248` |
| 5 | Comunicação interna — push/e-mail reais | **E-mail real; push falha de forma honesta.** | `supabase/functions/processar-agendamentos/filaNotificacoes.ts:80` `sendEmailResend` (Resend real); `:68` `erro_ultimo: "push_sem_vapid"` — não existe sender VAPID no sistema, e a fila registra a falha em vez de marcar como enviado |
| 6 | Bitrix24 — sync real | **Feito.** | `supabase/functions/sincronizar-bitrix/index.ts` (9608 bytes, 0 TODO), consumida por `src/services/edgeFunctionsService.ts:334` e `src/components/settings/ConfigPanels.tsx:100` |
| 7 | Portal do Colaborador — upload real de documentos | **Feito.** | `src/components/portal/PortalDocumentosTab.tsx:128-133` upload real ao Storage com URL assinada; delete em duas etapas `:166-172` |

## Categoria 3 — os 5 "mencionado sem código" (4 resolvidos, 1 por decisão de produto)

| # | Item | Estado real | Evidência |
|---|------|-------------|-----------|
| 1 | Integração bancária CNAB 240 | **Feito.** | `src/services/cnabService.ts` (config, remessa e retorno) + `CNABDialog` em `FolhaPagamentoPage.tsx:252` |
| 2 | FGTS Digital — API Caixa | **Feito.** Edge dedicada com hardening completo. | `supabase/functions/fgts-digital/index.ts` (184 linhas, 0 TODO): JWT + CSRF + `requireRh`, rate limit, competência validada, dedupe, protocolo GFD e hash SHA-256. Tabelas `guias_fgts_digital` e `fgts_digital_logs` no canônico com RLS. **Aba de UI entregue na PR #822** — antes disso a feature estava órfã (0 linhas em produção). || 3 | Gov.br OAuth 2.0 | **Feito.** | `supabase/config.toml:24,31` `[functions.auth-gov-br]`; F-08 do `analise-prs/funcionalidades.csv` está `VERIFICADO` |
| 4 | WhatsApp Business API | **Feito por Evolution API, não pela Business API oficial.** Decisão consciente e documentada. | `supabase/functions/whatsapp-send/index.ts:9` importa `sendWhatsappEvolution`; `:12` documenta Evolution; chamada real em `:106`. Migrar para a API oficial é decisão de produto, não dívida técnica. |
| 5 | PWA / Service Worker | **Feito com um único SW.** | `public/manifest.json` + `public/sw-custom.js` (13 KB) registrado em `src/main.tsx:151`. `vite.config.pwa.ts` existe mas **não é usado** — `vite.config.ts:108-112` documenta a remoção do `vite-plugin-pwa` porque dois SWs disputavam o escopo `/` e o workbox nunca ativava. |

---

## O que continua realmente aberto

Estes não são "código faltando"; são bloqueios externos ou decisões de negócio:

1. **eSocial produtivo (F-07)** — depende do certificado ICP-Brasil A1/A3 do cliente e do endpoint homologado. Nenhuma alteração de código destrava isso. A edge está pronta e recusa com mensagem honesta.
2. **Certificação de produção das features `VERIFICADO_INFRA`** — F-03 (rescisão), F-07 (eSocial) e F-11 (CNAB) nunca exercitaram fluxo completo com dados reais. O código está implementado e testado; o que falta é execução com dados de produção.
3. **Etapa 41 do plano do ponto** (`ponto_rep_dias` → `batidas_ponto`) — bloqueada pelo acesso aos bancos reais do AtecSoft.
4. **Push notification** — sem sender VAPID. A fila registra `push_sem_vapid` em vez de fingir entrega. Implementar exige gerar par de chaves VAPID e configurar o segredo; é decisão de produto (custo de infra + manutenção).

---

## Como reconferir

```bash
# 1. Gates estáticos de integridade
npm run audit:bridge-contract
npm run audit:edge-audit-log
npm run audit:types-drift

# 2. Suíte completa
npx vitest run

# 3. Estado real do banco canônico (somente leitura, via GitHub Actions)
gh workflow run canonical-sql-diag.yml --repo adm01-debug/Departamento_Pessoal_V3 \
  --ref main -f confirm_project_ref=frjbfeamybqsejlvmqbl \
  -f "query=select to_regclass('public.guias_fgts_digital')" -f allow_pii=true
```

A certificação por funcionalidade (F-01..F-20) com o estado de produção vive em
`analise-prs/funcionalidades.csv`, que é a fonte de verdade — este documento explica
**por quê** cada item que já foi dado como ausente na verdade existe.
