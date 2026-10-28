// IRRF progressivo (IN RFB 2110/2022): acúmulo faixa a faixa em centavos
// inteiros (BigInt) com truncamento único — mesma convenção do INSS e do front
// (src/calculators/impostos.ts). Paridade verificada por irrf.test.ts.
import { calcularINSS } from './inss.ts';

// Tabela mensal vigente em 2025 (Lei 14.663/2023, faixas de 05/2023)
const FAIXAS_IRRF_2025 = [
  { limite: 2259.2, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.0 },
];

// Tabela mensal 2026 (Lei 15.270/2025 — nova 1ª faixa até R$ 2.428,80)
const FAIXAS_IRRF_2026 = [
  { limite: 2428.8, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { limite: 3751.05, aliquota: 0.15, deducao: 394.16 },
  { limite: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { limite: Infinity, aliquota: 0.275, deducao: 908.73 },
];

const IRRF_POR_ANO: Record<number, { faixas: typeof FAIXAS_IRRF_2026; simplificado: number }> = {
  2025: { faixas: FAIXAS_IRRF_2025, simplificado: 564.8 },
  2026: { faixas: FAIXAS_IRRF_2026, simplificado: 607.2 },
};

// Redução do imposto devido — Lei 15.270/2025 (art. 3º-A da Lei 9.250/95),
// a partir de jan/2026, sobre os rendimentos tributáveis mensais:
//   rendimento ≤ R$ 5.000      → redução de até R$ 312,89 (limitada ao imposto)
//   R$ 5.000 < rendimento ≤ R$ 7.350 → redução = 978,62 − 0,133145 × rendimento
const IRRF_2026_ISENCAO_ATE = 5000;
const IRRF_2026_REDUCAO_ATE = 7350;
const IRRF_2026_REDUCAO_MAX = 312.89;
const IRRF_2026_REDUCAO_A = 978.62;
const IRRF_2026_REDUCAO_B = 0.133145;

const DEDUCAO_DEPENDENTE_IRRF = 189.59;

function anoCompetencia(competencia: string): number {
  const ano = Number(competencia.slice(0, 4));
  return Number.isFinite(ano) && ano > 0 ? ano : 2026;
}

export function calcIRRF(
  bruto: number,
  dependentes = 0,
  competencia: string,
  outrasDeducoes = 0
): number {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const ano = anoCompetencia(competencia);
  const { faixas, simplificado } = IRRF_POR_ANO[Math.max(2025, Math.min(ano, 2026))];
  const inss = calcularINSS(bruto, competencia);
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF - outrasDeducoes;
  const baseSimplificada = bruto - simplificado;
  const base = Math.max(0, Math.min(baseLegal, baseSimplificada));
  if (base <= 0) return 0;
  const baseCents = BigInt(Math.round(base * 100));
  let impostoMilesimos = 0n;
  let anteriorIrrf = 0n;
  for (const f of faixas) {
    if (baseCents <= anteriorIrrf) break;
    const limite = f.limite === Infinity ? baseCents : BigInt(Math.round(f.limite * 100));
    const aliquota = BigInt(Math.round(f.aliquota * 1000));
    const faixaCents = (baseCents < limite ? baseCents : limite) - anteriorIrrf;
    impostoMilesimos += faixaCents * aliquota;
    anteriorIrrf = limite;
    if (baseCents <= limite) break;
  }
  const imposto = Math.max(0, Number(impostoMilesimos / 1000n) / 100);

  // Lei 15.270/2025: redução sobre os rendimentos tributáveis mensais (bruto).
  if (ano >= 2026 && bruto <= IRRF_2026_REDUCAO_ATE) {
    const reducao =
      bruto <= IRRF_2026_ISENCAO_ATE
        ? Math.min(imposto, IRRF_2026_REDUCAO_MAX)
        : Math.max(0, IRRF_2026_REDUCAO_A - IRRF_2026_REDUCAO_B * bruto);
    return Math.max(0, Math.round((imposto - reducao) * 100) / 100);
  }
  return imposto;
}
