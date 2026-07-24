import { useMemo } from 'react';
import { calculoFerias, type CalculoFeriasResult } from '@/utils/calculoFerias';

interface Params {
  salarioBase: number;
  diasFerias: number;
  diasAbono?: number;
  dependentesIrrf?: number;
  enabled?: boolean;
}

/**
 * Preview de cálculo de férias em tempo real para uso no FeriasForm.
 * Não bate no servidor — usa o motor canônico local (`@/calculators/beneficios`)
 * que é o mesmo referenciado pela função `gerar_rubricas_ferias` no banco.
 */
export function useCalculoFeriasPreview({
  salarioBase,
  diasFerias,
  diasAbono = 0,
  dependentesIrrf = 0,
  enabled = true,
}: Params): CalculoFeriasResult | null {
  return useMemo(() => {
    if (!enabled) return null;
    if (!salarioBase || salarioBase <= 0) return null;
    if (!diasFerias || diasFerias <= 0) return null;
    try {
      return calculoFerias.calcular({ salarioBase, diasFerias, diasAbono, dependentesIrrf });
    } catch {
      return null;
    }
  }, [enabled, salarioBase, diasFerias, diasAbono, dependentesIrrf]);
}
