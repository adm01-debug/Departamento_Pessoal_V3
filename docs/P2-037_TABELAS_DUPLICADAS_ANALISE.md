# P2-037: Consolidação de Tabelas Duplicadas — Análise e Runbook

## Diagnóstico (2026-08-18)

### Contexto
O projeto tem 3 gerações de migrations:
- `003_*` — schema inicial Lovable (sem prefixo `public.`, `uuid_generate_v4()`)
- `20250102_*` — primeira migration com `public.` prefix, `gen_random_uuid()`
- `20251216+` — schema atual canônico

### Tabelas ativas vs. legadas

| Tabela legado (`003`) | Colunas-chave | Status | Usada pelo app? |
|---|---|---|---|
| `folha_pagamento` | empresa_id, competencia, total_liquido | **LEAGACY** | ❌ (app usa `folhas_pagamento`) |
| `ferias` | colaborador_id, periodo_aquisitivo_inicio | **LEAGACY** | ❌ (app usa `ferias` em `20251216/20260306`) |
| `ponto_registros` | colaborador_id, data, entrada_1 | **LEAGACY** | ❌ (app usa `registros_ponto`) |

| Tabela canônica atual | Migration | Status | Usada pelo app? |
|---|---|---|---|
| `folhas_pagamento` | 20251216165741 | ✅ ATIVA | ✅ `useExecutiveDashboard.ts:41` |
| `periodos_aquisitivos` | 20251216170845 | ✅ ATIVA | ✅ `usePeriodosAquisitivos.ts` |
| `ferias` (v2) | 20260306005302 (ferias_solicitacoes) | ✅ ATIVA | ✅ hooks em `hooks/ferias/` |
| `registros_ponto` | 20251216170303 | ✅ ATIVA | ✅ `usePonto.ts` |
| `batidas_ponto` | 20260306005302 | ✅ ATIVA | ✅ `useBatidasPonto` |

### Conclusão
**Não há duplicatas com dados reais.** As 3 tabelas legado (`folha_pagamento`, `ferias`, `ponto_registros`)
nunca foram populadas pelo app — o app nasceu usando o schema de `20250102` em diante.

### Ações de deprecação

```sql
-- RODAR ANTES DE DROPAR: verificar se há dados residuais
SELECT count(*) FROM public.folha_pagamento;   -- Esperado: 0
SELECT count(*) FROM public.ferias;             -- Verificar (pode ter dados)
SELECT count(*) FROM public.ponto_registros;    -- Esperado: 0

-- Se todas retornam 0:
ALTER TABLE public.folha_pagamento  RENAME TO folha_pagamento_legacy_003;
ALTER TABLE public.ferias             RENAME TO ferias_legacy_003;
ALTER TABLE public.ponto_registros    RENAME TO ponto_registros_legacy_003;

-- OU, se preferir DROP direto (sem rename):
DROP TABLE IF EXISTS public.folha_pagamento;
DROP TABLE IF EXISTS public.ponto_registros;
-- ferias_legacy_003: manter rename (pode ter dados de transição)
```

### Cronograma de execução
- **Q3 2026 Sprint 1**: Verificar dados residuais e rename
- **Q3 2026 Sprint 2**: DROP após 30 dias sem incidentes
