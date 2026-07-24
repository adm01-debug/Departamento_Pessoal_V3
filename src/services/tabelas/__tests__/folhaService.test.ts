import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function makeChain(data: any = [], error: any = null) {
  const result = { data, error };
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order, then: (fn: any) => Promise.resolve(result).then(fn) });
  const delete_ = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
  const insert = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ order, eq, then: (fn: any) => Promise.resolve(result).then(fn) });
  return { select, eq, order, insert, delete: delete_, update };
}

import {
  esocialLotesService,
  eventosVariaveisService,
  lancamentosFolhaService,
  rubricasFolhaService,
  parametrosFiscaisService,
} from '../folhaService';

describe('esocialLotesService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries esocial_lotes', async () => {
    const chain = makeChain([{ id: 'el1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await esocialLotesService.listar();
    expect(mockFrom).toHaveBeenCalledWith('esocial_lotes');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns [] when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await esocialLotesService.listar();
    expect(result).toEqual([]);
  });

  it('criar calls insert on esocial_lotes', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await esocialLotesService.criar({ empresa_id: 'emp-1' });
    expect(chain.insert).toHaveBeenCalled();
  });
});

describe('eventosVariaveisService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries eventos_variaveis', async () => {
    const chain = makeChain([{ id: 'ev1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await eventosVariaveisService.listar();
    expect(mockFrom).toHaveBeenCalledWith('eventos_variaveis');
    expect(Array.isArray(result)).toBe(true);
  });

  it('criar calls insert on eventos_variaveis', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await eventosVariaveisService.criar({ tipo: 'horas_extra', valor: 10 });
    expect(chain.insert).toHaveBeenCalled();
  });

  it('excluir calls delete on eventos_variaveis', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await eventosVariaveisService.excluir('ev-1');
    expect(chain.delete).toHaveBeenCalled();
  });
});

describe('lancamentosFolhaService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries lancamentos_folha by folha_id', async () => {
    const chain = makeChain([{ id: 'lf1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await lancamentosFolhaService.listar('folha-1');
    expect(mockFrom).toHaveBeenCalledWith('lancamentos_folha');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns [] when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await lancamentosFolhaService.listar('folha-1');
    expect(result).toEqual([]);
  });

  it('criar calls insert on lancamentos_folha', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await lancamentosFolhaService.criar({ folha_id: 'f1', rubrica: '1000' });
    expect(chain.insert).toHaveBeenCalled();
  });
});

describe('rubricasFolhaService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries rubricas_folha', async () => {
    const chain = makeChain([{ id: 'rf1', codigo: '1000' }]);
    mockFrom.mockReturnValue(chain);
    const result = await rubricasFolhaService.listar();
    expect(mockFrom).toHaveBeenCalledWith('rubricas_folha');
    expect(Array.isArray(result)).toBe(true);
  });

  it('criar calls insert on rubricas_folha', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await rubricasFolhaService.criar({ codigo: '9999', descricao: 'Extra' });
    expect(chain.insert).toHaveBeenCalled();
  });

  it('atualizar calls update on rubricas_folha', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await rubricasFolhaService.atualizar('rf-1', { descricao: 'Atualizado' });
    expect(chain.update).toHaveBeenCalled();
  });
});

describe('parametrosFiscaisService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries parametros_fiscais', async () => {
    const chain = makeChain([{ id: 'pf1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await parametrosFiscaisService.listar();
    expect(mockFrom).toHaveBeenCalledWith('parametros_fiscais');
    expect(Array.isArray(result)).toBe(true);
  });

  it('criar calls insert on parametros_fiscais', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await parametrosFiscaisService.criar({ vigencia_inicio: '2024-01-01' });
    expect(chain.insert).toHaveBeenCalled();
  });
});
