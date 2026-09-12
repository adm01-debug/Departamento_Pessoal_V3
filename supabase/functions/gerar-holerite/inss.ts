type InssBracket = Readonly<{ limit: number; rate: number }>;

// 2025: Portaria Interministerial MPS/MF nº 6/2025.
// 2026: Portaria Interministerial MPS/MF nº 13/2026.
const TABLES: Readonly<Record<string, readonly InssBracket[]>> = {
  '2025': [
    { limit: 1518, rate: 0.075 },
    { limit: 2793.88, rate: 0.09 },
    { limit: 4190.83, rate: 0.12 },
    { limit: 8157.41, rate: 0.14 },
  ],
  '2026': [
    { limit: 1621, rate: 0.075 },
    { limit: 2902.84, rate: 0.09 },
    { limit: 4354.27, rate: 0.12 },
    { limit: 8475.55, rate: 0.14 },
  ],
};

export function calcularInssEmpregado(base: number, competencia: string): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  const year = competencia.match(/^(\d{4})-(?:0[1-9]|1[0-2])$/)?.[1];
  const brackets = year ? TABLES[year] : undefined;
  if (!brackets) throw new Error(`Tabela INSS não homologada para a competência ${competencia}`);

  let previousLimit = 0;
  let total = 0;
  for (const bracket of brackets) {
    const taxable = Math.max(0, Math.min(base, bracket.limit) - previousLimit);
    total += taxable * bracket.rate;
    previousLimit = bracket.limit;
    if (base <= bracket.limit) break;
  }
  // Compensa apenas o ruído binário do IEEE-754 antes do arredondamento
  // monetário (ex.: 1.621 x 7,5% = 121,575 => R$ 121,58).
  return Math.round((total + 1e-9) * 100) / 100;
}
