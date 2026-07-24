// Cálculos de rescisão, provisões e encargos
import { SALARIO_MINIMO_2026, FAIXAS_SEGURO_DESEMPREGO_2026, FAIXAS_PLR_2026 } from './tabelas';
import { calcularINSS, calcularIRRF, calcularFGTS } from './impostos';

export type TipoRescisao = 'sem_justa_causa' | 'com_justa_causa' | 'pedido_demissao' | 'acordo_mutuo';

// Avos proporcionais (CLT): fração >= 15 dias conta como mês integral.
function calcularAvos(inicio: Date, fim: Date): number {
  if (fim < inicio) return 0;
  const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
  const dataReferencia = new Date(inicio.getFullYear(), inicio.getMonth() + meses, inicio.getDate());
  const diasRestantes = Math.floor((fim.getTime() - dataReferencia.getTime()) / (1000 * 60 * 60 * 24));
  return diasRestantes >= 15 ? meses + 1 : meses;
}

export function calcularRescisao(params: {
  salarioBase: number;
  dataAdmissao: string;
  dataDesligamento: string;
  tipoRescisao: TipoRescisao;
  saldoFGTS?: number;
  feriasVencidas?: boolean;
}) {
  const { salarioBase, dataAdmissao, dataDesligamento, tipoRescisao, saldoFGTS = 0, feriasVencidas = false } = params;
  // Parse as local date (YYYY-MM-DD) to avoid timezone shift
  const admissao = new Date(dataAdmissao + 'T00:00:00');
  const desligamento = new Date(dataDesligamento + 'T00:00:00');
  const avosTotal = calcularAvos(admissao, desligamento);

  // Saldo de salário: dias trabalhados no mês sobre os dias reais do mês.
  const diasNoMes = new Date(desligamento.getFullYear(), desligamento.getMonth() + 1, 0).getDate() || 30;
  const diasTrabalhados = desligamento.getDate();
  const saldoSalario = Math.trunc((salarioBase / diasNoMes) * diasTrabalhados * 100) / 100;

  // 13º proporcional: meses trabalhados no ano-calendário (a partir da admissão, se admitido no ano).
  const inicioAno = new Date(desligamento.getFullYear(), 0, 1);
  const baseInicio13 = admissao > inicioAno ? admissao : inicioAno;
  const meses13 = calcularAvos(baseInicio13, desligamento);
  const decimo13Prop = tipoRescisao !== 'com_justa_causa' ? Math.trunc((salarioBase / 12) * meses13 * 100) / 100 : 0;

  // Férias proporcionais: avos do período aquisitivo corrente (com regra dos 15 dias).
  // C34: avosTotal múltiplo de 12 → período aquisitivo completo, proporcional = 0 (não 12).
  const mesesFeriasProp = avosTotal % 12;
  const feriasProp = tipoRescisao !== 'com_justa_causa' ? Math.trunc((salarioBase / 12) * mesesFeriasProp * 100) / 100 : 0;
  const tercoFeriasProp = Math.trunc(feriasProp / 3 * 100) / 100;
  const feriasVencidasValor = feriasVencidas ? salarioBase : 0;
  const tercoFeriasVencidas = Math.trunc(feriasVencidasValor / 3 * 100) / 100;

  // C35: aviso prévio proporcional usa anos completos de serviço calculados sem a regra de
  // arredondamento dos 15 dias (que inflacionaria avosTotal e, por consequência, os dias extras).
  const rawMeses = (desligamento.getFullYear() - admissao.getFullYear()) * 12
    + (desligamento.getMonth() - admissao.getMonth());
  const anosServico = Math.floor(rawMeses / 12);
  const diasAvisoPrevio = tipoRescisao === 'sem_justa_causa' ? Math.min(90, 30 + anosServico * 3) : 0;
  const avisoPrevio = tipoRescisao === 'sem_justa_causa'
    ? Math.trunc((salarioBase / 30) * diasAvisoPrevio * 100) / 100
    : tipoRescisao === 'acordo_mutuo'
      ? Math.trunc((salarioBase / 30) * Math.min(90, 30 + anosServico * 3) * 0.5 * 100) / 100
      : 0;

  // Multa FGTS (Lei 8.036/90, Art. 18): 40% (sem justa causa) ou 20% (acordo mútuo) sobre saldo acumulado.
  const multaFGTS = tipoRescisao === 'sem_justa_causa'
    ? Math.trunc(saldoFGTS * 0.40 * 100) / 100
    : tipoRescisao === 'acordo_mutuo'
      ? Math.trunc(saldoFGTS * 0.20 * 100) / 100
      : 0;

  const totalBruto = saldoSalario + decimo13Prop + feriasProp + tercoFeriasProp + feriasVencidasValor + tercoFeriasVencidas + avisoPrevio;
  // INSS/IRRF incidem sobre saldo de salário e 13º (em bases separadas); férias indenizadas são isentas.
  const inss = Math.trunc((calcularINSS(saldoSalario) + calcularINSS(decimo13Prop)) * 100) / 100;
  const irrf = Math.trunc((calcularIRRF(saldoSalario) + calcularIRRF(decimo13Prop)) * 100) / 100;
  const totalLiquido = Math.trunc((totalBruto - inss - irrf) * 100) / 100;

  return {
    saldoSalario, decimo13Proporcional: decimo13Prop, feriasProporcional: feriasProp,
    tercoFeriasProporcional: tercoFeriasProp, feriasVencidas: feriasVencidasValor,
    tercoFeriasVencidas, avisoPrevio, diasAvisoPrevio, multaFGTS,
    totalBruto: Math.trunc(totalBruto * 100) / 100, inss, irrf, totalLiquido,
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

export function calcularMultaFGTS(saldoFGTS: number, tipo: 'sem_justa_causa' | 'acordo_mutuo', fgtsRescisao = 0): number {
  const percentual = tipo === 'sem_justa_causa' ? 0.40 : 0.20;
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
  const provisaoTerco = Math.trunc(provisaoFerias / 3 * 100) / 100;
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

export function calcularEncargos(salarioBase: number, percentualRAT: number = 0.03, percentualTerceiros: number = 0.058) {
  const inssEmpregado = calcularINSS(salarioBase);
  const irrfEmpregado = calcularIRRF(salarioBase);
  const fgts = calcularFGTS(salarioBase);

  const inssPatronal = Math.trunc(salarioBase * 0.20 * 100) / 100;
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
    custoMensalTotal
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
