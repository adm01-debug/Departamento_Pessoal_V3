# Runbook — Rollback de Schema (migrations forward-only)

As migrations deste projeto são **forward-only**: não existe `down`/`revert`
automático. Este runbook define o que fazer quando uma migration aplicada
precisa ser desfeita, na ordem de preferência.

## Decisão rápida

| Situação                                                              | Estratégia                                  |
| --------------------------------------------------------------------- | ------------------------------------------- |
| Migration aplicada há minutos, ainda não referenciada por dados novos | Migration compensadora (recomendado)        |
| Corrupção de dados causada pela migration                             | PITR no Supabase + compensadora selecionada |
| Migration falhou no meio (parcialmente aplicada)                      | Reconciliar estado real, então compensadora |
| Estrutura legada precisa só deixar de ser usada                       | Depreciação (sinalização + remoção futura)  |

## 1) Migration compensadora (caminho padrão)

Criar uma **nova** migration `YYYYMMDDHHMMSS_p1_rollback_<descricao>.sql` que
desfaz exatamente o que a migration original fez — nunca editar a migration
original, pois ela já pode estar no ledger de versões aplicadas.

```sql
-- Exemplo: a original criou a tabela foo_bar
DROP TABLE IF EXISTS public.foo_bar;
-- Exemplo: a original adicionou coluna
ALTER TABLE public.x DROP COLUMN IF EXISTS y;
-- Exemplo: a original criou CHECK NOT VALID
ALTER TABLE public.z DROP CONSTRAINT IF EXISTS z_check;
```

Checklist:

- [ ] A compensadora é idempotente (`IF EXISTS`/`IF NOT EXISTS` em tudo).
- [ ] Comentário referencia a versão/nome da migration original.
- [ ] Se a original gravou dados, a compensadora preserva ou exporta o que for
      necessário antes de dropar (dump parcial via `pg_dump --table`).
- [ ] Registrar no PR por que o rollback é seguro (dados não dependem do
      objeto removido).

## 2) PITR (Point-in-Time Recovery)

Quando a migration **corrompeu dados** (delete indesejado, update errado,
tipo de coluna mudado com perda):

1. No dashboard Supabase canônico (`frjbfeamybqsejlvmqbl`):
   **Database → Point in Time Recovery** (plano Pro+) ou restore do
   snapshot mais recente.
2. Restaurar para um projeto/branch de staging primeiro e validar.
3. Só promover para produção após confirmar integridade dos dados críticos.
4. Registrar o incidente em `RESPOSTA_INCIDENTES.md` e o gap que permitiu.

Se PITR não estiver habilitado no plano: avaliar `pg_dump` parcial da tabela
afetada antes do restore completo.

## 3) Estado intermediário (migration falhou no meio)

Migration que morreu no meio deixa objetos parcialmente criados e **não**
re-roda (versão já gravada ou conflito de objeto). Procedimento:

1. `SELECT * FROM supabase_migrations.schema_migrations` — confirmar se a
   versão foi registrada.
2. Inspecionar o schema real: `scripts/check-db-schema.mjs` ou
   `information_schema` direto.
3. Escrever migration "estabilizadora" que alinha o estado real ao pretendido
   (com `IF NOT EXISTS`/`IF EXISTS` para cada objeto).
4. Atualizar `docs/migration-health/` se aplicável.

## 4) Depreciação sem drop

Para estruturas ainda referenciadas por código antigo ou dados históricos:
marcar como deprecated em comentário + `docs/guides/` e remover no ciclo
seguinte, após confirmar zero referências no app e no analytics.

## Anti-padrões

- ❌ Editar migration já aplicada para "desfazer" — o ledger e a realidade
  divergem; futuras aplicações em ambientes novos reproduzem o erro.
- ❌ `DROP` sem verificar dependências (`pg_depend`, policies, triggers,
  views dependentes).
- ❌ Assumir que o ledger prova aplicação (ver `audit-schema-drift.mjs` —
  presença no ledger ≠ objeto existe).
