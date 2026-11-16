/**
 * Guarda de escrita operacional — impede gravação a partir de dados fictícios.
 * Cobre as duas regras: identificador `mock-*` e ambiente de demonstração.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDemo } = vi.hoisted(() => ({ mockDemo: { ativo: false } }));

vi.mock('@/mocks/desempenhoMock', () => ({
  isDesempenhoMockEnabled: () => mockDemo.ativo,
}));

import {
  EscritaBloqueadaError,
  camposFicticios,
  demonstracaoEmUso,
  exigirEscritaOperacional,
  idFicticio,
} from '../avaliacao/escritaOperacional';

describe('escritaOperacional.idFicticio', () => {
  it('reconhece identificadores de demonstração', () => {
    expect(idFicticio('mock-empresa-1')).toBe(true);
    expect(idFicticio('mock-ciclo-3')).toBe(true);
    expect(idFicticio(' mock-colab-9 ')).toBe(true);
  });

  it('não trata vazio/nulo como fictício', () => {
    expect(idFicticio('')).toBe(false);
    expect(idFicticio(null)).toBe(false);
    expect(idFicticio(undefined)).toBe(false);
    expect(idFicticio('empresa-real-1')).toBe(false);
  });
});

describe('escritaOperacional.camposFicticios', () => {
  it('aponta os campos ofensivos', () => {
    expect(
      camposFicticios({
        empresa_id: 'mock-empresa-1',
        avaliado_id: 'colab-1',
        ciclo_id: 'mock-ciclo-3',
        avaliador_id: null,
      })
    ).toEqual(['empresa_id', 'ciclo_id']);
  });

  it('devolve lista vazia quando todos os ids são reais', () => {
    expect(camposFicticios({ empresa_id: 'emp-1', avaliado_id: 'colab-1' })).toEqual([]);
  });
});

describe('escritaOperacional.exigirEscritaOperacional', () => {
  beforeEach(() => {
    mockDemo.ativo = false;
  });

  it('libera ids reais', () => {
    expect(() =>
      exigirEscritaOperacional('Criar feedback', { empresa_id: 'emp-1', avaliado_id: 'colab-1' })
    ).not.toThrow();
  });

  it('bloqueia identificador fictício e diz em QUAL campo', () => {
    let erro: unknown = null;
    try {
      exigirEscritaOperacional('Criar feedback', { empresa_id: 'mock-empresa-1', avaliado_id: 'colab-1' });
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(EscritaBloqueadaError);
    const e = erro as EscritaBloqueadaError;
    expect(e.motivo).toBe('dado_ficticio');
    expect(e.campos).toEqual(['empresa_id']);
    expect(e.name).toBe('EscritaBloqueadaError');
    expect(e.message).toContain('empresa_id');
    expect(e.message).toContain('Nenhuma gravação');
  });

  it('NÃO bloqueia ids reais quando a vitrine está ligada (tela mista)', () => {
    mockDemo.ativo = true;
    // A demonstração é apenas visual: quem protege o banco é o ID fictício.
    expect(demonstracaoEmUso()).toBe(false);
    expect(() =>
      exigirEscritaOperacional('Criar feedback', { empresa_id: 'emp-1', avaliado_id: 'colab-1' })
    ).not.toThrow();
  });

  it('bloqueia registro criado na vitrine (`demo-*`) antes da rede', () => {
    mockDemo.ativo = true;
    expect(() =>
      exigirEscritaOperacional('Aprovar avaliação', {
        colaborador_id: 'demo-colaborador-1',
        ciclo_id: 'demo-ciclo-1',
      })
    ).toThrow(EscritaBloqueadaError);
    expect(camposFicticios({ colaborador_id: 'demo-colaborador-1' })).toEqual(['colaborador_id']);
  });

  it('a guarda de dado fictício não acusa campo vazio', () => {
    expect(() =>
      exigirEscritaOperacional('Criar feedback', { empresa_id: null, avaliado_id: undefined })
    ).not.toThrow();
  });
});
