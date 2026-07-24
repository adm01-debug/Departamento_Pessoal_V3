import { describe, it, expect } from 'vitest';
import { folhaCalc } from '../folhaCalc';

describe('Motor de Cálculo de Folha (folhaCalc)', () => {
  it('deve processar uma folha simples corretamente', () => {
    const salarioBase = 3000.00;
    const resultado = folhaCalc.processar(salarioBase);

    expect(resultado.proventos).toBe(3000.00);
    expect(resultado.inss).toBeGreaterThan(0);
    expect(resultado.liquido).toBeLessThan(3000.00);
    expect(resultado.detalheEventos).toContainEqual(
      expect.objectContaining({ codigo: '1000', valor: 3000.00 })
    );
  });

  it('deve incluir horas extras e DSR no cálculo', () => {
    const salarioBase = 2000.00;
    const resultado = folhaCalc.processar(salarioBase, {
      horasExtras50: 10,
      diasUteis: 26,
      domingosFeriados: 4
    });

    expect(resultado.proventos).toBeGreaterThan(2000.00);
    expect(resultado.horasExtras).toBeGreaterThan(0);
    expect(resultado.dsr).toBeGreaterThan(0);
  });

  it('deve calcular 13º salário quando solicitado', () => {
    const salarioBase = 5000.00;
    const resultado = folhaCalc.processar(salarioBase, {
      meses13: 12,
      parcela13: 1
    });

    expect(resultado.decimoTerceiro).toBe(2500.00); // 1ª parcela é 50%
  });

  it('deve calcular 2ª parcela do 13º salário', () => {
    const salarioBase = 4000.00;
    const resultado = folhaCalc.processar(salarioBase, {
      meses13: 12,
      parcela13: 2
    });

    // 2ª parcela = 100% - INSS e IRRF incidindo
    expect(resultado.decimoTerceiro).toBe(4000.00);
  });

  it('deve calcular 13º salário proporcional (6 meses)', () => {
    const salarioBase = 6000.00;
    const resultado = folhaCalc.processar(salarioBase, {
      meses13: 6,
      parcela13: 1
    });

    // 6/12 * 6000 * 50% = 1500
    expect(resultado.decimoTerceiro).toBe(1500.00);
  });

  it('deve calcular horas extras 100%', () => {
    const salarioBase = 2200.00;
    const resultado = folhaCalc.processar(salarioBase, {
      horasExtras100: 5,
      jornada: 220
    });

    // HE 100% = (2200/220) * 5 * 2 = 100
    expect(resultado.horasExtras).toBeGreaterThan(0);
    expect(resultado.detalheEventos).toContainEqual(
      expect.objectContaining({ codigo: '1002', tipo: 'provento' })
    );
  });

  it('deve calcular horas extras 50% e 100% simultaneamente', () => {
    const salarioBase = 2200.00;
    const resultado = folhaCalc.processar(salarioBase, {
      horasExtras50: 5,
      horasExtras100: 5,
      jornada: 220
    });

    expect(resultado.horasExtras).toBeGreaterThan(0);
    const he50 = resultado.detalheEventos!.find(e => e.codigo === '1001');
    const he100 = resultado.detalheEventos!.find(e => e.codigo === '1002');
    expect(he50).toBeTruthy();
    expect(he100).toBeTruthy();
  });

  it('deve calcular descontos por faltas', () => {
    const salarioBase = 3000.00;
    const resultado = folhaCalc.processar(salarioBase, {
      horasFalta: 8,
      jornada: 220
    });

    // Falta de 8h: 3000/220 * 8 ≈ 109.09
    expect(resultado.detalheEventos).toContainEqual(
      expect.objectContaining({ codigo: '5005', tipo: 'desconto' })
    );
    expect(resultado.liquido).toBeLessThan(3000.00 - resultado.inss - resultado.irrf);
  });

  it('deve aplicar adicionais ao salário', () => {
    const salarioBase = 3000.00;
    const resultado = folhaCalc.processar(salarioBase, { adicionais: 500 });

    expect(resultado.proventos).toBe(3500.00);
    expect(resultado.detalheEventos).toContainEqual(
      expect.objectContaining({ codigo: '1050', valor: 500 })
    );
  });

  it('deve aplicar descontos extras', () => {
    const salarioBase = 3000.00;
    const resultado = folhaCalc.processar(salarioBase, { descontosExtras: 200 });

    expect(resultado.detalheEventos).toContainEqual(
      expect.objectContaining({ codigo: '5099', valor: 200, tipo: 'desconto' })
    );
    expect(resultado.descontos).toBeGreaterThan(resultado.inss);
  });

  it('deve incluir eventos customizados', () => {
    const salarioBase = 3000.00;
    const eventos = [
      { codigo: '9001', descricao: 'Bonificação', tipo: 'provento' as const, valor: 300 },
      { codigo: '9100', descricao: 'Desconto Plano', tipo: 'desconto' as const, valor: 150 },
    ];
    const resultado = folhaCalc.processar(salarioBase, { eventos });

    expect(resultado.detalheEventos).toContainEqual(expect.objectContaining({ codigo: '9001' }));
    expect(resultado.detalheEventos).toContainEqual(expect.objectContaining({ codigo: '9100' }));
  });

  it('deve calcular FGTS (8% do salário bruto)', () => {
    const salarioBase = 3000.00;
    const resultado = folhaCalc.processar(salarioBase);

    expect(resultado.fgts).toBeCloseTo(240, 1); // 3000 * 8% = 240
  });

  it('deve calcular INSS progressivo corretamente para salário de 3000', () => {
    const resultado = folhaCalc.processar(3000.00);

    // INSS 2026 progressivo sobre 3000
    // 1518 * 7.5% = 113.85
    // (2793.88 - 1518) * 9% = 114.83
    // (3000 - 2793.88) * 12% = 24.74
    // Total ≈ 253.42
    expect(resultado.inss).toBeGreaterThan(200);
    expect(resultado.inss).toBeLessThan(400);
    expect(resultado.faixaInss).toMatch(/12%|Teto/);
  });

  it('deve retornar IRRF isento para salário baixo', () => {
    const resultado = folhaCalc.processar(1518.00);

    expect(resultado.irrf).toBe(0);
    expect(resultado.faixaIrrf).toBe('Isento');
  });

  it('deve calcular IRRF com dependentes', () => {
    const semDependente = folhaCalc.processar(5000.00, { dependentes: 0 });
    const comDependente = folhaCalc.processar(5000.00, { dependentes: 1 });

    expect(comDependente.irrf).toBeLessThan(semDependente.irrf);
  });

  it('liquidez contábil: liquido = proventos - descontos', () => {
    const resultado = folhaCalc.processar(4500.00, {
      adicionais: 300,
      descontosExtras: 100,
      dependentes: 1,
    });

    expect(resultado.liquido).toBeCloseTo(resultado.proventos - resultado.descontos, 2);
  });

  it('deve incluir INSS como evento de desconto na lista', () => {
    const resultado = folhaCalc.processar(3000.00);

    expect(resultado.detalheEventos).toContainEqual(
      expect.objectContaining({ codigo: '5000', tipo: 'desconto' })
    );
  });

  it('deve incluir IRRF como evento de desconto quando positivo', () => {
    const resultado = folhaCalc.processar(5000.00);

    expect(resultado.irrf).toBeGreaterThan(0);
    expect(resultado.detalheEventos).toContainEqual(
      expect.objectContaining({ codigo: '5001', tipo: 'desconto' })
    );
  });

  it('calcularINSS: retorna valor e faixa', () => {
    const { valor, faixa } = folhaCalc.calcularINSS(1518);

    expect(valor).toBeCloseTo(113.85, 1);
    expect(faixa).toBeTruthy();
  });

  it('calcularIRRF: retorna valor e faixa', () => {
    const { valor, faixa } = folhaCalc.calcularIRRF(5000, 300, 0, 0);

    expect(valor).toBeGreaterThanOrEqual(0);
    expect(faixa).toBeTruthy();
  });

  it('calcularFGTS: retorna 8% do salário', () => {
    expect(folhaCalc.calcularFGTS(2000)).toBeCloseTo(160, 1);
    expect(folhaCalc.calcularFGTS(5000)).toBeCloseTo(400, 1);
  });

  it('sem DSR quando não há horas extras', () => {
    const resultado = folhaCalc.processar(3000.00, { horasExtras50: 0, domingosFeriados: 4 });

    expect(resultado.dsr).toBe(0);
    expect(resultado.detalheEventos).not.toContainEqual(
      expect.objectContaining({ codigo: '1003' })
    );
  });

  it('alto salário cai no teto do INSS', () => {
    const resultado = folhaCalc.processar(20000.00);

    expect(resultado.faixaInss).toContain('Teto');
    expect(resultado.irrf).toBeGreaterThan(0);
  });
});
