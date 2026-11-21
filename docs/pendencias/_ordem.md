# Pendencias — Estado Verificado (backlog executável)

Gerado em 2026-11-21 a partir de inspeção real (código + banco canônico). Cada item tem estado: `OK` (incorporado/deny-all intencional), `FEITO` (corrigido), `PENDENTE` (executar).

## Resumo

- Itens da auditoria re-verificados contra o estado real: várias "pendências" documentadas já estavam resolvidas na main.
- Correção nova nesta rodada: `empresa_id` em rubricas_folha (PR #772, mergeada).

## Itens verificados como OK (não são mais pendentes)

| Item                                                                                                                                                                                                     | Evidência                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Migrations drifts #499/#528/#529/#530                                                                                                                                                                    | MERGED em main                                                                                                            |
| Menu `/faltas` e `/centros-custo`                                                                                                                                                                        | Já existem em `AppSidebar.tsx`                                                                                            |
| 16 tabelas RLS-on sem policy (cnab_sequencias, colaboradores_pin, dp_audit_log__, medidas_ciencia_tokens, ninebox_permissoes_homologacao, pii_access_alerts, report_dispatch_attempts, training_image__) | Deny-all intencional — escritas só via edge functions com service_role/admin                                              |
| migration `colaborador_lotacoes`                                                                                                                                                                         | `20260929120000` no ledger; tabela existe; `TrabalhoHierarquiaTab.tsx` consome via `useColaboradorLotacao.ts`             |
| busca CPF/matrícula na calculadora de rescisão                                                                                                                                                           | `[nome_completo, matricula, cpf_last4].join(' ')` em `CalculadoraRescisaoPage.tsx`                                        |
| `catalogo_cursos.metadata`                                                                                                                                                                               | `fn_auto_generate_training_certificate` não lê o catálogo (fix #499 alterou a função) — `FUNCTION_OK_NO_METADATA_READ`    |
| `logs_sistema`                                                                                                                                                                                           | **Vivo** — 6 registros total, 5 nos últimos 7 dias (query no canônico). A auditoria dizia "morto/1 por 7d", desatualizado |
| policy UPDATE do gestor em ferias (`ferias_gestor_update`)                                                                                          | Aplicada no canônico — migration `20261119130000` no ledger; policy UPDATE com `pode_gerir_pessoas`. A parte de `folhas_pagamento` descartada de propósito: sem fluxo de gestor que escreva nela (escrita é RH via service_role) |
| SENTRY_RELEASE / VITE_E2E_BYPASS_MFA                                                                                                                                                                     | Toggles env intencionais (release tracking e bypass p/ e2e), não toggles de produção                                      |

## FEITO nesta rodada

| Item                                                                                    | PR          |
| --------------------------------------------------------------------------------------- | ----------- |
| Insert/update/delete de `rubricas_folha` omitia `empresa_id` (falha na UI p/ não-admin) | #772 MERGED |

## PENDENTE (próximas rodadas)

| Item                                                                               | Ação             | Arquivo/camada                 |
| ---------------------------------------------------------------------------------- | ---------------- | ------------------------------ |
| Confirmar deploy pós-merge p/ cada regressão                                       | Smoke pós-deploy | CI                             |
| Auditoria `logs_sistema` — ampliar hooks p/ mutações críticas (volume baixo: 5/7d) | a definir        | backend/edge                   |
| eSocial F-07 transporte real — edge enviar-esocial recusa envio produtivo (503) sem SOAP/ICP-Brasil; 0 eventos/0 lotes/0 certificados em prod | configurar certificado A1/A3 + endpoint SOAP homologado (exige ICP-Brasil do cliente) | enviar-esocial/index.ts / canônico certificados_digitais |
