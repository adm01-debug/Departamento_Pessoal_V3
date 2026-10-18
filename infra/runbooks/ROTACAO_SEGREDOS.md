# Runbook E-056 — Rotação de segredos

> Todo segredo impresso em log, commitado, ou trafegado fora de canal seguro é
> considerado **comprometido** e entra nesta fila. Rotação = gerar novo,
> distribuir, revogar antigo, verificar.

## 1. Inventário de segredos

| Segredo                            | Onde vive                                                                            | Quem usa                                                   | Rotação                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`        | Supabase (project frjbfeamybqsejlvmqbl) + secrets do GitHub + env das Edge Functions | Edge Functions, scripts admin                              | Trimestral ou sob suspeita                    |
| `SUPABASE_ANON_KEY`                | Pública por natureza (frontend)                                                      | Frontend                                                   | Junto com service_role                        |
| `SUPABASE_DB_URL`                  | secrets do GitHub (`SUPABASE_DB_URL`), operadores                                    | CI (gates), runbooks                                       | Semestral ou sob suspeita                     |
| `EXTERNAL_DB_KEY`                  | env do external-db-bridge                                                            | bridge                                                     | Trimestral                                    |
| `WEBHOOK_SECRET`                   | env da edge `webhook` + sistema emissor                                              | webhooks HMAC                                              | Semestral                                     |
| `CRON_SECRET`                      | env das edges agendadas                                                              | pg_cron → edges                                            | Semestral                                     |
| `REPORT_SCHEDULER_SECRET`          | env de `processar-agendamentos` e `enviar-relatorio`                                 | autentica somente o salto interno de entrega de relatórios | Semestral ou sob suspeita                     |
| `SENTRY_DSN`                       | env frontend/edges                                                                   | observabilidade                                            | Anual                                         |
| **ACCESS_KEY do `migrate-helper`** | ⚠️ **estava commitada no repo** (`8775…a23f`)                                        | ninguém (função removida em 30/08/2026)                    | **Revogar/rotacionar imediatamente** — ver §3 |

## 2. Procedimento padrão (por segredo)

1. **Gerar** novo valor no provedor (Supabase: Settings → API → Reset).
2. **Distribuir**: atualizar GitHub Secrets e env das Edge Functions
   (`supabase secrets set CHAVE=valor` — nunca em arquivo, issue ou chat).
3. **Revogar** o valor antigo.
4. **Verificar**: CI verde + smoke (login, bridge write autenticado, webhook).
5. **Registrar** data/executor/motivo no log de segurança (§5).

## 3. Incidente A-015 — ACCESS_KEY do migrate-helper (30/08/2026)

A edge temporária `migrate-helper` continha:

- `ACCESS_KEY` hardcoded (`8775732b…a23f`) — **em texto claro no histórico git**;
- endpoint `?action=credentials` que devolvia `SUPABASE_SERVICE_ROLE_KEY` e
  `SUPABASE_DB_URL` a quem apresentasse a chave;
- `verify_jwt = false` e CORS `*`.

**Status no repo:** função removida e entrada removida de `config.toml`.

**Ações pendentes (manuais, fora do repo):**

1. [ ] Confirmar que a função não está deployada (Supabase → Edge Functions;
       se estiver, deletar no painel — remover do repo não desfaz deploy).
2. [ ] Tratar `SERVICE_ROLE_KEY` e `DB_URL` como potencialmente expostos
       (a chave estava pública no histórico) → executar rotação do §2.
3. [ ] Revisar logs de acesso da função no período em que esteve deployada.

## 4. Regras permanentes

- Nenhum segredo em código, teste, doc ou comentário. CI bloqueia via
  gitleaks (`.github/workflows/security.yml`).
- Chaves de acesso a edge functions internas vivem em env, nunca em constante.
- Segredo em log → rotação imediata + registro, sem exceção.

## 5. Log de rotações

| Data       | Segredo                   | Motivo                                     | Executor |
| ---------- | ------------------------- | ------------------------------------------ | -------- |
| 2026-08-30 | migrate-helper ACCESS_KEY | A-015: commitada no repo (função removida) | —        |

## 6. Incidente A-016 — Resultados de SQL canônico em logs públicos de CI (18/10/2026)

**Descrição:** Antes da implementação de W27 (PR #247), o workflow `canonical-sql-diag.yml`
imprimia os resultados de queries SQL diretamente nos logs do GitHub Actions, sem filtragem de PII.
Qualquer query executada contra o banco canônico (schema `public`) produzia saída visível nos
logs públicos do repositório.

**Escopo:** 38 runs do `canonical-sql-diag.yml` + 50 runs do `canonical-migrations.yml` +
11 runs do `canonical-probes.yml` = **99 runs com logs potencialmente contendo dados de
tabelas do schema public do banco canônico.**

**Dados canônicos:** O banco canônico usa CNPJ `00000000000191` e dados sintéticos/mock
criados para validação de design (conforme documentado em CLAUDE.md, Sessão 9). CPFs,
nomes, salários e dados bancários são **fictícios** — sem exposição de PII real.

**Ação tomada (18/10/2026):**

- Logs de todos os 99 runs deletados via API (`DELETE /repos/…/actions/runs/{id}/logs`).
- W27 implementado: queries ao schema `public` agora exigem `allow_pii=true` e o resultado
  vai para artifact privado (retenção 1 dia), nunca para os logs de CI.

**Status:** Risco residual zero para dados reais (dados são mock/sintéticos). Logs deletados.

**Pendência:** W25 — mover `SUPABASE_DB_URL` para o environment `production` e apagar
o secret de repositório (impede acesso de forks ao banco canônico).
