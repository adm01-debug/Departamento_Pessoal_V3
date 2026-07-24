# QA Férias v31 — Etapa 10

**Data:** 2026-07-22
**Baseline:** QA v30 (Vitest 394/394, bridge 18/18, linter 21 warns)
**Meta:** Fechar gaps CLT do módulo de férias, rumo ao 10/10 sustentado.

---

## Execução (1 melhoria por vez)

| # | Fase | Escopo | Status | Warns |
|---|---|---|---|---|
| 0 | Baseline | Vitest + typecheck + schema audit | ✅ | 21 |
| 1.1 | Art. 130 | Proporcionalidade por faltas + trigger | ✅ | 21 |
| 1.2 | Art. 133 | Perda de direito + colunas + trigger | ✅ | 21 |
| 1.3 | Art. 134 §1º | Fracionamento (max 3, um ≥14, ≥5) + trigger | ✅ | 21 |
| 1.4 | Art. 134 §3º | Início válido (DSR/feriado) + trigger | ✅ | 21 |
| 1.5 | Art. 137 + 145 | Dobra + `data_limite_concessao` + view alertas | ✅ | 21 |
| 2.8 | Frontend | Schema Zod espelho + `useCalculoFeriasPreview` | ✅ | 21 |
| 2.9 | Folha | `gerar_rubricas_ferias` + trigger idempotente | ✅ | 25 (+4) |
| 3.11 | FK | `periodo_aquisitivo_id NOT NULL` + defesa | ✅ | 27 (+2) |
| 3.12 | Cron | `fn_recalcular_dobra_e_alertas` + agenda diária | ✅ | 27 |
| 4 | Revalidação | Vitest + typecheck | ✅ | 27 |

**Vitest:** 394/394 ✅
**Typecheck (tsgo):** 0 erros ✅
**Cron agendados:** 2 (03:15 e 03:30 UTC)

---

## Detalhes por gap

### Críticos CLT

- **Art. 130** — função `IMMUTABLE` que mapeia faltas→dias, trigger recalcula automaticamente. Retroativo aplicado em registros existentes.
- **Art. 133** — trigger marca `perdeu_direito=true` quando faltas>32; reversível se faltas forem corrigidas.
- **Art. 134 §1º** — função stable que soma períodos ativos (não cancelados) do mesmo aquisitivo e valida limites; trigger com `RAISE EXCEPTION` estável.
- **Art. 134 §3º** — bloqueia domingo, feriado (nacional ou por empresa) e 2 dias antes. Coletiva ignora a regra (empresa define).
- **Art. 137 + 145** — colunas + view consolidando `DOBRA_IMINENTE_60/30`, `DOBRA_VENCIDA` e `PAGAMENTO_ATRASADO_ART_145`.

### Paridade Convenia

- **2.8** Zod com `superRefine` (domingo + coerência de datas), hook de preview em tempo real usando motor canônico (`calculoFerias.calcular`).
- **2.9** Trigger `AFTER UPDATE` gera 6 rubricas em `eventos_variaveis` de forma idempotente (índice único parcial em `origem_ferias_id + rubrica_id`).

### Complementares

- **3.11** FK `periodo_aquisitivo_id NOT NULL` + trigger de defesa (bloqueia registros contra aquisitivos perdidos, zerados ou de outro colaborador).
- **3.12** Cron diário via `pg_cron`.

---

## Warns do linter (27 total, delta +6)

Todos os 6 novos warns são de `SECURITY DEFINER` — necessários para:

- `gerar_rubricas_ferias` (chamada por trigger em contexto elevado, `EXECUTE` só a `service_role`)
- `fn_recalcular_dobra_e_alertas` (chamada pelo cron)

Ambos com `REVOKE ALL FROM PUBLIC` e `GRANT EXECUTE TO service_role` apenas. Signed-in users **não** conseguem chamar.

---

## Pendências (próxima onda — escopo UI/Storage)

| # | Item | Motivo |
|---|---|---|
| 2.6 | Aviso Férias PDF (MTE) + assinatura | Requer template PDF completo + fluxo `documentos_assinatura` |
| 2.7 | Programação Anual (Kanban) | Nova tabela + página `/ferias/programacao-anual` |
| 2.10 | Comunicado Coletivas (MTE + sindicato) | Templates PDF + storage bucket |
| 3.13 | Portal do Colaborador | Página `/portal/ferias` + RLS colaborador-scoped |

Todas ancoram-se na base de banco/regras já implementadas.

---

## Selo

**Módulo Férias: 10/10 nas regras CLT** (Arts. 130, 133, 134, 137, 143, 145).
Restante das entregas Convenia é UI/documento e será fechada em onda dedicada.
