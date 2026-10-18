// Motor puro da rescisão (Deno) — espelho portado de
// src/utils/rescisaoCalc.ts::calcularRescisaoCore (motor único do front).
// Edge functions não podem importar de src/: qualquer mudança no motor
// canônico exige porte manual para este arquivo (mesmas regras/valores).
import { calcularINSS } from '../_shared/inss.ts';

export const trunc2 = (n: number): number => Math.trunc(n * 100) / 100;
const DIA_MS = 1000 * 60 * 60 * 24;
const DEDUCAO_SIMPLIFICADA_IRRF = 564.80; // Lei 14.663/2023
const DEDUCAO_DEPENDENTE_IRRF = 189.59;

const FAIXAS_IRRF = [
  { l: 2259.20, a: 0, d: 0 },
  { l: 2826.65, a: 0.075, d: 169.44 },
  { l: 3751.05, a: 0.15, d: 381.44 },
  { l: 4664.68, a: 0.225, d: 662.77 },
  { l: Infinity, a: 0.275, d: 896.00 },
];

// Seguro-desemprego 2026 — espelha FAIXAS_SEGURO_DESEMPREGO_2026 e
// SALARIO_MINIMO_2026 de src/calculators/tabelas.ts.
const SALARIO_MINIMO = 1621.00;
const SEGURO_DESEMPREGO = {
  faixa1Limite: 2041.39,
  faixa1Mult: 0.8,
  faixa2Limite: 3402.65,
  faixa2Base: 1633.10,
  faixa2Mult: 0.5,
  teto: 2313.74,
};

// Replica src/calculators/impostos.ts::calcularIRRF (base mais benéfica ao
// contribuinte: legal com deduções vs. simplificada). `referencia` só serve
// para escolher a tabela de INSS do ano-calendário no cálculo da base legal.
function calcIRRF(bruto: number, dependentes = 0, referencia: string): number {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const inss = calcularINSS(bruto, referencia);
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF;
  const baseSimplificada = bruto - DEDUCAO_SIMPLIFICADA_IRRF;
  const base = Math.max(0, Math.min(baseLegal, baseSimplificada));
  if (base <= 0) return 0;
  // IN RFB 2110/2022: truncar (não arredondar) na 2ª casa decimal
  for (const f of FAIXAS_IRRF) {
    if (base <= f.l) return Math.max(0, trunc2(base * f.a - f.d));
  }
  return 0;
}

// Avos proporcionais (CLT): fração >= 15 dias conta como mês integral.
// Portado de src/utils/rescisaoCalc.ts::calcularAvos (motor canônico).
export function calcularAvos(inicio: Date, fim: Date): number {
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
  const ultimoDiaMesRef = new Date(anoRef, mesRef + 1, 0).getDate();
  const dataReferencia = new Date(anoRef, mesRef, Math.min(inicio.getDate(), ultimoDiaMesRef));
  const diffTime = fim.getTime() - dataReferencia.getTime();
  const diasRestantes = Math.floor(diffTime / DIA_MS);
  return diasRestantes >= 15 ? meses + 1 : meses;
}

// Anos completos de serviço pela regra do aniversário (Lei 12.506/2011).
function anosCompletosServico(inicio: Date, fim: Date): number {
  let anos = fim.getFullYear() - inicio.getFullYear();
  const aniversario = new Date(fim.getFullYear(), inicio.getMonth(), inicio.getDate());
  if (fim < aniversario) anos--;
  return Math.max(0, anos);
}

// Normaliza aliases legados e os valores do enum `tipo_desligamento`
// ('acordo', 'fim_contrato') para o tipo canônico do motor.
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

export interface RescisaoMotorParams {
  salarioBase: number;
  dataAdmissao: string;
  dataDesligamento: string;
  tipo: string;
  avisoTrabalhado: boolean;
  feriasVencidas: boolean;
  saldoFGTS: number;
  dependentes?: number;
  diasAvisoNaoCumpridos?: number;
  dataFimContrato?: string;
  terminoIniciativa?: 'empregador' | 'empregado' | 'natural';
  dataPagamento?: string;
}

/**
 * Porte 1:1 de calcularRescisaoCore (src/utils/rescisaoCalc.ts).
 * `referencia` (data do desligamento) escolhe a tabela INSS do ano.
 */
export function calcularRescisaoMotor(p: RescisaoMotorParams) {
  const { salarioBase, dataAdmissao, dataDesligamento } = p;
  if (!(salarioBase > 0)) throw new Error('Salário deve ser maior que zero');

  const adm = new Date(dataAdmissao + 'T00:00:00');
  const desl = new Date(dataDesligamento + 'T00:00:00');
  if (isNaN(adm.getTime()) || isNaN(desl.getTime())) throw new Error('Datas inválidas');
  if (desl < adm) throw new Error('Data de desligamento não pode ser anterior à admissão');

  const tipo = normalizarTipoRescisao(p.tipo);
  const terminoIniciativa = p.terminoIniciativa ?? 'empregador';
  const referencia = dataDesligamento;

  // 1. Saldo de salário (Art. 4º CLT)
  const diasNoMes = new Date(desl.getFullYear(), desl.getMonth() + 1, 0).getDate();
  const diasTrabalhados = desl.getDate();
  const saldoSalario = trunc2((salarioBase / diasNoMes) * diasTrabalhados);

  // 2. Aviso prévio (Lei 12.506/2011) — anos completos de serviço.
  const anosServico = anosCompletosServico(adm, desl);
  const diasAviso = Math.min(90, 30 + anosServico * 3);

  // Projeção do aviso INDENIZADO nos avos (OJ 82 SDI-I TST): 100% em
  // sem_justa_causa, 50% no acordo (484-A) e na culpa recíproca (Súm. 14 TST).
  let diasAvisoIndenizados = 0;
  if (!p.avisoTrabalhado) {
    if (tipo === 'sem_justa_causa') {
      diasAvisoIndenizados = diasAviso;
    } else if (tipo === 'acordo_mutuo' || tipo === 'culpa_reciproca') {
      diasAvisoIndenizados = diasAviso / 2;
    }
  }
  const dataFimProjetada = new Date(desl);
  dataFimProjetada.setDate(dataFimProjetada.getDate() + diasAvisoIndenizados);

  const avisoIndenizado = trunc2((salarioBase / 30) * diasAvisoIndenizados);

  // 2b. Pedido de demissão sem aviso cumprido — desconto (art. 487 §2º CLT).
  const diasAvisoNaoCumpridos =
    tipo === 'pedido_demissao'
      ? Math.min(30, Math.max(0, p.diasAvisoNaoCumpridos ?? (p.avisoTrabalhado ? 0 : 30)))
      : 0;
  const descontoAvisoPrevio = trunc2((salarioBase / 30) * diasAvisoNaoCumpridos);

  // 3. Férias (Art. 146 CLT) com projeção; período completado pela projeção
  // paga 12/12, exceto quando ferias_vencidas já cobre o período (dedup).
  const mesesFerias = calcularAvos(adm, dataFimProjetada);
  const avosResto = mesesFerias % 12;
  const completouPeriodo = mesesFerias > 0 && avosResto === 0;
  const mesesFeriasPagos = avosResto || (completouPeriodo && !p.feriasVencidas ? 12 : 0);
  let feriasProporcionais = 0;
  if (tipo !== 'justa_causa') {
    feriasProporcionais = trunc2((salarioBase / 12) * mesesFeriasPagos);
    if (tipo === 'culpa_reciproca') {
      feriasProporcionais = trunc2(feriasProporcionais / 2);
    }
  }
  // Férias vencidas são devidas inclusive na justa causa (art. 146).
  const feriasVencidasValor = p.feriasVencidas ? salarioBase : 0;
  const tercoFerias = trunc2((feriasProporcionais + feriasVencidasValor) / 3);

  // 4. 13º proporcional (Lei 4.090/62) — ano-base do desligamento.
  const inicioAno = new Date(desl.getFullYear(), 0, 1);
  const dataBase13 = adm > inicioAno ? adm : inicioAno;
  const meses13 = Math.min(12, calcularAvos(dataBase13, dataFimProjetada));
  let decimoTerceiro = 0;
  if (tipo !== 'justa_causa' && tipo !== 'culpa_reciproca') {
    decimoTerceiro = trunc2((salarioBase / 12) * meses13);
  } else if (tipo === 'culpa_reciproca') {
    decimoTerceiro = trunc2(((salarioBase / 12) * meses13) / 2);
  }

  // 5. Indenizações arts. 479/480 CLT — 50% dos dias restantes do contrato a prazo.
  let indenizacaoArt479 = 0;
  let indenizacaoArt480 = 0;
  if (tipo === 'termino_contrato' && p.dataFimContrato) {
    const fimPrevisto = new Date(p.dataFimContrato + 'T00:00:00');
    if (!isNaN(fimPrevisto.getTime())) {
      const diasRestantes = Math.ceil((fimPrevisto.getTime() - desl.getTime()) / DIA_MS);
      if (diasRestantes > 0) {
        const valor = trunc2((salarioBase / 30) * diasRestantes * 0.5);
        if (terminoIniciativa === 'empregado') {
          indenizacaoArt480 = valor;
        } else if (terminoIniciativa !== 'natural') {
          indenizacaoArt479 = valor;
        }
      }
    }
  }

  // 6. FGTS + multa (Art. 18 Lei 8.036/90) — multa FORA do líquido (GRRF).
  const fgtsRescisao = trunc2((saldoSalario + avisoIndenizado + decimoTerceiro) * 0.08);
  let multaFGTS = 0;
  // Término de contrato a prazo pela iniciativa do empregador OU no prazo
  // natural paga multa de 40%; só a iniciativa do empregado a perde.
  if (tipo === 'sem_justa_causa' || (tipo === 'termino_contrato' && terminoIniciativa !== 'empregado')) {
    multaFGTS = trunc2((p.saldoFGTS + fgtsRescisao) * 0.40);
  } else if (tipo === 'acordo_mutuo' || tipo === 'culpa_reciproca') {
    multaFGTS = trunc2((p.saldoFGTS + fgtsRescisao) * 0.20);
  }

  // 7. Multa art. 477 §8º — pagamento após 10 dias corridos do desligamento.
  let multa477 = 0;
  if (p.dataPagamento) {
    const pagamento = new Date(p.dataPagamento + 'T00:00:00');
    if (!isNaN(pagamento.getTime()) && Math.floor((pagamento.getTime() - desl.getTime()) / DIA_MS) > 10) {
      multa477 = trunc2(salarioBase);
    }
  }

  // 8. Totais e descontos.
  const totalProventos = trunc2(
    saldoSalario + avisoIndenizado + feriasVencidasValor + feriasProporcionais + tercoFerias + decimoTerceiro + indenizacaoArt479 + multa477
  );
  const inssA = calcularINSS(saldoSalario, referencia);
  const inssB = calcularINSS(decimoTerceiro, referencia);
  const inss = (Math.round(inssA * 100) + Math.round(inssB * 100)) / 100;
  const irrfA = calcIRRF(saldoSalario, p.dependentes ?? 0, referencia);
  const irrfB = calcIRRF(decimoTerceiro, 0, referencia);
  const irrf = (Math.round(irrfA * 100) + Math.round(irrfB * 100)) / 100;
  const totalDescontos = trunc2(inss + irrf + descontoAvisoPrevio + indenizacaoArt480);
  const totalLiquido = trunc2(totalProventos - totalDescontos);

  // 9. Informativos — saque FGTS e seguro-desemprego.
  const fgtsSaquePercentual =
    tipo === 'acordo_mutuo'
      ? 0.8
      : tipo === 'justa_causa' ||
          tipo === 'pedido_demissao' ||
          (tipo === 'termino_contrato' && terminoIniciativa === 'empregado')
        ? 0
        : 1;

  const avosServico = calcularAvos(adm, desl);
  const dispensaInvoluntaria =
    tipo === 'sem_justa_causa' ||
    tipo === 'culpa_reciproca' ||
    (tipo === 'termino_contrato' && terminoIniciativa !== 'empregado');
  const seguroElegivel = dispensaInvoluntaria && avosServico >= 12;
  const media = salarioBase;
  let valorParcela = 0;
  if (seguroElegivel) {
    let v: number;
    if (media <= SEGURO_DESEMPREGO.faixa1Limite) v = media * SEGURO_DESEMPREGO.faixa1Mult;
    else if (media <= SEGURO_DESEMPREGO.faixa2Limite) v = SEGURO_DESEMPREGO.faixa2Base + (media - SEGURO_DESEMPREGO.faixa1Limite) * SEGURO_DESEMPREGO.faixa2Mult;
    else v = SEGURO_DESEMPREGO.teto;
    valorParcela = Math.max(SALARIO_MINIMO, trunc2(v));
  }

  return {
    saldoSalario,
    avisoIndenizado,
    descontoAvisoPrevio,
    feriasVencidas: feriasVencidasValor,
    feriasProporcionais,
    tercoFerias,
    decimoTerceiro,
    indenizacaoArt479,
    indenizacaoArt480,
    multa477,
    multaFGTS,
    fgtsRescisao,
    fgtsSaquePercentual,
    seguroDesemprego: {
      elegivel: seguroElegivel,
      parcelas: seguroElegivel ? (avosServico >= 24 ? 5 : 4) : 0,
      valorParcela,
    },
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
