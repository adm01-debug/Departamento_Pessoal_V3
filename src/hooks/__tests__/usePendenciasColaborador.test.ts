import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Regra de negócio resgatada da branch `muri`: o que conta como pendência no
// dossiê do colaborador. Os 4 hooks de dados são a fronteira do teste — aqui
// se testa a REGRA, não a consulta.

const dados = vi.hoisted(() => ({
  asos: [] as unknown[],
  documentos: [] as unknown[],
  ajustes: [] as unknown[],
  atrasadas: [] as unknown[],
}));

vi.mock('@/hooks/useColaboradorDetalhes', () => ({ useASOs: () => ({ data: dados.asos }) }));
vi.mock('@/hooks/useTabelasReferencia', () => ({
  useDocumentosPessoais: () => ({ data: dados.documentos }),
}));
vi.mock('@/hooks/usePontoMelhorado', () => ({
  usePontoMelhorado: () => ({ solicitacoes: dados.ajustes }),
}));
vi.mock('@/hooks/useDesenvolvimentoColaborador', () => ({
  useOnboardingColaborador: () => ({ atrasadas: dados.atrasadas }),
}));

const { usePendenciasColaborador } = await import('@/hooks/usePendenciasColaborador');

function montar() {
  return renderHook(() => usePendenciasColaborador('c1', 'e1')).result.current;
}

beforeEach(() => {
  dados.asos = [];
  dados.documentos = [];
  dados.ajustes = [];
  dados.atrasadas = [];
});

describe('usePendenciasColaborador', () => {
  it('sem nada vencido nem pendente, não devolve pendência alguma', () => {
    expect(montar().pendencias).toHaveLength(0);
  });

  it('ajuste de ponto só conta quando o status é "enviado"', () => {
    dados.ajustes = [
      { status: 'aprovado', data_ponto: '2026-11-01' },
      { status: 'enviado', data_ponto: '2026-11-02', tipo_ponto: 'entrada', hora_sugerida: '08:00' },
    ];
    const { pendencias } = montar();
    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].chave).toBe('ponto');
    expect(pendencias[0].texto).toBe('1 ajuste de ponto pendente');
    expect(pendencias[0].severidade).toBe('media');
  });

  it('ASO vencido é severidade alta e cita a NR-7', () => {
    dados.asos = [{ tipo: 'Periódico', data_validade: '2020-01-10', data_exame: '2019-01-10' }];
    const { pendencias, temAlta } = montar();
    expect(pendencias[0].chave).toBe('aso');
    expect(pendencias[0].severidade).toBe('alta');
    expect(pendencias[0].contexto).toContain('NR-7');
    expect(temAlta).toBe(true);
  });

  it('ASO ainda válido não entra', () => {
    dados.asos = [{ tipo: 'Periódico', data_validade: '2099-01-10' }];
    expect(montar().pendencias).toHaveLength(0);
  });

  it('ASO sem data de validade não entra (não dá para afirmar que venceu)', () => {
    dados.asos = [{ tipo: 'Admissional', data_validade: null }];
    expect(montar().pendencias).toHaveLength(0);
  });

  it('pluraliza documento pessoal corretamente (1 e 2)', () => {
    dados.documentos = [{ tipo_documento: 'RG', data_validade: '2020-05-01' }];
    expect(montar().pendencias[0].texto).toBe('1 documento pessoal vencido');

    dados.documentos = [
      { tipo_documento: 'RG', data_validade: '2020-05-01' },
      { tipo_documento: 'CNH', data_validade: '2021-05-01' },
    ];
    expect(montar().pendencias[0].texto).toBe('2 documentos pessoais vencidos');
  });

  it('tarefa de onboarding atrasada mostra o prazo em dd/MM/yyyy e o atraso em dias', () => {
    dados.atrasadas = [{ titulo: 'Entregar crachá', categoria: 'Acessos', data_prazo: '2026-11-10' }];
    const item = montar().pendencias[0];
    expect(item.chave).toBe('onboarding');
    expect(item.severidade).toBe('alta');
    expect(item.itens[0]).toContain('Entregar crachá (Acessos)');
    expect(item.itens[0]).toContain('prazo era 10/11/2026');
    expect(item.itens[0]).toMatch(/\d+ dias? de atraso/);
  });

  it('as 4 fontes juntas devolvem 4 pendências, ordenadas por fonte', () => {
    dados.ajustes = [{ status: 'enviado', data_ponto: '2026-11-02' }];
    dados.atrasadas = [{ titulo: 'T', data_prazo: '2026-11-01' }];
    dados.asos = [{ tipo: 'Periódico', data_validade: '2020-01-01' }];
    dados.documentos = [{ tipo_documento: 'RG', data_validade: '2020-01-01' }];
    expect(montar().pendencias.map((p) => p.chave)).toEqual(['ponto', 'onboarding', 'aso', 'documentos']);
  });

  it('temAlta é falso quando só há pendência de severidade média', () => {
    dados.ajustes = [{ status: 'enviado', data_ponto: '2026-11-02' }];
    expect(montar().temAlta).toBe(false);
  });
});
