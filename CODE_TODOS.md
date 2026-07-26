# Code TODO

> Atualizado em 2026-07-24. Formato organizado por prioridade.

## Prioridade P1 - Crítico

### P1-022: React Compiler readiness
- **Status:** Parcial — useNow/useCallback corrigidos, restam 75 ESLint warnings
- **Origem:** QA_SIMULATION
- **Prazo:** Próximo trimestre
- **Ação:** Reduzir ESLint warnings para habilitar React Compiler
- **Tarefas:**
  - [ ] Analisar e resolver 75 ESLint warnings restantes
  - [ ] Validar compilação com React Compiler habilitado

### P1-025: Criptografia pgcrypto dados sensíveis
- **Status:** Não iniciado
- **Origem:** SECURITY_AUDIT
- **Prazo:** Q3 2026
- **Ação:** Implementar criptografia para dados sensíveis
- **Tarefas:**
  - [ ] Identificar campos sensíveis (CPF, RG, salário, conta bancária)
  - [ ] Implementar extensão pgcrypto
  - [ ] Criar funções de criptografia/descriptografia
  - [ ] Migrar dados existentes

### P1-030: Eliminar ocorrências de `any` (cauda TypeScript)
- **Status:** Contínuo
- **Origem:** PLANO_REFATORACAO_TIPOS
- **Ação:** Reduzir uso de `any` para melhor type safety
- **Tarefas:**
  - [ ] Analisar ocorrências residuais de `any`
  - [ ] Definir tipos específicos para cada contexto
  - [ ] Aplicar correções progressivamente

### P1-XXX: useState<any> residual
- **Status:** Identificado — 10+ ocorrências
- **Ação:** Substituir `useState<any>` por tipos específicos
- **Tarefas:**
  - [ ] Localizar todas ocorrências de `useState<any>`
  - [ ] Definir tipos adequados para cada contexto
  - [ ] Aplicar correções

### P1-XXX: Error handling residual (catch (err: any))
- **Status:** Identificado — 20+ ocorrências
- **Ação:** Substituir `catch (err: any)` por tratamento tipado
- **Tarefas:**
  - [ ] Localizar todas ocorrências de `catch (err: any)`
  - [ ] Definir tipos adequados para cada contexto
  - [ ] Aplicar correções

### P1-XXX: Console logging em produção
- **Status:** Identificado — ~20+ ocorrências (Vite 8 ignora esbuild.drop)
- **Origem:** REGRESSÃO
- **Ação:** Remover/replace console.* em código de produção
- **Tarefas:**
  - [ ] Identificar todos console.* em produção
  - [ ] Substituir por logger estruturado (pino/winston)
  - [ ] Configurar níveis de log por ambiente
  - [ ] Configurar terser ou oxc-minify para remover console em prod

---

## Prioridade P2 - Importante

### P2-037: Consolidar tabelas duplicadas
- **Status:** Não iniciado
- **Origem:** SECURITY_AUDIT
- **Prazo:** Q3 2026
- **Ação:** Identificar e consolidar tabelas duplicadas (férias/folha/ponto)
- **Tarefas:**
  - [ ] Mapear entidades duplicadas no schema
  - [ ] Analisar dependências e foreign keys
  - [ ] Planejar migração de dados
  - [ ] Executar consolidação

### P2-XXX: parseCursor não consumido pelo frontend
- **Status:** Função implementada mas não utilizada
- **Ação:** Integrar parseCursor no frontend
- **Tarefas:**
  - [ ] Identificar onde pagination cursor é necessário
  - [ ] Integrar parseCursor no código frontend
  - [ ] Testar navegação com cursores

### P2-XXX: cachedFetch não consumido pelo backend
- **Status:** Função implementada mas não utilizada
- **Ação:** Integrar cachedFetch no backend
- **Tarefas:**
  - [ ] Identificar chamadas HTTP repetitivas no backend
  - [ ] Aplicar cachedFetch para otimizar
  - [ ] Validar cache hit/miss

### P2-XXX: useActionState migration não executada
- **Status:** Não iniciado
- **Ação:** Migrar de useTransition/useFormStatus para useActionState
- **Tarefas:**
  - [ ] Identificar formulários usando padrões antigos
  - [ ] Refatorar para useActionState
  - [ ] Testar submit e estados de loading/error

### P2-033: FIXME(data-table) - RESOLVIDO
- **Arquivo:** `src/components/ui/data-table.tsx`
- **Resolução:** Adicionado @tanstack/react-table, removido @ts-nocheck

### P0-008: client.ts fallbacks hardcoded - RESOLVIDO
- **Arquivo:** `src/integrations/supabase/client.ts`
- **Resolução:** Throw se env vars ausentes

---

## Prioridade P3 - Observabilidade

### P3-054: View materializada para telemetria
- **Status:** Não iniciado
- **Origem:** BRIDGE_PERFORMANCE
- **Prazo:** Q3 2026
- **Tarefas:**
  - [ ] Criar view materializada para métricas
  - [ ] Configurar refresh interval
  - [ ] Documentar uso

### P3-055: Endpoint /api/metricas
- **Status:** Não iniciado
- **Origem:** BRIDGE_PERFORMANCE
- **Prazo:** Q3 2026
- **Tarefas:**
  - [ ] Criar endpoint REST
  - [ ] Retornar métricas agregadas
  - [ ] Autenticar endpoint

### P3-057: v_login_anomalies
- **Status:** Não iniciado
- **Origem:** Brute force detection
- **Prazo:** Q3 2026
- **Tarefas:**
  - [ ] Criar view para anomalias de login
  - [ ] Configurar alertas
  - [ ] Integrar com monitoramento

### P3-058: Prometheus scrape + alertas
- **Status:** Não iniciado
- **Origem:** DOCS_MONITORING
- **Prazo:** Q3 2026
- **Tarefas:**
  - [ ] Configurar Prometheus scrape
  - [ ] Definir alertas críticos
  - [ ] Testar notificação

### P3-059: Separar APMs em DOCS_MONITORING.md
- **Status:** Não iniciado
- **Origem:** DOCS_MONITORING
- **Prazo:** Q3 2026
- **Tarefas:**
  - [ ] Documentar APMs existentes
  - [ ] Criar DOCS_MONITORING.md
  - [ ] Atualizar referências

### P3-060: Backup automatizado + alerta
- **Status:** Não iniciado
- **Origem:** infra
- **Prazo:** Q3 2026
- **Tarefas:**
  - [ ] Configurar backup automático
  - [ ] Configurar alerta de falha
  - [ ] Testar restauração

### P3-061: Retry exponencial em idempotency
- **Status:** Não iniciado
- **Origem:** infra
- **Prazo:** Q3 2026
- **Tarefas:**
  - [ ] Implementar retry com backoff
  - [ ] Garantir idempotency
  - [ ] Testar cenários de falha

### P3-065: Retenção e purga de logs (LGPD)
- **Status:** Não iniciado
- **Origem:** LGPD Art. 16
- **Prazo:** Q4 2026
- **Tarefas:**
  - [ ] Definir política de retenção
  - [ ] Implementar purga automática
  - [ ] Documentar compliance

---

## Prioridade P4 - Performance

### P4-068: Read replicas
- **Status:** Não iniciado
- **Origem:** BRIDGE_PERFORMANCE
- **Prazo:** Q4 2026
- **Tarefas:**
  - [ ] Configurar read replicas
  - [ ] Direcionar queries de leitura
  - [ ] Testar consistência

### P4-069: PgBouncer config para 100+ tenants
- **Status:** Não iniciado
- **Origem:** Scaling
- **Prazo:** Q4 2026
- **Tarefas:**
  - [ ] Configurar PgBouncer pooling
  - [ ] Testar com carga multi-tenant
  - [ ] Monitorar conexões

### P4-071: Índices compostos para top-20 queries
- **Status:** Não iniciado
- **Origem:** perf
- **Prazo:** Q4 2026
- **Tarefas:**
  - [ ] Identificar top-20 queries lentas
  - [ ] Criar índices compostos
  - [ ] Validar melhoria

### P4-072: Materialized views para dashboards
- **Status:** Não iniciado
- **Origem:** perf
- **Prazo:** Q4 2026
- **Tarefas:**
  - [ ] Identificar queries de dashboard
  - [ ] Criar materialized views
  - [ ] Configurar refresh

### P4-074: Code splitting em 62 pages
- **Status:** Não iniciado
- **Origem:** perf
- **Prazo:** Q4 2026
- **Tarefas:**
  - [ ] Analisar bundle de cada page
  - [ ] Implementar lazy loading
  - [ ] Medir melhoria de load time

### P4-075: Workbox strategies (offline-first)
- **Status:** Não iniciado
- **Origem:** PWA
- **Prazo:** Q4 2026
- **Tarefas:**
  - [ ] Configurar Workbox
  - [ ] Implementar cache strategies
  - [ ] Testar offline mode

### P4-076: Pre-fetch de dados no Login
- **Status:** Não iniciado
- **Origem:** perf
- **Prazo:** Q4 2026
- **Tarefas:**
  - [ ] Identificar dados críticos pós-login
  - [ ] Implementar pre-fetch
  - [ ] Medir tempo de renderização

---

## Prioridade P5 - Features

### P5-077 a P5-088: Features de roadmap
- **Status:** 0%
- **Origem:** ROADMAP
- **Prazo:** 2026-2027

#### Features Planejadas:
- [ ] P5-077: Feature 077
- [ ] P5-078: Feature 078
- [ ] P5-079: Feature 079
- [ ] P5-080: Feature 080
- [ ] P5-081: Feature 081
- [ ] P5-082: eSocial eventos S-3000, S-5001, S-5011
- [ ] P5-083: Feature 083
- [ ] P5-084: Feature 084
- [ ] P5-085: Feature 085
- [ ] P5-086: Feature 086
- [ ] P5-087: Feature 087
- [ ] P5-088: Feature 088

#### Features Backlog:
- [ ] formatarXXX aliases em `src/lib/masks.ts`

---

## Resumo de Status

| Categoria | Total | Concluído | Restante |
|-----------|-------|-----------|----------|
| P1 - Crítico | 6 | 0 | 6 |
| P2 - Importante | 6 | 2 | 4 |
| P3 - Observabilidade | 8 | 0 | 8 |
| P4 - Performance | 7 | 0 | 7 |
| P5 - Features | 12 | 0 | 12 |
| **Total** | **39** | **2** | **37** |

---

## Histórico de Resoluções

| Data | Item | Arquivo | Resolução |
|------|------|---------|-----------|
| 2026-07-24 | P2-033 | `src/components/ui/data-table.tsx` | Adicionado @tanstack/react-table, removido @ts-nocheck |
| 2026-07-24 | P0-008 | `src/integrations/supabase/client.ts` | Throw se env vars ausentes |

---

## Backlog Histórico

| Item | Arquivo | Ação proposta |
|------|---------|---------------|
| formatarXXX aliases | `src/lib/masks.ts` | Consolidar em funções nomeadas |
| eSocial eventos S-XXXX fallback | `src/components/esocial/tabs.tsx` | Implementar S-3000, S-5001, S-5011 |

---

*Mantido pelo time de dev. Última revisão: 2026-07-24.*

*Para adicionar novo item: edite este arquivo + crie issue no GitHub linkando a linha.*
*Para fechar: marque como resolvido e mova para "Histórico de Resoluções".*
