# BACKLOG — 2 Itens Restantes

**Última atualização:** 2026-08-28
**Total implementado:** 86/88 ✅
**Restantes:** 2 🔄
**Dependência:** Design de UX (P5-083) + credenciais de terceiros (P5-084/P5-086)

---

## 🔴 Prioridade por dependência

| Grupo | Itens | Dependência |
|---|---|---|
| **Código (local)** | P1-015, P1-017, P2-043, P2-045, P3-058 | Nenhuma — implementável agora |
| **Infraestrutura** | P4-072 | Supabase Pro tier ou Postgres direto |
| **Features externos** | P5-083, P5-084, P5-085, P5-086, P5-088 | Provedores terceiros |

---

## 🟠 P1-015 — ORDER BY validation no bridge (0,5 dia)

**Arquivo:** `supabase/functions/external-db-bridge/index.ts`
**Função:** `isSafeOrderColumn`

### Problema
`isSafeOrderColumn` valida a sintaxe do `order` via regex `^[a-zA-Z_][a-zA-Z0-9_.]*$` mas **não aceita direção** (`asc`/`desc`) nem `nullsfirst`/`nullslast`. PostgREST aceita `"created_at.desc.nullsfirst"` como string única.

### Implementação

```typescript
// Antes (incompleto)
const isSafeOrderColumn = (c: string) => /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(c);

// Depois
const ORDER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*(\.(asc|desc))?(\.(nullsfirst|nullslast))?$/;
const isSafeOrderColumn = (c: string) => ORDER_RE.test(c);

// Casos de teste:
isSafeOrderColumn('id')             // true
isSafeOrderColumn('id.desc')        // true
isSafeOrderColumn('id.asc.nullsfirst') // true
isSafeOrderColumn('id;DROP TABLE')  // false — SQLi bloquado
isSafeOrderColumn('id--comment')    // false
```

### Critério de aceite
- [ ] 5 casos de teste cobrindo válidos e inválidos
- [ ] `ORDER BY created_at.desc.nullsfirst` não quebra em produção
- [ ] Nenhuma regressão em queries existentes

---

## 🟠 P1-017 — RPC error details no log do bridge (0,5 dia)

**Arquivo:** `supabase/functions/_shared/rpc-error-logging.ts`

### Problema
RPC errors do PostgREST logam `error.message` mas **não logam `error.details` nem `error.hint`** — essenciais para debugging de violations, constraints e FK.

### Implementação

```typescript
// Já existe — verificar se está correto:
export function logRpcError(
  fn: string,
  error: unknown,
  ctx: Record<string, unknown> = {}
) {
  const err = toError(error);
  // Sanitização: remove CPF/CNPJ de details/hint antes de logar
  const sanitized = sanitizeForLogging(err.details ?? err.hint ?? '');
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'error',
    event: 'rpc_error',
    function: fn,
    message: err.message,
    details: sanitized,       // <-- adicionado
    hint: sanitized,          // <-- adicionado (pode ser igual)
    code: (err as { code?: string }).code,
    ...ctx,
  }));
}
```

### Critério de aceite
- [ ] `logRpcError` é chamado em todos os `catch` de RPC no bridge
- [ ] `details`/`hint` nunca retornam ao cliente (só log)
- [ ] CPF/CNPJ removidos de `details`/`hint` antes de logar

---

## 🟡 P2-043 — Tipagem de `as any` nos top-5 services (3 dias)

**Arquivos críticos:**

| Arquivo | `as any` count | Interface a criar |
|---|---|---|
| `colaboradorDetalhesService.ts` | 37 | `ColaboradorDetalhado`, `DependenteItem`, `ContatoEmergenciaItem` |
| `cnabService.ts` | 30 | `CNABHeader`, `CNABDetail`, `CNABTrailler` |
| `tabelasReferenciaService.ts` | 24 | `TabelaReferencia`, `TabelaReferenciaRow` |
| `tabelas/rhService.ts` | 20 | `RHRegistro`, `RHLancamento` |
| `useNovasTabelas.ts` (hook) | 23 | `BatidaPontoItem`, `MedidaDisciplinarItem`, `EpiItem` |

### Padrão de refatoração

```typescript
// ANTES
const data = await supabase.from('colaboradores_detalhes').select('*').eq('id', id);
const colaborador: any = data.data;  // 37 ocorrências

// DEPOIS
interface ColaboradorDetalhado {
  id: string;
  nome: string;
  cpf: string;
  ctps: string;
  // ... campos reais
}
const { data } = await supabase
  .from('colaboradores_detalhes')
  .select('*')
  .eq('id', id)
  .single();
const colaborador: ColaboradorDetalhado | null = data;
```

### Critério de aceite
- [ ] 0 `as any` nos 5 arquivos listados
- [ ] Build passa com `strict: true`
- [ ] Unit tests dos services continuam passando

---

## 🟡 P2-045 — React Compiler: configurar babel + otimizar re-renders (1 dia)

**Arquivo:** `vite.config.ts`

### Status atual
- ✅ `babel-plugin-react-compiler` instalado
- ✅ Configuração presente em `vite.config.ts` (comentada)
- ❌ NÃO ATIVADO — precisa de `VITE_REACT_COMPILER=1`

### Implementação

```typescript
// vite.config.ts — já tem isso (checar se está igual):
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ...(process.env.VITE_REACT_COMPILER === '1'
            ? [['babel-plugin-react-compiler', { target: '19' }]]
            : []),
        ],
      },
    }),
  ],
});
```

**Ação necessária para ativar:**
```bash
# .env.local
VITE_REACT_COMPILER=1
```

### O que monitorar ao ativar
```typescript
// Antes de ativar, auditar:
grep -rn "useCallback\|useMemo" src/ | wc -l   // re-renders devem ser poucos
grep -rn "// eslint-disable-next-line react-hooks/exhaustive-deps" src/ | wc -l
```

### Critério de aceite
- [ ] Build com `VITE_REACT_COMPILER=1` passa em 0 warnings
- [ ] Lighthouse LCP < 2.5s (React Compiler otimiza re-renders)
- [ ] Nenhum `Component rerendered because of context change` no DevTools

---

## 🟢 P3-058 — Prometheus scrape config para o bridge (1 dia)

**Arquivo:** `monitoring/prometheus.yml`

### Problema
Prometheus existe mas não faz scrape das métricas do `external-db-bridge`.

### Implementação

```yaml
# monitoring/prometheus.yml — Job a adicionar:
  - job_name: 'supabase-bridge'
    metrics_path: '/functions/v1/healthcheck'
    static_configs:
      - targets: ['https://seu-projeto.supabase.co']
    scrape_interval: 30s
    scrape_timeout: 10s
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'external-db-bridge'
```

**Alertas a adicionar:**
```yaml
# Prometheus alerting rules
groups:
  - name: bridge
    rules:
      - alert: BridgeQueryLatencyHigh
        expr: bridge_query_duration_seconds{p99=""} > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Bridge P99 > 5s há mais de 5min"
      - alert: BridgeErrorRateHigh
        expr: rate(bridge_errors_total[1m]) / rate(bridge_requests_total[1m]) > 0.01
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Taxa de erro do bridge > 1%"
```

### Critério de aceite
- [ ] Prometheus consegue scrapear healthcheck do bridge
- [ ] 2 alertas configurados e testados (disparar manualmente via kubectl)
- [ ] Documentado em `DOCS_MONITORING.md`

---

## 🔵 P4-072 — Materialized views para dashboards (2 dias)

**Dependência:** Supabase Pro tier **ou** Postgres direto com acesso

### Status atual
- ✅ 5 materialized views já criadas na migration `20260817010000_p4_072_materialized_views_dashboards.sql`
- ❌ Refresh automático pode não estar configurado

### Implementação necessária

```sql
-- Cron job para refresh noturno (22h)
SELECT cron.schedule(
  'refresh-dashboards-nightly',
  '0 22 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY vw_dashboard_time; 
   REFRESH MATERIALIZED VIEW CONCURRENTLY vw_kpi_turnover;
   REFRESH MATERIALIZED VIEW CONCURRENTLY vw_kpi_absenteismo;'
);

-- Refresh on-demand via RPC
CREATE OR REPLACE FUNCTION admin.refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM RefreshAllDashboardViews();  -- se existir
END;
$$;
```

### Critério de aceite
- [ ] Views são refreshadas automaticamente toda noite às 22h
- [ ] Admin pode forçar refresh via RPC `admin.refresh_dashboard_views()`
- [ ] Dashboard carrega dados em < 500ms (vs. 5-10s com JOINs)

---

## 🟣 P5-083 — Workflow engine BPMN-like (10 dias)

**Arquivo existente:** `workflowService.ts`

### O que falta
1. **Editor visual** — drag-and-drop para desenhar fluxos
2. **Execução com aprovação multi-nível** — Aprovador N1 → N2 → N3
3. **SLA configurável** — "aprovar em 48h ou escalonar"
4. **Notificações automáticas** — email/Slack quando aguardando aprovação
5. **Auditoria completa** — cada transição logada com user, timestamp, decisão

### Stack recomendada
```
@bpmn-io/bpmn-js   ← editor BPMN (React wrapper)
xstate              ← execution engine
supabase (DR)       ← persistência de estado
```

### Critério de aceite
- [ ] Editor visual de workflow desenhando → salvando → executando
- [ ] Aprovação N1 → N2 → N3 com timeout de SLA
- [ ] Notificação enviada ao próximo aprovador
- [ ] Log de auditoria completo de cada transição

---

## 🟣 P5-084 — Gov.br OAuth completo (5 dias)

**Arquivo existente:** `supabase/functions/auth-gov-br/index.ts`

### O que falta
1. **Validação contra Gov.br real** — testar com conta real
2. **Níveis de confiabilidade** — gold (>75), silver (>50), bronze (<50)
3. **Logout federado** — revogar token Gov.br
4. **Refresh token** — renovação automática de sessão

### Fluxo Gov.br
```
Usuário clica "Entrar com Gov.br"
→ Redirect para https://login.gov.br/authorize
→ Callback com code
→ Exchange por access_token + id_token
→ Validar id_token (JWT verification)
→ Mapear nível de confiabilidade
→ Criar/atualizar usuário em auth.users
```

### Critério de aceite
- [ ] Login com conta Gov.br bronze funciona (teste real)
- [ ] Login com conta Gov.br gold funciona (teste real)
- [ ] Logout revoga token federado
- [ ] Dados do Gov.br (CPF, nome) populados em `user_metadata`

---

## 🟣 P5-085 — Assinatura digital ICP-Brasil (8 dias)

**Arquivo existente:** `supabase/functions/assinaturaDigital/index.ts`

### O que falta
1. **Integração com provedor ICP-Brasil** — e-Sign, BRy ou Soluti
2. **Validação de cadeia de certificados** — CRL/OCSP
3. **Armazenamento de hash** — documento original + hash SHA-256
4. **Audit trail LGPD** — quem assinou, quando, com qual certificado

### Provedores ICP-Brasil
| Provedor | SDK | Custo estimado |
|---|---|---|
| e-Sign | `@e-sign/sdk` | R$ 0,80/assinatura |
| BRy | BRyAPI REST | R$ 0,50/assinatura |
| Soluti | SDK Soluti | R$ 1,00/assinatura |

### Critério de aceite
- [ ] Assinatura com certificado A3 (cartão) funciona
- [ ] Assinatura com certificado em nuvem (Azure Key Vault) funciona
- [ ] Hash do documento persiste no banco
- [ ] Cadeia de certificados validada (RAIZ → ICP-Brasil → AC)
- [ ] Audit trail gravado em `auditoria` com hash do documento

---

## 🟣 P5-086 — Relatórios avançados BI com Metabase (8 dias)

**Arquivo existente:** `src/services/metabaseService.ts`

### O que falta
1. **Metabase embed completo** — Signed Embedding (protegido por JWT)
2. **Drill-down interativo** — clicar em "10 desligamentos" → detalhe por colaborador
3. **Relatórios customizáveis por tenant** — cada empresa vê só seus dados
4. **Agendamento de envio** — email automático com PDF/CSV

### Implementação
```typescript
// metabaseService.ts — completar:
export interface MetabaseReport {
  id: string;
  name: string;
  iframeUrl: string;      // JWT-signed, expira em 1h
  filters: ReportFilter[];
  schedule?: CronSchedule;
}

// Assinatura JWT do embed URL
export function getSignedEmbedUrl(reportId: string, empresaId: string): string {
  const payload = { reportId, empresaId, exp: Date.now() / 1000 + 3600 };
  const token = jwt.sign(payload, METABASE_SECRET_KEY);
  return `${METABASE_URL}/embed/report/${reportId}#${token}`;
}
```

### Critério de aceite
- [ ] 5 dashboards do Metabase embedados na app (JWT-signed)
- [ ] Filtro por empresa aplicada em todos os dashboards
- [ ] Agendamento de email funcionando com PDF em anexo
- [ ] Nenhum dado de empresa A visível para empresa B

---

## 🟣 P5-088 — Testes E2E completos — cobertura 80% (8 dias)

**Diretório existente:** `e2e/`

### Status atual
- ~7 specs (login, logout, navegação básica)
- Fluxos críticos **SEM teste:** admissão, desligamento, folha, rescisão, ponto

### Plano de execução

**Sprint 1 (3 dias) — Fluxos RH críticos**
```typescript
// e2e/authenticated/admissao.spec.ts
test('fluxo completo de admissão com assinatura digital', async ({ page }) => {
  await login(page, 'rh@empresa.com');
  await page.goto('/rh/admissoes/novo');
  await page.fill('[name="nome"]', 'João Silva');
  await page.fill('[name="cpf"]', '12345678900');
  // ... preenchimento completo
  await page.click('[data-testid="btn-assinar"]');
  await expect(page.locator('.toast-success')).toBeVisible();
});

// e2e/authenticated/desligamento.spec.ts
test('fluxo completo de desligamento com cálculo de rescisão', async ({ page }) => {
  // ...
});
```

**Sprint 2 (3 dias) — Fluxos folha e ponto**
```typescript
// e2e/authenticated/folha.spec.ts
test('geração de folha mensal', async ({ page }) => { /* ... */ });

// e2e/authenticated/ponto.spec.ts
test('registro de ponto com batida automática', async ({ page }) => { /* ... */ });
```

**Sprint 3 (2 dias) — Infraestrutura**
- Page Object Model (POM) — separar selectors de lógica
- Playwright config para CI (paralelo, 4 workers)
- Screenshots no failures automáticos
- Relatório HTML no GitHub Actions

### Critério de aceite
- [ ] 15+ specs cobrindo fluxos: login, admissão, admissão-assinatura, desligamento, folha, ponto, beneficios,esocial
- [ ] Page Object Model implementado
- [ ] CI GitHub Actions com E2E antes de merge
- [ ] Cobertura ≥ 80% dos fluxos principais (medido por Playwright report)

---

## 📋 Checklist de Implementação

| # | Item | Prioridade | Esforço | Dependência | Status |
|---|---|---|---|---|---|
| 1 | P1-015 ORDER BY validation | 🟠 Alta | 0,5 dia | Nenhuma | 🔄 |
| 2 | P1-017 RPC error details | 🟠 Alta | 0,5 dia | Nenhuma | 🔄 |
| 3 | P2-043 Tipagem as any | 🟡 Média | 3 dias | Nenhuma | 🔄 |
| 4 | P2-045 React Compiler | 🟡 Média | 1 dia | Nenhuma | 🔄 |
| 5 | P3-058 Prometheus scrape | 🟢 Baixa | 1 dia | Nenhuma | 🔄 |
| 6 | P4-072 MV refresh cron | 🔵 Perf | 2 dias | Supabase Pro | 🔄 |
| 7 | P5-083 Workflow BPMN | 🟣 Feature | 10 dias | @bpmn-io | 🔄 |
| 8 | P5-084 Gov.br OAuth | 🟣 Feature | 5 dias | Gov.br API | 🔄 |
| 9 | P5-085 ICP-Brasil | 🟣 Feature | 8 dias | Provedor ICP | 🔄 |
| 10 | P5-086 BI Metabase | 🟣 Feature | 8 dias | Metabase Pro | 🔄 |
| 11 | P5-088 E2E 80% | 🟣 Feature | 8 dias | Nenhuma | 🔄 |
