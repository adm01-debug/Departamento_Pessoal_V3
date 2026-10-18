import { assertEquals, assertAlmostEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { calcularRescisaoMotor, normalizarTipoRescisao, trunc2 } from './motor.ts';

// Espelho dos cenários novos de src/utils/__tests__/rescisaoCalc.test.ts —
// mesma entrada nos dois motores deve produzir a mesma saída (motor único).

const BASE = {
  salarioBase: 5000,
  dataAdmissao: '2020-03-15',
  dataDesligamento: '2026-03-22',
  tipo: 'sem_justa_causa',
  avisoTrabalhado: false,
  feriasVencidas: false,
  saldoFGTS: 15000,
};

Deno.test('sem justa causa: multa FGTS fora do líquido (GRRF)', () => {
  const r = calcularRescisaoMotor(BASE);
  assertAlmostEquals(r.totalLiquido, r.totalProventos - r.totalDescontos, 0.01);
  assertEquals(r.multaFGTS > 0, true);
});

Deno.test('aviso proporcional Lei 12.506: 6 anos → 48 dias', () => {
  const r = calcularRescisaoMotor(BASE);
  assertEquals(r.diasAviso, 48);
  assertAlmostEquals(r.avisoIndenizado, (5000 / 30) * 48, 0.01);
});

Deno.test('termino_contrato empregador → indenização art. 479 (50% dos dias restantes)', () => {
  const r = calcularRescisaoMotor({
    ...BASE,
    tipo: 'termino_contrato',
    terminoIniciativa: 'empregador',
    dataFimContrato: '2026-07-01',
  });
  // 2026-03-22 → 2026-07-01 = 101 dias → 5000/30 × 101 × 0,5 = 8.416,67
  assertAlmostEquals(r.indenizacaoArt479, trunc2((5000 / 30) * 101 * 0.5), 0.01);
  assertEquals(r.indenizacaoArt480, 0);
  assertAlmostEquals(r.multaFGTS, (15000 + r.fgtsRescisao) * 0.4, 0.01);
});

Deno.test('termino_contrato empregado → indenização art. 480 nos descontos, sem multa', () => {
  const r = calcularRescisaoMotor({
    ...BASE,
    tipo: 'termino_contrato',
    terminoIniciativa: 'empregado',
    dataFimContrato: '2026-07-01',
  });
  assertAlmostEquals(r.indenizacaoArt480, trunc2((5000 / 30) * 101 * 0.5), 0.01);
  assertEquals(r.indenizacaoArt479, 0);
  assertEquals(r.multaFGTS, 0);
  assertEquals(r.fgtsSaquePercentual, 0);
  assertAlmostEquals(r.totalDescontos, r.inss + r.irrf + r.indenizacaoArt480, 0.01);
});

Deno.test('termino_contrato natural → sem indenização, multa 40%', () => {
  const r = calcularRescisaoMotor({
    ...BASE,
    tipo: 'termino_contrato',
    terminoIniciativa: 'natural',
    dataFimContrato: '2026-07-01',
  });
  assertEquals(r.indenizacaoArt479, 0);
  assertEquals(r.indenizacaoArt480, 0);
  assertAlmostEquals(r.multaFGTS, (15000 + r.fgtsRescisao) * 0.4, 0.01);
});

Deno.test('pedido_demissao sem aviso → desconto art. 487 §2º (1 salário)', () => {
  const r = calcularRescisaoMotor({
    ...BASE,
    tipo: 'pedido_demissao',
  });
  assertEquals(r.diasAvisoNaoCumpridos, 30);
  assertAlmostEquals(r.descontoAvisoPrevio, 5000, 0.01);
  assertAlmostEquals(r.totalDescontos, r.inss + r.irrf + r.descontoAvisoPrevio, 0.01);
});

Deno.test('pedido_demissao com dias parciais → desconto proporcional', () => {
  const r = calcularRescisaoMotor({
    ...BASE,
    tipo: 'pedido_demissao',
    diasAvisoNaoCumpridos: 15,
  });
  assertAlmostEquals(r.descontoAvisoPrevio, 2500, 0.01);
});

Deno.test('pedido_demissao com aviso trabalhado → sem desconto', () => {
  const r = calcularRescisaoMotor({
    ...BASE,
    tipo: 'pedido_demissao',
    avisoTrabalhado: true,
  });
  assertEquals(r.descontoAvisoPrevio, 0);
});

Deno.test('culpa_reciproca completa: aviso/férias/13º a 50%, multa 20%', () => {
  const base = {
    salarioBase: 6000,
    dataAdmissao: '2022-05-01',
    dataDesligamento: '2026-06-01',
    tipo: 'culpa_reciproca',
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFGTS: 20000,
  };
  const r = calcularRescisaoMotor(base);
  // 4 anos → 42 dias; metade indenizada = 21 dias → 4.200
  assertEquals(r.diasAviso, 42);
  assertAlmostEquals(r.avisoIndenizado, (6000 / 30) * 21, 0.01);
  const sem = calcularRescisaoMotor({ ...base, tipo: 'sem_justa_causa' });
  assertAlmostEquals(r.decimoTerceiro, sem.decimoTerceiro / 2, 0.02);
  assertAlmostEquals(r.multaFGTS, (20000 + r.fgtsRescisao) * 0.2, 0.01);
  assertEquals(r.seguroDesemprego.elegivel, true);
});

Deno.test('acordo_mutuo: aviso 50%, multa 20%, saque 80%, sem seguro', () => {
  const base = { ...BASE, tipo: 'acordo_mutuo' };
  const r = calcularRescisaoMotor(base);
  const sem = calcularRescisaoMotor({ ...BASE });
  assertAlmostEquals(r.avisoIndenizado, sem.avisoIndenizado * 0.5, 0.05);
  assertAlmostEquals(r.multaFGTS, (15000 + r.fgtsRescisao) * 0.2, 0.01);
  assertEquals(r.fgtsSaquePercentual, 0.8);
  assertEquals(r.seguroDesemprego.elegivel, false);
});

Deno.test('multa 477 §8º: pagamento >10 dias corridos → 1 salário', () => {
  const atrasado = calcularRescisaoMotor({ ...BASE, dataPagamento: '2026-04-15' });
  assertAlmostEquals(atrasado.multa477, 5000, 0.01);
  const emDia = calcularRescisaoMotor({ ...BASE, dataPagamento: '2026-04-01' });
  assertEquals(emDia.multa477, 0);
  const semData = calcularRescisaoMotor(BASE);
  assertEquals(semData.multa477, 0);
});

Deno.test('seguro-desemprego informativo: elegível só na dispensa involuntária com vínculo ≥12m', () => {
  const elegivel = calcularRescisaoMotor(BASE);
  assertEquals(elegivel.seguroDesemprego.elegivel, true);
  assertEquals(elegivel.seguroDesemprego.parcelas, 5);
  const curto = calcularRescisaoMotor({ ...BASE, dataAdmissao: '2026-01-01' });
  assertEquals(curto.seguroDesemprego.elegivel, false);
  const pedido = calcularRescisaoMotor({ ...BASE, tipo: 'pedido_demissao', avisoTrabalhado: true });
  assertEquals(pedido.seguroDesemprego.elegivel, false);
});

Deno.test('normalização: aliases legados e enum do banco', () => {
  assertEquals(normalizarTipoRescisao('com_justa_causa'), 'justa_causa');
  assertEquals(normalizarTipoRescisao('acordo'), 'acordo_mutuo');
  assertEquals(normalizarTipoRescisao('fim_contrato'), 'termino_contrato');
  const a = calcularRescisaoMotor({ ...BASE, tipo: 'acordo' });
  const b = calcularRescisaoMotor({ ...BASE, tipo: 'acordo_mutuo' });
  assertEquals(a.totalLiquido, b.totalLiquido);
});

Deno.test('validações: salário e datas inválidas lançam erro', () => {
  assertThrows(() => calcularRescisaoMotor({ ...BASE, salarioBase: 0 }));
  assertThrows(() => calcularRescisaoMotor({ ...BASE, dataAdmissao: '2027-01-01' }));
});
