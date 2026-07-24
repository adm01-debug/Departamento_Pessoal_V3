// Cálculo completo de folha e salário líquido
import { calcularINSS, calcularIRRF, calcularFGTS } from './impostos';
import { calcularHorasExtras, calcularAdicionalNoturno, calcularInsalubridade, calcularPericulosidade, calcularDescontoVT, calcularPensaoAlimenticia, calcularDSR, type GrauInsalubridade } from './beneficios';
import { RUBRICAS_PADRAO } from '@/constants/rubricas';

export interface ParamsFolhaCompleta {
  salarioBase: number;
  horasExtras50?: number;
  horasExtras100?: number;
  horasNoturnas?: number;
  adicionalNoturnoPerc?: number;
  insalubridade?: GrauInsalubridade | null;
  periculosidade?: boolean;
  dependentes?: number;
  valeTransporte?: number;
  pensaoPercentual?: number;
  outrosDescontos?: number;
  outrosProventos?: number;
  diasUteis?: number;
  domingosEFeriados?: number;
}

export function calcularFolhaCompleta(params: ParamsFolhaCompleta) {
  const {
    salarioBase, horasExtras50 = 0, horasExtras100 = 0,
    horasNoturnas = 0, adicionalNoturnoPerc = 20,
    insalubridade = null, periculosidade = false,
    dependentes = 0, valeTransporte = 0,
    pensaoPercentual = 0, outrosDescontos = 0, outrosProventos = 0,
    diasUteis = 26, domingosEFeriados = 4,
  } = params;

  const he = calcularHorasExtras(salarioBase, horasExtras50, horasExtras100, 220, diasUteis, domingosEFeriados);
  const adNoturno = horasNoturnas > 0 ? calcularAdicionalNoturno(salarioBase, horasNoturnas, 220, adicionalNoturnoPerc) : 0;
  
  // Cálculo de DSR sobre Adicional Noturno (o DSR das HE já vem no objeto he)
  const dsrAdNoturno = calcularDSR(adNoturno, diasUteis, domingosEFeriados);
  const dsrTotal = Math.trunc((he.dsr + dsrAdNoturno) * 100) / 100;

  const adInsalubridade = insalubridade ? calcularInsalubridade(insalubridade) : 0;
  const adPericulosidade = periculosidade ? calcularPericulosidade(salarioBase) : 0;

  const totalProventos = Math.trunc((salarioBase + he.total + adNoturno + dsrTotal + adInsalubridade + adPericulosidade + outrosProventos) * 100) / 100;

  const inss = calcularINSS(totalProventos);
  const fgts = calcularFGTS(totalProventos);
  const descontoVT = valeTransporte > 0 ? calcularDescontoVT(salarioBase, valeTransporte) : 0;

  // IN RFB: Pensão alimentícia judicial é dedutível da base IRRF.
  // Resolve circularidade (IRRF depende de pensão, pensão depende de IRRF) via iteração convergente.
  let irrf = 0;
  let pensao = 0;
  if (pensaoPercentual > 0) {
    let pensaoEstimada = 0;
    for (let i = 0; i < 10; i++) {
      irrf = calcularIRRF(totalProventos, dependentes, pensaoEstimada);
      const baseParaPensao = totalProventos - inss - irrf - descontoVT - outrosDescontos;
      pensao = calcularPensaoAlimenticia(baseParaPensao, pensaoPercentual);
      if (Math.abs(pensao - pensaoEstimada) < 0.01) break;
      pensaoEstimada = pensao;
    }
  } else {
    irrf = calcularIRRF(totalProventos, dependentes);
  }

  const totalDescontos = Math.trunc((inss + irrf + descontoVT + pensao + outrosDescontos) * 100) / 100;
  const salarioLiquido = Math.trunc((totalProventos - totalDescontos) * 100) / 100;

  const lancamentos = [
    { codigo: '1000', descricao: 'Salário Base', valor: salarioBase, tipo: 'provento' },
    ...(he.total > 0 ? [{ codigo: '1001', descricao: 'Horas Extras (Total)', valor: he.total, tipo: 'provento' }] : []),
    ...(dsrTotal > 0 ? [{ codigo: '1003', descricao: 'DSR sobre Variáveis', valor: dsrTotal, tipo: 'provento' }] : []),
    ...(adNoturno > 0 ? [{ codigo: '1004', descricao: 'Adicional Noturno', valor: adNoturno, tipo: 'provento' }] : []),
    ...(adInsalubridade > 0 ? [{ codigo: '1005', descricao: 'Adicional de Insalubridade', valor: adInsalubridade, tipo: 'provento' }] : []),
    ...(adPericulosidade > 0 ? [{ codigo: '1006', descricao: 'Adicional de Periculosidade', valor: adPericulosidade, tipo: 'provento' }] : []),
    ...(outrosProventos > 0 ? [{ codigo: '1008', descricao: 'Outros Proventos', valor: outrosProventos, tipo: 'provento' }] : []),
    { codigo: '5000', descricao: 'INSS', valor: inss, tipo: 'desconto' },
    ...(irrf > 0 ? [{ codigo: '5001', descricao: 'IRRF', valor: irrf, tipo: 'desconto' }] : []),
    ...(descontoVT > 0 ? [{ codigo: '5002', descricao: 'Vale Transporte', valor: descontoVT, tipo: 'desconto' }] : []),
    ...(pensao > 0 ? [{ codigo: '5003', descricao: 'Pensão Alimentícia', valor: pensao, tipo: 'desconto' }] : []),
    ...(outrosDescontos > 0 ? [{ codigo: '5004', descricao: 'Outros Descontos', valor: outrosDescontos, tipo: 'desconto' }] : []),
  ];

  return {
    proventos: {
      salarioBase, horasExtras: he.total, adicionalNoturno: adNoturno,
      dsr: dsrTotal, insalubridade: adInsalubridade, periculosidade: adPericulosidade,
      outrosProventos, totalProventos,
    },
    descontos: { inss, irrf, valeTransporte: descontoVT, pensao, outrosDescontos, totalDescontos },
    fgts, salarioLiquido,
    lancamentos,
  };
}

export function calcularSalarioLiquido(params: {
  salarioBruto: number;
  dependentes?: number;
  outrasDeducoes?: number;
  valeTransporte?: number;
}) {
  const { salarioBruto, dependentes = 0, outrasDeducoes = 0, valeTransporte = 0 } = params;
  const inss = calcularINSS(salarioBruto);
  const irrf = calcularIRRF(salarioBruto, dependentes, outrasDeducoes);
  const fgts = calcularFGTS(salarioBruto);
  const descontoVT = valeTransporte > 0 ? calcularDescontoVT(salarioBruto, valeTransporte) : 0;
  const totalDescontos = inss + irrf + descontoVT;
  const liquido = Math.trunc((salarioBruto - totalDescontos) * 100) / 100;
  return { salarioBruto, inss, irrf, fgts, descontoVT, totalDescontos: Math.trunc(totalDescontos * 100) / 100, liquido };
}
