# PENDENCIAS.md — Itens que dependem do Joaquim ou de ação externa

Data: 2026-10-28 · Contexto: verificação exaustiva dos docs (5 agentes V1–V5) contra a main + estado do canônico

## URGENTE — bloqueia deploy de edge functions

- **`SUPABASE_ACCESS_TOKEN` expirado** — todo deploy de edges no canônico falha com `401: Invalid access token` (último: run [40768419757](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/40768419757)). Sem isso as edges novas/atualizadas não sobem (`gerar-afd`, `calcular-folha` com Lei 15.270, `calcular-ferias` com médias, `processar-ponto`). **Ação:**
  1. Gerar token novo em https://supabase.com/dashboard/account/tokens
  2. GitHub → Departamento_Pessoal_V3 → **Settings → Environments → production** → atualizar o secret `SUPABASE_ACCESS_TOKEN`
  3. Avisar que o deploy é re-disparado — sem mexer em código.

## Resolvido nesta rodada (28/10)

- ✅ **Migrations no canônico**: 29/29 versões no ledger, todos os ~80 invariantes verdes — run [40770859012](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/40770859012) (inclui espelho holerites `20261012120000` e `gaps_v2_verificacao` 20261029000000)
- ✅ **PR #311** — 10 gaps Folha/Fiscal (Lei 15.270, motores alinhados, lançamentos manuais, emitirPDF real)
- ✅ **PR #312** — 5 gaps ponto/férias (configs gravando, escalas alimentam o motor, férias c/ médias+art.130+persistência, recibos_ferias, AFD novo + mapa real + flag facial)
- ✅ **PR #310** — docs fantasma removidos + toast falso FGTS
- ✅ **PR #324/#325** — assert do canônico alinhado ao contrato count(); `salvarGrade` bridge-safe
- ✅ **PR #326** — este arquivo

## Dependências que só o Joaquim executa

| Item                                       | Motivo                                                                                                                                                                         | Ação necessária                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Env vars do Supabase na Vercel             | Build de produção sai sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` → `client.ts` lança exceção no import e o React nunca monta (tela branca para todos os usuários) | 1) GitHub → Settings → Secrets and variables → Actions → aba Variables — copiar os 2 valores. 2) Vercel → projeto `departamento-pessoal-v3` → Settings → Environment Variables — criar as duas (Production). 3) Redeploy. Depois disso `post-deploy-smoke` e o site voltam |
| `E2E_TOTP_SECRET` desatualizado            | `admin@teste.local` agora exige TOTP e o seed do secret não bate → E2E autenticado falha no login                                                                              | GitHub → Settings → Secrets → Actions → atualizar `E2E_TOTP_SECRET` com o seed atual da conta                                                                                                                                                                              |
| Vincular `admin@teste.local` a uma empresa | Sem empresa, writes do E2E retornam 403 — caminho de escrita não provado                                                                                                       | Vincular a conta a uma empresa com papel admin/rh                                                                                                                                                                                                                          |
| Chaves Turnstile, pen test, 2º CODEOWNER   | Administrativo, fora do repo                                                                                                                                                   | Conforme combinado em sessões anteriores                                                                                                                                                                                                                                   |

## Gaps reais restantes do levantamento (backlog de engenharia — não bloqueiam operação)

Consolidado dos 5 agentes de verificação (V1 Folha/Fiscal, V2 Ponto/Férias, V3 Admissão/Rescisão/Pagamentos, V4 Segurança/LGPD, V5 UI/Comunicação/Infra):

**Rescisão/eSocial (V3)**

- `DesligamentoDetailSheet.handleCalcular` chama o motor com defaults fixos (`aviso_trabalhado:false`, `ferias_vencidas:false`, `saldo_fgts:0`) — pede os dados reais do colaborador
- RPC `pagar_desligamento` existe mas revogada de `authenticated` e sem caller — decidir ligar ou remover
- TRCT não segue layout Homolognet
- GRRF: tabela existe mas órfã (sem gerador)
- S-2299: XML serializer cai no fallback CDATA
- Botão `DetalhesAdmissaoDialog.tsx` chama `enviarEvento({eventoId: admissao.id})` — sempre falha

**Pagamentos/integrações (V3/V5)**

- Pré-admissão: e-mail nunca é enviado (toast mente "enviado")
- gov.br login quebrado (edge exige JWT + `data.profile.nivel` vs `data.nivel` no AuthCallbackPage)
- `gerar-contrato-pdf`: `gerarPdf` sem caller — infra existe, nada invoca
- Edges `cnab-remessa`/`pix-lote` órfãs; PIX é CSV-only
- OCR de documentos depende de `LOVABLE_API_KEY` (não provisionada)
- Filas sem consumidor: `fila_notificacoes`, `whatsapp_mensagens_logs` (pending_trigger), holerite por e-mail/whatsapp; Resend real mas remetente `onboarding@resend.dev`; sem VAPID push
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

- Wizard de cálculo: bridge `.maybeSingle()` falha em `folhas_pagamento` (bug antigo)
- "Nova Rubrica" omite `empresa_id` — sempre erro na UI
- Biometria: só `foto_biometria_url` (sem WebAuthn)
- Órfãos §8.3: esocialEventosPeriodicos/SST, esocialValidators, MetabaseEmbed, LanguageSelector, evaluationPDF, provisoesService, automacaoService, cnabLayoutService, dominioService, calcularFolhaCompleta, specs e2e fuzz/audit
- Docs mentirosos §10: docs/api (37), README clones v2, netlify.toml, nginx.conf → api:3001

## Decisões registradas (não reabrir)

- **CPF em claro via API**: mantido — qualquer usuário autenticado da empresa lê CPFs (decisão do Joaquim, 28/10)
- **`is_admin` global** enxerga todas as empresas: desenho atual, manter
