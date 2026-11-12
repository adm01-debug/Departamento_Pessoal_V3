import { describe, expect, it } from 'vitest';
import {
  catParaForm,
  isoParaDatetimeLocal,
  opcaoValida,
  podeEditarCat,
  prazoLimiteCat,
  vazioParaNull,
} from '../adminCatEdicao';

describe('podeEditarCat', () => {
  const base = { status_esocial: 'pendente', protocolo_esocial: null, data_envio_esocial: null };

  it('permite editar CAT pendente sem protocolo nem envio', () => {
    expect(podeEditarCat(base)).toBe(true);
  });

  it.each(['enviado', 'processado', 'aceito', 'transmitido', null])('bloqueia status %s', (status) => {
    expect(podeEditarCat({ ...base, status_esocial: status })).toBe(false);
  });

  it('bloqueia quando já há protocolo ou data de envio', () => {
    expect(podeEditarCat({ ...base, protocolo_esocial: '1.2.3' })).toBe(false);
    expect(podeEditarCat({ ...base, data_envio_esocial: '2026-11-01T10:00:00Z' })).toBe(false);
  });
});

describe('isoParaDatetimeLocal', () => {
  it('converte timestamptz para datetime-local no fuso local', () => {
    const d = new Date(2026, 10, 5, 8, 7);
    expect(isoParaDatetimeLocal(d.toISOString())).toBe('2026-11-05T08:07');
  });

  it('devolve vazio para entrada ausente ou inválida', () => {
    expect(isoParaDatetimeLocal(null)).toBe('');
    expect(isoParaDatetimeLocal('não é data')).toBe('');
  });
});

describe('catParaForm', () => {
  it('troca null por undefined e formata a data do acidente', () => {
    const d = new Date(2026, 0, 2, 13, 45);
    const r = catParaForm({
      data_acidente: d.toISOString(),
      cid_principal: 'S60.9',
      parte_corpo_atingida: null,
      houve_obito: false,
    });
    expect(r).toEqual({
      data_acidente: '2026-01-02T13:45',
      cid_principal: 'S60.9',
      parte_corpo_atingida: undefined,
      houve_obito: false,
    });
  });
});

describe('prazoLimiteCat', () => {
  it('24h após o acidente com óbito e 1 dia sem óbito (regra de calcular_prazo_cat)', () => {
    expect(prazoLimiteCat('2026-11-05T08:07:00.000Z', true)).toBe('2026-11-06T08:07:00.000Z');
    expect(prazoLimiteCat('2026-11-05T08:07:00.000Z', false)).toBe('2026-11-06T08:07:00.000Z');
  });

  it('recalcula a partir da data corrigida', () => {
    expect(prazoLimiteCat('2026-12-31T23:30:00.000Z', false)).toBe('2027-01-01T23:30:00.000Z');
  });
});

describe('opcaoValida', () => {
  const opcoes = ['tipico', 'trajeto', 'doenca_ocupacional'] as const;

  it('mantém valor que está nas opções', () => {
    expect(opcaoValida('trajeto', opcoes)).toBe('trajeto');
  });

  it('descarta valor legado fora das opções (ex.: queda_de_nivel)', () => {
    expect(opcaoValida('queda_de_nivel', opcoes)).toBeUndefined();
    expect(opcaoValida(undefined, opcoes)).toBeUndefined();
  });
});

describe('vazioParaNull', () => {
  it('converte campo limpo em null e preserva os demais', () => {
    const values = { hora_acidente: '', ultimo_dia_trabalhado: '', observacoes: '', houve_obito: false };
    expect(vazioParaNull(values, ['hora_acidente', 'ultimo_dia_trabalhado'])).toEqual({
      hora_acidente: null,
      ultimo_dia_trabalhado: null,
      observacoes: '',
      houve_obito: false,
    });
  });
});
