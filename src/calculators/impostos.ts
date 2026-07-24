// Cálculos base: INSS, IRRF, FGTS
import { 
  FAIXAS_INSS_2026, 
  FAIXAS_IRRF_2026, 
  DEDUCAO_DEPENDENTE_IRRF, 
  ALIQUOTA_FGTS,
  DEDUCAO_SIMPLIFICADA_IRRF_2026,
  TETO_INSS_2026
} from './tabelas';

export function calcularINSS(salarioBruto: number): number {
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos

  let descontoTotal = 0;
  let baseRestante = Math.min(salarioBruto, TETO_INSS_2026);

  for (let i = 0; i < FAIXAS_INSS_2026.length; i++) {
    const faixa = FAIXAS_INSS_2026[i];
    const limiteAnterior = i === 0 ? 0 : FAIXAS_INSS_2026[i - 1].limite;
    const faixaCalculo = Math.min(baseRestante, faixa.limite - limiteAnterior);

    if (faixaCalculo <= 0) break;

    descontoTotal += faixaCalculo * faixa.aliquota;
    baseRestante -= faixaCalculo;
  }

  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  return Math.trunc(descontoTotal * 100) / 100;
}

export function calcularIRRF(
  salarioBruto: number,
  dependentes: number = 0,
  outrasDeducoes: number = 0,
  // Pensão alimentícia recebida é isenta de IRRF (Art. 6°, XXXIII, Lei 7.713/88)
  isPensaoAlimenticia: boolean = false,
): number {
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos
  if (isPensaoAlimenticia) return 0;  // rendimento isento — sem incidência de IRRF

  const descontoINSS = calcularINSS(salarioBruto);

  // Opção 1: Deduções Legais
  const baseCalculoLegal = salarioBruto - descontoINSS - (dependentes * DEDUCAO_DEPENDENTE_IRRF) - outrasDeducoes;

  // Opção 2: Desconto Simplificado
  const baseCalculoSimplificado = salarioBruto - DEDUCAO_SIMPLIFICADA_IRRF_2026;

  // A Receita Federal utiliza a base que for mais benéfica para o contribuinte (menor imposto)
  const baseCalculo = Math.max(0, Math.min(baseCalculoLegal, baseCalculoSimplificado));

  if (baseCalculo <= 0) return 0;

  let impostoTotal = 0;
  for (let i = 0; i < FAIXAS_IRRF_2026.length; i++) {
    const faixa = FAIXAS_IRRF_2026[i];
    const limiteAnterior = i === 0 ? 0 : FAIXAS_IRRF_2026[i - 1].limite;
    const baseNaFaixa = Math.min(Math.max(0, baseCalculo - limiteAnterior), (faixa.limite || Infinity) - limiteAnterior);

    if (baseNaFaixa <= 0) break;
    impostoTotal += baseNaFaixa * faixa.aliquota;
  }

  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  return Math.max(0, Math.trunc(impostoTotal * 100) / 100);
}

export function calcularFGTS(salarioBruto: number): number {
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos
  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  return Math.trunc(salarioBruto * ALIQUOTA_FGTS * 100) / 100;
}
