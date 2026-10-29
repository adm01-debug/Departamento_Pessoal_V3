// Cálculos base: INSS, IRRF, FGTS
import {
  FAIXAS_INSS_2026,
  DEDUCAO_DEPENDENTE_IRRF,
  ALIQUOTA_FGTS,
  TETO_INSS_2026,
  INSS_POR_ANO,
  IRRF_POR_ANO,
  IRRF_2026_ISENCAO_ATE,
  IRRF_2026_REDUCAO_ATE,
  IRRF_2026_REDUCAO_MAX,
  IRRF_2026_REDUCAO_A,
  IRRF_2026_REDUCAO_B,
} from './tabelas';

// INSS progressivo em centavos: soma as contribuições das faixas em
// milésimos de centavo e trunca o total uma vez — acumular em float perdia
// 1 centavo em bases com centavos na fronteira da faixa (ex.: 1.700,50).
// Mesma convenção das edge functions (_shared/inss.ts). `ano` seleciona a
// tabela por ano-calendário (default: mais recente); ano sem tabela cai na
// mais próxima (a mais antiga quando abaixo do intervalo, a mais recente
// quando acima — simulador; a edge falha fechado em ambos os casos).
export function calcularINSS(salarioBruto: number, ano: number = 2026): number {
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos

  const anos = Object.keys(INSS_POR_ANO)
    .map(Number)
    .sort((a, b) => a - b);
  const anoTabela = anos.filter((a) => a <= ano).pop() ?? anos[0];
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

  // Tabela por ano-calendário (mesma convenção do INSS: mais próxima)
  const anos = Object.keys(IRRF_POR_ANO)
    .map(Number)
    .sort((a, b) => a - b);
  const anoTabela = anos.filter((a) => a <= ano).pop() ?? anos[0];
  const { faixas, simplificado } = IRRF_POR_ANO[anoTabela];

  // Opção 1: Deduções Legais
  const baseCalculoLegal = salarioBruto - descontoINSS - dependentes * DEDUCAO_DEPENDENTE_IRRF - outrasDeducoes;

  // Opção 2: Desconto Simplificado
  const baseCalculoSimplificado = salarioBruto - simplificado;

  // A Receita Federal utiliza a base que for mais benéfica para o contribuinte (menor imposto)
  const baseCalculo = Math.max(0, Math.min(baseCalculoLegal, baseCalculoSimplificado));

  if (baseCalculo <= 0) return 0;

  // Mesma convenção do INSS: centavos inteiros por faixa, truncamento único.
  const baseCents = BigInt(Math.round(baseCalculo * 100));
  let impostoMilesimos = 0n;
  let anteriorIrrf = 0n;
  for (const faixa of faixas) {
    if (baseCents <= anteriorIrrf) break;
    const limite = faixa.limite === Infinity ? baseCents : BigInt(Math.round(faixa.limite * 100));
    const aliquota = BigInt(Math.round(faixa.aliquota * 1000));
    const faixaCents = (baseCents < limite ? baseCents : limite) - anteriorIrrf;
    impostoMilesimos += faixaCents * aliquota;
    anteriorIrrf = limite;
    if (baseCents <= limite) break;
  }

  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  const imposto = Math.max(0, Number(impostoMilesimos / 1000n) / 100);

  // Lei 15.270/2025: redução do imposto devido a partir de jan/2026 sobre os
  // rendimentos tributáveis mensais (salário bruto, não a base de cálculo).
  if (ano >= 2026 && salarioBruto <= IRRF_2026_REDUCAO_ATE) {
    const reducao =
      salarioBruto <= IRRF_2026_ISENCAO_ATE
        ? Math.min(imposto, IRRF_2026_REDUCAO_MAX)
        : Math.max(0, IRRF_2026_REDUCAO_A - IRRF_2026_REDUCAO_B * salarioBruto);
    return Math.max(0, Math.round((imposto - reducao) * 100) / 100);
  }

  return imposto;
}

export function calcularFGTS(salarioBruto: number): number {
  if (!(salarioBruto > 0)) return 0; // captura também NaN/negativos
  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  return Math.trunc(salarioBruto * ALIQUOTA_FGTS * 100) / 100;
}
