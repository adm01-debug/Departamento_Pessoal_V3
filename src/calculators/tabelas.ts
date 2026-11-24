// Tabelas e constantes trabalhistas 2026

export const SALARIO_MINIMO_2026 = 1621.00;

export const FAIXAS_INSS_2026 = [
  { limite: 1621.00, aliquota: 0.075 },
  { limite: 2902.84, aliquota: 0.09 },
  { limite: 4354.27, aliquota: 0.12 },
  { limite: 8475.55, aliquota: 0.14 },
];

export const TETO_INSS_2026 = 8475.55;

export const FAIXAS_IRRF_2026 = [
  { limite: 2259.20, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];

export const DEDUCAO_SIMPLIFICADA_IRRF_2026 = 564.80;
export const DEDUCAO_DEPENDENTE_IRRF = 189.59;
export const ALIQUOTA_FGTS = 0.08;

export const SALARIO_FAMILIA_TETO = 1980.38;
export const SALARIO_FAMILIA_VALOR = 67.54;

export const VA_VR_MAX_DESCONTO_PAT = 0.20; // 20% do valor do benefício se for PAT
export const LIMITE_ISENCAO_PLR = 7640.80;

export const FAIXAS_PLR_2026 = [
  { limite: 7640.80, aliquota: 0, deducao: 0 },
  { limite: 9922.28, aliquota: 0.075, deducao: 573.06 },
  { limite: 13167.00, aliquota: 0.15, deducao: 1316.36 },
  { limite: 16380.38, aliquota: 0.225, deducao: 2303.89 },
  { limite: Infinity, aliquota: 0.275, deducao: 3123.78 },
];

export const ENCARGOS_PADRAO = {
  inssPatronal: 0.20,
  rat: 0.03,
  terceiros: 0.058,
  fgts: 0.08,
};

// Encargos patronais incidentes sobre a provisão de férias e 13º, por regime
// tributário da empresa (coluna `empresas.regime_tributario`).
//  - Simples Nacional: a CPP (INSS patronal) e as contribuições de Terceiros
//    estão embutidas no DAS (LC 123/2006, art. 13, §3º) — sobre a folha incide
//    apenas o FGTS. Exceção do Anexo IV (art. 18, §5º-C): CPP e RAT/FAP são
//    recolhidos fora do DAS; Terceiros seguem dispensados.
//  - Lucro Real/Presumido, MEI e regime ausente/desconhecido: alíquota cheia.
//    Na dúvida o sistema não subestima o passivo provisionado.
// Espelhado manualmente em supabase/functions/calcular-provisoes/index.ts
// (edge não pode importar de src/).
export const ALIQUOTA_ENCARGOS_PROVISAO = {
  padrao: ENCARGOS_PADRAO.inssPatronal + ENCARGOS_PADRAO.rat + ENCARGOS_PADRAO.terceiros + ENCARGOS_PADRAO.fgts,
  simplesNacional: ENCARGOS_PADRAO.fgts,
  simplesAnexoIV: ENCARGOS_PADRAO.inssPatronal + ENCARGOS_PADRAO.rat + ENCARGOS_PADRAO.fgts,
};

/**
 * Alíquota de encargos patronais da provisão para o regime informado.
 * `regime` e `simplesAnexo` chegam crus do banco (enum/texto), por isso aceitam
 * nulo: qualquer valor fora de `simples_nacional` mantém a alíquota cheia.
 */
export function aliquotaEncargosProvisao(regime: string | null | undefined, simplesAnexo?: string | null): number {
  if (regime !== 'simples_nacional') return ALIQUOTA_ENCARGOS_PROVISAO.padrao;
  if (simplesAnexo === 'IV') return ALIQUOTA_ENCARGOS_PROVISAO.simplesAnexoIV;
  // Anexo ausente = anexo desconhecido. `empresas.simples_anexo` é nullable e a
  // tela permite salvar sem ele, então reduzir aqui subestimaria o passivo de
  // uma empresa do Anexo IV mal cadastrada.
  if (!simplesAnexo) return ALIQUOTA_ENCARGOS_PROVISAO.padrao;
  return ALIQUOTA_ENCARGOS_PROVISAO.simplesNacional;
}

// Seguro-Desemprego 2026 (Resolução CODEFAT — base SM R$1.518,00)
export const FAIXAS_SEGURO_DESEMPREGO_2026 = {
  faixa1Limite: 2041.39,
  faixa1Mult: 0.8,
  faixa2Limite: 3402.65,
  faixa2Base: 1633.10,
  faixa2Mult: 0.5,
  teto: 2313.74,
};
