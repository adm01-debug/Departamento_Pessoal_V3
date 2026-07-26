# P4-069 — PgBouncer: Configuração para 100+ Tenants

**Criado:** 2026-07-25
**Origem:** PLANO_MELHORIAS.md P4-069
**Esforço:** 1 dia

---

## Auditoria do Estado Atual

O `supabase/config.toml` atual **não define PgBouncer customizado**.
Supabase usa PgBouncer padrão: `pool_mode = transaction`, `max_client_conn = 1000`.

Para **100+ empresas tenants**, os valores padrão são suficientes até ~200 connections.
Acima disso, tunar.

## Configurações Recomendadas

```ini
# /etc/pgbouncer/pgbouncer.ini  (self-hosted)
# ou via Supabase Dashboard → Database → Connection Pooling (Pro)

[databases]
; Aponta para o Postgres principal
db-prod = host=db-primary port=5432 dbname=postgres

[pgbouncer]
; Pool mode: transaction é ideal para Supabase (RLS + много tenants)
pool_mode = transaction

; Connections ao Postgres (ajustar conforme RAM do server)
max_db_connections = 200        ; era: 100 (muito baixo para 100 tenants)
default_pool_size = 25          ; connections por (user, database, host)

; Clientes
max_client_conn = 2000          ; era: 1000 ( enough for 100 tenants)
reserve_pool_size = 10          ; overflow para spikes
reserve_pool_timeout = 3        ; segundos antes de liberar reserva

; Timeouts (evita connections órfãs)
server_idle_timeout = 600       ; 10min sem query → libera connection
server_connect_timeout = 15     ; tempo max para handshake
server_login_retry = 3         ; retries ao reconectar

; Query timeout (protege contra queries travadas)
query_timeout = 60              ; queries > 60s são cortadas (edge functions têm 60s timeout)
query_wait_timeout = 30         ; tempo máximo que uma query espera por connection

; Logs
log_connections = 0             ; desliga (muito ruído)
log_disconnections = 0
log_pooler_errors = 1
```

## Para Supabase Cloud (Pro Tier)

1. Dashboard → Database → Connection Pooling
2. Pool mode: **transaction** (não `session` — session causa vazamento de connections)
3. Pool size: **20** por default
4. Adicionar via environment variable (se suportado):
   ```
   POSTGRES_POOL_SIZE=20
   PGBOUNCER_MAX_CLIENT_CONN=2000
   ```

## Monitoramento (Datadog)

```bash
# Métricas PgBouncer para monitorar:
pgbouncer.active_connections        # conexões ativas (alerta > 90% de max_db_connections)
pgbouncer.waiters                   # queries esperando por connection (alerta > 10)
pgbouncer.max_client_conn           # clients simultâneos
pgbouncer.pool_mode                 # deve ser 'transaction'
```

**Alerta:** `waiters > 20 por 5min` → Aumentar `max_db_connections`.

## Cálculo de Conexões needed

```
max_connections_per_tenant × num_tenants × utilization_factor = min_max_db_connections

Exemplo (100 tenants):
  2 connections × 100 × 0.3 = 60 connections mínimas
  Com overhead: 100 connections (ok)
  Com 500 tenants: 2 × 500 × 0.3 = 300 connections → ajustar para 300+
```

## Validação

```sql
-- Ver utilização atual do pool (Superuser no Postgres):
SELECT * FROM pg_stat_activity
WHERE datname = 'postgres'
  AND state = 'idle in transaction'
ORDER BY query_start;

-- Queries travadas (> 5 min)
SELECT pid, now() - query_start AS duracao, state, query
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > INTERVAL '5 minutes'
ORDER BY duracao DESC;
```

## Checklist

- [ ] Pool mode definido como `transaction` (não `session`)
- [ ] `max_db_connections` >= `2 × num_tenants × 0.3`
- [ ] `max_client_conn` >= 2000
- [ ] `query_timeout` = 60 (sincronizado com timeout da Edge Function)
- [ ] Métricas Datadog configuradas
- [ ] Alerta `waiters > 20` criado
