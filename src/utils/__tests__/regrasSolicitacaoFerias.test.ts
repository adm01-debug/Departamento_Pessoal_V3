import { describe, it, expect } from 'vitest';
import {
  USO_VAZIO,
  avisoAntecedenciaFerias,
  resumirUsoPorPeriodo,
  validarInicioFerias,
  validarSaldoFerias,
} from '../regrasSolicitacaoFerias';

const P = 'p-1';

describe('resumirUsoPorPeriodo', () => {
  it('soma gozo, abono e partes; rejeitadas/canceladas contam só como parte', () => {
    const uso = resumirUsoPorPeriodo([
      { periodo_aquisitivo_id: P, dias_gozo: 14, dias_abono: 5, status: 'aprovada' },
      { periodo_aquisitivo_id: P, dias_gozo: 20, dias_abono: 5, status: 'rejeitada' },
      { periodo_aquisitivo_id: P, dias_gozo: 5, dias_abono: null, status: 'cancelada' },
      { periodo_aquisitivo_id: null, dias_gozo: 30, dias_abono: 0, status: 'aprovada' },
    ]).get(P);
    expect(uso).toEqual({ usado: 19, abonoUsado: 5, partes: 3, maiorParte: 20 });
  });
});

describe('validarSaldoFerias', () => {
  const base = { diasDireito: 30, uso: USO_VAZIO };

  it('aceita 30 dias sem abono e 20 + 10 de abono', () => {
    expect(validarSaldoFerias({ ...base, diasGozo: 30, diasAbono: 0 })).toBeNull();
    expect(validarSaldoFerias({ ...base, diasGozo: 20, diasAbono: 10 })).toBeNull();
  });

  it('bloqueia gozo + abono acima do saldo', () => {
    const uso = { usado: 20, abonoUsado: 0, partes: 1, maiorParte: 20 };
    expect(validarSaldoFerias({ diasDireito: 30, uso, diasGozo: 14, diasAbono: 0 })).toMatch(/saldo 10 de 30/);
  });

  it('limita o abono a 1/3 do direito somando o já convertido (Art. 143)', () => {
    const uso = { usado: 22, abonoUsado: 8, partes: 1, maiorParte: 14 };
    expect(validarSaldoFerias({ diasDireito: 30, uso, diasGozo: 5, diasAbono: 3 })).toMatch(/1\/3.*10 dias/);
    expect(validarSaldoFerias({ diasDireito: 30, uso, diasGozo: 6, diasAbono: 2 })).toBeNull();
    expect(validarSaldoFerias({ diasDireito: 18, uso: USO_VAZIO, diasGozo: 12, diasAbono: 6 })).toBeNull();
    expect(validarSaldoFerias({ diasDireito: 18, uso: USO_VAZIO, diasGozo: 11, diasAbono: 7 })).toMatch(/6 dias/);
  });

  it('bloqueia a 4ª parte e fracionamento sem parte de 14 dias', () => {
    expect(
      validarSaldoFerias({
        diasDireito: 30,
        uso: { usado: 24, abonoUsado: 0, partes: 3, maiorParte: 14 },
        diasGozo: 5,
        diasAbono: 0,
      })
    ).toMatch(/3 períodos/);
    expect(
      validarSaldoFerias({
        diasDireito: 30,
        uso: { usado: 10, abonoUsado: 0, partes: 1, maiorParte: 10 },
        diasGozo: 10,
        diasAbono: 0,
      })
    ).toMatch(/mínimo 14 dias/);
  });

  it('bloqueia primeira parte curta que deixa restante < 14 (período sem como cumprir 14 dias)', () => {
    expect(validarSaldoFerias({ ...base, diasGozo: 10, diasAbono: 10 })).toMatch(/deixa 10 dias/);
    expect(validarSaldoFerias({ ...base, diasGozo: 10, diasAbono: 0 })).toBeNull();
    expect(validarSaldoFerias({ ...base, diasGozo: 14, diasAbono: 10 })).toBeNull();
  });
});

describe('início e aviso de antecedência', () => {
  const hoje = '2026-11-12';

  it('bloqueia início no passado e aceita hoje', () => {
    expect(validarInicioFerias('2026-11-11', hoje)).toMatch(/passado/);
    expect(validarInicioFerias(hoje, hoje)).toBeNull();
  });

  it('avisa quando faltam menos de 30 dias (Art. 135)', () => {
    expect(avisoAntecedenciaFerias('2026-11-13', hoje)).toMatch(/1 dia\(s\).*Art\. 135/);
    expect(avisoAntecedenciaFerias('2026-12-11', hoje)).toMatch(/29 dia/);
    expect(avisoAntecedenciaFerias('2026-12-12', hoje)).toBeNull();
    expect(avisoAntecedenciaFerias('', hoje)).toBeNull();
    expect(avisoAntecedenciaFerias('2026-11-01', hoje)).toBeNull();
  });
});
