// Cálculos de benefícios e adicionais
import { 
  SALARIO_MINIMO_2026, 
  SALARIO_FAMILIA_TETO, 
  SALARIO_FAMILIA_VALOR,
  VA_VR_MAX_DESCONTO_PAT
} from './tabelas';
import { calcularINSS, calcularIRRF } from './impostos';

export interface ParamsDecimo13 {
  salarioBase: number;
  mesesTrabalhados: number;
  mediasVariaveis?: number;
  parcela: 1 | 2;
  dependentes?: number;
}

export function calcularDecimo13(params: ParamsDecimo13): { 
  bruto: number; 
  inss: number; 
  irrf: number; 
  fgts: number;
  liquido: number;
  mensagem?: string;
} {
  const { salarioBase, mesesTrabalhados, mediasVariaveis = 0, parcela, dependentes = 0 } = params;
  const meses = Math.min(12, Math.max(0, mesesTrabalhados));
  
  if (meses < 1) {
    return { bruto: 0, inss: 0, irrf: 0, fgts: 0, liquido: 0, mensagem: 'Mínimo de 15 dias trabalhados no ano.' };
  }

  const valorIntegral = salarioBase + mediasVariaveis;
  const valorProporcional = (valorIntegral / 12) * meses;

  if (parcela === 1) {
    const bruto = Math.trunc((valorProporcional / 2) * 100) / 100;
    const fgts = Math.trunc(bruto * 0.08 * 100) / 100;
    return { bruto, inss: 0, irrf: 0, fgts, liquido: bruto };
  } else {
    const brutoTotal = Math.trunc(valorProporcional * 100) / 100;
    const primeiraParcelaJaPaga = Math.trunc((brutoTotal / 2) * 100) / 100;
    
    const inss = calcularINSS(brutoTotal);
    const irrf = calcularIRRF(brutoTotal, dependentes);
    const fgts = Math.trunc((brutoTotal - primeiraParcelaJaPaga) * 0.08 * 100) / 100;
    
    const brutoSegunda = Math.trunc((brutoTotal - primeiraParcelaJaPaga) * 100) / 100;
    const liquido = Math.trunc((brutoTotal - inss - irrf - primeiraParcelaJaPaga) * 100) / 100;
    
    return { bruto: brutoSegunda, inss, irrf, fgts, liquido };
  }
}

export function calcularFerias(salarioBase: number, diasFerias: number = 30, diasAbono: number = 0, dependentes: number = 0) {
  const valorDiario = salarioBase / 30;
  const valorFerias = valorDiario * diasFerias;
  const tercoConstitucional = valorFerias / 3;
  const valorAbono = valorDiario * diasAbono;
  const tercoAbono = valorAbono / 3;
  const bruto = valorFerias + tercoConstitucional + valorAbono + tercoAbono;
  
  // Férias têm tributação separada (exclusiva na fonte)
  const inss = calcularINSS(valorFerias + tercoConstitucional);
  const irrf = calcularIRRF(valorFerias + tercoConstitucional, dependentes);
  
  const liquido = Math.trunc((bruto - inss - irrf) * 100) / 100;

  return {
    valorFerias: Math.trunc(valorFerias * 100) / 100,
    tercoConstitucional: Math.trunc(tercoConstitucional * 100) / 100,
    valorAbono: Math.trunc(valorAbono * 100) / 100,
    tercoAbono: Math.trunc(tercoAbono * 100) / 100,
    bruto: Math.trunc(bruto * 100) / 100,
    inss, irrf, liquido,
  };
}

export function calcularHorasExtras(salarioBase: number, horasExtras50: number = 0, horasExtras100: number = 0, jornadaMensal: number = 220, diasUteis: number = 26, domingosEFeriados: number = 4) {
  const valorHora = jornadaMensal > 0 ? salarioBase / jornadaMensal : 0;
  const valor50 = Math.trunc(valorHora * 1.5 * horasExtras50 * 100) / 100;
  const valor100 = Math.trunc(valorHora * 2.0 * horasExtras100 * 100) / 100;
  const totalExtras = Math.trunc((valor50 + valor100) * 100) / 100;
  const dsr = calcularDSR(totalExtras, diasUteis, domingosEFeriados);
  return { valor50, valor100, total: totalExtras, dsr, totalComDsr: Math.trunc((totalExtras + dsr) * 100) / 100 };
}

export function calcularDSR(totalVariaveis: number, diasUteis: number, domingosEFeriados: number): number {
  if (diasUteis <= 0) return 0;
  const valorDsr = (totalVariaveis / diasUteis) * domingosEFeriados;
  return Math.trunc(valorDsr * 100) / 100;
}

export function calcularAdicionalNoturno(salarioBase: number, horasNoturnas: number, jornadaMensal: number = 220, percentual: number = 20): number {
  const valorHora = jornadaMensal > 0 ? salarioBase / jornadaMensal : 0;
  return Math.trunc(valorHora * (percentual / 100) * horasNoturnas * 100) / 100;
}

export function calcularPericulosidade(salarioBase: number): number {
  return Math.trunc(salarioBase * 0.30 * 100) / 100;
}

export type GrauInsalubridade = 'minimo' | 'medio' | 'maximo';
export function calcularInsalubridade(grau: GrauInsalubridade): number {
  const percentuais = { minimo: 0.10, medio: 0.20, maximo: 0.40 };
  return Math.trunc(SALARIO_MINIMO_2026 * percentuais[grau] * 100) / 100;
}

export function calcularDescontoVT(salarioBase: number, valorVTMensal: number): number {
  const limiteDesconto = salarioBase * 0.06;
  return Math.trunc(Math.min(valorVTMensal, limiteDesconto) * 100) / 100;
}

export function calcularValeAlimentacao(valorMensal: number, salarioBase: number, usaPAT: boolean = true): { valor: number, desconto: number } {
  const percentualMaximo = usaPAT ? VA_VR_MAX_DESCONTO_PAT : 1.0;
  const desconto = Math.trunc(Math.min(valorMensal * percentualMaximo, salarioBase * 0.20) * 100) / 100;
  return { valor: valorMensal, desconto };
}

export function calcularPlanoSaude(custoTotal: number, coparticipacao: number = 0, mensalidadeFixa: number = 0): number {
  return Math.trunc((mensalidadeFixa + coparticipacao) * 100) / 100;
}

export function calcularPensaoAlimenticia(baseCalculo: number, percentual: number): number {
  return Math.trunc(baseCalculo * (percentual / 100) * 100) / 100;
}

export function calcularSalarioFamilia(salarioBruto: number, numeroDependentes: number): number {
  if (salarioBruto > SALARIO_FAMILIA_TETO) return 0;
  return Math.trunc(SALARIO_FAMILIA_VALOR * numeroDependentes * 100) / 100;
}

export function calcularSalarioMaternidade(salarioBase: number, diasLicenca: number = 120): number {
  return Math.trunc((salarioBase / 30) * diasLicenca * 100) / 100;
}

export function calcularAuxilioDoenca(mediaSalarial: number): number {
  const beneficio = mediaSalarial * 0.91;
  return Math.trunc(Math.max(SALARIO_MINIMO_2026, beneficio) * 100) / 100;
}

export function calcularSobreaviso(salarioBase: number, horas: number, jornadaMensal: number = 220): number {
  if (jornadaMensal <= 0 || horas <= 0) return 0;
  const valorHora = salarioBase / jornadaMensal;
  return Math.trunc(valorHora * (1 / 3) * horas * 100) / 100;
}

export function calcularProntidao(salarioBase: number, horas: number, jornadaMensal: number = 220): number {
  if (jornadaMensal <= 0 || horas <= 0) return 0;
  const valorHora = salarioBase / jornadaMensal;
  return Math.trunc(valorHora * (2 / 3) * horas * 100) / 100;
}

export function calcularGratificacao(salarioBase: number, percentual: number): number {
  return Math.trunc(salarioBase * (percentual / 100) * 100) / 100;
}

export function calcularComissao(valorVendas: number, percentualComissao: number): number {
  return Math.trunc(valorVendas * (percentualComissao / 100) * 100) / 100;
}

export function calcularDiarias(valorDiaria: number, dias: number, percentualDesconto: number = 0) {
  const total = Math.trunc(valorDiaria * dias * 100) / 100;
  const desconto = Math.trunc(total * (percentualDesconto / 100) * 100) / 100;
  return { total, desconto, liquido: Math.trunc((total - desconto) * 100) / 100 };
}

export function calcularQuilometragem(km: number, valorPorKm: number = 1.20): number {
  return Math.trunc(km * valorPorKm * 100) / 100;
}

export function calcularBancoHoras(creditos: string[], debitos: string[]) {
  const parseMinutos = (h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    return (hh || 0) * 60 + (mm || 0);
  };
  const totalCreditos = creditos.reduce((a, c) => a + parseMinutos(c), 0);
  const totalDebitos = debitos.reduce((a, d) => a + parseMinutos(d), 0);
  const saldo = totalCreditos - totalDebitos;
  const horas = Math.floor(Math.abs(saldo) / 60);
  const minutos = Math.abs(saldo) % 60;
  const saldoFormatado = `${saldo < 0 ? '-' : ''}${horas}:${minutos.toString().padStart(2, '0')}`;
  return { totalCreditos, totalDebitos, saldo, saldoFormatado };
}

export function calcularMedias(valores: number[]): number {
  if (valores.length === 0) return 0;
  const soma = valores.reduce((acc, val) => acc + val, 0);
  return Math.trunc((soma / valores.length) * 100) / 100;
}

export function calcularLiquido(bruto: number, descontos: number): number {
  return Math.trunc((bruto - descontos) * 100) / 100;
}

export function calcularAdicionalTransferencia(salarioBase: number, percentual: number = 25): number {
  return Math.trunc(salarioBase * (percentual / 100) * 100) / 100;
}

export function calcularEmprestimoConsignado(salarioLiquido: number, parcela: number): { parcela: number, margemDisponivel: number } {
  const margemTotal = Math.trunc(salarioLiquido * 0.35 * 100) / 100;
  return {
    parcela,
    margemDisponivel: Math.max(0, Math.trunc((margemTotal - parcela) * 100) / 100)
  };
}
