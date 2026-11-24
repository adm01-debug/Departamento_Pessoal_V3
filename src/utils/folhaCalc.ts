import { Decimal } from 'decimal.js';
import { calcularINSS as _inss, calcularIRRF as _irrf, calcularFGTS as _fgts } from '@/calculators/impostos';
import { calcularHorasExtras, calcularDSR, calcular13Salario } from '@/calculators';
import { FAIXAS_INSS_2026, FAIXAS_IRRF_2026, DEDUCAO_DEPENDENTE_IRRF } from '@/calculators/tabelas';

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface CalculoResultado {
  proventos: number;
  descontos: number;
  liquido: number;
  inss: number;
  irrf: number;
  fgts: number;
  horasExtras?: number;
  horasFalta?: number;
  dsr?: number;
  decimoTerceiro?: number;
  faixaInss: string;
  faixaIrrf: string;
  detalheEventos?: Array<{
    codigo: string;
    descricao: string;
    tipo: 'provento' | 'desconto';
    valor: number;
  }>;
}

const TETO_INSS = FAIXAS_INSS_2026[FAIXAS_INSS_2026.length - 1].limite;

function descreverFaixaInss(salarioBruto: number): string {
  if (salarioBruto >= TETO_INSS) return 'Teto (14%)';
  const faixa = FAIXAS_INSS_2026.find((f, i) => {
    const limiteAnterior = i === 0 ? 0 : FAIXAS_INSS_2026[i - 1].limite;
    return salarioBruto > limiteAnterior && salarioBruto <= f.limite;
  }) || FAIXAS_INSS_2026[FAIXAS_INSS_2026.length - 1];
  
  return `${(faixa.aliquota * 100).toFixed(1).replace('.0', '')}%`;
}

function descreverFaixaIrrf(base: number): string {
  if (base <= FAIXAS_IRRF_2026[0].limite) return 'Isento';
  for (const f of FAIXAS_IRRF_2026) {
    if (base <= f.limite) return `${(f.aliquota * 100).toFixed(1).replace('.0', '')}%`;
  }
  return '27.5%';
}

export const folhaCalc = {
  calcularINSS: (salarioBruto: number): { valor: number; faixa: string } => ({
    valor: _inss(salarioBruto),
    faixa: descreverFaixaInss(salarioBruto),
  }),

  calcularIRRF: (salarioBruto: number, inss: number, dependentes: number = 0, outrasDeducoes: number = 0): { valor: number; faixa: string } => {
    const valor = _irrf(salarioBruto, dependentes, outrasDeducoes);
    const base = salarioBruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF - outrasDeducoes;
    return { valor, faixa: descreverFaixaIrrf(base) };
  },

  calcularFGTS: (salarioBruto: number): number => _fgts(salarioBruto),

  calcularHorasExtras,
  calcularDSR,
  calcular13Salario,

  processar: (
    salarioBase: number,
    params: {
      adicionais?: number;
      descontosExtras?: number;
      dependentes?: number;
      horasExtras50?: number;
      horasExtras100?: number;
      meses13?: number;
      parcela13?: 1 | 2;
      jornada?: number;
      horasFalta?: number;
      diasUteis?: number;
      domingosFeriados?: number;
      eventos?: Array<{ codigo: string; descricao: string; tipo: 'provento' | 'desconto'; valor: number }>;
    } = {}
  ): CalculoResultado => {
    const {
      adicionais = 0,
      descontosExtras = 0,
      dependentes = 0,
      horasExtras50 = 0,
      horasExtras100 = 0,
      meses13 = 0,
      parcela13,
      jornada = 220,
      horasFalta = 0,
      diasUteis = 26,
      domingosFeriados = 4,
      eventos = []
    } = params;

    const detalheEventos: Array<{ codigo: string; descricao: string; tipo: 'provento' | 'desconto'; valor: number }> = [];

    // 1. Proventos Fixos
    detalheEventos.push({ codigo: '1000', descricao: 'Salário Base', tipo: 'provento', valor: salarioBase });

    // 2. Horas Extras
    const valorHE50 = calcularHorasExtras(salarioBase, jornada, horasExtras50, 0.5);
    if (valorHE50 > 0) detalheEventos.push({ codigo: '1001', descricao: 'Horas Extras 50%', tipo: 'provento', valor: valorHE50 });
    
    const valorHE100 = calcularHorasExtras(salarioBase, jornada, horasExtras100, 1.0);
    if (valorHE100 > 0) detalheEventos.push({ codigo: '1002', descricao: 'Horas Extras 100%', tipo: 'provento', valor: valorHE100 });
    
    const totalHE = new Decimal(valorHE50).plus(valorHE100).toNumber();
    
    // 3. DSR
    const dsr = (diasUteis > 0 && domingosFeriados > 0) ? calcularDSR(totalHE, diasUteis, domingosFeriados) : 0;
    if (dsr > 0) detalheEventos.push({ codigo: '1003', descricao: 'DSR sobre Horas Extras', tipo: 'provento', valor: dsr });
    
    // 4. 13º Salário
    let decimoTerceiro = 0;
    if (parcela13) {
      decimoTerceiro = calcular13Salario(salarioBase, meses13 || 12, parcela13);
      detalheEventos.push({ 
        codigo: parcela13 === 1 ? '1011' : '1012', 
        descricao: `13º Salário - ${parcela13}ª Parcela`, 
        tipo: 'provento', 
        valor: decimoTerceiro 
      });
    }

    // 5. Adicionais
    if (adicionais > 0) {
      detalheEventos.push({ codigo: '1050', descricao: 'Adicionais Diversos', tipo: 'provento', valor: adicionais });
    }

    // 6. Faltas
    const valorFaltas = jornada > 0 
      ? new Decimal(salarioBase).div(jornada).mul(horasFalta).toDecimalPlaces(2).toNumber() 
      : 0;
    if (valorFaltas > 0) {
      detalheEventos.push({ codigo: '5005', descricao: 'Faltas e Atrasos', tipo: 'desconto', valor: valorFaltas });
    }

    // 7. Eventos Customizados
    eventos.forEach(ev => detalheEventos.push(ev));

    const proventos = detalheEventos
      .filter(e => e.tipo === 'provento')
      .reduce((acc, curr) => acc.plus(curr.valor), new Decimal(0))
      .toNumber();

    // 8. Cálculo de Impostos
    const baseTributavel = Decimal.max(0, new Decimal(proventos).minus(valorFaltas)).toNumber();

    const { valor: inss, faixa: faixaInss } = folhaCalc.calcularINSS(baseTributavel);
    detalheEventos.push({ codigo: '5000', descricao: 'Desconto INSS', tipo: 'desconto', valor: inss });

    const { valor: irrf, faixa: faixaIrrf } = folhaCalc.calcularIRRF(baseTributavel, inss, dependentes, descontosExtras);
    if (irrf > 0) detalheEventos.push({ codigo: '5001', descricao: 'Desconto IRRF', tipo: 'desconto', valor: irrf });

    // 9. FGTS (Encargo)
    const fgts = folhaCalc.calcularFGTS(baseTributavel);

    // 10. Descontos Extras
    if (descontosExtras > 0) {
      detalheEventos.push({ codigo: '5099', descricao: 'Descontos Diversos', tipo: 'desconto', valor: descontosExtras });
    }

    const descontos = detalheEventos
      .filter(e => e.tipo === 'desconto')
      .reduce((acc, curr) => acc.plus(curr.valor), new Decimal(0))
      .toNumber();

    const liquido = new Decimal(proventos).minus(descontos).toDecimalPlaces(2).toNumber();

    return { 
      proventos, 
      descontos, 
      liquido, 
      inss, 
      irrf, 
      fgts, 
      horasExtras: totalHE,
      horasFalta,
      dsr,
      decimoTerceiro,
      faixaInss, 
      faixaIrrf,
      detalheEventos
    };
  },
};