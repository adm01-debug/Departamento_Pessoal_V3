import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function makeChain(data: any = [], error: any = null) {
  const result = { data, error };
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order, then: (fn: any) => Promise.resolve(result).then(fn) });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
  const insert = vi.fn().mockResolvedValue(result);
  const in_ = vi.fn().mockReturnValue({ order, then: (fn: any) => Promise.resolve(result).then(fn) });
  const select = vi.fn().mockReturnValue({ order, eq, in: in_, then: (fn: any) => Promise.resolve(result).then(fn) });
  return { select, eq, order, insert, update, in: in_ };
}

import { ajustesPontoService, periodosPontoService } from '../pontoService';

describe('ajustesPontoService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries ajustes_ponto', async () => {
    const chain = makeChain([{ id: 'ap1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await ajustesPontoService.listar();
    expect(mockFrom).toHaveBeenCalledWith('ajustes_ponto');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns [] when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await ajustesPontoService.listar();
    expect(result).toEqual([]);
  });

  it('criar calls insert on ajustes_ponto', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await ajustesPontoService.criar({ colaborador_id: 'c1', tipo: 'entrada' });
    expect(chain.insert).toHaveBeenCalled();
  });

  it('aprovar calls update with status=aprovado', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await ajustesPontoService.aprovar('ap-1', 'user-1');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'aprovado', aprovado_por: 'user-1' })
    );
  });
});

describe('periodosPontoService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries periodos_ponto', async () => {
    const chain = makeChain([{ id: 'pp1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await periodosPontoService.listar();
    expect(mockFrom).toHaveBeenCalledWith('periodos_ponto');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns [] when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await periodosPontoService.listar();
    expect(result).toEqual([]);
  });

  it('criar calls insert on periodos_ponto', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await periodosPontoService.criar({ empresa_id: 'emp-1', data_inicio: '2024-01-01' });
    expect(chain.insert).toHaveBeenCalled();
  });

  it('fechar calls update with status=fechado', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await periodosPontoService.fechar('pp-1');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'fechado' })
    );
  });
});
