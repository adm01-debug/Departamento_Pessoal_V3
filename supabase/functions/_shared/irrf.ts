// IRRF progressivo (IN RFB 2110/2022): acúmulo faixa a faixa em centavos
// inteiros (BigInt) com truncamento único — mesma convenção do INSS e do front
// (src/calculators/impostos.ts). Paridade verificada por irrf.test.ts.
import { calcularINSS } from './inss.ts';

const FAIXAS_IRRF = [
  { limite: 2259.20, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];

const DEDUCAO_SIMPLIFICADA_IRRF = 564.80; // Lei 14.663/2023
const DEDUCAO_DEPENDENTE_IRRF = 189.59;

export function calcIRRF(bruto: number, dependentes = 0, competencia: string): number {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const inss = calcularINSS(bruto, competencia);
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF;
  const baseSimplificada = bruto - DEDUCAO_SIMPLIFICADA_IRRF;
  const base = Math.max(0, Math.min(baseLegal, baseSimplificada));
  if (base <= 0) return 0;
  const baseCents = BigInt(Math.round(base * 100));
  let impostoMilesimos = 0n;
  let anteriorIrrf = 0n;
  for (const f of FAIXAS_IRRF) {
    if (baseCents <= anteriorIrrf) break;
    const limite = f.limite === Infinity ? baseCents : BigInt(Math.round(f.limite * 100));
    const aliquota = BigInt(Math.round(f.aliquota * 1000));
    const faixaCents = (baseCents < limite ? baseCents : limite) - anteriorIrrf;
    impostoMilesimos += faixaCents * aliquota;
    anteriorIrrf = limite;
    if (baseCents <= limite) break;
  }
  return Math.max(0, Number(impostoMilesimos / 1000n) / 100);
}
