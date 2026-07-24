// Cálculos base para Verbas Trabalhistas Complementares: Horas Extras, DSR, 13º Salário
import { SALARIO_MINIMO_2026 } from './tabelas';

/**
 * Calcula o valor das Horas Extras
 * @param salarioBase Salário base do colaborador
 * @param jornadaMensal Horas mensais (ex: 220)
 * @param horasExtras Quantidade de horas extras realizadas
 * @param percentual Adicional (ex: 0.5 para 50%, 1.0 para 100%)
 */
export function calcularHorasExtras(
  salarioBase: number,
  jornadaMensal: number = 220,
  horasExtras: number,
  percentual: number = 0.5
): number {
  if (horasExtras <= 0 || jornadaMensal <= 0) return 0;
  const valorHora = salarioBase / jornadaMensal;
  const valorComAdicional = valorHora * (1 + percentual);
  return Math.trunc(valorComAdicional * horasExtras * 100) / 100;
}

/**
 * Calcula o Descanso Semanal Remunerado (DSR) sobre verbas variáveis
 * Fórmula: (Total das Verbas Variáveis / Dias Úteis) * Domingos e Feriados
 */
export function calcularDSR(
  totalVariavel: number,
  diasUteis: number = 26,
  domingosFeriados: number = 4
): number {
  if (totalVariavel <= 0 || diasUteis <= 0) return 0;
  return Math.trunc((totalVariavel / diasUteis) * domingosFeriados * 100) / 100;
}

/**
 * Calcula o 13º Salário (Parcelas ou Integral)
 * @param salarioBase Salário atual
 * @param mesesTrabalhados Meses de direito no ano (1-12)
 * @param parcela 1 para primeira parcela (50%, sem descontos), 2 para segunda ou integral
 */
export function calcular13Salario(
  salarioBase: number,
  mesesTrabalhados: number = 12,
  parcela: 1 | 2 = 2
): number {
  const valorIntegral = (salarioBase / 12) * mesesTrabalhados;
  
  if (parcela === 1) {
    // 1ª Parcela é sempre 50% do valor de direito, sem descontos de INSS/IRRF
    return Math.trunc((valorIntegral / 2) * 100) / 100;
  }

  // 2ª Parcela é o valor integral (sobre o qual incidirão descontos no cálculo principal)
  return Math.trunc(valorIntegral * 100) / 100;
}
