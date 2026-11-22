# Análise de funcionalidades pendentes — estado real certificado

**Original:** 02/04/2026 (análise estática de código)
**Revisão exaustiva:** 22/11/2026 — cada linha abaixo foi reverificada no código e, quando aplicável, no banco canônico (`frjbfeamybqsejlvmqbl`).

> Este documento substitui a versão de 02/04/2026, que listava 12 itens como ausentes.
> Desses 12, **7 estavam de fato implementados** na época desta revisão. Os outros 5
> são stubs ou parciais, e estão marcados como tal abaixo. As tabelas dão arquivo:linha
> do consumidor, que é o que prova funcionalidade integrada — não a existência de um
> arquivo solto.

---

## Categoria 2 — os 7 "pendentes" (todos resolvidos)

| #   | Item                                              | Estado real                                                                                                                    | Evidência (arquivo:linha)                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | eSocial — envio real ao governo                   | **Não feito.** A edge recusa com 503 fora do `SIMULATE`: falta o cliente SOAP e a assinatura ICP-Brasil, não só o certificado. | `supabase/functions/enviar-esocial/index.ts:145-156` — comentário explícito "Esta versão não possui cliente SOAP nem assinatura ICP-Brasil real" + `if (!SIMULATE) return 503 ESOCIAL_TRANSPORT_UNAVAILABLE`. O transporte governamental inteiro está ausente, não apenas a credencial.                                                                                                                |
| 2   | Folha — integração bancária de pagamento          | **Arquivo gerado, envio manual.** Não é integração com o banco.                                                                | `src/pages/FolhaPagamentoPage.tsx:251` monta `<PagamentoBancarioWizard folhaId={resumo.id} />`, mas o wizard (`src/components/folha/PagamentoBancarioWizard.tsx:37-53`) gera o lote PIX/CNAB e baixa o arquivo; o toast pede envio manual pelo internet banking. Nenhuma chamada de API bancária existe.                                                                                               |
| 3   | Ponto — biometria / reconhecimento facial         | **Feito.**                                                                                                                     | `src/services/pontoService.ts:155` `validarBiometria` → edge `validar-biometria`, consumida em `src/pages/PontoPage.tsx:341`                                                                                                                                                                                                                                                                           |
| 4   | Workflows — engine automática com triggers        | **Feito, sem e-mail.** Não há envio de e-mail no engine; notificação sai por outro caminho.                                    | `src/services/workflowService.ts:279` `executarWorkflow`, `:377` `executarPorTipo`, `:403` `registrarAprovacao`, `:510` `statusSLA`; RPCs `fn_processar_workflow` e `fn_start_workflow` em `supabase/baseline/20260831_canonical/canonical_schema.sql:4213` e `:4248`. `grep -i 'email\|resend'` em `workflowService.ts` retorna vazio — os triggers do schema só ajustam `updated_at`/abrem execução. |
| 5   | Comunicação interna — push/e-mail reais           | **E-mail real; push falha de forma honesta.**                                                                                  | `supabase/functions/processar-agendamentos/filaNotificacoes.ts:80` `sendEmailResend` (Resend real); `:68` `erro_ultimo: "push_sem_vapid"` — não existe sender VAPID no sistema, e a fila registra a falha em vez de marcar como enviado                                                                                                                                                                |
| 6   | Bitrix24 — sync real                              | **Feito.** Departamentos, colaboradores e cargos sincronizam de verdade.                                                       | `supabase/functions/sincronizar-bitrix/index.ts` — `departamentos` e `colaboradores` por upsert real; **cargos resolvido na PR #825** (lê `WORK_POSITION`/`POSITION` dos usuários ativos): `:176-215` (o stub que só devolvia uma nota foi substituído na PR #825).                                                                                                                                    |
| 7   | Portal do Colaborador — upload real de documentos | **Feito.**                                                                                                                     | `src/components/portal/PortalDocumentosTab.tsx:128-133` upload real ao Storage com URL assinada; delete em duas etapas `:166-172`                                                                                                                                                                                                                                                                      |

## Categoria 3 — os 5 "mencionado sem código" (4 resolvidos, 1 por decisão de produto)

| #   | Item                         | Estado real                                                                                   | Evidência                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Integração bancária CNAB 240 | **Feito.**                                                                                    | `src/services/cnabService.ts` (config, remessa e retorno) + `CNABDialog` em `FolhaPagamentoPage.tsx:252`                                                                                                                                                                                                                                                                                                   |
| 2   | FGTS Digital — API Caixa     | **Parcial: registro local, não integração com a Caixa.**                                      | `supabase/functions/fgts-digital/index.ts:118-141` calcula hash e **gera o protocolo localmente** (`FGD-${Date.now()}-${uuid}`) e faz insert em `guias_fgts_digital`; não há chamada HTTP à Caixa/GFD. Tabelas `guias_fgts_digital` e `fgts_digital_logs` no canônico com RLS. Aba de UI na PR #822 — antes dela a feature estava órfã (0 linhas em produção). O que falta é o cliente da API GFD, não UI. |
| 3   | Gov.br OAuth 2.0             | **Feito.**                                                                                    | Chamada real na tela de login: `src/pages/LoginPage.tsx:72-75` → edge `auth-gov-br`, declarada em `supabase/config.toml:24,31`; F-08 do `analise-prs/funcionalidades.csv` está `VERIFICADO`                                                                                                                                                                                                                |
| 4   | WhatsApp Business API        | **Feito por Evolution API, não pela Business API oficial.** Decisão consciente e documentada. | `supabase/functions/whatsapp-send/index.ts:9` importa `sendWhatsappEvolution`; `:12` documenta Evolution; chamada real em `:106`. Migrar para a API oficial é decisão de produto, não dívida técnica.                                                                                                                                                                                                      |
| 5   | PWA / Service Worker         | **Feito com um único SW.**                                                                    | `public/manifest.json` + `public/sw-custom.js` (13 KB) registrado em `src/main.tsx:151`. `vite.config.pwa.ts` existe mas **não é usado** — `vite.config.ts:108-112` documenta a remoção do `vite-plugin-pwa` porque dois SWs disputavam o escopo `/` e o workbox nunca ativava.                                                                                                                            |

---

## O que continua realmente aberto

Bloqueios externos, decisões de negócio e — os que o Devin Review apontou nesta PR —
stubs que a análise anterior tratava como concluídos:

1. **eSocial produtivo (F-07)** — falta o cliente SOAP + assinatura ICP-Brasil (não só a credencial) e o endpoint homologado. `enviar-esocial/index.ts:148-156`. Código de transporte é trabalho a fazer.
2. **FGTS Digital — cliente da API GFD da Caixa** — a edge só registra a guia localmente (`fgts-digital/index.ts:118-141`). Precisa do cliente HTTP oficial e das credenciais de integração. A UI já existe (#822).
3. ~~**Bitrix24 — sync de cargos**~~ — **Resolvido em 22/11/2026** (PR #825). O ramo lê `WORK_POSITION`/`POSITION` do `user.get` de usuários ativos e faz lookup por nome na empresa (reativa ou insere), porque `cargos` não tem unique em `(empresa_id, nome)` — um `upsert` com esse `onConflict` falharia em runtime.
4. **Envio bancário automático** — `PagamentoBancarioWizard.tsx:37-53` gera e baixa o arquivo; o pagamento é manual pelo internet banking. Integração por API bancária é escopo novo.
5. **Workflow com e-mail** — o engine não envia e-mail (grep vazio em `workflowService.ts`). O canal real de e-mail vive em `processar-agendamentos/filaNotificacoes.ts:80` (Resend), não nos workflows.
6. **Certificação de produção das features `VERIFICADO_INFRA`** — F-03 (rescisão), F-07 (eSocial) e F-11 (CNAB) nunca exercitaram fluxo completo com dados reais.
7. **Etapa 41 do plano do ponto** (`ponto_rep_dias` → `batidas_ponto`) — bloqueada pelo acesso aos bancos reais do AtecSoft.
8. **Push notification** — sem sender VAPID. A fila registra `push_sem_vapid` em vez de fingir entrega. Exige par de chaves VAPID + secret; decisão de produto.

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
