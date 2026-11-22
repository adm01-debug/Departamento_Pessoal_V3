import { describe, it, expect } from 'vitest';
import { itemizarVerbasRescisorias, somarVerbas } from '../rescisaoVerbas';
import { calcularRescisaoCore } from '../rescisaoCalc';
import type { RescisaoResult } from '../rescisaoCalc';

const base: RescisaoResult = {
  saldoSalario: 1500.5,
  avisoIndenizado: 5000,
  descontoAvisoPrevio: 0,
  feriasVencidas: 0,
  feriasProporcionais: 1250.25,
  tercoFerias: 416.75,
  decimoTerceiro: 2000,
  indenizacaoArt479: 0,
  indenizacaoArt480: 0,
  multa477: 0,
  multaFGTS: 3200,
  fgtsRescisao: 680.04,
  fgtsSaquePercentual: 1,
  seguroDesemprego: { elegivel: true, parcelas: 4, valorParcela: 1800, observacao: '' },
  totalProventos: 10167.5,
  inss: 245.3,
  irrf: 120.1,
  totalDescontos: 365.4,
  totalLiquido: 9802.1,
  saldoDevedor: 0,
  diasTrabalhados: 15,
  mesesFerias: 8,
  meses13: 8,
  diasAviso: 30,
  diasAvisoNaoCumpridos: 0,
  timestamp: '2026-01-01T00:00:00.000Z',
};

describe('itemizarVerbasRescisorias', () => {
  it('soma das linhas fecha exatamente com totalProventos e totalDescontos', () => {
    const linhas = itemizarVerbasRescisorias(base);
    expect(somarVerbas(linhas, 'provento')).toBe(Math.round(base.totalProventos * 100));
    expect(somarVerbas(linhas, 'desconto')).toBe(Math.round(base.totalDescontos * 100));
  });

  it('reancora no total oficial quando o truncamento do motor desvia 1 centavo', () => {
    // Total do motor truncado 1 centavo abaixo da soma das parcelas — o que
    // acontece de verdade quando trunc2 corta cada parcela separadamente.
    const linhas = itemizarVerbasRescisorias({ ...base, totalProventos: 10167.49 });
    expect(somarVerbas(linhas, 'provento')).toBe(1016749);
    // Ajuste vai na maior linha, onde o desvio relativo é menor.
    const maior = linhas.filter((l) => l.tipo === 'provento').reduce((a, b) => (b.valor > a.valor ? b : a));
    expect(maior.codigo).toBe('AVISO_INDENIZADO');
    expect(maior.valor).toBe(4999.99);
  });

  it('não inclui a multa do FGTS — é depósito de GRRF, fora do líquido', () => {
    const linhas = itemizarVerbasRescisorias(base);
    expect(linhas.some((l) => l.codigo === 'MULTA_FGTS')).toBe(false);
    expect(linhas.some((l) => l.valor === base.multaFGTS)).toBe(false);
  });

  it('omite rubricas zeradas', () => {
    const linhas = itemizarVerbasRescisorias(base);
    expect(linhas.every((l) => l.valor > 0)).toBe(true);
    expect(linhas.map((l) => l.codigo)).not.toContain('FERIAS_VENCIDAS');
    expect(linhas.map((l) => l.codigo)).not.toContain('INDENIZACAO_ART_479');
  });

  it('marca INCIDÊNCIA coerente com o que o motor reteve', () => {
    const porCodigo = new Map(itemizarVerbasRescisorias(base).map((l) => [l.codigo, l]));
    expect(porCodigo.get('SALDO_SALARIO')).toMatchObject({ incide_inss: true, incide_irrf: true, incide_fgts: true });
    expect(porCodigo.get('DECIMO_TERCEIRO')).toMatchObject({ incide_inss: true, incide_irrf: true, incide_fgts: true });
    // Aviso indenizado integra o FGTS (Súmula 305 TST) e é isento de INSS/IRRF.
    expect(porCodigo.get('AVISO_INDENIZADO')).toMatchObject({
      incide_inss: false,
      incide_irrf: false,
      incide_fgts: true,
    });
    expect(porCodigo.get('FERIAS_PROPORCIONAIS')).toMatchObject({ incide_inss: false, incide_fgts: false });
    expect(porCodigo.get('INSS')).toMatchObject({ tipo: 'desconto' });
  });

  it('fecha com o motor real em cada modalidade de desligamento', () => {
    const casos = [
      { tipo: 'sem_justa_causa', avisoTrabalhado: false },
      { tipo: 'pedido_demissao', avisoTrabalhado: false },
      { tipo: 'justa_causa', avisoTrabalhado: false },
      { tipo: 'acordo_mutuo', avisoTrabalhado: false },
      { tipo: 'culpa_reciproca', avisoTrabalhado: false },
    ];
    for (const caso of casos) {
      const resultado = calcularRescisaoCore({
        salario: 4200,
        dataAdmissao: '2021-03-10',
        dataDesligamento: '2026-07-20',
        tipo: caso.tipo,
        avisoTrabalhado: caso.avisoTrabalhado,
        feriasVencidas: false,
        saldoFGTS: 12000,
        dependentes: 1,
        diasAvisoNaoCumpridos: caso.tipo === 'pedido_demissao' ? 30 : 0,
      });
      const linhas = itemizarVerbasRescisorias(resultado);
      expect(somarVerbas(linhas, 'provento'), caso.tipo).toBe(Math.round(resultado.totalProventos * 100));
      expect(somarVerbas(linhas, 'desconto'), caso.tipo).toBe(Math.round(resultado.totalDescontos * 100));
    }
  });
});
