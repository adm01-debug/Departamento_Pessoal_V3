// Tabelas INSS por ano-calendário — fonte única para as edge functions.
// 2025: Portaria Interministerial MPS/MF nº 6/2025.
// 2026: Portaria Interministerial MPS/MF nº 13/2026 — espelha
//       FAIXAS_INSS_2026 em src/calculators/tabelas.ts.
// A referência aceita 'YYYY-MM' (competência) ou 'YYYY-MM-DD' (data).

const TABELAS: Readonly<
  Record<string, { tetoCents: bigint; faixasCents: readonly (readonly [bigint, bigint])[] }>
> = {
  '2025': {
    tetoCents: 815_741n,
    faixasCents: [
      [151_800n, 75n], // até 1.518,00 @ 7,5%
      [279_388n, 90n], // até 2.793,88 @ 9%
      [419_083n, 120n], // até 4.190,83 @ 12%
      [815_741n, 140n], // até 8.157,41 @ 14%
    ],
  },
  '2026': {
    tetoCents: 847_555n,
    faixasCents: [
      [162_100n, 75n], // até 1.621,00 @ 7,5%
      [290_284n, 90n], // até 2.902,84 @ 9%
      [435_427n, 120n], // até 4.354,27 @ 12%
      [847_555n, 140n], // até 8.475,55 @ 14%
    ],
  },
};

// Fail-closed: ano sem tabela homologada (ou competência malformada) é
// erro explícito, nunca aplica a tabela errada.
function tabelaDe(referencia: string) {
  const ano = referencia.slice(0, 4);
  // A referência pode ser 'YYYY-MM' ou 'YYYY-MM-DD' — o mês precisa ser
  // válido nos dois formatos ('2026-13' não pode cair na tabela de 2026).
  const mes = referencia.slice(5, 7);
  const tabela = TABELAS[ano];
  if (!tabela || (mes !== '' && !(Number(mes) >= 1 && Number(mes) <= 12))) {
    throw new Error(`Tabela INSS não homologada para a referência ${referencia}`);
  }
  return tabela;
}

// INSS progressivo em centavos. Soma as contribuições das faixas em milésimos
// de centavo e trunca o total uma vez (IN RFB 2110/2022) — mesma convenção do
// motor canônico src/calculators/impostos.ts.
export function calcularINSSCents(baseCents: bigint, referencia: string): bigint {
  if (baseCents <= 0n) return 0n;
  const { tetoCents, faixasCents } = tabelaDe(referencia);
  const b = baseCents < tetoCents ? baseCents : tetoCents;
  let inssMilesimos = 0n;
  let anterior = 0n;
  for (const [limite, aliquota] of faixasCents) {
    if (b <= anterior) break;
    const faixa = (b < limite ? b : limite) - anterior;
    inssMilesimos += faixa * aliquota;
    anterior = limite;
    if (b <= limite) break;
  }
  return inssMilesimos / 1000n;
}

// INSS progressivo em reais. Delega ao cálculo exato em centavos — acumular
// faixas em float antes do truncamento perde 1 centavo em bases com
// centavos exatos na fronteira (ex.: 1.700,50 → 128,73, não 128,72).
export function calcularINSS(salario: number, referencia: string): number {
  if (!Number.isFinite(salario) || salario <= 0) return 0;
  const baseCents = BigInt(Math.round(salario * 100));
  return Number(calcularINSSCents(baseCents, referencia)) / 100;
}
