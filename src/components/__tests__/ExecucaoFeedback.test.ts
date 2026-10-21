import { describe, expect, it } from 'vitest';
import {
  confirmarFinalizacao,
  mensagemFinalizacao,
  resolverDestinoAcao,
} from '../avaliacao/execucaoFeedback';

const real = { id: 'real' };
const demo = { id: 'demo' };
const previa = { id: 'previa' };

describe('resolverDestinoAcao — escolha POR REGISTRO', () => {
  it('UUID real usa o serviço real mesmo com serviço demonstrativo disponível', () => {
    const destino = resolverDestinoAcao({
      feedbackId: '11111111-1111-4111-8111-111111111111',
      demoService: demo,
      realService: real,
    });
    expect(destino).toMatchObject({ origem: 'real', servico: real });
  });

  it.each(['mock-feedback-1', 'demo-feedback-1'])('%s usa o serviço demonstrativo', (id) => {
    const destino = resolverDestinoAcao({ feedbackId: id, demoService: demo, realService: real });
    expect(destino).toMatchObject({ origem: 'demo', servico: demo });
  });

  it('registro demonstrativo sem serviço local fica indisponível (não cai na RPC)', () => {
    const destino = resolverDestinoAcao({
      feedbackId: 'mock-feedback-1',
      realService: real,
    });
    expect(destino.origem).toBe('indisponivel');
    expect(destino.servico).toBeNull();
  });

  it('sem identificador não executa nada', () => {
    const destino = resolverDestinoAcao({ feedbackId: '   ', demoService: demo, realService: real });
    expect(destino.origem).toBe('indisponivel');
    expect(destino.servico).toBeNull();
  });

  it('prévia DEV usa o serviço simulado e nunca é marcada como real', () => {
    const destino = resolverDestinoAcao({
      feedbackId: '11111111-1111-4111-8111-111111111111',
      emPrevia: true,
      previaServico: previa,
      demoService: demo,
      realService: real,
    });
    expect(destino).toMatchObject({ origem: 'previa', servico: previa });
  });
});

describe('confirmarFinalizacao — somente sucesso comprovado', () => {
  it.each([
    ['concluir', 'concluido'],
    ['cancelar', 'cancelado'],
    ['reabrir', 'pendente'],
  ] as const)('%s exige o status %s', (acao, status) => {
    expect(confirmarFinalizacao({ ok: true, status_novo: status }, acao, 'real')).toMatchObject({
      status_novo: status,
    });
  });

  it('aceita `status` do serviço demonstrativo', () => {
    expect(confirmarFinalizacao({ ok: true, status: 'cancelado' }, 'cancelar', 'demo')).toMatchObject({
      status_novo: 'cancelado',
    });
  });

  it.each([
    [null],
    [{}],
    [{ ok: false, status_novo: 'cancelado' }],
    [{ ok: true }],
    [{ ok: true, status_novo: 'concluido' }],
  ])('resposta ambígua/divergente não vira sucesso: %j', (resposta) => {
    expect(() => confirmarFinalizacao(resposta as never, 'cancelar', 'real')).toThrow();
  });
});

describe('mensagemFinalizacao', () => {
  it('real não menciona demonstração/local', () => {
    const mensagem = mensagemFinalizacao('real', 'cancelar', false, 'sucesso');
    expect(mensagem).toBe('Avaliação cancelada (registro preservado).');
  });

  it('demo identifica armazenamento local e ausência de alteração no Supabase', () => {
    const mensagem = mensagemFinalizacao('demo', 'cancelar', false, 'sucesso');
    expect(mensagem).toContain('Demonstração');
    expect(mensagem).toContain('armazenamento local');
    expect(mensagem).toContain('Supabase não foi alterado');
  });

  it('prévia não afirma gravação real', () => {
    expect(mensagemFinalizacao('previa', 'concluir', false, 'sucesso')).toContain('Prévia');
  });
});
