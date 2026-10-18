// Cálculos de rescisão, provisões e encargos
import { SALARIO_MINIMO_2026, FAIXAS_SEGURO_DESEMPREGO_2026, FAIXAS_PLR_2026 } from './tabelas';
import { calcularINSS, calcularIRRF, calcularFGTS } from './impostos';
import { calcularRescisaoCore } from '@/utils/rescisaoCalc';

export type TipoRescisao =
  | 'sem_justa_causa'
  | 'com_justa_causa'
  | 'justa_causa'
  | 'pedido_demissao'
  | 'acordo_mutuo'
  | 'culpa_reciproca'
  | 'termino_contrato'
  | 'falecimento';

const trunc2 = (n: number): number => Math.trunc(n * 100) / 100;

/**
 * @deprecated Use `calcularRescisao` de `@/utils/rescisaoCalc` — motor único.
 * Shim de compatibilidade que delega ao motor único (mesma saída) e remapeia
 * os nomes históricos dos campos. Mantido porque consumidores legados usam
 * este shape; não contém mais lógica própria de cálculo.
 */
export function calcularRescisao(params: {
  salarioBase: number;
  dataAdmissao: string;
  dataDesligamento: string;
  tipoRescisao: TipoRescisao;
  saldoFGTS?: number;
  feriasVencidas?: boolean;
  avisoTrabalhado?: boolean;
  dependentes?: number;
  diasAvisoNaoCumpridos?: number;
  dataFimContrato?: string;
  terminoIniciativa?: 'empregador' | 'empregado' | 'natural';
  dataPagamento?: string;
}) {
  const r = calcularRescisaoCore({
    salario: params.salarioBase,
    dataAdmissao: params.dataAdmissao,
    dataDesligamento: params.dataDesligamento,
    tipo: params.tipoRescisao,
    avisoTrabalhado: params.avisoTrabalhado ?? false,
    feriasVencidas: params.feriasVencidas ?? false,
    saldoFGTS: params.saldoFGTS ?? 0,
    dependentes: params.dependentes ?? 0,
    diasAvisoNaoCumpridos: params.diasAvisoNaoCumpridos,
    dataFimContrato: params.dataFimContrato,
    terminoIniciativa: params.terminoIniciativa,
    dataPagamento: params.dataPagamento,
  });

  return {
    saldoSalario: r.saldoSalario,
    decimo13Proporcional: r.decimoTerceiro,
    feriasProporcional: r.feriasProporcionais,
    tercoFeriasProporcional: trunc2(r.feriasProporcionais / 3),
    feriasVencidas: r.feriasVencidas,
    tercoFeriasVencidas: trunc2(r.feriasVencidas / 3),
    avisoPrevio: r.avisoIndenizado,
    diasAvisoPrevio: r.diasAviso,
    descontoAvisoPrevio: r.descontoAvisoPrevio,
    indenizacaoArt479: r.indenizacaoArt479,
    indenizacaoArt480: r.indenizacaoArt480,
    multa477: r.multa477,
    fgtsRescisao: r.fgtsRescisao,
    multaFGTS: r.multaFGTS,
    totalBruto: r.totalProventos,
    inss: r.inss,
    irrf: r.irrf,
    totalLiquido: r.totalLiquido,
  };
}

export function calcularAvisoPrevioIndenizado(salarioBase: number, anosServico: number) {
  const dias = Math.min(90, 30 + anosServico * 3);
  const valor = Math.trunc((salarioBase / 30) * dias * 100) / 100;
  return { dias, valor };
}

export function calcularSeguroDesemprego(ultimosSalarios: number[], mesesVinculo: number = 0) {
  if (!ultimosSalarios.length) return { valorParcela: SALARIO_MINIMO_2026, parcelas: 3 };
  const media = ultimosSalarios.reduce((a, b) => a + b, 0) / ultimosSalarios.length;
  const sd = FAIXAS_SEGURO_DESEMPREGO_2026;
  let valorParcela: number;
  if (media <= sd.faixa1Limite) valorParcela = media * sd.faixa1Mult;
  else if (media <= sd.faixa2Limite) valorParcela = sd.faixa2Base + (media - sd.faixa1Limite) * sd.faixa2Mult;
  else valorParcela = sd.teto;
  valorParcela = Math.max(SALARIO_MINIMO_2026, Math.trunc(valorParcela * 100) / 100);
  const ref = mesesVinculo > 0 ? mesesVinculo : ultimosSalarios.length;
  return { valorParcela, parcelas: ref >= 24 ? 5 : ref >= 12 ? 4 : 3 };
}

export function calcularMultaFGTS(
  saldoFGTS: number,
  tipo: 'sem_justa_causa' | 'acordo_mutuo',
  fgtsRescisao = 0
): number {
  const percentual = tipo === 'sem_justa_causa' ? 0.4 : 0.2;
  return Math.trunc((saldoFGTS + fgtsRescisao) * percentual * 100) / 100;
}

// CLT Art. 477 §8°: multa de um salário mensal quando o empregador não quita as verbas rescisórias
// no prazo legal (10 dias corridos para aviso prévio trabalhado; 1° dia útil para demissão imediata).
// Retorna 0 quando o empregador não é o culpado pelo atraso (e.g., força maior, culpa do empregado).
export function calcularMulta477(salarioBase: number, empregadorCulpado: boolean = false): number {
  if (!empregadorCulpado) return 0;
  return Math.trunc(salarioBase * 100) / 100;
}

export function calcularProvisaoFerias(salarioBase: number, mesesAquisitivo: number) {
  const proporcional = (salarioBase / 12) * mesesAquisitivo;
  const provisaoFerias = Math.trunc(proporcional * 100) / 100;
  const provisaoTerco = Math.trunc((provisaoFerias / 3) * 100) / 100;
  const provisaoEncargos = Math.trunc((provisaoFerias + provisaoTerco) * 0.3637 * 100) / 100;
  const total = Math.trunc((provisaoFerias + provisaoTerco + provisaoEncargos) * 100) / 100;
  return { provisaoFerias, provisaoTerco, provisaoEncargos, total };
}

export function calcularProvisao13(salarioBase: number, mesesTrabalhados: number) {
  const provisao13 = Math.trunc((salarioBase / 12) * mesesTrabalhados * 100) / 100;
  const provisaoEncargos = Math.trunc(provisao13 * 0.3637 * 100) / 100;
  const total = Math.trunc((provisao13 + provisaoEncargos) * 100) / 100;
  return { provisao13, provisaoEncargos, total };
}

export function calcularEncargos(
  salarioBase: number,
  percentualRAT: number = 0.03,
  percentualTerceiros: number = 0.058
) {
  const inssEmpregado = calcularINSS(salarioBase);
  const irrfEmpregado = calcularIRRF(salarioBase);
  const fgts = calcularFGTS(salarioBase);

  const inssPatronal = Math.trunc(salarioBase * 0.2 * 100) / 100;
  const rat = Math.trunc(salarioBase * percentualRAT * 100) / 100;
  const terceiros = Math.trunc(salarioBase * percentualTerceiros * 100) / 100;

  const totalEncargosPatronais = Math.trunc((inssPatronal + rat + terceiros + fgts) * 100) / 100;
  const custoMensalTotal = Math.trunc((salarioBase + totalEncargosPatronais) * 100) / 100;

  return {
    inssEmpregado,
    irrfEmpregado,
    fgts,
    inssPatronal,
    rat,
    terceiros,
    totalEncargosPatronais,
    custoMensalTotal,
  };
}

export function calcularProRata(salarioBase: number, diasTrabalhados: number): number {
  return Math.trunc((salarioBase / 30) * diasTrabalhados * 100) / 100;
}

export function calcularMargemConsignado(salarioLiquido: number) {
  return {
    margemTotal: Math.trunc(salarioLiquido * 0.35 * 100) / 100,
    margemCartao: Math.trunc(salarioLiquido * 0.05 * 100) / 100,
  };
}

export function calcularPLR(valor: number) {
  let irrf = 0;
  for (const faixa of FAIXAS_PLR_2026) {
    if (valor <= faixa.limite) {
      irrf = Math.max(0, Math.trunc((valor * faixa.aliquota - faixa.deducao) * 100) / 100);
      break;
    }
  }
  return { bruto: valor, irrf, liquido: Math.trunc((valor - irrf) * 100) / 100 };
}
