# PENDENCIAS.md — Itens que dependem do Joaquim ou de ação externa

Data: 2026-10-28 · Contexto: verificação exaustiva dos docs (5 agentes V1–V5) contra a main + estado do canônico; + execução dos gaps V3 (PRs #309, #313, #317)

## Depois de mergear os PRs V3 — ações pendentes

| Item                                                                                                            | Por quê                                                                                          | Ação                                                                                                            |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Aplicar migrations `20261028220000_pagar_desligamento_transacional` e `20261028230000_govbr_auth_state_user_id` | As RPCs/telas novas quebram sem elas                                                             | Rodar `canonical-migrations.yml` (dispatch manual) após o merge dos PRs #313 e #317                             |
| Deploy das edges `enviar-email-admissao`, `auth-gov-br`, `enviar-esocial`                                       | Mudanças de edge só valem após deploy no canônico                                                | `canonical-edge-functions.yml` roda sozinho no push que tocar `supabase/functions/` — conferir o run após merge |
| Secret `RESEND_API_KEY` no Supabase                                                                             | Sem ela o e-mail de pré-admissão não sai — o app copia o link e avisa "provedor não configurado" | Criar conta gratuita em resend.com → API key → Supabase Dashboard → Edge Functions → Secrets → `RESEND_API_KEY` |
| Secrets `GOVBR_CLIENT_ID` + `GOVBR_CLIENT_SECRET`                                                               | Sem credenciais o login gov.br responde 503 "não configurado"                                    | Cadastrar o sistema no [gov.br/servicos](https://sso.acesso.gov.br/) e criar os dois secrets no Supabase        |
| `LOVABLE_API_KEY` (OCR) e Evolution API (WhatsApp)                                                              | OCR e envio WhatsApp dependem de credenciais externas já existentes no projeto                   | Confirmar se os secrets estão configurados no Supabase do canônico                                              |

## Não implementado — depende de fornecedor/escopo maior

| Item                                  | Situação                                                                                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assinatura ICP-Brasil no contrato     | Hoje a assinatura é hash+CPF+IP (válida como assinatura eletrônica simples). ICP-Brasil exige provedor pago (ex.: Clicksign, D4Sign, DocuSign) — decisão de fornecedor do Joaquim |
| API bancária / conciliação de extrato | PIX continua CSV-only e CNAB segue envio manual ao banco. Integração exige escolha de PSP (ex.: API PIX do banco, Belvo/Pluggy para extrato) e contrato                           |
| Edges `cnab-remessa`/`pix-lote` órfãs | A geração de remessa é client-side hoje; as edges existem sem chamador — candidatas a remoção ou a wiring quando houver API bancária. Não deletei nesta rodada                    |
| Guia de seguro-desemprego             | O motor informa elegibilidade/parcelas; o requerimento em si é feito no portal gov.br/CTPS Digital — registrado como gap documental                                               |
| TRCT modelo Homolognet                | O PDF gerado tem todas as rubricas e selo de auditoria, mas não replica o formulário oficial Homolognet — a tabela `trct` agora registra a emissão no pagamento                   |
| GRRF (guia física)                    | A tabela `grrf` agora registra a obrigação pendente no pagamento; emitir a guia segue manual na Caixa/FGTS Digital                                                                |

---

## URGENTE — bloqueia deploy de edge functions

- **`SUPABASE_ACCESS_TOKEN` expirado** — todo deploy de edges no canônico falha com `401: Invalid access token` (último: run [40768419757](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/40768419757)). Sem isso as edges novas/atualizadas não sobem (`gerar-afd`, `calcular-folha` com Lei 15.270, `calcular-ferias` com médias, `processar-ponto`). **Ação:**
  1. Gerar token novo em https://supabase.com/dashboard/account/tokens
  2. GitHub → Departamento_Pessoal_V3 → **Settings → Environments → production** → atualizar o secret `SUPABASE_ACCESS_TOKEN`
  3. **Re-disparar o deploy**: Actions → "Canonical Supabase — Edge Functions" → Run workflow (branch main) — ou me avisar que eu disparo. Atualizar o secret **não** republica nada sozinho; sem re-dispatch as edges pendentes não sobem.

## Resolvido nesta rodada (28/10)

- ✅ **Migrations no canônico**: 29/29 versões no ledger, todos os ~80 invariantes verdes — run [40770859012](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/40770859012) (inclui espelho holerites `20261012120000` e `gaps_v2_verificacao` 20261029000000)
- ✅ **PR #311** — 10 gaps Folha/Fiscal (Lei 15.270, motores alinhados, lançamentos manuais, emitirPDF real)
- ✅ **PR #312** — 5 gaps ponto/férias (configs gravando, escalas alimentam o motor, férias c/ médias+art.130+persistência, recibos_ferias, AFD novo + mapa real + flag facial)
- ✅ **PR #310** — docs fantasma removidos + toast falso FGTS
- ✅ **PR #324/#325** — assert do canônico alinhado ao contrato count(); `salvarGrade` bridge-safe
- ✅ **PR #323** — consumidores reais das 3 filas de comunicação (drenar fila_notificacoes via Resend, holerite por e-mail/whatsapp com status honesto, `pending_trigger` aposentado)
- ✅ **PR #326/#327** — este arquivo

## Dependências que só o Joaquim executa

| Item                                       | Motivo                                                                                                                                                                         | Ação necessária                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Env vars do Supabase na Vercel             | Build de produção sai sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` → `client.ts` lança exceção no import e o React nunca monta (tela branca para todos os usuários) | 1) GitHub → Settings → Secrets and variables → Actions → aba Variables — copiar os 2 valores. 2) Vercel → projeto `departamento-pessoal-v3` → Settings → Environment Variables — criar as duas (Production). 3) Redeploy. Depois disso `post-deploy-smoke` e o site voltam |
| `E2E_TOTP_SECRET` desatualizado            | `admin@teste.local` agora exige TOTP e o seed do secret não bate → E2E autenticado falha no login                                                                              | GitHub → Settings → Secrets → Actions → atualizar `E2E_TOTP_SECRET` com o seed atual da conta                                                                                                                                                                              |
| Vincular `admin@teste.local` a uma empresa | Sem empresa, writes do E2E retornam 403. O `ensure-fixtures` do e2e.yml pressupõe vínculo permanente (W58/W59)                                                                 | **Verificar primeiro** se o vínculo segue ativo; se perdido, re-vincular a conta a uma empresa com papel admin/rh                                                                                                                                                          |
| `canonical-sql-diag`                       | Último erro conhecido: `permission denied to set role "ci_auditor"` — saiu da lista sem confirmação de correção                                                                | Rodar um dispatch de teste do workflow para confirmar se segue quebrado                                                                                                                                                                                                    |
| Chaves Turnstile, pen test, 2º CODEOWNER   | Administrativo, fora do repo                                                                                                                                                   | Conforme combinado em sessões anteriores                                                                                                                                                                                                                                   |

## Gaps reais restantes do levantamento (backlog de engenharia)

> Itens marcados com ⚠️ **quebram um fluxo visível ao usuário** — não são cosméticos.

Consolidado dos 5 agentes de verificação (V1 Folha/Fiscal, V2 Ponto/Férias, V3 Admissão/Rescisão/Pagamentos, V4 Segurança/LGPD, V5 UI/Comunicação/Infra):

**Rescisão/eSocial (V3)**

- `DesligamentoDetailSheet.handleCalcular` chama o motor com defaults fixos (`aviso_trabalhado:false`, `ferias_vencidas:false`, `saldo_fgts:0`) — **corrigido no PR #313** (card "Parâmetros do Cálculo")
- RPC `pagar_desligamento` existe mas revogada de `authenticated` e sem caller — **corrigido no PR #313** (migration nova + chamada no `processarPagamento`)
- TRCT não segue layout Homolognet — `trct` passa a registrar a emissão no PR #313; layout Homolognet segue pendente
- GRRF: tabela existe mas órfã — passa a registrar a obrigação pendente no PR #313; guia física segue manual
- S-2299: XML serializer cai no fallback CDATA — **corrigido no PR #317** (leiaute real)
- ⚠️ Botão `DetalhesAdmissaoDialog.tsx` chama `enviarEvento({eventoId: admissao.id})` — sempre falha → **corrigido no PR #309** (fluxo claim-based)

**Pagamentos/integrações (V3/V5)**

- ⚠️ Pré-admissão: e-mail nunca é enviado (toast mente "enviado") — **corrigido no PR #309** (edge `enviar-email-admissao`, Resend + fallback honesto)
- ⚠️ gov.br login quebrado (edge exige JWT + `data.profile.nivel` vs `data.nivel` no AuthCallbackPage) — **corrigido no PR #317** (login anônimo + campo correto)
- `gerar-contrato-pdf`: `gerarPdf` sem caller — **corrigido no PR #309** (botão no diálogo da admissão)
- Edges `cnab-remessa`/`pix-lote` órfãs; PIX é CSV-only — mantido, documentado acima em "Não implementado"
- OCR de documentos depende de `LOVABLE_API_KEY` (não provisionada)
- ~~Filas sem consumidor~~ → **resolvido na [#323](https://github.com/adm01-debug/Departamento_Pessoal_V3/pull/323)** (drenar fila_notificacoes via Resend, holerite por e-mail/whatsapp com status honesto, `pending_trigger` aposentado). Restam: remetente Resend `onboarding@resend.dev` (domínio de teste) e ausência de push VAPID
- 0 `net.http_post` no banco — nenhuma automação dispara HTTP do DB
- `executarWorkflow` sem caller; backup real mas sem agendamento
- `aplicar_medida_folha_ponto` só no baseline (3 buckets sem migration)
- `/faltas` e `/centros-custo` sem item de menu

**Segurança/LGPD (V4)**

- `#8` `tabs.tsx` guarda senha do certificado .pfx em claro + datas inventadas
- `#33` external-db-bridge: denylist incompleta + `select=*` expõe PII (index.ts:~599)
- `#34` sem enforcement server-side de aal2/TOTP/CAPTCHA nas edges
- `#35` senha E2E `Admin@2026!` versionada no repo
- `#43` LGPD: sem RoPA/DPIA, score 5/8 hardcoded, retenção só em logs
- §6.14: sem headers nginx, gitleaks, SBOM, pentest (não iniciado)

**Outros (V1/V2/V5)**

- ⚠️ Wizard de cálculo: bridge `.maybeSingle()` falha em `folhas_pagamento` (bug antigo)
- ⚠️ "Nova Rubrica" omite `empresa_id` — sempre erro na UI
- Biometria: só `foto_biometria_url` (sem WebAuthn)
- Órfãos §8.3: esocialEventosPeriodicos/SST, esocialValidators, MetabaseEmbed, LanguageSelector, evaluationPDF, provisoesService, automacaoService, cnabLayoutService, dominioService, calcularFolhaCompleta, specs e2e fuzz/audit
- Docs mentirosos §10: docs/api (37), README clones v2, netlify.toml, nginx.conf → api:3001

## Decisões registradas (não reabrir)

- **CPF em claro via API**: mantido — qualquer usuário autenticado da empresa lê CPFs (decisão do Joaquim, 28/10)
- **`is_admin` global** enxerga todas as empresas: desenho atual, manter
