// Tabelas e constantes trabalhistas 2026

export const SALARIO_MINIMO_2026 = 1621.0;

export const FAIXAS_INSS_2026 = [
  { limite: 1621.0, aliquota: 0.075 },
  { limite: 2902.84, aliquota: 0.09 },
  { limite: 4354.27, aliquota: 0.12 },
  { limite: 8475.55, aliquota: 0.14 },
];

export const TETO_INSS_2026 = 8475.55;

// Tabela 2025 (Portaria Interministerial MPS/MF nº 6/2025) — espelha
// supabase/functions/_shared/inss.ts. Rescisões/folhas de anos anteriores
// divergiam da edge, que já é year-aware.
export const FAIXAS_INSS_2025 = [
  { limite: 1518.0, aliquota: 0.075 },
  { limite: 2793.88, aliquota: 0.09 },
  { limite: 4190.83, aliquota: 0.12 },
  { limite: 8157.41, aliquota: 0.14 },
];

export const TETO_INSS_2025 = 8157.41;

export const INSS_POR_ANO: Record<number, { faixas: typeof FAIXAS_INSS_2026; teto: number }> = {
  2025: { faixas: FAIXAS_INSS_2025, teto: TETO_INSS_2025 },
  2026: { faixas: FAIXAS_INSS_2026, teto: TETO_INSS_2026 },
};

// Tabela mensal vigente em 2025 (Lei 14.663/2023, faixas de 05/2023)
export const FAIXAS_IRRF_2025 = [
  { limite: 2259.2, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.0 },
];

// Tabela mensal 2026 (Lei 15.270/2025 — nova 1ª faixa até R$ 2.428,80)
export const FAIXAS_IRRF_2026 = [
  { limite: 2428.8, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { limite: 3751.05, aliquota: 0.15, deducao: 394.16 },
  { limite: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { limite: Infinity, aliquota: 0.275, deducao: 908.73 },
];

export const IRRF_POR_ANO: Record<number, { faixas: typeof FAIXAS_IRRF_2026; simplificado: number }> = {
  2025: { faixas: FAIXAS_IRRF_2025, simplificado: 564.8 },
  2026: { faixas: FAIXAS_IRRF_2026, simplificado: 607.2 },
};

// Redução do imposto devido — Lei 15.270/2025 (art. 3º-A da Lei 9.250/95),
// a partir de jan/2026, sobre os rendimentos tributáveis mensais:
//   rendimento ≤ R$ 5.000      → redução de até R$ 312,89 (limitada ao imposto)
//   R$ 5.000 < rendimento ≤ R$ 7.350 → redução = 978,62 − 0,133145 × rendimento
export const IRRF_2026_ISENCAO_ATE = 5000;
export const IRRF_2026_REDUCAO_ATE = 7350;
export const IRRF_2026_REDUCAO_MAX = 312.89;
export const IRRF_2026_REDUCAO_A = 978.62;
export const IRRF_2026_REDUCAO_B = 0.133145;

export const DEDUCAO_SIMPLIFICADA_IRRF_2026 = 607.2;
export const DEDUCAO_DEPENDENTE_IRRF = 189.59;
export const ALIQUOTA_FGTS = 0.08;

export const SALARIO_FAMILIA_TETO = 1980.38;
export const SALARIO_FAMILIA_VALOR = 67.54;

export const VA_VR_MAX_DESCONTO_PAT = 0.2; // 20% do valor do benefício se for PAT
export const LIMITE_ISENCAO_PLR = 7640.8;

export const FAIXAS_PLR_2026 = [
  { limite: 7640.8, aliquota: 0, deducao: 0 },
  { limite: 9922.28, aliquota: 0.075, deducao: 573.06 },
  { limite: 13167.0, aliquota: 0.15, deducao: 1316.36 },
  { limite: 16380.38, aliquota: 0.225, deducao: 2303.89 },
  { limite: Infinity, aliquota: 0.275, deducao: 3123.78 },
];

export const ENCARGOS_PADRAO = {
  inssPatronal: 0.2,
  rat: 0.03,
  terceiros: 0.058,
  fgts: 0.08,
};

// Seguro-Desemprego 2026 (Resolução CODEFAT — base SM R$1.518,00)
export const FAIXAS_SEGURO_DESEMPREGO_2026 = {
  faixa1Limite: 2041.39,
  faixa1Mult: 0.8,
  faixa2Limite: 3402.65,
  faixa2Base: 1633.1,
  faixa2Mult: 0.5,
  teto: 2313.74,
};
