# Runbook E-056 — Rotação de segredos

> Todo segredo impresso em log, commitado, ou trafegado fora de canal seguro é
> considerado **comprometido** e entra nesta fila. Rotação = gerar novo,
> distribuir, revogar antigo, verificar.

## 1. Inventário de segredos

| Segredo | Onde vive | Quem usa | Rotação |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (project frjbfeamybqsejlvmqbl) + secrets do GitHub + env das Edge Functions | Edge Functions, scripts admin | Trimestral ou sob suspeita |
| `SUPABASE_ANON_KEY` | Pública por natureza (frontend) | Frontend | Junto com service_role |
| `SUPABASE_DB_URL` | secrets do GitHub (`SUPABASE_DB_URL`), operadores | CI (gates), runbooks | Semestral ou sob suspeita |
| `EXTERNAL_DB_KEY` | env do external-db-bridge | bridge | Trimestral |
| `WEBHOOK_SECRET` | env da edge `webhook` + sistema emissor | webhooks HMAC | Semestral |
| `CRON_SECRET` | env das edges agendadas | pg_cron → edges | Semestral |
| `SENTRY_DSN` | env frontend/edges | observabilidade | Anual |
| **ACCESS_KEY do `migrate-helper`** | ⚠️ **estava commitada no repo** (`8775…a23f`) | ninguém (função removida em 30/08/2026) | **Revogar/rotacionar imediatamente** — ver §3 |

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

| Data | Segredo | Motivo | Executor |
|---|---|---|---|
| 2026-08-30 | migrate-helper ACCESS_KEY | A-015: commitada no repo (função removida) | — |
