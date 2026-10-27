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

export const FAIXAS_IRRF_2026 = [
  { limite: 2259.2, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.0 },
];

export const DEDUCAO_SIMPLIFICADA_IRRF_2026 = 564.8;
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
