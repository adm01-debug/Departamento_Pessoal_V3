import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCriarEvento } = vi.hoisted(() => ({ mockCriarEvento: vi.fn() }));

vi.mock('@/services/esocialService', () => ({
  criarEvento: mockCriarEvento,
}));

import { gerarEventosSST } from '../esocialEventosSST';

describe('gerarEventosSST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarEvento.mockResolvedValue({ id: 'ev-sst' });
  });

  it('returns empty array when dados has no relevant fields', async () => {
    const results = await gerarEventosSST('emp-1', {});
    expect(results).toEqual([]);
    expect(mockCriarEvento).not.toHaveBeenCalled();
  });

  it('creates S-2210 event when acidente is present', async () => {
    const acidente = { tipo: 'tipico', descricao: 'queda' };
    const results = await gerarEventosSST('emp-1', { acidente });
    expect(mockCriarEvento).toHaveBeenCalledWith(expect.objectContaining({
      empresa_id: 'emp-1',
      tipo_evento: 'S-2210',
      dados: acidente,
    }));
    expect(results).toHaveLength(1);
  });

  it('creates S-2220 event when exame is present', async () => {
    const exame = { tipo: 'admissional' };
    await gerarEventosSST('emp-1', { exame });
    expect(mockCriarEvento).toHaveBeenCalledWith(expect.objectContaining({
      tipo_evento: 'S-2220',
      dados: exame,
    }));
  });

  it('creates S-2240 event when riscos is present', async () => {
    const riscos = { agente: 'ruido', nivel: 'alto' };
    await gerarEventosSST('emp-1', { riscos });
    expect(mockCriarEvento).toHaveBeenCalledWith(expect.objectContaining({
      tipo_evento: 'S-2240',
      dados: riscos,
    }));
  });

  it('creates all three events when all dados present', async () => {
    const dados = { acidente: {}, exame: {}, riscos: {} };
    const results = await gerarEventosSST('emp-1', dados);
    expect(mockCriarEvento).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
  });

  it('skips absent fields without calling criarEvento', async () => {
    await gerarEventosSST('emp-1', { exame: { tipo: 'periodico' } });
    expect(mockCriarEvento).toHaveBeenCalledTimes(1);
    expect(mockCriarEvento).not.toHaveBeenCalledWith(expect.objectContaining({ tipo_evento: 'S-2210' }));
    expect(mockCriarEvento).not.toHaveBeenCalledWith(expect.objectContaining({ tipo_evento: 'S-2240' }));
  });
});
