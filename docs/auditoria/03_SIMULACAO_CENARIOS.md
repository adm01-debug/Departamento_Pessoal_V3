# Simulação de Cenários — Evidência Quantitativa Pré-Correção

> Executada antes de qualquer correção de código, para não corrigir às cegas e para servir de base de regressão. Réplicas fiéis das fórmulas atuais (pré-fix) do edge vs. a engine correta do frontend, simuladas em lote fora do runtime Deno.

## 1. Rescisão — 13º proporcional e férias proporcionais (K2/K3)

**Script:** `scripts/simulacao/simulate_rescisao.cjs` · **Cenários:** 19.712 (8 salários × 4 tipos de rescisão × 9 admissões × 84 desligamentos cobrindo toda virada de mês/dia 1/14/15/16/28 do ano).

| Métrica | Resultado |
| --- | --- |
| Divergência em 13º proporcional (edge vs. correto) | **11.624 / 19.712 (59,0%)** |
| Divergência em férias proporcionais | **7.960 / 19.712 (40,4%)** |
| Impacto monetário agregado (Σ\|diff\| do 13º) | **R$ 21.722.031,37** |
| `pedido_demissao` com 13º/férias devidos zerados indevidamente | **4.648 / 4.928 (94,3%)** |

Exemplo concreto: salário R$1.518, admitido 10/01/2020, desligado 10/03/2026 (sem justa causa) → correto = R$253,00 de 13º proporcional; edge calcula R$379,50 (mês de calendário nº3 usado como avos, em vez de 2 avos reais). Confirma **K2** (avos = `getMonth()+1`) e **K4** (tempo de serviço mal contado).

## 2. Folha — IRRF (K1)

**Script:** `scripts/simulacao/simulate_irrf.cjs` · **Cenários:** 1.850 (salário R$1.518–R$20.000, passo R$50 × 0–4 dependentes).

| Métrica | Resultado |
| --- | --- |
| Divergência (edge vs. correto) | **1.755 / 1.850 (94,9%)** |
| Retenção a maior agregada (Σ diffs positivos) | **R$ 266.797,76** |

Exemplo: bruto R$2.518, 1 dependente → correto = R$0,00 (dedução simplificada + dependente isentam); edge retém R$4,12. Confirma **K1** (edge ignora dedução simplificada e dependentes).

## Conclusão

A simulação **confirma empiricamente** os achados K1–K4 do relatório de auditoria (`01_FALHAS_E_GAPS.md`), com taxas de divergência entre 40% e 95% dos cenários testados e impacto monetário agregado de sete dígitos nos cenários simulados. Isso justifica a prioridade dada à unificação da engine de cálculo no plano de remediação.

Os scripts foram commitados em `scripts/simulacao/` para permitir re-execução após cada correção (regressão).

## Verificação pós-correção (task 7 — K1-K5, H(K)4)

Após corrigir `calcular-folha`, `calcular-rescisao` e `calcular-provisoes`, os mesmos grids de cenários foram
reexecutados comparando a engine do edge (pós-fix) contra o motor canônico do frontend, via
`scripts/simulacao/verify_irrf_fix.cjs` e `scripts/simulacao/verify_rescisao_fix.cjs`:

| Script | Cenários | Divergência |
| --- | --- | --- |
| `verify_irrf_fix.cjs` (IRRF, K1) | 1.850 (salário R$1.518–R$20.000 × 0–4 dependentes) | **0 (0,000%)** |
| `verify_rescisao_fix.cjs` (rescisão, K2-K4 + H(K)4) | 236.544 (8 salários × 6 tipos × 9 admissões × 72 desligamentos × aviso trabalhado/indenizado × férias vencidas × dependentes) | **0 (0,000%)** em todos os 13 campos do resultado |

Divergência caiu de 40–95% (baseline pré-fix acima) para **zero** em ambos os motores, confirmando que o edge agora
produz os mesmos valores que o motor canônico testado (`src/utils/rescisaoCalc.ts` / `src/calculators/impostos.ts`)
para o mesmo conjunto de entradas.
