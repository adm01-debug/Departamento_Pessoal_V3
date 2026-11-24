# Mapa de API — E-094

> Inventário das superfícies de API do sistema e estado de cada uma.
> Atualizado a cada mudança de edge function ou RPC pública.

## 1. PostgREST direto (via `external-db-bridge`)

O frontend **não** chama o PostgREST diretamente: toda leitura/escrita passa
pelo bridge (`POST /functions/v1/external-db-bridge`), que aplica:

- JWT obrigatório para writes (`insert/update/delete/upsert`) e RPCs fora da
  lista pública (`PUBLIC_RPCS` — login protection e onboarding);
- CSRF fail-closed em writes;
- `TABLE_DENYLIST` (tabelas sensíveis bloqueadas) + `RPC_ALLOWLIST`;
- tenant scope (`assertTenantScope` via `is_admin`/`user_belongs_to_empresa`);
- rate limit (100 reads/min autenticado, 20 anon, 30 writes/min);
- payload cap 256 KB, timeout 15 s, erros sanitizados (E-017).

## 2. Edge Functions

| Função | Auth | Estado | Nota |
|---|---|---|---|
| `external-db-bridge` | JWT p/ writes | ✅ ativa | gateway principal |
| `auth-login` | pública (`verify_jwt=false`, E-031) | ✅ ativa | rate limit + lockout |
| `webhook` | HMAC fail-closed (`verify_jwt=false`, E-030) | ✅ ativa | sem secret → 503 |
| `healthcheck` | pública (probe, E-029) | ✅ ativa | sem PII |
| `metrics` | pública (probe, E-029) | ⚠️ limitada | depende de views de telemetria |
| `calcular-folha`, `fechar-folha`, `calcular-13-salario`, `calcular-ferias`, `calcular-provisoes` | JWT + CSRF + authz + idempotência | ✅ núcleo fiscal | — |
| `gerar-holerite`, `distribuir-holerites`, `gerar-guias`, `cnab-remessa`, `pix-lote`, `fgts-digital`, `dctfweb`, `enviar-esocial` | JWT + CSRF | ✅ endurecidas | eSocial/FGTS/DCTF em modo simulação até credenciais |
| `processar-ponto`, `processar-ponto-offline`, `validar-biometria` | JWT + assinatura HMAC (offline) | 🟡 parcial | biometria real pendente |
| `sincronizar-bitrix` | JWT | 🟡 parcial | ver E-062…E-065 |
| `migrate-helper` | — | ❌ **removida** (A-015, 30/08/2026) | exfiltrava credenciais |

Demais funções: ver `docs/auditoria/estado/08-edge-functions.md` (inventário
completo das 60). Funções sem chamador há >90 dias são candidatas a sunset
(E-091/E-093).

## 3. RPCs públicas (sem JWT — chamadas pré-login)

`check_login_lock`, `record_failed_login`, `reset_login_attempts`,
`check_account_lockout`, `record_login_attempt`, `reset_account_lockout`,
`check_brute_force`, `check_rate_limit`, `is_ip_blocked`, `is_ip_whitelisted`,
`is_country_allowed`, `get_admissao_por_token`.

Todas: somente leitura/escrita nas próprias tabelas de proteção; revisão
trimestral desta lista (cada entrada é uma superfície pública).

## 4. Sunset e depreciação

| Candidata | Motivo | Ação |
|---|---|---|
| `metrics` | depende de views inexistentes em prod | reescrever ou remover em 2026-Q4 |
| RPCs legadas fora do allowlist | inacessíveis via bridge | remover do banco após inventário |
| Rotas legadas (E-040) | redirects acumulados | revisar acessos 30d antes de remover |
