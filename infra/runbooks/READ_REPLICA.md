# P4-068 — Read Replicas para Queries Analíticas

**Criado:** 2026-07-25
**Origem:** PLANO_MELHORIAS.md P4-068
**Esforço:** 3 dias (depende de infraestrutura)

---

## Quando Ativar

Ativar quando:
- `mv_folha_summary` demora > 3s para刷新
- Queries de dashboard com `LIMIT > 500` ou `COUNT` exato
- P95 latency do bridge > 2s em horas de pico

## Opções por Tier

### Supabase Pro/Team (cloud)

1. Ativar em: **Supabase Dashboard → Database → Replicas**
2. Adicionar ao `supabase/config.toml`:
   ```toml
   [replicas]
   default_replica = ["cloud-g1-replica"]
   ```
3. No bridge: queries com `count: 'exact'` OU `limit > 500` usam URL de replica
4. Feature flag: `BRIDGE_USE_REPLICA=true`

### Self-hosted (Docker/ARM)

1. Configurar PostgreSQL streaming replication (hot standby):
   ```bash
   # docker-compose.yml do Postgres standby
   command: postgres
     -c
     -primary_conninfo=host=db-primary
     -c
     -standby_mode=on
   ```
2. No `pgpool` ou `PgBouncer` do pooler: separar pool de leitura

## Código Bridge (feature-flag ready)

O código abaixo está preparado — ativar com `BRIDGE_USE_REPLICA=true`:

```typescript
// supabase/functions/external-db-bridge/index.ts

// P4-068: read replica
const REPLICA_URL = Deno.env.get('SUPABASE_REPLICA_URL');
const USE_REPLICA = Deno.env.get('BRIDGE_USE_REPLICA') === 'true';

// Queries analíticas vão para replica (somente-leitura)
const isAnalyticalQuery = (body: ParsedBody) =>
  body.countMode === 'exact' ||
  (body.limit ?? 0) > 500 ||
  body.action === 'rpc'; // RPCs pesadas (relatórios)

function createAnalyticalClient() {
  if (!REPLICA_URL) {
    console.warn('[bridge] BRIDGE_USE_REPLICA=true mas SUPABASE_REPLICA_URL não definido');
    return null;
  }
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  return createClient(REPLICA_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Na query select:
const useReplica = USE_REPLICA && isAnalyticalQuery(body);
const queryClient = useReplica
  ? createAnalyticalClient()
  : externalClient;

// Log qual client foi usado
console.info(`[bridge] ${useReplica ? '📖 REPLICA' : '🏠 PRIMARY'}: ${action}:${table ?? rpcName}`);
```

## Validação de Performance

```sql
-- Antes (primary):
EXPLAIN ANALYZE
SELECT ... FROM folhas f WHERE f.empresa_id = $1
  ORDER BY f.competencia DESC LIMIT 1000;

-- Depois (replica): same query deve ter latência menor
-- Meta: < 50% da latência da primary
```

## Métricas para Monitorar

| Métrica | Dashboard | Alerta |
|---------|----------|--------|
| `bridge_replica_latency_ms` | Datadog | P95 > 2s |
| `bridge_replica_errors_total` | Datadog | > 0 |
| `bridge_primary_vs_replica_ratio` | interno | se replica usada < 10% em pico |

## Riscos e Mitigações

| Risco | Prob | Impacto | Mitigação |
|-------|-----|---------|-----------|
| Replica atrás da primary | baixa | dados desatualizados | MV com refresh >= 5min; replicas síncronas se SLA exigir |
| Replica fora do ar | baixa | queries falham | fallback para primary com `USE_REPLICA=false` |
| Bridge tenta replica sem URL | baixa | warning no log | feature flag + null check |

## Checklist de Ativação

- [ ] Replica criada e sincronizada
- [ ] `SUPABASE_REPLICA_URL` configurado nas Edge Functions
- [ ] `BRIDGE_USE_REPLICA=true` em produção
- [ ] Query explain antes/depois validado
- [ ] Dashboards Datadog criados
- [ ] Alertas configurados
