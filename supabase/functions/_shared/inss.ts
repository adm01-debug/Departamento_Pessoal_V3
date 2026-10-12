// Tabela INSS vigente — fonte única para as edge functions.
// Deve ficar alinhada com FAIXAS_INSS_2026 em src/calculators/tabelas.ts.

export const FAIXAS_INSS = [
  { limite: 1621.0, aliquota: 0.075 },
  { limite: 2902.84, aliquota: 0.09 },
  { limite: 4354.27, aliquota: 0.12 },
  { limite: 8475.55, aliquota: 0.14 },
] as const;

export const TETO_INSS = 8475.55;
export const TETO_INSS_CENTS = 847_555n;

const trunc2 = (n: number): number => Math.trunc(n * 100) / 100;

// INSS progressivo por faixas (retorna reais truncados em 2 casas)
export function calcularINSS(salario: number): number {
  if (!Number.isFinite(salario) || salario <= 0) return 0;
  const base = Math.min(salario, TETO_INSS);
  let desc = 0;
  let rest = base;
  for (let i = 0; i < FAIXAS_INSS.length; i++) {
    const limAnt = i === 0 ? 0 : FAIXAS_INSS[i - 1].limite;
    const f = Math.min(rest, FAIXAS_INSS[i].limite - limAnt);
    if (f <= 0) break;
    desc += f * FAIXAS_INSS[i].aliquota;
    rest -= f;
  }
  return trunc2(desc);
}

const FAIXAS_CENTS: readonly (readonly [bigint, bigint])[] = [
  [162_100n, 75n], // até 1.621,00 @ 7,5%
  [290_284n, 90n], // até 2.902,84 @ 9%
  [435_427n, 120n], // até 4.354,27 @ 12%
  [847_555n, 140n], // até 8.475,55 @ 14%
];

// INSS progressivo em centavos. Soma as contribuições das faixas em milésimos
// de centavo e trunca o total uma vez (IN RFB 2110/2022) — mesma convenção do
// motor canônico src/calculators/impostos.ts e de gerar-holerite/inss.ts.
export function calcularINSSCents(baseCents: bigint): bigint {
  if (baseCents <= 0n) return 0n;
  const b = baseCents < TETO_INSS_CENTS ? baseCents : TETO_INSS_CENTS;
  let inssMilesimos = 0n;
  let anterior = 0n;
  for (const [limite, aliquota] of FAIXAS_CENTS) {
    if (b <= anterior) break;
    const faixa = (b < limite ? b : limite) - anterior;
    inssMilesimos += faixa * aliquota;
    anterior = limite;
    if (b <= limite) break;
  }
  return inssMilesimos / 1000n;
}
