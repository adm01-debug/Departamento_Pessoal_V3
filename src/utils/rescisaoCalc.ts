/**
 * Motor ÚNICO de Cálculo de Rescisão - Conformidade CLT 2026
 * Implementa cálculos de verbas rescisórias, descontos legais (INSS/IRRF) e multas.
 * Baseado na Lei 12.506/2011 (Aviso Prévio Proporcional) e Artigos 477 a 487 da CLT.
 *
 * É a fonte de verdade para:
 *  - o botão "Calcular Local" e o rescisaoService.calcularESalvar (front);
 *  - src/calculators/rescisao.ts (shim de compatibilidade — @deprecated);
 *  - supabase/functions/calcular-rescisao/motor.ts (espelho Deno portado
 *    manualmente — edge não pode importar de src/).
 *
 * Cobertura legal implementada:
 *  - OJ 82 SDI-I TST: aviso prévio INDENIZADO projeta os avos de férias/13º
 *    (somente o período efetivamente indenizado: 100% sem justa causa,
 *    50% no acordo 484-A e na culpa recíproca — Súmula 14 TST).
 *  - Período aquisitivo completado pela projeção paga 12/12 avos,
 *    EXCETO quando `ferias_vencidas` já cobre esse período (sem dupla contagem).
 *  - Art. 479/480 CLT: término antecipado de contrato a prazo (indenização de
 *    50% dos dias restantes — provento para o empregado ou desconto a favor
 *    do empregador).
 *  - Art. 487 §2º CLT: pedido de demissão sem aviso cumprido desconta o aviso.
 *  - Art. 484-A: aviso 50%, multa FGTS 20%, saque FGTS limitado a 80% e
 *    sem direito a seguro-desemprego (campos informativos).
 *  - Súmula 14 TST (culpa recíproca): aviso, férias proporcionais e 13º a 50%,
 *    multa FGTS 20%.
 *  - Art. 477 §8º CLT: pagamento após 10 dias corridos do desligamento
 *    adiciona multa de 1 salário ao resultado.
 *  - Multa FGTS NÃO integra o total líquido do empregado: é depósito na
 *    conta vinculada (GRRF), exposta como campo separado.
 *  - Seguro-desemprego exposto como campo informativo (elegibilidade,
 *    parcelas estimadas, valor estimado) — sem emissão de guia.
 */

import { calcularINSS, calcularIRRF } from '@/calculators/impostos';
import { SALARIO_MINIMO_2026, FAIXAS_SEGURO_DESEMPREGO_2026 } from '@/calculators/tabelas';
import { signCalculation } from '@/calculators/auditHelper';

const trunc2 = (n: number): number => Math.trunc(n * 100) / 100;
const DIA_MS = 1000 * 60 * 60 * 24;

/**
 * Calcula a quantidade de meses (avos) proporcionais entre duas datas.
 * Considera a regra da CLT: fração igual ou superior a 15 dias conta como mês integral.
 */
function calcularAvos(inicio: Date, fim: Date): number {
  if (fim < inicio) return 0;

  let meses = (fim.getFullYear() - inicio.getFullYear()) * 12;
  meses += fim.getMonth() - inicio.getMonth();

  const diaInicio = inicio.getDate();
  const diaFim = fim.getDate();

  if (diaFim < diaInicio - 1) {
    meses--;
  }

  const anoRef = inicio.getFullYear();
  const mesRef = inicio.getMonth() + meses;
  // Clamp diaInicio to the last valid day of mesRef (avoids Jan 31 + 1 month = Mar 3 overflow).
  const ultimoDiaMesRef = new Date(anoRef, mesRef + 1, 0).getDate();
  const dataReferencia = new Date(anoRef, mesRef, Math.min(inicio.getDate(), ultimoDiaMesRef));
  const diffTime = fim.getTime() - dataReferencia.getTime();
  const diasRestantes = Math.floor(diffTime / DIA_MS);

  return diasRestantes >= 15 ? meses + 1 : meses;
}

/**
 * Anos completos de serviço pela regra do aniversário (Lei 12.506/2011:
 * +3 dias de aviso por ano de serviço prestado à mesma empresa).
 * A alternativa floor(dias/365,25) erra em aniversários exatos
 * (365/365,25 = 0 → funcionário com 1 ano completo recebia só 30 dias).
 */
function anosCompletosServico(inicio: Date, fim: Date): number {
  let anos = fim.getFullYear() - inicio.getFullYear();
  const aniversario = new Date(fim.getFullYear(), inicio.getMonth(), inicio.getDate());
  if (fim < aniversario) anos--;
  return Math.max(0, anos);
}

/**
 * Normaliza aliases legados e os valores do enum `tipo_desligamento`
 * ('acordo', 'fim_contrato') para o tipo canônico do motor.
 */
export function normalizarTipoRescisao(tipo: string): string {
  switch (tipo) {
    case 'com_justa_causa':
      return 'justa_causa';
    case 'acordo':
      return 'acordo_mutuo';
    case 'fim_contrato':
      return 'termino_contrato';
    default:
      return tipo;
  }
}

export interface SeguroDesempregoInfo {
  elegivel: boolean;
  parcelas: number;
  valorParcela: number;
}

export interface RescisaoResult {
  saldoSalario: number;
  avisoIndenizado: number;
  descontoAvisoPrevio: number;
  feriasVencidas: number;
  feriasProporcionais: number;
  tercoFerias: number;
  decimoTerceiro: number;
  indenizacaoArt479: number;
  indenizacaoArt480: number;
  multa477: number;
  multaFGTS: number;
  fgtsRescisao: number;
  fgtsSaquePercentual: number;
  seguroDesemprego: SeguroDesempregoInfo;
  totalProventos: number;
  inss: number;
  irrf: number;
  totalDescontos: number;
  totalLiquido: number;
  diasTrabalhados: number;
  mesesFerias: number;
  meses13: number;
  diasAviso: number;
  diasAvisoNaoCumpridos: number;
  assinaturaDigital?: string;
  timestamp: string;
}

export interface RescisaoParams {
  salario: number;
  dataAdmissao: string;
  dataDesligamento: string;
  tipo: string;
  avisoTrabalhado: boolean;
  feriasVencidas: boolean;
  saldoFGTS: number;
  dependentes?: number;
  /** Pedido de demissão: dias de aviso prévio NÃO cumpridos pelo empregado
   *  (art. 487 §2º CLT). Omitido: 30 dias quando `avisoTrabalhado` é falso. */
  diasAvisoNaoCumpridos?: number;
  /** Contrato a prazo/experiência: data prevista de fim do contrato.
   *  Necessária para aplicar a indenização dos arts. 479/480. */
  dataFimContrato?: string;
  /** Quem antecipa o contrato a prazo: 'empregador' (art. 479, provento),
   *  'empregado' (art. 480, desconto) ou 'natural' (fim do prazo, sem indenização). */
  terminoIniciativa?: 'empregador' | 'empregado' | 'natural';
  /** Data efetiva do pagamento das verbas; acima de desligamento + 10 dias
   *  corridos aplica a multa de 1 salário (art. 477 §8º CLT). */
  dataPagamento?: string;
}

/**
 * Estimativa da parcela de seguro-desemprego (Resolução CODEFAT — tabela
 * FAIXAS_SEGURO_DESEMPREGO_2026, mínimo = salário mínimo 2026).
 */
function estimarParcelaSeguro(salarioMedio: number): number {
  const sd = FAIXAS_SEGURO_DESEMPREGO_2026;
  let valor: number;
  if (salarioMedio <= sd.faixa1Limite) valor = salarioMedio * sd.faixa1Mult;
  else if (salarioMedio <= sd.faixa2Limite) valor = sd.faixa2Base + (salarioMedio - sd.faixa1Limite) * sd.faixa2Mult;
  else valor = sd.teto;
  return Math.max(SALARIO_MINIMO_2026, trunc2(valor));
}

/**
 * Núcleo síncrono e puro do cálculo — compartilhado pelo shim legado
 * (src/calculators/rescisao.ts) e espelhado na edge function.
 */
export function calcularRescisaoCore(params: RescisaoParams): RescisaoResult {
  const {
    salario,
    dataAdmissao,
    dataDesligamento,
    avisoTrabalhado,
    feriasVencidas: feriasVencidasFlag,
    saldoFGTS,
    dependentes = 0,
  } = params;

  if (salario <= 0) throw new Error('Salário deve ser maior que zero');

  const admissao = new Date(dataAdmissao + 'T00:00:00');
  const desligamento = new Date(dataDesligamento + 'T00:00:00');

  if (isNaN(admissao.getTime()) || isNaN(desligamento.getTime())) {
    throw new Error('Datas inválidas');
  }

  if (desligamento < admissao) {
    throw new Error('Data de desligamento não pode ser anterior à admissão');
  }

  const tipo = normalizarTipoRescisao(params.tipo);
  const terminoIniciativa = params.terminoIniciativa ?? 'empregador';

  // 1. Saldo de Salário (Art. 4º CLT)
  const diasNoMes = new Date(desligamento.getFullYear(), desligamento.getMonth() + 1, 0).getDate();
  const diasTrabalhados = desligamento.getDate();
  const saldoSalario = trunc2((salario / diasNoMes) * diasTrabalhados);

  // 2. Aviso Prévio (Lei 12.506/2011) — anos completos de serviço.
  const anosServico = anosCompletosServico(admissao, desligamento);
  const diasAviso = Math.min(90, 30 + anosServico * 3);

  // Projeção do aviso INDENIZADO nos avos de férias/13º (OJ 82 SDI-I TST).
  // Apenas o período efetivamente indenizado projeta: 100% em sem_justa_causa,
  // 50% no acordo mútuo (art. 484-A) e na culpa recíproca (Súmula 14 TST).
  let diasAvisoIndenizados = 0;
  if (!avisoTrabalhado) {
    if (tipo === 'sem_justa_causa') {
      diasAvisoIndenizados = diasAviso;
    } else if (tipo === 'acordo_mutuo' || tipo === 'culpa_reciproca') {
      diasAvisoIndenizados = diasAviso / 2;
    }
  }

  const dataFimProjetada = new Date(desligamento);
  dataFimProjetada.setDate(dataFimProjetada.getDate() + diasAvisoIndenizados);

  const avisoIndenizado = trunc2((salario / 30) * diasAvisoIndenizados);

  // 2b. Pedido de demissão com aviso prévio não cumprido (art. 487 §2º CLT):
  // desconto dos dias faltantes (padrão 30 quando o aviso não foi trabalhado).
  const diasAvisoNaoCumpridos =
    tipo === 'pedido_demissao'
      ? Math.min(30, Math.max(0, params.diasAvisoNaoCumpridos ?? (avisoTrabalhado ? 0 : 30)))
      : 0;
  const descontoAvisoPrevio = trunc2((salario / 30) * diasAvisoNaoCumpridos);

  // 3. Férias (Art. 146 CLT) — com projeção do aviso indenizado.
  const mesesFerias = calcularAvos(admissao, dataFimProjetada);
  const avosResto = mesesFerias % 12;
  const completouPeriodo = mesesFerias > 0 && avosResto === 0;
  // Projeção que fecha o período aquisitivo paga 12/12 — menos quando
  // `ferias_vencidas` já cobre esse período completo (evita dupla contagem).
  const mesesFeriasPagos = avosResto || (completouPeriodo && !feriasVencidasFlag ? 12 : 0);
  let feriasProporcionaisVal = 0;
  if (tipo !== 'justa_causa') {
    feriasProporcionaisVal = trunc2((salario / 12) * mesesFeriasPagos);
    if (tipo === 'culpa_reciproca') {
      feriasProporcionaisVal = trunc2(feriasProporcionaisVal / 2);
    }
  }

  // Férias vencidas (período aquisitivo já fechado) são devidas inclusive na
  // justa causa — a demissão por justa causa só perde as PROPORCIONAIS (art. 146).
  const feriasVencidasVal = feriasVencidasFlag ? salario : 0;
  const tercoFerias = trunc2((feriasProporcionaisVal + feriasVencidasVal) / 3);

  // 4. 13º Salário (Lei 4.090/62) - Com projeção do aviso
  // O ano-base do 13º é o ano do DESLIGAMENTO. Usar o ano da data projetada
  // zerava os avos quando a projeção do aviso cruzava para janeiro do ano
  // seguinte (ex.: desligamento em 15/nov projetava p/ jan → meses13 = 0).
  const inicioAno = new Date(desligamento.getFullYear(), 0, 1);
  const dataBase13 = admissao > inicioAno ? admissao : inicioAno;
  const meses13 = Math.min(12, calcularAvos(dataBase13, dataFimProjetada));

  let decimoTerceiro = 0;
  if (tipo !== 'justa_causa' && tipo !== 'culpa_reciproca') {
    decimoTerceiro = trunc2((salario / 12) * meses13);
  } else if (tipo === 'culpa_reciproca') {
    decimoTerceiro = trunc2(((salario / 12) * meses13) / 2);
  }

  // 5. Indenização dos arts. 479/480 CLT — contrato a prazo/experiência
  // encerrado antes do fim previsto: 50% dos dias restantes do contrato.
  // Art. 479 (empregador demite) → provento; art. 480 (empregado pede) → desconto.
  let indenizacaoArt479 = 0;
  let indenizacaoArt480 = 0;
  if (tipo === 'termino_contrato' && params.dataFimContrato) {
    const fimPrevisto = new Date(params.dataFimContrato + 'T00:00:00');
    if (!isNaN(fimPrevisto.getTime())) {
      const diasRestantes = Math.ceil((fimPrevisto.getTime() - desligamento.getTime()) / DIA_MS);
      if (diasRestantes > 0) {
        const valor = trunc2((salario / 30) * diasRestantes * 0.5);
        if (terminoIniciativa === 'empregado') {
          indenizacaoArt480 = valor;
        } else if (terminoIniciativa !== 'natural') {
          indenizacaoArt479 = valor;
        }
      }
    }
  }

  // 6. FGTS e Multa (Art. 18 Lei 8.036/90). A multa é depósito na conta
  // vinculada (GRRF) — NÃO é verba do TRCT e fica fora do total líquido.
  const fgtsRescisao = trunc2((saldoSalario + avisoIndenizado + decimoTerceiro) * 0.08);
  let multaFGTS = 0;
  // Término de contrato a prazo pela iniciativa do empregador OU no prazo
  // natural paga multa de 40%; só a iniciativa do empregado a perde.
  if (tipo === 'sem_justa_causa' || (tipo === 'termino_contrato' && terminoIniciativa !== 'empregado')) {
    multaFGTS = trunc2((saldoFGTS + fgtsRescisao) * 0.4);
  } else if (tipo === 'acordo_mutuo' || tipo === 'culpa_reciproca') {
    multaFGTS = trunc2((saldoFGTS + fgtsRescisao) * 0.2);
  }

  // 7. Multa do art. 477 §8º CLT — verbas quitadas após 10 dias corridos
  // do desligamento geram multa de 1 salário a favor do empregado.
  let multa477 = 0;
  if (params.dataPagamento) {
    const pagamento = new Date(params.dataPagamento + 'T00:00:00');
    if (!isNaN(pagamento.getTime()) && Math.floor((pagamento.getTime() - desligamento.getTime()) / DIA_MS) > 10) {
      multa477 = trunc2(salario);
    }
  }

  // 8. Totais e Descontos — INSS/IRRF incidem separadamente sobre saldo de
  // salário e 13º; férias/aviso indenizados e indenizações são isentos.
  const totalProventos = trunc2(
    saldoSalario +
      avisoIndenizado +
      feriasVencidasVal +
      feriasProporcionaisVal +
      tercoFerias +
      decimoTerceiro +
      indenizacaoArt479 +
      multa477
  );

  const inssSaldo = calcularINSS(saldoSalario);
  const inss13 = calcularINSS(decimoTerceiro);
  // Soma em inteiros de centavos para não perder 1 centavo em drift IEEE754.
  const inss = (Math.round(inssSaldo * 100) + Math.round(inss13 * 100)) / 100;

  const irrfSaldo = calcularIRRF(saldoSalario, dependentes, 0);
  const irrf13 = calcularIRRF(decimoTerceiro, 0, 0);
  const irrf = (Math.round(irrfSaldo * 100) + Math.round(irrf13 * 100)) / 100;

  // Descontos incluem o aviso não cumprido (487 §2º) e a indenização do
  // art. 480 devida pelo empregado ao empregador.
  const totalDescontos = trunc2(inss + irrf + descontoAvisoPrevio + indenizacaoArt480);
  const totalLiquido = trunc2(totalProventos - totalDescontos);

  // 9. Informativos — saque FGTS (484-A limita a 80%) e seguro-desemprego
  // (elegibilidade requer dispensa involuntária + vínculo mínimo de 12 meses
  // na 1ª solicitação; estimativa apenas, sem emissão de guia).
  const fgtsSaquePercentual =
    tipo === 'acordo_mutuo'
      ? 0.8
      : tipo === 'justa_causa' ||
          tipo === 'pedido_demissao' ||
          (tipo === 'termino_contrato' && terminoIniciativa === 'empregado')
        ? 0
        : 1;

  const avosServico = calcularAvos(admissao, desligamento);
  const dispensaInvoluntaria =
    tipo === 'sem_justa_causa' ||
    tipo === 'culpa_reciproca' ||
    (tipo === 'termino_contrato' && terminoIniciativa !== 'empregado');
  const seguroElegivel = dispensaInvoluntaria && avosServico >= 12;
  const seguroDesemprego: SeguroDesempregoInfo = {
    elegivel: seguroElegivel,
    parcelas: seguroElegivel ? (avosServico >= 24 ? 5 : 4) : 0,
    valorParcela: seguroElegivel ? estimarParcelaSeguro(salario) : 0,
  };

  return {
    saldoSalario,
    avisoIndenizado,
    descontoAvisoPrevio,
    feriasVencidas: feriasVencidasVal,
    feriasProporcionais: feriasProporcionaisVal,
    tercoFerias,
    decimoTerceiro,
    indenizacaoArt479,
    indenizacaoArt480,
    multa477,
    multaFGTS,
    fgtsRescisao,
    fgtsSaquePercentual,
    seguroDesemprego,
    totalProventos,
    inss,
    irrf,
    totalDescontos,
    totalLiquido,
    diasTrabalhados,
    mesesFerias: mesesFeriasPagos,
    meses13,
    diasAviso,
    diasAvisoNaoCumpridos,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Motor de Cálculo CLT com Assinatura Digital e Tratamento de Erros
 */
export async function calcularRescisao(params: RescisaoParams): Promise<RescisaoResult> {
  try {
    const result = calcularRescisaoCore(params);
    // Assinatura digital do resultado para auditoria e integridade
    result.assinaturaDigital = await signCalculation(result);
    return result;
  } catch (e: unknown) {
    if (e instanceof Error) throw e;
    throw new Error(String(e), { cause: e });
  }
}

export function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
