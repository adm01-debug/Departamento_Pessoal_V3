import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function makeChain(data: any = [], error: any = null) {
  const result = { data, error };
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ maybeSingle, then: (fn: any) => Promise.resolve(result).then(fn) });
  const order = vi.fn().mockReturnValue({ limit, eq: vi.fn().mockResolvedValue(result), then: (fn: any) => Promise.resolve(result).then(fn) });
  const eq = vi.fn().mockReturnValue({ order, maybeSingle, then: (fn: any) => Promise.resolve(result).then(fn) });
  const delete_ = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
  const upsert = vi.fn().mockResolvedValue(result);
  const insert = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ order, eq, maybeSingle, limit, then: (fn: any) => Promise.resolve(result).then(fn) });
  return { select, eq, order, upsert, insert, delete: delete_, maybeSingle, limit };
}

import {
  logEnvioRelatoriosService,
  relatoriosAgendadosService,
  savedFiltersService,
  bitrix24Service,
} from '../adminService';

describe('logEnvioRelatoriosService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries log_envio_relatorios', async () => {
    const chain = makeChain([{ id: 'l1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await logEnvioRelatoriosService.listar();
    expect(mockFrom).toHaveBeenCalledWith('log_envio_relatorios');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar with empresaId filters by empresa_id', async () => {
    const chain = makeChain([]);
    const eqFn = vi.fn().mockResolvedValue({ data: [], error: null });
    chain.select.mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ eq: eqFn, then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn) }), then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn) }) });
    mockFrom.mockReturnValue(chain);
    await logEnvioRelatoriosService.listar('emp-1');
    expect(mockFrom).toHaveBeenCalledWith('log_envio_relatorios');
  });
});

describe('relatoriosAgendadosService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries relatorios_agendados', async () => {
    const chain = makeChain([{ id: 'r1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await relatoriosAgendadosService.listar();
    expect(mockFrom).toHaveBeenCalledWith('relatorios_agendados');
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns [] when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await relatoriosAgendadosService.listar();
    expect(result).toEqual([]);
  });

  it('criar calls insert on relatorios_agendados', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await relatoriosAgendadosService.criar({ nome: 'Relatório A' });
    expect(mockFrom).toHaveBeenCalledWith('relatorios_agendados');
    expect(chain.insert).toHaveBeenCalled();
  });

  it('excluir calls delete.eq on relatorios_agendados', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await relatoriosAgendadosService.excluir('id-1');
    expect(mockFrom).toHaveBeenCalledWith('relatorios_agendados');
    expect(chain.delete).toHaveBeenCalled();
  });
});

describe('savedFiltersService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries saved_filters by user_id', async () => {
    const chain = makeChain([{ id: 'f1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await savedFiltersService.listar('user-1');
    expect(mockFrom).toHaveBeenCalledWith('saved_filters');
    expect(Array.isArray(result)).toBe(true);
  });

  it('criar calls insert on saved_filters', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await savedFiltersService.criar({ user_id: 'u1', nome: 'Filtro' });
    expect(chain.insert).toHaveBeenCalled();
  });

  it('excluir calls delete on saved_filters', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await savedFiltersService.excluir('filter-1');
    expect(chain.delete).toHaveBeenCalled();
  });
});

describe('bitrix24Service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getConfig queries bitrix24_config with limit/maybeSingle', async () => {
    const chain = makeChain({ id: 'b1', token: 'tok' });
    mockFrom.mockReturnValue(chain);
    await bitrix24Service.getConfig();
    expect(mockFrom).toHaveBeenCalledWith('bitrix24_config');
  });

  it('saveConfig calls upsert on bitrix24_config', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await bitrix24Service.saveConfig({ token: 'new-tok' });
    expect(mockFrom).toHaveBeenCalledWith('bitrix24_config');
    expect(chain.upsert).toHaveBeenCalled();
  });

  it('getLogs queries bitrix24_sync_logs', async () => {
    const chain = makeChain([{ id: 'log1' }]);
    mockFrom.mockReturnValue(chain);
    const result = await bitrix24Service.getLogs();
    expect(mockFrom).toHaveBeenCalledWith('bitrix24_sync_logs');
    expect(Array.isArray(result)).toBe(true);
  });
});
