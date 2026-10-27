// Cálculos base: INSS, IRRF, FGTS
import {
  FAIXAS_INSS_2026,
  FAIXAS_IRRF_2026,
  DEDUCAO_DEPENDENTE_IRRF,
  ALIQUOTA_FGTS,
  DEDUCAO_SIMPLIFICADA_IRRF_2026,
  TETO_INSS_2026,
  INSS_POR_ANO,
} from './tabelas';

// INSS progressivo em centavos: soma as contribuições das faixas em
// milésimos de centavo e trunca o total uma vez — acumular em float perdia
// 1 centavo em bases com centavos na fronteira da faixa (ex.: 1.700,50).
// Mesma convenção das edge functions (_shared/inss.ts). `ano` seleciona a
// tabela por ano-calendário (default: mais recente); ano sem tabela cai na
// mais próxima anterior, senão na mais recente.
export function calcularINSS(salarioBruto: number, ano: number = 2026): number {
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos

  const anos = Object.keys(INSS_POR_ANO)
    .map(Number)
    .sort((a, b) => a - b);
  const anoTabela = anos.filter((a) => a <= ano).pop() ?? anos[anos.length - 1];
  const { faixas, teto } = INSS_POR_ANO[anoTabela];

  const baseCents = BigInt(Math.round(salarioBruto * 100));
  const tetoCents = BigInt(Math.round(teto * 100));
  const b = baseCents < tetoCents ? baseCents : tetoCents;

  let inssMilesimos = 0n;
  let anterior = 0n;
  for (const faixa of faixas) {
    if (b <= anterior) break;
    const limite = BigInt(Math.round(faixa.limite * 100));
    const aliquota = BigInt(Math.round(faixa.aliquota * 1000));
    const faixaCents = (b < limite ? b : limite) - anterior;
    inssMilesimos += faixaCents * aliquota;
    anterior = limite;
    if (b <= limite) break;
  }

  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  return Number(inssMilesimos / 1000n) / 100;
}

export function calcularIRRF(
  salarioBruto: number,
  dependentes: number = 0,
  outrasDeducoes: number = 0,
  // Pensão alimentícia recebida é isenta de IRRF (Art. 6°, XXXIII, Lei 7.713/88)
  isPensaoAlimenticia: boolean = false,
  ano: number = 2026
): number {
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos
  if (isPensaoAlimenticia) return 0; // rendimento isento — sem incidência de IRRF

  const descontoINSS = calcularINSS(salarioBruto, ano);

  // Opção 1: Deduções Legais
  const baseCalculoLegal = salarioBruto - descontoINSS - dependentes * DEDUCAO_DEPENDENTE_IRRF - outrasDeducoes;

  // Opção 2: Desconto Simplificado
  const baseCalculoSimplificado = salarioBruto - DEDUCAO_SIMPLIFICADA_IRRF_2026;

  // A Receita Federal utiliza a base que for mais benéfica para o contribuinte (menor imposto)
  const baseCalculo = Math.max(0, Math.min(baseCalculoLegal, baseCalculoSimplificado));

  if (baseCalculo <= 0) return 0;

  // Mesma convenção do INSS: centavos inteiros por faixa, truncamento único.
  const baseCents = BigInt(Math.round(baseCalculo * 100));
  let impostoMilesimos = 0n;
  let anteriorIrrf = 0n;
  for (const faixa of FAIXAS_IRRF_2026) {
    if (baseCents <= anteriorIrrf) break;
    const limite = faixa.limite === Infinity ? baseCents : BigInt(Math.round(faixa.limite * 100));
    const aliquota = BigInt(Math.round(faixa.aliquota * 1000));
    const faixaCents = (baseCents < limite ? baseCents : limite) - anteriorIrrf;
    impostoMilesimos += faixaCents * aliquota;
    anteriorIrrf = limite;
    if (baseCents <= limite) break;
  }

  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  return Math.max(0, Number(impostoMilesimos / 1000n) / 100);
}

export function calcularFGTS(salarioBruto: number): number {
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos
  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  return Math.trunc(salarioBruto * ALIQUOTA_FGTS * 100) / 100;
}
