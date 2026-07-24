import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function makeChain(data: any = [], error: any = null) {
  const result = { data, error };
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result), maybeSingle, limit, then: (fn: any) => Promise.resolve(result).then(fn) });
  const eq = vi.fn().mockReturnValue({ order, maybeSingle, then: (fn: any) => Promise.resolve(result).then(fn) });
  const upsert = vi.fn().mockResolvedValue(result);
  const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle }), then: (fn: any) => Promise.resolve(result).then(fn) });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(result) });
  const select = vi.fn().mockReturnValue({ order, eq, maybeSingle, then: (fn: any) => Promise.resolve(result).then(fn) });
  return { select, eq, order, upsert, insert, update, maybeSingle };
}

import {
  configAfastamentosService,
  feriasSolicitacoesService,
  historicoCargoService,
  linhasTransporteService,
  notificacoesAdmissaoService,
  onboardingService,
} from '../rhService';

describe('configAfastamentosService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('obter calls from config_afastamentos with eq empresa_id', async () => {
    const chain = makeChain({ id: 'c1' });
    mockFrom.mockReturnValue(chain);
    await configAfastamentosService.obter('emp-1');
    expect(mockFrom).toHaveBeenCalledWith('config_afastamentos');
  });

  it('obter throws on error', async () => {
    const chain = makeChain(null, new Error('db error'));
    chain.select.mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }) }) });
    mockFrom.mockReturnValue(chain);
    await expect(configAfastamentosService.obter('emp-1')).rejects.toThrow('db error');
  });

  it('salvar calls upsert', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await configAfastamentosService.salvar({ empresa_id: 'emp-1', valor: 10 });
    expect(mockFrom).toHaveBeenCalledWith('config_afastamentos');
    expect(chain.upsert).toHaveBeenCalled();
  });
});

describe('feriasSolicitacoesService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar returns data array', async () => {
    const data = [{ id: 'f1' }];
    const chain = makeChain(data);
    mockFrom.mockReturnValue(chain);
    const result = await feriasSolicitacoesService.listar();
    expect(Array.isArray(result)).toBe(true);
  });

  it('listar returns empty array when data is null', async () => {
    const chain = makeChain(null);
    mockFrom.mockReturnValue(chain);
    const result = await feriasSolicitacoesService.listar();
    expect(result).toEqual([]);
  });

  it('criar calls from ferias_solicitacoes', async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    await feriasSolicitacoesService.criar({ colaborador_id: 'c1' });
    expect(mockFrom).toHaveBeenCalledWith('ferias_solicitacoes');
  });
});

describe('historicoCargoService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries historico_cargo', async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);
    await historicoCargoService.listar('col-1');
    expect(mockFrom).toHaveBeenCalledWith('historico_cargo');
  });
});

describe('linhasTransporteService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar returns array', async () => {
    const chain = makeChain([{ id: 'l1', nome: 'Linha A' }]);
    mockFrom.mockReturnValue(chain);
    const result = await linhasTransporteService.listar();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('notificacoesAdmissaoService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listar queries notificacoes_admissao', async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);
    await notificacoesAdmissaoService.listar('adm-1');
    expect(mockFrom).toHaveBeenCalledWith('notificacoes_admissao');
  });
});

describe('onboardingService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listarTemplates queries onboarding_templates', async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);
    await onboardingService.listarTemplates();
    expect(mockFrom).toHaveBeenCalledWith('onboarding_templates');
  });

  it('listarTarefas queries onboarding_tarefas by onboardingId', async () => {
    const chain = makeChain([]);
    mockFrom.mockReturnValue(chain);
    await onboardingService.listarTarefas('ob-1');
    expect(mockFrom).toHaveBeenCalledWith('onboarding_tarefas');
  });
});
